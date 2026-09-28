let mockCashSnapshot: {
  status: 'loading' | 'idle' | 'submitting' | 'uncertain' | 'business_error' | 'session_expired' | 'success';
  attempt: null;
  error: null;
} = { status: 'idle', attempt: null, error: null };

const mockSignOut = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: { baseUrl: 'https://tenant.example', accessToken: 'token' },
    user: { id: 3, email: 'cashier@example.com' },
    signOut: mockSignOut,
  }),
}));
jest.mock('../src/services/cashRegister/cashRegisterAttemptStorage', () => ({
  cashRegisterAttemptStorage: () => ({ read: async () => null, write: async () => {}, remove: async () => {} }),
}));
jest.mock('../src/services/cashRegister/cashRegisterOperationController', () => ({
  CashRegisterOperationController: class {
    subscribe = () => () => {};
    getSnapshot = () => mockCashSnapshot;
    isLocked = () => !['idle', 'business_error'].includes(mockCashSnapshot.status);
    start = jest.fn();
    retry = jest.fn();
    finish = jest.fn();
    reset = jest.fn();
  },
}));
jest.mock('../src/components/ui/MotionSheet', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    MotionSheet: ({ children, ...props }: any) => React.createElement(View, { ...props, testID: 'cash-motion-sheet' }, children),
  };
});
jest.mock('../src/components/ui/Button', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Button: ({ label, onPress, ...props }: any) => React.createElement(Pressable, { ...props, onPress }, React.createElement(Text, null, label)),
  };
});

import React from 'react';
import { act, create } from 'react-test-renderer';

import { CashMovementModal } from '../src/components/cashRegister/CashMovementModal';

function renderAtStatus(status: typeof mockCashSnapshot.status, onClose = jest.fn()) {
  mockCashSnapshot = { status, attempt: null, error: null };
  let root!: ReturnType<typeof create>;
  act(() => {
    root = create(React.createElement(CashMovementModal, {
      visible: true,
      type: 'out',
      registerId: 9,
      onClose,
      onSuccess: jest.fn(),
    }));
  });
  return { root, onClose, sheet: root.root.find((node) => node.props.testID === 'cash-motion-sheet') };
}

it.each(['loading', 'submitting', 'uncertain', 'session_expired', 'success'] as const)(
  'blocks every dismissal path while the financial operation is %s',
  (status) => {
    const { root, onClose, sheet } = renderAtStatus(status);
    expect(sheet.props.dismissible).toBe(false);
    act(() => { sheet.props.onClose(); });
    expect(onClose).not.toHaveBeenCalled();
    act(() => { root.unmount(); });
  },
);

it.each(['idle', 'business_error'] as const)('allows a deliberate close while the operation is %s', (status) => {
  const { root, onClose, sheet } = renderAtStatus(status);
  expect(sheet.props.dismissible).toBe(true);
  act(() => { sheet.props.onClose(); });
  expect(onClose).toHaveBeenCalledTimes(1);
  act(() => { root.unmount(); });
});
