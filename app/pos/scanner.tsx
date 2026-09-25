import { PosRegisterGuard } from '../../src/components/pos/PosRegisterGuard';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeType } from 'expo-camera';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView, PressableScale } from '../../src/components/motion';
import { Button } from '../../src/components/ui/Button';
import { usePosCart } from '../../src/context/PosCartContext';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontWeights, radii, spacing, typography } from '../../src/theme';
import { resolveScannedProduct } from '../../src/services/pos/productBarcodeService';

const barcodeTypes: BarcodeType[] = ['code128', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code39'];

function ScannerScreenContent() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; detail?: string; tone: 'info' | 'success' | 'error' } | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const scanLock = useRef(false);
  const { items, addProduct } = usePosCart();
  const { session, inventoryLocationId, signOut } = useAuth();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  const processBarcode = async (rawValue: string, rawType: string) => {
    if (scanLock.current) return;
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

    if (result.status === 'found') {
      addProduct(result.product, result.quantity ?? 1);
      setFeedback({ title: `${result.product.name}${result.product.variantName ? ` · ${result.product.variantName}` : ''} agregado`, tone: 'success' });
      setTimeout(() => router.back(), 450);
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

  if (!permission) return <View style={styles.loading}><Text style={styles.loadingText}>Preparando cámara...</Text></View>;

  if (!permission.granted) {
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}><FadeInView style={styles.center}><Text style={styles.title}>Acceso a la cámara</Text><Text style={styles.description}>PRODEX necesita acceso a la cámara para escanear códigos de barras de productos.</Text><Button label="Reintentar permiso" accessibilityLabel="Permitir acceso a la cámara" onPress={requestPermission} style={styles.primaryButton} />{!permission.canAskAgain && <Button label="Abrir configuración" accessibilityLabel="Abrir configuración de cámara" variant="secondary" onPress={() => Linking.openSettings()} style={styles.secondaryButton} />}<PressableScale accessibilityLabel="Volver al POS" accessibilityRole="button" onPress={() => router.back()} style={styles.closeText}><Text style={styles.closeTextLabel}>Volver al POS</Text></PressableScale></FadeInView></SafeAreaView>;
  }

  return <View style={styles.cameraScreen}><CameraView facing="back" enableTorch={torchEnabled} onMountError={() => setCameraError(true)} onBarcodeScanned={isProcessingScan ? undefined : ({ data, type }) => { void processBarcode(data, type); }} barcodeScannerSettings={{ barcodeTypes }} style={StyleSheet.absoluteFill} /><SafeAreaView style={styles.overlay} edges={['top', 'bottom']}><View style={styles.topBar}><PressableScale accessibilityLabel="Cerrar escáner" accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={21} color={colors.ink} /></PressableScale><View><Text style={styles.cameraTitle}>Escanear producto</Text><Text style={styles.location}>Apunta al código del producto</Text></View><View style={styles.topSpacer} /></View><View style={styles.scannerArea}><View style={styles.frame}><View style={[styles.corner, styles.cornerTopLeft]} /><View style={[styles.corner, styles.cornerTopRight]} /><View style={[styles.corner, styles.cornerBottomLeft]} /><View style={[styles.corner, styles.cornerBottomRight]} /></View><Text style={styles.instruction}>Coloca el código de barras dentro del marco</Text></View><View style={styles.bottomControls}>{cameraError && <FadeInView><Text style={styles.cameraError}>La cámara no está disponible.</Text></FadeInView>}{feedback && <FadeInView style={[styles.feedback, feedback.tone === 'error' && styles.feedbackError, feedback.tone === 'success' && styles.feedbackSuccess]}><View style={styles.feedbackHeader}>{feedback.tone === 'success' ? <Ionicons name="checkmark-circle" size={18} color={colors.green} /> : feedback.tone === 'error' ? <Ionicons name="alert-circle-outline" size={18} color={colors.red} /> : null}<Text style={styles.feedbackTitle}>{feedback.title}</Text></View>{feedback.detail && <Text style={styles.feedbackDetail}>{feedback.detail}</Text>}{feedback.tone === 'error' && <PressableScale accessibilityLabel="Escanear nuevamente" accessibilityRole="button" onPress={retryScan} style={styles.retry}><Text style={styles.retryText}>Escanear nuevamente</Text></PressableScale>}</FadeInView>}<PressableScale accessibilityLabel={torchEnabled ? 'Apagar linterna' : 'Encender linterna'} accessibilityRole="button" onPress={() => setTorchEnabled((current) => !current)} style={styles.torch}><Text style={styles.torchText}>{torchEnabled ? 'Apagar linterna' : 'Linterna'}</Text></PressableScale></View></SafeAreaView></View>;
}

const styles = StyleSheet.create({
  cameraScreen: { flex: 1, backgroundColor: colors.brandDark },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: 'rgba(10, 30, 54, 0.62)' },
  iconButton: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.9)' },
  cameraTitle: { color: colors.white, fontSize: typography.title, fontWeight: fontWeights.bold },
  location: { marginTop: spacing.xs, color: 'rgba(255,255,255,0.78)', fontSize: 11 },
  topSpacer: { width: 44 },
  scannerArea: { alignItems: 'center', justifyContent: 'center' },
  frame: { width: '80%', maxWidth: 340, height: 190, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.04)' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: colors.white },
  cornerTopLeft: { borderTopLeftRadius: 18, top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTopRight: { borderTopRightRadius: 18, top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBottomLeft: { borderBottomLeftRadius: 18, bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBottomRight: { borderBottomRightRadius: 18, bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  instruction: { marginTop: spacing.lg, paddingHorizontal: spacing.lg, color: colors.white, fontSize: 13, fontWeight: fontWeights.semibold, textAlign: 'center' },
  bottomControls: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  torch: { minHeight: 52, paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  torchText: { color: colors.ink, fontSize: 12, fontWeight: fontWeights.bold },
  feedback: { width: '100%', marginBottom: spacing.md, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.brandSoft },
  feedbackError: { backgroundColor: colors.redSoft },
  feedbackSuccess: { backgroundColor: colors.greenSoft },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  feedbackTitle: { color: colors.ink, fontSize: 14, fontWeight: fontWeights.bold, textAlign: 'center' },
  feedbackDetail: { marginTop: spacing.xs, color: colors.inkMuted, fontSize: 12, textAlign: 'center' },
  retry: { minHeight: 44, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.brandDark, fontSize: 12, fontWeight: fontWeights.bold },
  cameraError: { marginBottom: spacing.sm, color: colors.white, fontSize: 12, fontWeight: fontWeights.bold },
  safe: { flex: 1, backgroundColor: colors.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  title: { color: colors.ink, fontSize: typography.title, fontWeight: fontWeights.bold, textAlign: 'center' },
  description: { marginTop: spacing.md, color: colors.inkMuted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  primaryButton: { marginTop: spacing.xl },
  secondaryButton: { marginTop: spacing.sm },
  closeText: { minHeight: 44, marginTop: spacing.md, alignItems: 'center', justifyContent: 'center' },
  closeTextLabel: { color: colors.inkMuted, fontSize: 13, fontWeight: fontWeights.bold },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  loadingText: { color: colors.inkMuted, fontSize: 13 },
});

export default function ScannerScreen() {
  return <PosRegisterGuard><ScannerScreenContent /></PosRegisterGuard>;
}
