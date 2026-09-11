import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import type { ColorValue } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { colors, fontWeights, motion, radii, spacing } from '../../src/theme';

function TabIcon({ color, focused, name, isPos }: { color: ColorValue; focused: boolean; name: keyof typeof Ionicons.glyphMap; isPos: boolean }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: reducedMotion ? motion.duration.fast : motion.duration.normal });
  }, [focused, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.82 + progress.value * 0.18,
    transform: [{ scale: 1 + progress.value * (reducedMotion ? 0 : 0.04) }],
  }));

  const iconSize = focused ? (isPos ? 24 : 23) : 22;

  return (
    <Animated.View style={[styles.iconSlot, focused && styles.activeIcon, isPos && styles.posIcon, animatedStyle]}>
      <Ionicons name={name} size={iconSize} color={color} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: fontWeights.semibold },
        tabBarStyle: { height: 58 + insets.bottom, paddingTop: spacing.xs, paddingBottom: insets.bottom + spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0 },
        tabBarItemStyle: { minHeight: 44, borderRadius: radii.md },
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            index: focused ? 'home' : 'home-outline',
            pos: focused ? 'cart' : 'cart-outline',
            inventory: focused ? 'cube' : 'cube-outline',
            sales: focused ? 'receipt' : 'receipt-outline',
            more: focused ? 'menu' : 'menu-outline',
          };
          const isPos = route.name === 'pos';
          return <TabIcon color={color} focused={focused} isPos={isPos} name={icons[route.name] ?? 'ellipse-outline'} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarAccessibilityLabel: 'Inicio' }} />
      <Tabs.Screen name="pos" options={{ title: 'POS', tabBarAccessibilityLabel: 'Punto de venta' }} />
      <Tabs.Screen name="inventory" options={{ title: 'Inventario', tabBarAccessibilityLabel: 'Inventario' }} />
      <Tabs.Screen name="sales" options={{ title: 'Ventas', tabBarAccessibilityLabel: 'Ventas' }} />
      <Tabs.Screen name="more" options={{ title: 'Más', tabBarAccessibilityLabel: 'Más opciones' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconSlot: { width: 36, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  activeIcon: { backgroundColor: colors.brandSoft },
  posIcon: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.brandSoft },
});
