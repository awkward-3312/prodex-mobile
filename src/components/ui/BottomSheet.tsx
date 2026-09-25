import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView, PressableScale } from '../motion';
import { colors, motion, radii, spacing } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Fixed sheet height as a fraction of window height (e.g. 0.8). Omit for a
   * content-sized sheet capped by `maxHeightPct`. */
  heightPct?: number;
  /** Cap on a content-sized sheet's height as a fraction of window height. */
  maxHeightPct?: number;
  showHandle?: boolean;
  showCloseButton?: boolean;
  closeAccessibilityLabel?: string;
};

/**
 * Single bottom-sheet primitive: same backdrop, handle, corner radius and
 * safe-area handling everywhere. Built on the technique already proven by
 * the POS cart sheet (Modal transparent + Reanimated slide-in), not native
 * Modal slide animation, so behavior is identical on Android and iOS
 * instead of depending on each platform's own Modal transition.
 */
export function BottomSheet({ visible, onClose, children, heightPct, maxHeightPct = 0.85, showHandle = true, showCloseButton = false, closeAccessibilityLabel = 'Cerrar' }: Props) {
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel={closeAccessibilityLabel} accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <FadeInView
          distance={18}
          duration={motion.duration.slow}
          style={[
            styles.sheetWrap,
            heightPct ? { height: height * heightPct } : { maxHeight: height * maxHeightPct },
          ]}
        >
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            {showHandle ? <View style={styles.handle} /> : null}
            {showCloseButton ? (
              <PressableScale accessibilityLabel={closeAccessibilityLabel} accessibilityRole="button" onPress={onClose} style={styles.close}>
                <Ionicons name="close" size={20} color={colors.ink} />
              </PressableScale>
            ) : null}
            {children}
          </SafeAreaView>
        </FadeInView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10, 30, 54, 0.4)' },
  sheetWrap: { width: '100%' },
  sheet: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.surface },
  handle: { alignSelf: 'center', width: 38, height: 4, marginBottom: spacing.md, borderRadius: radii.pill, backgroundColor: colors.line },
  close: { position: 'absolute', top: spacing.sm, right: spacing.lg, width: 42, height: 42, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, zIndex: 1 },
});
