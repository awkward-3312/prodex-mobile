import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '../../src/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        tabBarStyle: { height: 58 + insets.bottom, paddingTop: spacing.xs, paddingBottom: insets.bottom + spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0 },
        tabBarItemStyle: { minHeight: 44, borderRadius: radii.md },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            index: focused ? 'home' : 'home-outline',
            pos: focused ? 'cart' : 'cart-outline',
            inventory: focused ? 'cube' : 'cube-outline',
            sales: focused ? 'receipt' : 'receipt-outline',
            more: focused ? 'menu' : 'menu-outline',
          };
          const isPos = route.name === 'pos';
          const iconSize = focused ? (isPos ? 24 : 23) : 22;

          return (
            <View style={[styles.iconSlot, focused && styles.activeIcon, isPos && styles.posIcon]}>
              <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={iconSize} color={color} />
            </View>
          );
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
