# Auditoría visual y funcional de PRODEX Mobile — 2026-09-27

Cambios listos para revisión local. No se hizo commit, merge ni push. Se preservó el trabajo staged/unstaged existente de branding y motion. La certificación nativa y la causa de la venta concreta de prueba02 siguen pendientes; no se presenta esta entrega como validación completa de producción.

## Hallazgos y causas

| Problema | Evidencia y causa | Corrección |
| --- | --- | --- |
| Triángulos | `Tabs` recibía el icono+label dentro de `tabBarLabel`, sin `tabBarIcon`. `expo-router/build/react-navigation/elements/MissingIcon.js` renderiza literalmente `⏷`. Se reprodujo visualmente en web; el código compartido explica iOS. | Se proporciona el renderer real en `tabBarIcon`; el componente conserva su label y motion. Se desactiva únicamente el label adicional del navegador. No se oculta el fallback con opacity, color ni recortes. |
| Barra alta | Base de 66 + inset, más dos espacios de contenido (fallback y componente completo). | Base de 56 + inset a escala de fuente 1; espacio táctil de 48; crecimiento con fontScale. El inset se cuenta una vez. |
| Scanner | Ruta `fullScreenModal` con provider solamente fuera de la jerarquía nativa del modal. SafeAreaView nativo depende de un ancestro nativo, no solamente del árbol React. Es la causa estructural identificada; falta reproducir la corrección en iOS nativo. Además, carga de permisos/guard sin salida y consulta que podía completar tras cerrar. | Provider dentro de la ruta, insets reales para todo el contenido, header en flujo con back 44×44 fuera del guard, fallback a POS sin historial, status bar claro, descartado de resultados tardíos. |
| Dashboard | Cero margen entre actionsGrid y el hero; etiquetas truncadas en 320. | `spacing.xl` (24) entre secciones; `spacing.lg` en el siguiente bloque; dos columnas en ancho efectivo <360 y cuatro en ancho normal. |
| Checkout contradictorio | Tras rechazo se borraba preflight, disparando automáticamente otro. El error de submission persistía mientras reaparecía “Venta validada”. | Rechazo domina la presentación, sin nueva validación automática del mismo intento. Revalidación explícita o cambio de intención; éxito sólo tras respuesta confirmada. |
| Pago exacto | Campo vacío significaba total exacto en el request, pero la UI mostraba 0 y “Falta”. Incluso un cero escrito se reemplazaba por el total. | Se explica el importe automático y se muestra cambio coherente; cero explícito se conserva para validación del servidor. |
| Sheets web | Cerrar carrito generaba `findNodeHandle is not supported on web`. | Foco DOM en web y foco de accesibilidad nativo en iOS/Android. Provider local del modal para el inset inferior. |

## Checkout: alcance comprobado y límite

Tenant indicado por la usuaria: `prueba02`. No había sesión autenticada accesible al agente; no se enviaron ventas a ese tenant ni se modificó Laravel/configuración fiscal.

Trazado del código actual:

1. Checkout carga `/api/mobile/pos/checkout-context`: cliente, métodos/cuentas y contexto operativo.
2. Construye intención con IDs y cantidades; consulta `POST /api/mobile/pos/sale-preflight`. El servidor calcula precios, impuestos y total. La validación local no sustituye esos cálculos.
3. Al confirmar, el controller conserva un UUID v4, persiste el intento y envía `POST /api/mobile/sales` una vez. Payload: `sale_uuid`, `client_id`, `lines[{product_id,product_variant_id,quantity}]`, `payments[{payment_method_id,amount,account_id?}]`. Sin precios, impuestos ni asignaciones operativas impuestas por el cliente.
4. Laravel verifica autorización `Sales_pos`, caja, contexto e idempotencia, vuelve a ejecutar preflight y delega al motor `PosController::CreatePOS`, que crea venta/detalles/pagos/stock y emite fiscal dentro de su transacción.
5. `MobilePosSaleSubmissionService::errorCodeFromCreatePos` sólo distingue stock y pagos por mensaje; muchos otros rechazos terminan como `sale_failed`. El controlador móvil devuelve código, mensaje y `details.pos_response`. El cliente antes reducía todo a una cadena genérica.
6. El móvil ahora reconoce códigos específicos anidados y mensajes fiscales conocidos del adaptador legacy (SAR deshabilitado, autorización ausente/vencida, rango agotado, producto sin clasificación, identificación del cliente). Usa mensajes propios y no muestra excepciones SQL/rutas/tokens. Los fallos desconocidos conservan un mensaje honesto, sin adivinar que son fiscales. El error conserva status HTTP y código original para diagnóstico.

**No se ha identificado la causa exacta del intento real de prueba02.** Hace falta su respuesta HTTP o un registro del backend correlacionado con ese intento. Un HTTP 422 `sale_failed` con mensaje de SAR fue inyectado sólo en QA para verificar la nueva presentación y el mapeo; no prueba que esa configuración esté mal en prueba02. La solicitud original podría haber fallado por otra validación del motor de ventas. Ningún cambio de frontend puede reparar una configuración fiscal desconocida.

Estados efectivos de presentación: idle → validating → ready → submitting → success; rechazo definitivo → error → revalidación explícita; timeout/red/respuesta ambigua → uncertain con carrito bloqueado y reintento con el mismo UUID. Se conservan los importes calculados tras un rechazo. La nueva operación `clearBusinessError` no puede desbloquear una confirmación incierta.

## Auditoría global y motion

Revisados layout raíz, AuthGate, opciones Stack, tabs y sus permisos, PosRegisterGuard, componentes compartidos, tokens, PressableScale/FadeInView/useProdexMotion y sheets. SafeAreaProvider raíz existente se conserva. El header compartido no agrega insets: cada pantalla es responsable de los bordes que ocupa.

Se retiró el inset inferior duplicado del contenido de POS/Inventario/Ventas porque sus tabs ya reservan ese espacio. Se agregó protección inferior en Checkout, Caja (principal/abrir/cerrar), detalle de cliente y Reportes, que son pantallas Stack sin tab bar. No se reescribieron permisos ni contratos API.

Motion continúa con opacity/transform y Reduced Motion. Se preservan botones del navegador, links, selección y gating de tabs. Scanner no depende de una animación para permitir salir; cancelación y bloqueo de escaneos duplicados siguen cubiertos por pruebas. No se añadieron dependencias.

Se consultaron las [docs exactas de Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), la [guía de safe-area-context](https://docs.expo.dev/versions/v57.0.0/sdk/safe-area-context/) (incluye providers en modales) y [Camera](https://docs.expo.dev/versions/v57.0.0/sdk/camera/). Se leyeron las guías locales React Native, Expo Router y Design; se aplicaron sólo recomendaciones compatibles con el diseño y contratos existentes. `ui-ux-pro-max` independiente no estaba instalado; Design contiene sus criterios de ergonomía y jerarquía. Taste no corresponde a este trabajo porque está orientado a extraer el estilo de otra web.

## Verificación visual ejecutada

App ejecutada con Playwright/Chromium en 320×740 y 393×852. Copia aislada en `/private/tmp/prodex-visual-audit-app`; dos adaptadores `.web.ts` de almacenamiento únicamente para QA, ya que SecureStore nativo no funciona en web. APIs interceptadas con fixtures; cámara de Chromium simulada. Esos adaptadores y datos no entraron al repositorio/producto.

Perfiles geométricos adicionales: iPhone simulado (top 59, bottom 34) y Android simulado (top 24, bottom 24), inyectados únicamente en la medición del proveedor web. **No son simuladores nativos ni screenshots de iOS/Android.** Sin Xcode simctl ni adb disponibles.

| Pantalla abierta | Observación |
| --- | --- |
| Login | Campos/CTA legibles a 320, sin desbordamiento. |
| Dashboard | Separación de 24, sin carets; etiquetas completas con dos columnas a 320; métricas y gráfico conservados. |
| POS | Search/scanner/catalog y barra de carrito visibles por encima de tabs. |
| Scanner | Back 44×44, y=71.5 con inset 59; y=36.5 con inset 24. Click vuelve al POS en ambos perfiles/tamaños. Instrucción con fondo navy sobre cámara. |
| Cart | Modal abre y navega a Cobrar, cierre/foco sin error web; CTA por encima del inset inferior. |
| Checkout | Ready informativo, importe exacto coherente; rechazo específico y CTA de revalidación sin mensaje de éxito. Se inspeccionó la zona inferior desplazando el scroll. |
| Caja | Caja abierta, resumen, entrada/salida y cierre legibles. No se ejecutaron movimientos/cierre real. |
| Inventario | Resumen y fila con existencias visibles con fixture válido. También se observó su estado de error. |
| Ventas | Lista con venta pagada y estado vacío revisados. |
| Clientes | Directorio en estado vacío y CTA Nuevo cliente revisados; no se verificó visualmente el editor completo en este trabajo. |
| Reportes | Totales, impuestos, productos, clientes y métodos visibles con fixture; estado de error revisado. |
| Más | Identidad, navegación y cierre de sesión sin colisiones. |

Sin errores de JavaScript en las pasadas finales ni overflow horizontal/documental. Scrolling interno previsto en pantallas largas. También se abrió la confirmación de éxito con fixture: referencia QA-0043 y total L 115.00, después de rechazo y revalidación. Se comprobó el payload con importe autorizado de 115.00 tras corregir automáticamente la estimación inicial de 100.00. La factura no estaba en el fixture y se mostró correctamente el fallback con Reintentar factura. No se registró una venta real ni se revisó visualmente una factura real.

Evidencia clave: [Dashboard antes](screenshots/visual-audit/dashboard-before-393.png) · [después](screenshots/visual-audit/dashboard-after-393.png) · [320 px](screenshots/visual-audit/dashboard-small-ios-insets.png) · [Scanner con insets iPhone](screenshots/visual-audit/scanner-ios-insets.png) · [Scanner con insets Android](screenshots/visual-audit/scanner-android-insets.png) · [Checkout listo](screenshots/visual-audit/checkout-ready-ios-insets.png) · [rechazo](screenshots/visual-audit/checkout-rejected-ios-insets.png).

## Validaciones

- Jest completo, Node 22.23.2: 52 suites, 558 pruebas, todas pasan. Incluye POS, motion, scanner, tabs, API y submission, más tests nuevos que montan el checkout real y su provider.
- TypeScript `--noEmit`: pasa.
- Expo export web y exportación de bundles iOS/Android/web (`--platform all`): pasan. Esto no equivale a compilar/ejecutar un binario nativo.
- `git diff --check`: pasa.
- Expo Doctor con red: 17/18. Pendiente preexistente: Expo 57.0.22 (espera ~57.0.25), constants 57.0.18 (~57.0.19), linking 57.0.10 (~57.0.11), router 57.0.21 (~57.0.23). No se ocultó la advertencia ni se modificaron dependencias. No hay validación global totalmente verde.

Pendiente en dispositivos: medición nativa de insets/notch/Dynamic Island, status bar claro al presentar/salir, linterna/cámara física, lectura real de barcode, teclado iOS/Android, Back de Android, gestos/sheets y orientación/texto ampliado reales. También falta respuesta del intento de prueba02 y smoke test controlado de venta real. La falta de esos entornos limita la certificación; no es evidencia de que estén aprobados.

## Archivos cambiados en esta tarea

La lista compara el working tree al inicio de la auditoría con el actual; no atribuye a esta tarea los cambios previos. Diff aislado disponible en `/private/tmp/prodex-task-only.patch`.

- `app/clients/[id].tsx`
- `app/cash-register/index.tsx`
- `app/cash-register/close.tsx`
- `app/cash-register/open.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/sales.tsx`
- `app/(tabs)/inventory.tsx`
- `app/(tabs)/pos.tsx`
- `app/(tabs)/_layout.tsx`
- `app/pos/checkout.tsx`
- `app/pos/scanner.tsx`
- `app/reports/index.tsx`
- `src/components/QuickAction.tsx`
- `src/services/sales/mobileSaleSubmissionService.ts`
- `src/services/sales/saleSubmissionController.ts`
- `src/components/ui/MotionSheet.tsx`
- `src/components/pos/payment/CashPaymentForm.tsx`
- `src/components/pos/payment/PaymentSummary.tsx`
- `__tests__/bottomSheet.test.ts`
- `__tests__/checkoutStatePresentation.test.ts`
- `__tests__/customerQuickCreatePos.test.ts`
- `__tests__/mobileSaleSubmissionService.test.ts`
- `__tests__/scannerTimerSafety.test.ts`
- `__tests__/motionSheet.test.ts`
- `__tests__/navigationMotion.test.ts`
- `__tests__/saleSubmissionController.test.ts`

Documentación y capturas añadidas:

- `docs/visual-functional-audit.md`
- `docs/screenshots/visual-audit/dashboard-before-393.png`
- `docs/screenshots/visual-audit/dashboard-after-393.png`
- `docs/screenshots/visual-audit/dashboard-small-ios-insets.png`
- `docs/screenshots/visual-audit/scanner-ios-insets.png`
- `docs/screenshots/visual-audit/scanner-small-ios-insets.png`
- `docs/screenshots/visual-audit/scanner-android-insets.png`
- `docs/screenshots/visual-audit/checkout-ready-ios-insets.png`
- `docs/screenshots/visual-audit/checkout-rejected-ios-insets.png`
- `docs/screenshots/visual-audit/cart-ios-insets.png`
- `docs/screenshots/visual-audit/inventory-ios-insets.png`
- `docs/screenshots/visual-audit/reports-ios-insets.png`
- `docs/screenshots/visual-audit/login-small.png`

- `docs/screenshots/visual-audit/checkout-success-fixture.png`

[Confirmación de éxito con fixture](screenshots/visual-audit/checkout-success-fixture.png).

## Git al finalizar

La salida incluye cambios anteriores a esta tarea. `git diff --stat` no incluye archivos untracked ni el diff staged; la lista de arriba sí identifica nuestro alcance. El índice existente no fue modificado.

```text
$ git status --short --branch
## feat/navy-cyan-stable...origin/main
 M __tests__/bottomSheet.test.ts
 M __tests__/cashRegisterGuardFocus.test.ts
MM __tests__/cashRegisterScreen.test.ts
 M __tests__/customerQuickCreatePos.test.ts
 M __tests__/mobileSaleSubmissionService.test.ts
 M __tests__/saleSubmissionController.test.ts
MM app.json
MM app/(tabs)/_layout.tsx
MM app/(tabs)/index.tsx
MM app/(tabs)/inventory.tsx
M  app/(tabs)/more.tsx
MM app/(tabs)/pos.tsx
MM app/(tabs)/sales.tsx
 M app/_layout.tsx
MM app/cash-register/close.tsx
MM app/cash-register/index.tsx
MM app/cash-register/open.tsx
MM app/clients/[id].tsx
M  app/clients/index.tsx
M  app/login.tsx
MM app/pos/checkout.tsx
MM app/pos/scanner.tsx
MM app/reports/index.tsx
M  assets/icon.png
A  assets/prodex-logo.png
A  assets/prodex-symbol.png
A  docs/brand-palette-audit.md
A  docs/screenshots/prodex-login-320.png
A  docs/screenshots/prodex-login.png
 M eas.json
 M jest.setup.js
 M logo-prodex.png
 M package-lock.json
 M package.json
MM src/components/QuickAction.tsx
M  src/components/auth/AuthLoading.tsx
MM src/components/cashRegister/CashMovementModal.tsx
M  src/components/clients/ClientRow.tsx
M  src/components/clients/CustomerEditor.tsx
 M src/components/motion/FadeInView.tsx
 M src/components/motion/PressableScale.tsx
 M src/components/motion/index.ts
 M src/components/pos/CartItemRow.tsx
MM src/components/pos/CartSheet.tsx
MM src/components/pos/CartSummaryBar.tsx
MM src/components/pos/CategoryChip.tsx
M  src/components/pos/PosSearchBar.tsx
MM src/components/pos/ProductCard.tsx
MM src/components/pos/payment/CashPaymentForm.tsx
M  src/components/pos/payment/PaymentMethodCard.tsx
MM src/components/pos/payment/PaymentSummary.tsx
MM src/components/pos/payment/SaleConfirmation.tsx
M  src/components/ui/AppHeader.tsx
MM src/components/ui/BottomSheet.tsx
M  src/components/ui/BrandSignature.tsx
 M src/components/ui/ConnectivityBanner.tsx
M  src/components/ui/EmptyState.tsx
M  src/components/ui/SearchField.tsx
M  src/components/ui/StatHeroCard.tsx
M  src/components/ui/StatusBadge.tsx
 M src/context/PosCartContext.tsx
 M src/services/sales/mobileSaleSubmissionService.ts
 M src/services/sales/saleSubmissionController.ts
MM src/theme/index.ts
?? __tests__/cartSheet.test.ts
?? __tests__/cashMovementModal.test.ts
?? __tests__/checkoutStatePresentation.test.ts
?? __tests__/motionFoundation.test.ts
?? __tests__/motionSheet.test.ts
?? __tests__/navigationMotion.test.ts
?? __tests__/posInteractionStress.test.ts
?? __tests__/posMotion.test.ts
?? __tests__/scannerTimerSafety.test.ts
?? docs/screenshots/visual-audit/
?? docs/visual-functional-audit.md
?? src/components/motion/ExactValueFeedback.tsx
?? src/components/motion/easing.ts
?? src/components/motion/useProdexMotion.ts
?? src/components/navigation/
?? src/components/ui/MotionSheet.tsx
?? src/navigation/

$ git diff --stat
 __tests__/bottomSheet.test.ts                     |  67 ++++++++--
 __tests__/cashRegisterGuardFocus.test.ts          |   5 +
 __tests__/cashRegisterScreen.test.ts              |   5 +
 __tests__/customerQuickCreatePos.test.ts          |   6 +-
 __tests__/mobileSaleSubmissionService.test.ts     |  27 ++++
 __tests__/saleSubmissionController.test.ts        |  15 +++
 app.json                                          |  14 +-
 app/(tabs)/_layout.tsx                            |  65 +++------
 app/(tabs)/index.tsx                              |  17 ++-
 app/(tabs)/inventory.tsx                          |   5 +-
 app/(tabs)/pos.tsx                                |  38 +++---
 app/(tabs)/sales.tsx                              |   5 +-
 app/_layout.tsx                                   |   9 +-
 app/cash-register/close.tsx                       |   4 +-
 app/cash-register/index.tsx                       |   2 +-
 app/cash-register/open.tsx                        |   2 +-
 app/clients/[id].tsx                              |   3 +-
 app/pos/checkout.tsx                              |  59 +++++---
 app/pos/scanner.tsx                               | 156 +++++++++++++++++-----
 app/reports/index.tsx                             |   2 +-
 eas.json                                          |   9 +-
 jest.setup.js                                     |  44 ++++++
 logo-prodex.png                                   | Bin 1687859 -> 548414 bytes
 package-lock.json                                 | 127 +++++++++++++++++-
 package.json                                      |   2 +
 src/components/QuickAction.tsx                    |   6 +-
 src/components/cashRegister/CashMovementModal.tsx |  44 +++---
 src/components/motion/FadeInView.tsx              |  42 ++++--
 src/components/motion/PressableScale.tsx          |  27 ++--
 src/components/motion/index.ts                    |   2 +
 src/components/pos/CartItemRow.tsx                |  27 ++--
 src/components/pos/CartSheet.tsx                  |  52 ++++----
 src/components/pos/CartSummaryBar.tsx             |  17 +--
 src/components/pos/CategoryChip.tsx               |  38 +++++-
 src/components/pos/ProductCard.tsx                |  32 ++++-
 src/components/pos/payment/CashPaymentForm.tsx    |   7 +-
 src/components/pos/payment/PaymentSummary.tsx     |   2 +-
 src/components/pos/payment/SaleConfirmation.tsx   |   2 +-
 src/components/ui/BottomSheet.tsx                 |  77 +++++------
 src/components/ui/ConnectivityBanner.tsx          |  14 +-
 src/context/PosCartContext.tsx                    |  32 +++--
 src/services/sales/mobileSaleSubmissionService.ts |  38 +++++-
 src/services/sales/saleSubmissionController.ts    |   8 ++
 src/theme/index.ts                                |  74 +++++++++-
 44 files changed, 897 insertions(+), 332 deletions(-)
```
