import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fontWeights, radii, spacing } from '../../theme';

type Props = { size?: 'lg' | 'sm' };

/**
 * Horizontal lockup: mark + wordmark + "MOBILE" pill. The real PRODEX logo only
 * appears at `lg` (Login) - real brand value. The compact `sm` header lockup
 * (Dashboard) stays typographic/minimalist, unchanged.
 */
export function BrandSignature({ size = 'lg' }: Props) {
  const compact = size === 'sm';
  return (
    <View accessibilityLabel="PRODEX Mobile" style={styles.row}>
      {compact ? (
        <View style={[styles.mark, styles.markSm]}><Text style={[styles.markText, styles.markTextSm]}>P</Text></View>
      ) : (
        <Image source={require('../../../assets/icon.png')} style={styles.markImage} accessibilityIgnoresInvertColors resizeMode="contain" />
      )}
      <Text style={[styles.wordmark, compact && styles.wordmarkSm]}>PRODEX</Text>
      <View style={styles.pill}><Text style={styles.pillText}>MOBILE</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mark: { width: 34, height: 34, borderRadius: radii.xs, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  markImage: { width: 40, height: 40 },
  markSm: { width: 28, height: 28 },
  markText: { color: colors.white, fontSize: 17, fontWeight: fontWeights.heavy },
  markTextSm: { fontSize: 14 },
  wordmark: { color: colors.ink, fontSize: 19, letterSpacing: -0.4, fontWeight: fontWeights.heavy },
  wordmarkSm: { fontSize: 16 },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: colors.brandSoft },
  pillText: { color: colors.brand, fontSize: 10, letterSpacing: 0.6, fontWeight: fontWeights.bold },
});
