import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, sizing, spacing, surfaces, typography } from '../../theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

/** One search treatment shared by POS, Inventory and Sales — same height/radius/iconography everywhere. Purely presentational: debounce and stale-request handling stay owned by each screen. */
export function SearchField({ value, onChangeText, placeholder, accessibilityLabel, style }: Props) {
  return (
    <View style={[styles.box, style]}>
      <Ionicons name="search-outline" size={19} color={colors.inkMuted} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable accessibilityLabel="Limpiar búsqueda" accessibilityRole="button" onPress={() => onChangeText('')} style={styles.clear}>
          <Ionicons name="close-circle" size={18} color={colors.inkMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { ...surfaces.input, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  input: { flex: 1, minHeight: sizing.touch, color: colors.ink, fontSize: typography.body },
  clear: { width: 32, height: sizing.touch, alignItems: 'center', justifyContent: 'center' },
});
