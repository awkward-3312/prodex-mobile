import { Ionicons } from '@expo/vector-icons';
import type { ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  AccessibilityInfo,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  findNodeHandle,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useProdexMotion } from '../motion';
import { prodexEasing } from '../motion/easing';
import { colors, motion, radii, shadows, sizing, spacing } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type MotionSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissible?: boolean;
  gestureEnabled?: boolean;
  heightPct?: number;
  maxHeightPct?: number;
  showCloseButton?: boolean;
  closeAccessibilityLabel?: string;
  accessibilityLabel?: string;
  keyboardAvoiding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  initialFocusRef?: RefObject<View | null>;
  returnFocusRef?: RefObject<View | null>;
};

/**
 * Shared presentation layer for the app's sheet-shaped overlays. The native
 * Modal remains mounted until the coordinated visual exit finishes; business
 * callbacks are invoked once after that exit instead of relying on a timeout.
 */
export function MotionSheet({
  visible,
  onClose,
  children,
  dismissible = true,
  gestureEnabled = true,
  heightPct,
  maxHeightPct = 0.85,
  showCloseButton = false,
  closeAccessibilityLabel = 'Cerrar',
  accessibilityLabel,
  keyboardAvoiding = false,
  contentStyle,
  initialFocusRef,
  returnFocusRef,
}: MotionSheetProps) {
  const { height } = useWindowDimensions();
  const { reducedMotion, durations } = useProdexMotion();
  const [rendered, setRendered] = useState(visible);
  const mountedRef = useRef(true);
  const closingRef = useRef(false);
  const notifyCloseRef = useRef(false);
  const dismissedForVisibilityRef = useRef(false);
  const previousVisibleRef = useRef(visible);
  const onCloseRef = useRef(onClose);
  const focusFrameRef = useRef<number | null>(null);
  const closeButtonRef = useRef<View | null>(null);
  const screenHeight = Math.max(height, 1);

  const backdropOpacity = useSharedValue(0);
  const sheetOpacity = useSharedValue(reducedMotion ? 0 : 1);
  const translateY = useSharedValue(reducedMotion ? 0 : screenHeight);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const finishExit = useCallback(() => {
    if (!mountedRef.current) return;
    const shouldNotify = notifyCloseRef.current;
    closingRef.current = false;
    notifyCloseRef.current = false;
    if (shouldNotify) dismissedForVisibilityRef.current = true;
    setRendered(false);
    if (shouldNotify) {
      onCloseRef.current();
      if (returnFocusRef?.current) {
        focusFrameRef.current = requestAnimationFrame(() => {
          if (Platform.OS === 'web') {
            (returnFocusRef.current as unknown as { focus?: () => void })?.focus?.();
            return;
          }
          const target = findNodeHandle(returnFocusRef.current);
          if (target) AccessibilityInfo.setAccessibilityFocus(target);
        });
      }
    }
  }, [returnFocusRef]);

  const animateIn = useCallback(() => {
    closingRef.current = false;
    notifyCloseRef.current = false;
    backdropOpacity.value = withTiming(1, {
      duration: durations.overlay,
      easing: prodexEasing.enter,
    });
    sheetOpacity.value = withTiming(1, {
      duration: reducedMotion ? durations.touch : motion.duration.state,
      easing: prodexEasing.enter,
    });
    translateY.value = reducedMotion
      ? 0
      : withSpring(0, motion.springs.sheet);
  }, [backdropOpacity, durations.overlay, durations.touch, reducedMotion, sheetOpacity, translateY]);

  const animateExit = useCallback((notifyClose: boolean) => {
    if (closingRef.current) return;
    closingRef.current = true;
    notifyCloseRef.current = notifyClose;
    backdropOpacity.value = withTiming(0, {
      duration: durations.exit,
      easing: prodexEasing.exit,
    });
    translateY.value = withTiming(reducedMotion ? 0 : screenHeight, {
      duration: durations.exit,
      easing: prodexEasing.exit,
    });
    sheetOpacity.value = withTiming(0, {
      duration: durations.exit,
      easing: prodexEasing.exit,
    }, (finished) => {
      if (finished) runOnJS(finishExit)();
    });
  }, [backdropOpacity, durations.exit, finishExit, reducedMotion, screenHeight, sheetOpacity, translateY]);

  const requestClose = useCallback(() => {
    if (!dismissible || !rendered || dismissedForVisibilityRef.current || closingRef.current) return;
    Keyboard.dismiss();
    animateExit(true);
  }, [animateExit, dismissible, rendered]);

  const dragGesture = useMemo(() => Gesture.Pan()
    .enabled(gestureEnabled && dismissible && rendered)
    .activeOffsetY(motion.gesture.sheet.activationDistance)
    .failOffsetX([
      -motion.gesture.sheet.horizontalTolerance,
      motion.gesture.sheet.horizontalTolerance,
    ])
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (shouldDismissMotionSheet(event.translationY, event.velocityY)) {
        runOnJS(requestClose)();
        return;
      }
      translateY.value = reducedMotion
        ? withTiming(0, { duration: durations.touch })
        : withSpring(0, motion.springs.sheet);
    })
    .onFinalize((_event, success) => {
      if (!success) {
        translateY.value = reducedMotion
          ? withTiming(0, { duration: durations.touch })
          : withSpring(0, motion.springs.sheet);
      }
    })
    .withTestId('motion-sheet-drag'), [dismissible, durations.touch, gestureEnabled, reducedMotion, rendered, requestClose, translateY]);

  useEffect(() => {
    const wasVisible = previousVisibleRef.current;
    previousVisibleRef.current = visible;

    if (visible && !wasVisible) dismissedForVisibilityRef.current = false;

    if (visible) {
      if (dismissedForVisibilityRef.current) return;
      if (!rendered) {
        backdropOpacity.value = 0;
        sheetOpacity.value = reducedMotion ? 0 : 1;
        translateY.value = reducedMotion ? 0 : screenHeight;
        setRendered(true);
        return;
      }
      if (!closingRef.current) animateIn();
      return;
    }

    dismissedForVisibilityRef.current = false;
    if (rendered && !closingRef.current) animateExit(false);
  }, [animateExit, animateIn, backdropOpacity, reducedMotion, rendered, screenHeight, sheetOpacity, translateY, visible]);

  useEffect(() => () => {
    mountedRef.current = false;
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
    cancelAnimation(backdropOpacity);
    cancelAnimation(sheetOpacity);
    cancelAnimation(translateY);
  }, [backdropOpacity, sheetOpacity, translateY]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handleShow = () => {
    const focusTarget = initialFocusRef?.current
      ?? (showCloseButton && dismissible ? closeButtonRef.current : null);
    if (!focusTarget) return;
    focusFrameRef.current = requestAnimationFrame(() => {
      if (Platform.OS === 'web') {
        (focusTarget as unknown as { focus?: () => void }).focus?.();
        return;
      }
      const target = findNodeHandle(focusTarget);
      if (target) AccessibilityInfo.setAccessibilityFocus(target);
    });
  };

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onRequestClose={requestClose}
      onShow={handleShow}
      statusBarTranslucent
    >
      {rendered ? (
        <SafeAreaProvider><GestureHandlerRootView style={styles.gestureRoot}>
          <View
            accessibilityViewIsModal
            importantForAccessibility="yes"
            style={styles.overlay}
          >
          {dismissible ? (
            <AnimatedPressable
              accessibilityLabel={closeAccessibilityLabel}
              accessibilityRole="button"
              onPress={requestClose}
              style={[styles.backdrop, backdropStyle]}
            />
          ) : (
            <Animated.View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[styles.backdrop, backdropStyle]}
            />
          )}
          <KeyboardAvoidingView
            behavior={keyboardAvoiding ? (Platform.OS === 'ios' ? 'padding' : 'height') : undefined}
            pointerEvents="box-none"
            style={styles.keyboardLayer}
          >
            <Animated.View
              accessibilityLabel={accessibilityLabel}
              style={[
                styles.sheetWrap,
                heightPct ? { height: screenHeight * heightPct } : { maxHeight: screenHeight * maxHeightPct },
                sheetStyle,
              ]}
            >
              <SafeAreaView
                edges={['bottom']}
                style={[styles.sheet, heightPct ? styles.fixedSheet : null, contentStyle]}
              >
                {gestureEnabled ? (
                  <GestureDetector gesture={dragGesture}>
                    <Animated.View
                      accessibilityElementsHidden
                      collapsable={false}
                      importantForAccessibility="no"
                      style={[styles.dragArea, !dismissible && styles.dragAreaDisabled]}
                    >
                      <View style={styles.handle} />
                    </Animated.View>
                  </GestureDetector>
                ) : null}
                {showCloseButton ? (
                  <Pressable
                    ref={closeButtonRef}
                    accessibilityLabel={closeAccessibilityLabel}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !dismissible }}
                    disabled={!dismissible}
                    onPress={requestClose}
                    style={[styles.close, !dismissible && styles.closeDisabled]}
                  >
                    <Ionicons name="close" size={20} color={colors.ink} />
                  </Pressable>
                ) : null}
                {children}
              </SafeAreaView>
            </Animated.View>
          </KeyboardAvoidingView>
          </View>
        </GestureHandlerRootView></SafeAreaProvider>
      ) : null}
    </Modal>
  );
}

export function shouldDismissMotionSheet(translationY: number, velocityY: number) {
  'worklet';
  return translationY >= motion.gesture.sheet.dismissDistance
    || velocityY >= motion.gesture.sheet.dismissVelocity;
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.backdrop },
  keyboardLayer: { flex: 1, justifyContent: 'flex-end' },
  sheetWrap: { width: '100%', ...shadows.elevated },
  sheet: {
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fixedSheet: { flex: 1 },
  dragArea: {
    height: sizing.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragAreaDisabled: { opacity: motion.opacity.disabled },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.inkMuted,
  },
  close: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.lg,
    width: sizing.touch,
    height: sizing.touch,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    zIndex: 1,
  },
  closeDisabled: { opacity: motion.opacity.disabled },
});
