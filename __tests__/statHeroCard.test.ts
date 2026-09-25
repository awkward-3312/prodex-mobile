jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import { StatHeroCard } from '../src/components/ui/StatHeroCard';
import { colors } from '../src/theme';

function render(props: React.ComponentProps<typeof StatHeroCard>) {
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(StatHeroCard, props)); });
  return root;
}

function texts(root: ReturnType<typeof create>) {
  return root.root.findAllByType(Text).map((node) => node.props.children);
}

it('renders title, value and subtitle', () => {
  const root = render({ title: 'Ventas de hoy', value: 'L 1,240.00', subtitle: '12 ventas' });
  const rendered = texts(root);
  expect(rendered).toContain('Ventas de hoy');
  expect(rendered).toContain('L 1,240.00');
  expect(rendered).toContain('12 ventas');
});

it('omits the subtitle text node when none is given', () => {
  const root = render({ title: 'Ventas de hoy', value: 'L 1,240.00' });
  expect(texts(root)).toEqual(['Ventas de hoy', 'L 1,240.00']);
});

it('defaults to the soft (brandSoft) tone', () => {
  const root = render({ title: 'Total', value: '10' });
  const base = root.toJSON() as any;
  expect(JSON.stringify(base.props.style)).toContain(colors.brandSoft);
});

it('uses the dark (brand/navy) background for the dark variant', () => {
  const root = render({ title: 'Total', value: '10', variant: 'dark' });
  const base = root.toJSON() as any;
  expect(JSON.stringify(base.props.style)).toContain(colors.brand);
  expect(JSON.stringify(base.props.style)).not.toContain(colors.brandSoft);
});
