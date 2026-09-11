import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, radii, sizing, spacing, surfaces, typography } from '../../theme';

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
  searchBox: { ...surfaces.input, flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm },
  input: { flex: 1, minHeight: sizing.touch, color: colors.ink, fontSize: typography.body },
  clear: { width: 32, height: sizing.touch, alignItems: 'center', justifyContent: 'center' },
  scan: { width: sizing.input, height: sizing.input, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.brandSoft },
  pressed: { opacity: 0.7 },
});
