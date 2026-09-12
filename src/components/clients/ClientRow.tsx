import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeights, radii, spacing, typography } from '../../theme';
import type { ClientSearchResult } from '../../types/mobilePosCheckout';
import { PressableScale } from '../motion';

type Props = { client: ClientSearchResult; onPress?: (client: ClientSearchResult) => void };

export const ClientRow = memo(function ClientRow({ client, onPress }: Props) {
  const metaParts = [client.phone, client.rtn ? `RTN ${client.rtn}` : null].filter(Boolean) as string[];
  const content = (
    <View style={styles.main}>
      <View style={styles.avatar}><Ionicons name="person-outline" size={18} color={colors.brand} /></View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>{client.name}</Text>
        {metaParts.length > 0 ? <Text style={styles.meta} numberOfLines={1}>{metaParts.join(' · ')}</Text> : null}
      </View>
    </View>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Ver cliente ${client.name}`}
      onPress={() => onPress(client)}
      style={styles.row}
    >
      <View style={styles.rowInner}>
        {content}
        <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: { minHeight: 68, justifyContent: 'center', padding: spacing.md, marginBottom: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, minWidth: 0 },
  avatar: { width: 38, height: 38, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  copy: { flex: 1, minWidth: 0 },
  name: { color: colors.ink, fontSize: typography.body, fontWeight: fontWeights.semibold },
  meta: { marginTop: 2, color: colors.inkMuted, fontSize: 12 },
});
