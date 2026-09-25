jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../src/components/motion', () => {
  const { Pressable } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    PressableScale: ({ children, onPress, ...props }: any) => React.createElement(Pressable, { onPress, ...props }, children),
    FadeInView: ({ children, style }: any) => { const { View } = jest.requireActual('react-native'); return React.createElement(View, { style }, children); },
  };
});

import React from 'react';
import { act, create } from 'react-test-renderer';
import { ActivityIndicator, Text } from 'react-native';
import { Button } from '../src/components/ui/Button';

function findButton(root: ReturnType<typeof create>) {
  return root.root.findAll((node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function')[0];
}

it('renders the label and calls onPress when tapped', () => {
  const onPress = jest.fn();
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(Button, { label: 'Guardar', onPress })); });
  expect(root.root.findAllByType(Text).some((node) => node.props.children === 'Guardar')).toBe(true);
  act(() => { findButton(root).props.onPress(); });
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('does not call onPress when disabled', () => {
  const onPress = jest.fn();
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(Button, { label: 'Guardar', onPress, disabled: true })); });
  const button = findButton(root);
  expect(button.props.disabled).toBe(true);
  expect(button.props.accessibilityState.disabled).toBe(true);
});

it('shows a spinner instead of the label while loading, and is not pressable', () => {
  const onPress = jest.fn();
  let root!: ReturnType<typeof create>;
  act(() => { root = create(React.createElement(Button, { label: 'Guardar', onPress, loading: true })); });
  expect(root.root.findAllByType(ActivityIndicator)).toHaveLength(1);
  expect(root.root.findAllByType(Text).some((node) => node.props.children === 'Guardar')).toBe(false);
  const button = findButton(root);
  expect(button.props.disabled).toBe(true);
  expect(button.props.accessibilityState.busy).toBe(true);
});

it.each(['primary', 'secondary', 'destructive'] as const)('renders the %s variant without throwing', (variant) => {
  expect(() => act(() => { create(React.createElement(Button, { label: 'Eliminar', onPress: jest.fn(), variant })); })).not.toThrow();
});
