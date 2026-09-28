import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '../motion';
import { SearchField } from '../ui/SearchField';
import { colors, radii, sizing, spacing } from '../../theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onScanPress: () => void;
};

export function PosSearchBar({ value, onChangeText, onScanPress }: Props) {
  return (
    <View style={styles.row}>
      <SearchField
        accessibilityLabel="Buscar producto por nombre, SKU o código de barras"
        placeholder="Buscar producto o escanear"
        value={value}
        onChangeText={onChangeText}
        style={styles.searchBox}
      />
      <PressableScale accessibilityLabel="Escanear código de barras" accessibilityRole="button" onPress={onScanPress} style={styles.scan}>
        <Ionicons name="scan-outline" size={23} color={colors.onAccent} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  searchBox: { flex: 1 },
  scan: { width: sizing.input, height: sizing.input, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.accentDark },
});
