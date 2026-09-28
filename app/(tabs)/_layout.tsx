import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProdexTabItem } from '../../src/components/navigation/ProdexTabItem';
import { useCashRegister } from '../../src/context/CashRegisterContext';
import { useAuth } from '../../src/context/AuthContext';
import { colors, radii, sizing, spacing } from '../../src/theme';

const tabRoutes: Record<string, { activeIcon: keyof typeof Ionicons.glyphMap; inactiveIcon: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { activeIcon: 'home', inactiveIcon: 'home-outline', label: 'Inicio' },
  pos: { activeIcon: 'cart', inactiveIcon: 'cart-outline', label: 'POS' },
  inventory: { activeIcon: 'cube', inactiveIcon: 'cube-outline', label: 'Inventario' },
  sales: { activeIcon: 'receipt', inactiveIcon: 'receipt-outline', label: 'Ventas' },
  more: { activeIcon: 'menu', inactiveIcon: 'menu-outline', label: 'Más' },
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const itemHeight = sizing.touch + spacing.xs + 14 * Math.max(0, fontScale - 1);
  const { status } = useCashRegister();
  const { hasPermission } = useAuth();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkMuted,
        // ProdexTabItem owns both the icon and its label. Supplying the icon
        // renderer prevents the navigator from inserting its MissingIcon (⏷).
        tabBarShowLabel: false,
        tabBarIconStyle: { width: '100%', height: itemHeight },
        tabBarStyle: { height: itemHeight + spacing.sm + insets.bottom, paddingTop: spacing.xs, paddingBottom: insets.bottom + spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0 },
        tabBarItemStyle: { minHeight: 44, borderRadius: radii.md },
        tabBarIcon: ({ focused }) => {
          const tab = tabRoutes[route.name] ?? { activeIcon: 'ellipse', inactiveIcon: 'ellipse-outline', label: route.name };
          return <ProdexTabItem activeName={tab.activeIcon} focused={focused} inactiveName={tab.inactiveIcon} label={tab.label} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarAccessibilityLabel: 'Inicio' }} />
      <Tabs.Screen name="pos" options={{ href: status === 'open' && hasPermission('Pos_view') ? '/(tabs)/pos' : null, title: 'POS', tabBarAccessibilityLabel: 'Punto de venta' }} />
      <Tabs.Screen name="inventory" options={{ href: hasPermission('Pos_view') ? '/(tabs)/inventory' : null, title: 'Inventario', tabBarAccessibilityLabel: 'Inventario' }} />
      <Tabs.Screen name="sales" options={{ href: hasPermission('Sales_view') ? '/(tabs)/sales' : null, title: 'Ventas', tabBarAccessibilityLabel: 'Ventas' }} />
      <Tabs.Screen name="more" options={{ title: 'Más', tabBarAccessibilityLabel: 'Más opciones' }} />
    </Tabs>
  );
}
