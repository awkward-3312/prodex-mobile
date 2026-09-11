import { StyleSheet, Text, View } from 'react-native';
import { colors, fontWeights, spacing } from '../../theme';

export function BrandSignature() {
  return <View accessibilityLabel="PRODEX Mobile" style={styles.brand}>
    <Text style={styles.wordmark}>PRODEX</Text>
    <Text style={styles.label}>MOBILE</Text>
  </View>;
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', paddingVertical: spacing.xl },
  wordmark: { color: colors.ink, fontSize: 39, letterSpacing: -1.8, fontWeight: fontWeights.heavy },
  label: { color: colors.brand, fontSize: 10, letterSpacing: 5, fontWeight: fontWeights.bold, marginTop: 3 },
});
