import { PosRegisterGuard } from '../../src/components/pos/PosRegisterGuard';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeType } from 'expo-camera';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInView, PressableScale, useProdexMotion } from '../../src/components/motion';
import { prodexEasing } from '../../src/components/motion/easing';
import { Button } from '../../src/components/ui/Button';
import { usePosCart } from '../../src/context/PosCartContext';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontWeights, radii, spacing, typography } from '../../src/theme';
import { resolveScannedProduct } from '../../src/services/pos/productBarcodeService';

const barcodeTypes: BarcodeType[] = ['code128', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code39'];
const SUCCESS_RETURN_DELAY_MS = 450;

function ScannerScreenContent() {
  const insets = useSafeAreaInsets();
  const active = useRef(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; detail?: string; tone: 'info' | 'success' | 'error' } | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const scanLock = useRef(false);
  const navigationTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNavigatedBack = useRef(false);
  const { reducedMotion, durations } = useProdexMotion();
  const frameEmphasis = useSharedValue(1);
  const frameTone = useSharedValue(0);
  const { items, addProduct } = usePosCart();
  const { session, inventoryLocationId, signOut, hasPermission } = useAuth();

  useEffect(() => {
    if (hasPermission?.('Pos_view') && permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [hasPermission, permission, requestPermission]);

  const navigateBackOnce = useCallback(() => {
    if (hasNavigatedBack.current) return;
    hasNavigatedBack.current = true;
    if (navigationTimeout.current) {
      clearTimeout(navigationTimeout.current);
      navigationTimeout.current = null;
    }
    active.current = false;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/pos');
  }, []);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      if (navigationTimeout.current) clearTimeout(navigationTimeout.current);
      navigationTimeout.current = null;
      cancelAnimation(frameEmphasis);
    };
  }, []);

  useEffect(() => {
    frameTone.value = feedback?.tone === 'success' ? 1 : feedback?.tone === 'error' ? 2 : 0;
    cancelAnimation(frameEmphasis);
    frameEmphasis.value = 0;
    frameEmphasis.value = withTiming(1, { duration: durations.touch, easing: prodexEasing.emphasis });
  }, [durations.touch, feedback?.tone, frameEmphasis, frameTone]);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: 0.72 + (0.28 * frameEmphasis.value),
    transform: [{ scale: reducedMotion ? 1 : 0.985 + (0.015 * frameEmphasis.value) }],
  }));
  const cornerStyle = useAnimatedStyle(() => ({
    borderColor: frameTone.value === 1 ? colors.green : frameTone.value === 2 ? colors.red : colors.accent,
  }));

  const processBarcode = async (rawValue: string, rawType: string) => {
    if (scanLock.current || !active.current) return;
    scanLock.current = true;
    setIsProcessingScan(true);
    setFeedback({ title: 'Buscando producto...', tone: 'info' });

    if (!session?.baseUrl || !session.accessToken) {
      setFeedback({ title: 'Tu sesión necesita actualizarse.', tone: 'error' });
      return;
    }

    if (inventoryLocationId === null || inventoryLocationId === undefined || inventoryLocationId === '') {
      setFeedback({ title: 'No se pudo determinar la ubicación de venta.', tone: 'error' });
      return;
    }

    const result = await resolveScannedProduct({
      code: rawValue,
      symbology: rawType,
      tenantBaseUrl: session.baseUrl,
      accessToken: session.accessToken,
      inventoryLocationId,
      cartItems: items,
    });

    // Closing the modal also cancels any pending lookup's UI/cart effects.
    if (!active.current) return;

    if (result.status === 'found') {
      addProduct(result.product, result.quantity ?? 1);
      setFeedback({ title: `${result.product.name}${result.product.variantName ? ` · ${result.product.variantName}` : ''} agregado`, tone: 'success' });
      navigationTimeout.current = setTimeout(navigateBackOnce, SUCCESS_RETURN_DELAY_MS);
      return;
    }

    if (result.status === 'out_of_stock') {
      setFeedback({ title: 'Producto sin stock', detail: result.product.name, tone: 'error' });
    } else if (result.status === 'stock_limit_reached') {
      setFeedback({ title: 'Stock máximo alcanzado', detail: result.product.name, tone: 'error' });
    } else if (result.status === 'ambiguous_code') {
      setFeedback({ title: 'No se pudo identificar el producto de forma única.', tone: 'error' });
    } else if (result.status === 'invalid_location') {
      setFeedback({ title: 'No tienes acceso a esta ubicación de inventario.', tone: 'error' });
    } else if (result.status === 'session_expired') {
      setFeedback({ title: 'Tu sesión expiró. Inicia sesión nuevamente.', tone: 'error' });
      await signOut();
    } else if (result.status === 'network_error' || result.status === 'timeout') {
      setFeedback({ title: 'No pudimos consultar el producto. Revisa tu conexión.', tone: 'error' });
    } else if (result.status === 'not_sellable') {
      setFeedback({ title: result.reason || 'Este producto no puede venderse.', detail: result.product?.name, tone: 'error' });
    } else if (result.status === 'invalid_product_response') {
      setFeedback({ title: 'No pudimos leer la respuesta del producto.', tone: 'error' });
    } else {
      setFeedback({ title: 'Producto no encontrado', detail: `Código: ${result.barcode}`, tone: 'error' });
    }
  };

  const retryScan = () => {
    scanLock.current = false;
    setIsProcessingScan(false);
    setFeedback(null);
  };

  return (
    <View style={styles.cameraScreen}>
      <StatusBar style="light" />
      <View testID="scanner-safe-content" style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
        <View style={styles.topBar}>
          <PressableScale accessibilityLabel="Cerrar escáner" accessibilityRole="button" onPress={navigateBackOnce} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={21} color={colors.ink} />
          </PressableScale>
          <View style={styles.headerCopy}><Text style={styles.cameraTitle}>Escanear</Text><Text style={styles.location}>Apunta al código del producto</Text></View>
        </View>
        <PosRegisterGuard>
        {!permission ? (
          <View style={styles.center}><ActivityIndicator color={colors.accent} /><Text style={styles.loadingText}>Preparando cámara...</Text></View>
        ) : !permission.granted ? (
          <ScrollView contentContainerStyle={styles.permissionContent}>
            <Text style={styles.title}>Acceso a la cámara</Text>
            <Text style={styles.description}>PRODEX necesita acceso a la cámara para escanear códigos de barras de productos.</Text>
            {permission.canAskAgain ? <Button label="Permitir cámara" onPress={requestPermission} style={styles.primaryButton} /> : <Button label="Abrir configuración" onPress={() => Linking.openSettings()} style={styles.primaryButton} />}
            <Button label="Volver al POS" variant="secondary" onPress={navigateBackOnce} style={styles.secondaryButton} />
          </ScrollView>
        ) : (
          <View style={styles.viewport}>
            <CameraView facing="back" enableTorch={torchEnabled && !cameraError} onCameraReady={() => setCameraReady(true)} onMountError={() => { setCameraError(true); setTorchEnabled(false); }} onBarcodeScanned={isProcessingScan || cameraError ? undefined : ({ data, type }) => { void processBarcode(data, type); }} barcodeScannerSettings={{ barcodeTypes }} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={styles.cameraContent} bounces={false}>
              <View style={styles.scannerArea} pointerEvents="none">
                <Animated.View testID="scanner-target" style={[styles.frame, frameStyle]}>
                  <Animated.View style={[styles.corner, styles.cornerTopLeft, cornerStyle]} /><Animated.View style={[styles.corner, styles.cornerTopRight, cornerStyle]} /><Animated.View style={[styles.corner, styles.cornerBottomLeft, cornerStyle]} /><Animated.View style={[styles.corner, styles.cornerBottomRight, cornerStyle]} />
                </Animated.View>
                <View style={styles.instructionBadge}><Text style={styles.instruction}>Coloca el código de barras dentro del marco</Text></View>
              </View>
              <View style={styles.bottomControls}>
                {!cameraReady && !cameraError && <Text style={styles.loadingText}>Iniciando cámara...</Text>}
                {cameraError && <FadeInView style={styles.feedback}><Text accessibilityRole="alert" style={styles.feedbackTitle}>La cámara no está disponible. Vuelve al POS e intenta abrir el escáner nuevamente.</Text></FadeInView>}
                {feedback && <FadeInView accessibilityLiveRegion={feedback.tone === 'success' ? 'polite' : 'none'} accessibilityRole={feedback.tone === 'error' ? 'alert' : undefined} style={[styles.feedback, feedback.tone === 'error' && styles.feedbackError, feedback.tone === 'success' && styles.feedbackSuccess]}>
                  <View style={styles.feedbackHeader}>{feedback.tone === 'success' ? <Ionicons name="checkmark-circle" size={18} color={colors.green} /> : feedback.tone === 'error' ? <Ionicons name="alert-circle-outline" size={18} color={colors.red} /> : <ActivityIndicator size="small" color={colors.brand} />}<Text style={styles.feedbackTitle}>{feedback.title}</Text></View>
                  {feedback.detail && <Text style={styles.feedbackDetail}>{feedback.detail}</Text>}
                  {feedback.tone === 'error' && <PressableScale accessibilityLabel="Escanear nuevamente" accessibilityRole="button" onPress={retryScan} style={styles.retry}><Text style={styles.retryText}>Escanear nuevamente</Text></PressableScale>}
                </FadeInView>}
                <PressableScale accessibilityLabel={torchEnabled ? 'Apagar linterna' : 'Encender linterna'} accessibilityRole="button" accessibilityState={{ disabled: cameraError || !cameraReady, selected: torchEnabled }} disabled={cameraError || !cameraReady} onPress={() => setTorchEnabled((current) => !current)} style={styles.torch}><Ionicons name={torchEnabled ? 'flash' : 'flash-outline'} size={18} color={colors.ink} /><Text style={styles.torchText}>{torchEnabled ? 'Apagar linterna' : 'Linterna'}</Text></PressableScale>
              </View>
            </ScrollView>
          </View>
        )}
        </PosRegisterGuard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraScreen: { flex: 1, backgroundColor: colors.brandDark },
  overlay: { flex: 1 },
  viewport: { flex: 1, minHeight: 0 },
  cameraContent: { flexGrow: 1 },
  headerCopy: { flex: 1, minWidth: 0 },
  permissionContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.navyDark },
  iconButton: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  cameraTitle: { color: colors.white, fontSize: typography.title, fontWeight: fontWeights.bold },
  location: { marginTop: spacing.xs, color: colors.inkOnDark, fontSize: 11 },
  scannerArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  frame: { width: '80%', maxWidth: 340, height: 190, borderRadius: radii.md, backgroundColor: 'transparent' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: colors.accent },
  cornerTopLeft: { borderTopLeftRadius: 18, top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTopRight: { borderTopRightRadius: 18, top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBottomLeft: { borderBottomLeftRadius: 18, bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBottomRight: { borderBottomRightRadius: 18, bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  instructionBadge: { marginTop: spacing.lg, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radii.sm, backgroundColor: colors.navyDark },
  instruction: { color: colors.white, fontSize: 13, fontWeight: fontWeights.semibold, textAlign: 'center' },
  bottomControls: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  torch: { flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  torchText: { color: colors.ink, fontSize: 12, fontWeight: fontWeights.bold },
  feedback: { width: '100%', marginBottom: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.brandSoft },
  feedbackError: { backgroundColor: colors.redSoft },
  feedbackSuccess: { backgroundColor: colors.greenSoft },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  feedbackTitle: { flexShrink: 1, color: colors.ink, fontSize: 14, fontWeight: fontWeights.bold, textAlign: 'center' },
  feedbackDetail: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 12, textAlign: 'center' },
  retry: { minHeight: 44, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.brandDark, fontSize: 12, fontWeight: fontWeights.bold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  title: { color: colors.white, fontSize: typography.title, fontWeight: fontWeights.bold, textAlign: 'center' },
  description: { marginTop: spacing.md, color: colors.inkOnDark, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  primaryButton: { marginTop: spacing.xl },
  secondaryButton: { marginTop: spacing.sm },
  loadingText: { color: colors.inkOnDark, fontSize: 13, marginVertical: spacing.md },
});

export default function ScannerScreen() {
  // Native fullScreenModal content needs a provider in its own view hierarchy.
  return <SafeAreaProvider><ScannerScreenContent /></SafeAreaProvider>;
}
