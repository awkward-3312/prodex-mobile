import type { ReactNode, RefObject } from 'react';
import type { StyleProp, View, ViewStyle } from 'react-native';

import { MotionSheet } from './MotionSheet';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Fixed sheet height as a fraction of window height (e.g. 0.8). Omit for a
   * content-sized sheet capped by `maxHeightPct`. */
  heightPct?: number;
  /** Cap on a content-sized sheet's height as a fraction of window height. */
  maxHeightPct?: number;
  /** @deprecated The handle now follows `gestureEnabled` so it always represents a real gesture. */
  showHandle?: boolean;
  showCloseButton?: boolean;
  closeAccessibilityLabel?: string;
  accessibilityLabel?: string;
  dismissible?: boolean;
  gestureEnabled?: boolean;
  keyboardAvoiding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  initialFocusRef?: RefObject<View | null>;
  returnFocusRef?: RefObject<View | null>;
};

/**
 * Compatibility wrapper for existing consumers. MotionSheet owns the shared
 * gesture, transition, accessibility and safe-area behavior.
 */
export function BottomSheet({ visible, onClose, children, heightPct, maxHeightPct = 0.85, showCloseButton = false, closeAccessibilityLabel = 'Cerrar', accessibilityLabel, dismissible = true, gestureEnabled = true, keyboardAvoiding = false, contentStyle, initialFocusRef, returnFocusRef }: Props) {
  return (
    <MotionSheet
      visible={visible}
      onClose={onClose}
      heightPct={heightPct}
      maxHeightPct={maxHeightPct}
      showCloseButton={showCloseButton}
      closeAccessibilityLabel={closeAccessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      dismissible={dismissible}
      gestureEnabled={gestureEnabled}
      keyboardAvoiding={keyboardAvoiding}
      contentStyle={contentStyle}
      initialFocusRef={initialFocusRef}
      returnFocusRef={returnFocusRef}
    >
      {children}
    </MotionSheet>
  );
}
