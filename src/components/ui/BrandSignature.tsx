import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fontWeights, radii, spacing } from '../../theme';

type Props = { size?: 'lg' | 'sm' };

/** Official artwork on light surfaces; never recolor the supplied PNGs. */
export function BrandSignature({ size = 'lg' }: Props) {
  const compact = size === 'sm';
  return (
    <View accessibilityLabel="PRODEX Mobile" style={styles.row}>
      {compact ? (
        <Image source={require('../../../assets/prodex-symbol.png')} style={styles.markImage} accessibilityIgnoresInvertColors resizeMode="contain" />
      ) : (
        <Image source={require('../../../assets/prodex-logo.png')} style={styles.logoImage} accessibilityIgnoresInvertColors resizeMode="contain" />
      )}
      {compact ? <Text style={styles.wordmark}>PRODEX</Text> : null}
      <View style={styles.pill}><Text style={styles.pillText}>MOBILE</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  markImage: { width: 32, height: 32 },
  logoImage: { width: 200, height: 49, flexShrink: 1 },
  wordmark: { color: colors.ink, fontSize: 16, letterSpacing: -0.4, fontWeight: fontWeights.heavy },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: colors.accent },
  pillText: { color: colors.brand, fontSize: 10, letterSpacing: 0.6, fontWeight: fontWeights.bold },
});
