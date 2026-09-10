import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radii, spacing } from '../../theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onScanPress: () => void;
};

export function PosSearchBar({ value, onChangeText, onScanPress }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={20} color={colors.inkMuted} />
        <TextInput accessibilityLabel="Buscar producto por nombre, SKU o código de barras" placeholder="Buscar producto o escanear" placeholderTextColor={colors.inkMuted} value={value} onChangeText={onChangeText} style={styles.input} returnKeyType="search" />
        {value.length > 0 && <Pressable accessibilityLabel="Limpiar búsqueda" accessibilityRole="button" onPress={() => onChangeText('')} style={styles.clear}><Ionicons name="close-circle" size={18} color={colors.inkMuted} /></Pressable>}
      </View>
      <Pressable accessibilityLabel="Escanear código de barras" accessibilityRole="button" onPress={onScanPress} style={({ pressed }) => [styles.scan, pressed && styles.pressed]}>
        <Ionicons name="scan-outline" size={23} color={colors.brand} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  searchBox: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  input: { flex: 1, minHeight: 44, color: colors.ink, fontSize: 13 },
  clear: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  scan: { width: 52, height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.brandSoft },
  pressed: { opacity: 0.7 },
});
