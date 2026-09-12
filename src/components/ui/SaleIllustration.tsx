import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, shadows } from '../../theme';

/** Small layered receipt illustration, built with native views and existing icons. */
export function SaleIllustration() {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.stage}>
    <View style={styles.halo} />
    <View style={styles.back} />
    <View style={styles.receipt}>
      <Ionicons name="bag-handle-outline" size={27} color={colors.brand} />
      <View style={styles.line} /><View style={[styles.line, { width: 26 }]} />
      <View style={styles.rule} />
    </View>
    <View style={styles.check}><Ionicons name="checkmark" size={21} color={colors.white} /></View>
  </View>;
}

const styles = StyleSheet.create({
  stage: { width: 120, height: 138 },
  halo: { position: 'absolute', width: 116, height: 116, top: 12, borderRadius: 60, backgroundColor: '#246F5E' },
  back: { position: 'absolute', width: 70, height: 94, left: 36, top: 17, borderRadius: 15, backgroundColor: '#76BBA1', transform: [{ rotate: '15deg' }] },
  receipt: { ...shadows.card, position: 'absolute', width: 76, height: 100, top: 15, left: 17, padding: 14, gap: 7, borderRadius: 15, backgroundColor: '#F6FFF9', transform: [{ rotate: '-10deg' }], borderWidth: 1, borderColor: colors.white },
  line: { height: 4, width: 40, borderRadius: 3, backgroundColor: '#C4DED2' },
  rule: { height: 2, width: 44, marginTop: 3, backgroundColor: '#DCEDE3' },
  check: { ...shadows.card, position: 'absolute', bottom: 7, right: 7, width: 38, height: 38, borderRadius: 14, borderWidth: 3, borderColor: '#83C3A8', backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] },
});
