import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../../theme';

type Props = { message?: string; onRetry?: () => void };

export function AuthLoading({ message = 'Preparando tu sesión...', onRetry }: Props) {
  return <View style={styles.screen}><Text style={styles.brand}>PRODEX</Text><Text style={styles.text}>{message}</Text>{onRetry && <Pressable accessibilityLabel="Reintentar sesión" accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></Pressable>}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  brand: { color: colors.brand, fontSize: 24, fontWeight: '800' },
  text: { marginTop: spacing.sm, color: colors.inkMuted, fontSize: 13 },
  retry: { minHeight: 44, marginTop: spacing.lg, paddingHorizontal: spacing.lg, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  retryText: { color: colors.brandDark, fontSize: 13, fontWeight: '800' },
});