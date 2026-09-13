import React from 'react';
import { act, create } from 'react-test-renderer';
import { Image } from 'react-native';
import type { AuthenticatedUser, OperationalContext } from '../src/types/auth';
import { resolveUserAvatar } from '../src/utils/resolveUserAvatar';
import { resolveOperationalContext } from '../src/utils/resolveOperationalContext';

let mockUser: AuthenticatedUser;
let mockContext: OperationalContext | null;
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: mockUser, operationalContext: mockContext, session: { baseUrl: 'https://tenant.example', accessToken: 'secret-access-token' } }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
import { UserAvatar } from '../src/components/ui/UserAvatar';
import { PosHeader } from '../src/components/pos/PosHeader';

const base = 'https://tenant.example';
beforeEach(() => { mockUser = { id: 1, name: 'Ana Lopez' }; mockContext = null; });

it.each(['12345678photo.jpg', 'default_avatar_1.png', 'no_avatar.png'])('uses authoritative avatar folder for %s', avatar => {
  expect(resolveUserAvatar({ avatar }, base)).toBe(`${base}/images/avatar/${avatar}`);
});
it.each(['avatar', 'profile_photo_url', 'avatar_url', 'photo_url'])('preserves absolute HTTPS in %s', field => {
  expect(resolveUserAvatar({ [field]: 'https://cdn.example/photo.jpg' }, base)).toBe('https://cdn.example/photo.jpg');
});
it('resolves explicit relative URLs and prioritizes valid explicit fields', () => {
  expect(resolveUserAvatar({ avatar_url: '/media/photo.png', avatar: 'default_avatar_1.png' }, base)).toBe(`${base}/media/photo.png`);
  expect(resolveUserAvatar({ photo_url: 'media/photo.png' }, base)).toBe(`${base}/media/photo.png`);
  expect(resolveUserAvatar({ avatar: 'photo.jpg' }, `${base}/app/`)).toBe(`${base}/images/avatar/photo.jpg`);
});
it.each(['javascript:alert(1)', 'data:image/png;base64,xxx', 'file:///photo.jpg', 'https://user:password@host.example/photo', 'https://host.example\\photo'])('rejects unsafe image value %s', avatar => {
  expect(resolveUserAvatar({ avatar }, base)).toBeUndefined();
});
it('missing avatar and missing tenant for a filename return no URL', () => {
  expect(resolveUserAvatar({}, base)).toBeUndefined();
  expect(resolveUserAvatar({ avatar: 'photo.jpg' })).toBeUndefined();
});
it('shows initials for missing images and does not retry a failed image on rerender', () => {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(UserAvatar)); });
  expect(JSON.stringify(root.toJSON())).toContain('AL');
  mockUser = { ...mockUser, avatar: 'photo.jpg' };
  act(() => root.update(React.createElement(UserAvatar)));
  const image = root.root.findByType(Image);
  expect(image.props.source).toEqual({ uri: `${base}/images/avatar/photo.jpg` });
  expect(JSON.stringify(image.props)).not.toContain('secret-access-token');
  act(() => image.props.onError());
  act(() => root.update(React.createElement(UserAvatar)));
  expect(root.root.findAllByType(Image)).toHaveLength(0);
  expect(JSON.stringify(root.toJSON())).toContain('AL');
  mockUser = { ...mockUser, avatar: 'new.jpg' };
  act(() => root.update(React.createElement(UserAvatar)));
  expect(root.root.findByType(Image).props.source.uri).toBe(`${base}/images/avatar/new.jpg`);
  act(() => root.root.findByType(Image).props.onError());
  mockUser = { ...mockUser, id: 2 };
  act(() => root.update(React.createElement(UserAvatar)));
  expect(root.root.findAllByType(Image)).toHaveLength(1);
  act(() => root.unmount());
});

const context: OperationalContext = {
  effective: { branch_id: '1', inventory_location_id: 2, cash_drawer_id: '3' },
  branches: [{ id: 9, name: 'Otra' }, { id: 1, name: 'Sucursal Norte' }],
  inventory_locations: [{ id: '2', name: 'Sala de ventas' }],
  cash_drawers: [{ id: 3, name: 'Caja Azul' }], ready_for_location_pos: true,
};
it('resolves effective IDs across string/number types in branch/location/drawer order without mutation', () => {
  const before = JSON.stringify(context);
  const result = resolveOperationalContext(context);
  expect(result.label).toBe('Sucursal Norte · Sala de ventas · Caja Azul');
  expect(result.branch).toBe(context.branches![1]);
  expect(result.readyForLocationPos).toBe(true);
  expect(JSON.stringify(context)).toBe(before);
});
it('keeps only available names and never selects an alternative entity', () => {
  expect(resolveOperationalContext({ ...context, effective: { branch_id: 44, inventory_location_id: 2 } }).label).toBe('Sala de ventas');
  expect(resolveOperationalContext({ ...context, effective: {} }).label).toBe('Contexto operativo no disponible');
  expect(resolveOperationalContext(null).label).toBe('Contexto operativo no disponible');
});
it('renders actual names and preserves an explicit not-ready status without adding controls', () => {
  mockContext = { ...context, ready_for_location_pos: false };
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(PosHeader)); });
  expect(JSON.stringify(root.toJSON())).toContain('Sucursal Norte · Sala de ventas · Caja Azul');
  expect(JSON.stringify(root.toJSON())).toContain('Contexto no listo para POS');
  expect(root.root.findAll(node => typeof node.props.onPress === 'function')).toHaveLength(0);
  mockContext = null;
  act(() => root.update(React.createElement(PosHeader)));
  expect(JSON.stringify(root.toJSON())).toContain('Contexto operativo no disponible');
  act(() => root.unmount());
});
