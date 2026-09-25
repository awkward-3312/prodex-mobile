import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { PressableScale } from '../motion';
import { colors, fontWeights, motion, radii, sizing, spacing, typography } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  accessibilityLabel?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VARIANT_STYLES: Record<ButtonVariant, { background: string; border?: string; text: string; spinner: string }> = {
  primary: { background: colors.brand, text: colors.white, spinner: colors.white },
  secondary: { background: colors.surface, border: colors.line, text: colors.ink, spinner: colors.ink },
  destructive: { background: colors.red, text: colors.white, spinner: colors.white },
};

/**
 * The one button in the app. Every screen used to hand-roll its own primary
 * button style (and at least one had none at all) — this is the shared
 * shell going forward. Existing ad-hoc buttons are migrated screen by
 * screen, not all at once.
 */
export function Button({ label, onPress, variant = 'primary', disabled = false, loading = false, icon, iconPosition = 'left', accessibilityLabel, fullWidth = true, style }: Props) {
  const tone = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      scaleTo={variant === 'primary' ? motion.pressScalePrimary : motion.pressScale}
      style={[
        styles.base,
        { backgroundColor: tone.background, borderColor: tone.border ?? tone.background, borderWidth: tone.border ? 1 : 0 },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={tone.spinner} />
        ) : (
          <>
            {icon && iconPosition === 'left' ? <Ionicons name={icon} size={18} color={tone.text} /> : null}
            <Text style={[styles.label, { color: tone.text }]} numberOfLines={1}>{label}</Text>
            {icon && iconPosition === 'right' ? <Ionicons name={icon} size={18} color={tone.text} /> : null}
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: sizing.button, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  fullWidth: { width: '100%' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { fontSize: typography.button, fontWeight: fontWeights.bold },
});
