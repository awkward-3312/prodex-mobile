import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetricCard } from '../../src/components/MetricCard';
import { QuickAction } from '../../src/components/QuickAction';
import { RecentSaleRow } from '../../src/components/RecentSaleRow';
import { TodaySalesCard } from '../../src/components/TodaySalesCard';
import { appConfig } from '../../src/config/app';
import { dashboardMetrics, recentSales, todaySales } from '../../src/config/mockData';
import { colors, radii, shadows, spacing, typography } from '../../src/theme';

const pendingNotifications = 3;

export default function DashboardScreen() {
  const hasNotifications = pendingNotifications > 0;
  const notificationLabel = hasNotifications
    ? `Notificaciones, ${pendingNotifications} pendientes`
    : 'Notificaciones, sin pendientes';
  const notificationBadge = pendingNotifications > 9 ? '9+' : String(pendingNotifications);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.greeting}>Buenos días, Carlos</Text>
            <Pressable
              accessibilityLabel={`Cambiar ubicación activa: ${appConfig.companyName}, ${appConfig.activeLocation}`}
              accessibilityRole="button"
              style={styles.locationSelector}
            >
              <View style={styles.locationCopy}>
                <Text style={styles.company}>{appConfig.companyName}</Text>
                <View style={styles.locationLine}>
                  <Ionicons name="business-outline" size={14} color={colors.brand} />
                  <Text style={styles.location} numberOfLines={1}>{appConfig.activeLocation}</Text>
                  <Ionicons name="chevron-down" size={15} color={colors.inkMuted} />
                </View>
              </View>
            </Pressable>
          </View>
          <Pressable accessibilityLabel={notificationLabel} accessibilityRole="button" style={[styles.notificationButton, hasNotifications && styles.notificationButtonActive]}>
            <Ionicons name="notifications-outline" size={22} color={hasNotifications ? colors.amber : colors.inkMuted} />
            {hasNotifications && <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>{notificationBadge}</Text></View>}
          </Pressable>
        </View>

        <TodaySalesCard {...todaySales} />

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Resumen del negocio</Text>
          <Text style={styles.period}>Septiembre 2026</Text>
        </View>
        <View style={styles.metricsGrid}>
          {dashboardMetrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
        </View>

        <View style={styles.alertCard}>
          <View style={styles.alertIcon}><Ionicons name="alert-circle-outline" size={20} color={colors.amber} /></View>
          <View style={styles.alertCopy}><Text style={styles.alertTitle}>Inventario bajo</Text><Text style={styles.alertText}>8 productos necesitan reposición</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.amber} />
        </View>

        <Text style={styles.actionsTitle}>Acciones rápidas</Text>
        <View style={styles.actionsCard}>
          <QuickAction label="Nueva venta" icon="add-circle-outline" color={colors.blue} backgroundColor={colors.blueSoft} />
          <QuickAction label="Agregar producto" icon="cube-outline" color={colors.teal} backgroundColor={colors.tealSoft} />
          <QuickAction label="Ver reportes" icon="bar-chart-outline" color={colors.brand} backgroundColor={colors.brandSoft} />
          <QuickAction label="Cobros" icon="card-outline" color={colors.amber} backgroundColor={colors.amberSoft} />
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Ventas recientes</Text>
          <Pressable><Text style={styles.seeAll}>Ver todas</Text></Pressable>
        </View>
        <View style={styles.salesCard}>
          {recentSales.slice(0, 4).map((sale) => <RecentSaleRow key={sale.id} sale={sale} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: spacing.md, paddingBottom: spacing.md },
  headerCopy: { flex: 1, paddingRight: spacing.md },
  greeting: { color: colors.ink, fontSize: typography.title, fontWeight: '800' },
  notificationButton: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.card },
  notificationButtonActive: { backgroundColor: colors.amberSoft },
  notificationBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: radii.pill, backgroundColor: colors.red, borderWidth: 1.5, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  notificationBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800', lineHeight: 13 },
  locationSelector: { width: '100%', marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radii.sm, backgroundColor: colors.brandSoft },
  locationCopy: {},
  company: { color: colors.ink, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  location: { flexShrink: 1, color: colors.inkMuted, fontSize: 11, fontWeight: '600', lineHeight: 16 },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  sectionTitle: { color: colors.ink, fontSize: typography.subtitle, fontWeight: '800' },
  period: { color: colors.inkMuted, fontSize: 11, fontWeight: '600' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  alertCard: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.amberSoft },
  alertIcon: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  alertCopy: { flex: 1, marginLeft: spacing.md },
  alertTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  alertText: { marginTop: 2, color: colors.inkMuted, fontSize: 11 },
  actionsTitle: { marginTop: spacing.xl, color: colors.ink, fontSize: typography.subtitle, fontWeight: '800' },
  actionsCard: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, ...shadows.card },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  seeAll: { color: colors.brand, fontSize: 12, fontWeight: '800' },
  salesCard: { paddingHorizontal: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, borderRadius: radii.md, backgroundColor: colors.surface },
});
