@AGENTS.md
# PRODEX Mobile — Project Instructions

## 1. PROJECT OVERVIEW

PRODEX Mobile is the official mobile application for PRODEX.

PRODEX is a multitenant SaaS ERP/POS platform focused on businesses in
Honduras and Central America, with a long-term regional scope.

This repository contains ONLY the mobile application.

Repository:
awkward-3312/prodex-mobile

Local path:
~/Documents/GitHub/prodex-mobile

Main branch:
main

Backend repository:
awkward-3312/Prodex1

Backend local path:
~/Documents/GitHub/Prodex1

Production:
https://prodexhub.cloud

Test tenant:
https://prueba02.prodexhub.cloud

IMPORTANT:
The mobile application must NEVER connect directly to MySQL or any database.

All mobile access must go through Laravel HTTPS APIs.

Laravel owns:

- authentication
- tenancy
- permissions
- POS business rules
- pricing
- taxes
- fiscal logic
- inventory
- stock
- clients
- sales
- payments
- operational context

The mobile app is a client of those APIs.

---

# 2. STACK

Mobile stack:

- React Native
- Expo SDK 57
- Expo Router
- TypeScript
- React 19
- React Native 0.86
- Jest + jest-expo
- Expo SecureStore
- Expo Camera
- React Native Reanimated
- React Native Worklets

Current important dependency versions:

- expo: ~57.0.22
- expo-camera: ~57.0.5
- expo-constants: current package.json version
- expo-font: current package.json version
- expo-linking: ~57.0.10
- expo-router: ~57.0.21
- expo-secure-store: ~57.0.4
- react-native-reanimated: 4.5.1
- react-native-worklets: 0.10.1

Node:
Node 22 is used locally.

Do NOT downgrade Node.

Entry point: package.json "main" is "expo-router/entry". There is no
App.tsx / index.ts in this repo — expo-router owns the entry point via
app/_layout.tsx. Do not recreate the default Expo template's App.tsx;
it would be dead code that nothing loads.

---

# 3. EXPO / JEST IMPORTANT CONFIGURATION

Expo SDK 57 currently installs expo-modules-core nested below Expo.

Jest requires this configuration in jest.config.js:

preset: 'jest-expo'

and:

moduleDirectories: [
  'node_modules',
  '<rootDir>/node_modules/expo/node_modules',
]

This is intentional.

Do NOT remove it unless the dependency tree changes and tests prove it is
no longer necessary.

Do NOT install expo-modules-core directly just to solve Jest resolution.

---

# 4. REQUIRED VALIDATION

Before finishing any meaningful change run:

npm test -- --runInBand
npx tsc --noEmit
npx expo-doctor
npx expo export --platform web
git diff --check

Expected current baseline (verify with the commands above; this repo has
grown well past its early phases, so re-check rather than trusting old
numbers):

- 38 test suites
- ~450 tests
- TypeScript passing
- expo-doctor 21/21 (2 of the 21 checks require outbound network to Expo's
  registry/schema services; they cannot be verified in a network-restricted
  sandbox and are not a sign of a real problem there)
- web export passing

Do not claim a task is finished if relevant validation fails.

---

# 5. GIT RULES

Before making changes:

git status --short
git branch --show-current
git log -5 --oneline

Always inspect current local modifications before editing.

NEVER overwrite or discard existing user work.

Do NOT use:

git reset --hard
git clean -fd

unless explicitly authorized.

Do NOT commit automatically unless explicitly requested.

Do NOT push automatically unless explicitly requested.

When asked to commit:

- inspect diff
- validate
- commit only intended files
- report SHA
- report files
- report tests
- report push status

Main branch:
main

Do not trust hardcoded commit SHAs in this file as "current" — they age
immediately. Always run `git log -5 --oneline` to see what is actually
recent before assuming the state of the repo.

---

# 6. UX / MOTION SYSTEM — IMPLEMENTED AND STABLE

The UX/motion phase described in earlier versions of this document has been
completed and committed. It is no longer "uncommitted work to preserve" —
treat it as stable, shipped functionality like any other module.

Motion touches (non-exhaustive, still grows as new screens are added):

- app/(tabs)/_layout.tsx, app/(tabs)/more.tsx, app/(tabs)/pos.tsx
- app/login.tsx, app/pos/checkout.tsx, app/pos/scanner.tsx
- app/cash-register/*, app/clients/*, app/reports/*, app/sales/*
- src/components/pos/*, src/components/pos/payment/*
- src/components/ui/*

Reusable motion components:

- src/components/motion/FadeInView.tsx
- src/components/motion/PressableScale.tsx
- src/components/motion/index.ts

Motion system includes:

- subtle press scale around 0.98
- small opacity/translateY entrances
- Reduced Motion support
- transitions for cart bar
- checkout/preflight state transitions
- modal/sheet transitions
- empty/error state transitions

Do NOT redesign the application from scratch.

The current visual direction has already been approved.

As always: run `git status --short` before editing anything, since there
may be new, unrelated uncommitted work in progress that this document does
not know about yet.

---

# 7. DESIGN DIRECTION

PRODEX Mobile visual identity:

- modern
- clean
- professional
- SaaS / ERP
- enterprise
- friendly
- light interface
- no dark mode currently
- no emojis
- icons preferred
- subtle shadows
- clear spacing
- strong usability

Brand accent colors include:

- PRODEX green
- blue
- teal
- amber
- coral

Avoid:

- childish visuals
- excessive gradients
- excessive animation
- bouncing
- decorative motion everywhere
- oversized cards
- excessive whitespace
- unnecessarily dense screens

Motion should be:

- subtle
- fast
- functional
- consistent
- non-blocking

The application is intended to be used frequently by retail/business staff.

Speed matters more than decorative animation.

---

# 8. ACCESSIBILITY / UX

Maintain:

- touch targets around 44x44 where appropriate
- accessibilityLabel
- accessibilityRole
- disabled states
- Reduced Motion preference
- safe areas
- readable contrast
- clear error messaging

Primary actions should be easy to reach with one hand when practical.

Errors should explain what happened and what the user can do next.

Do not rely only on color to communicate status.

---

# 9. CURRENT NAVIGATION

Main tabs (Inventario is gated by the `Pos_view` permission, Ventas by
`Sales_view` — hidden from the tab bar and blocked in-screen when the user
lacks them; see §23/§24):

- Inicio
- POS
- Inventario
- Ventas
- Más

Other important screens:

- Login
- POS Scanner
- POS Checkout
- Client selector / clients list / client detail / client create-edit
  (app/clients/*)
- Cash register open / close / history (app/cash-register/*)
- Sales history + sale receipt (app/(tabs)/sales.tsx, app/sales/[id].tsx)
- Reports (app/reports/index.tsx)
- Cart sheet

---

# 10. AUTHENTICATION

Authentication is already implemented.

Central endpoint:

POST /api/mobile/tenants/resolve

Tenant endpoints:

POST /api/mobile/auth/login
GET /api/mobile/auth/bootstrap
POST /api/mobile/auth/logout

Mobile auth uses:

- Expo SecureStore
- bearer token
- AuthProvider
- session restoration
- global 401 handling
- tenant base URL

Backend login expects:

email

NOT:

login

Never print or expose full bearer tokens.

Never ask the user to paste access tokens into chat.

---

# 11. OPERATIONAL CONTEXT

Bootstrap provides operational POS context.

Important concepts:

- branch
- inventory_location
- cash_drawer
- warehouse legacy compatibility

Modern POS context must prefer:

branch_id
inventory_location_id
cash_drawer_id

Do not introduce fake locations.

POS header should use real bootstrap operational context.

---

# 12. POS UI — COMPLETED

POS UI already exists.

Important components include:

- PosHeader
- PosSearchBar
- CategoryChip
- ProductCard
- CartSummaryBar
- CartSheet
- CartItemRow

Features:

- search
- category filtering
- product cards
- cart
- quantity changes
- remove
- cart sheet
- real tenant catalog
- scanner integration
- real stock
- variants
- product images

Do not reintroduce mock runtime products.

---

# 13. POS CATALOG API

Real mobile catalog endpoint:

GET /api/mobile/pos/catalog

Supported query parameters include:

inventory_location_id
search
category_id
page
per_page

Catalog data includes:

- products
- variants
- prices
- images
- stock
- sellability
- categories
- pagination

Modern stock source in backend:

inventory_location_stocks

---

# 14. BARCODE SCANNER

Scanner is implemented with Expo Camera.

Supported formats include:

- code128
- code39
- ean8
- ean13
- upc_a
- upc_e

Real product resolver endpoint:

GET /api/mobile/products/resolve

Resolution backend logic supports:

- product code
- variant code
- GTIN
- weighted barcode fallback

Variant cart identity must include:

product_id
product_variant_id

Do not collapse variants into the parent product.

Weighted products may have decimal quantity.

---

# 15. PRODUCT / BARCODE DOMAIN

Important backend semantics:

products.code:
operational SKU / scan code

product_variants.code:
variant operational scan code

product / variant gtin:
standard external identifier

Type_barcode:
label rendering symbology only

It is NOT the identity of a product.

---

# 16. CHECKOUT — CURRENT STATUS

Mobile checkout is LIVE. Phase 4C-2 (real sale submission) has already been
implemented and is in production code — see §30 for its actual contract,
which now documents what IS implemented rather than what to avoid.

Endpoints integrated:

GET /api/mobile/pos/checkout-context
GET /api/mobile/pos/clients
POST /api/mobile/pos/sale-preflight
POST /api/mobile/sales

Key files:

- src/services/sales/mobileSaleSubmissionService.ts (request/response
  contract, sale_uuid validation)
- src/services/sales/saleSubmissionController.ts (submission state machine)
- src/services/sales/saleAttemptStorage.ts (idempotent retry persistence)
- app/pos/checkout.tsx

Current checkout supports:

- backend customer
- customer search
- backend payment methods
- mixed payment representation
- cash
- accounts when applicable
- server-authoritative totals
- preflight
- stock validation
- operational context validation

---

# 17. CHECKOUT INTENT CONTRACT

Preflight receives intent only.

Example:

{
  "client_id": 1,
  "lines": [
    {
      "product_id": 10,
      "product_variant_id": null,
      "quantity": "1.000"
    }
  ],
  "payment_intent": [
    {
      "payment_method_id": 2,
      "amount": "150.00",
      "account_id": null
    }
  ]
}

Never send client-calculated:

- tax
- price
- subtotal
- grand total
- stock
- branch
- inventory location
- cash drawer

unless the backend contract explicitly requires it.

Backend is authoritative.

---

# 18. TAX / FISCAL TOTALS — VERY IMPORTANT

Mobile must use authoritative backend totals.

Use:

subtotal_excluding_tax
or:
net_total

for displayed subtotal.

Use:

tax

for ISV/tax.

Use:

grand_total

for final total.

NEVER display:

subtotal_including_tax + tax

because that would double tax visually.

Example known preflight:

Iphone X:
catalog unit price: 450.00
ISV: 67.50
grand total: 517.50

Correct UI:

Subtotal   L. 450.00
ISV        L. 67.50
Total      L. 517.50

Currency display should prefer backend:

currency.symbol

For Honduras this currently renders:

L.

Do not hardcode "L.".

---

# 19. PAYMENT METHOD DISPLAY

Payment method IDs and backend names must remain untouched as data.

Only UI labels may be localized.

Known visual mapping:

Cash -> Efectivo
bank transfer -> Transferencia bancaria
Check -> Cheque
Credit Card -> Tarjeta de crédito
other -> Otro

TPE -> TPE
Western Union -> Western Union

Unknown names:
show backend original.

Never hardcode payment method IDs.

Default payment:

1. backend configured default if available
2. otherwise available cash method
3. otherwise first supported + available method

---

# 20. PREFLIGHT INVALIDATION

A validated preflight is valid only for the exact checkout state.

Current checkout derives a signature using things such as:

- customer
- cart lines
- quantities
- payment method
- payment amounts
- accounts

If any relevant input changes:

validated preflight must immediately become stale.

UI must return to:

Pendiente de validación fiscal

Never keep:

Venta validada por PRODEX

after changing payment/customer/cart state.

---

# 21. CURRENT TEST TENANT / KNOWN CONTEXT

Test tenant:

https://prueba02.prodexhub.cloud

Known operational context from prior live testing:

branch:
Sucursal 1

inventory location:
Piso de venta

cash drawer:
Caja1

default client:
Cliente Final

Known cash method existed and was usable without account.

Do NOT hardcode these values.

They are examples only.

---

# 22. IMPORTANT FISCAL WARNING

The prueba02 tenant has SAR fiscal configuration enabled.

Known audit found:

zatca_enabled = false
sar_enabled_profiles = 1

Therefore:

DO NOT casually submit real sales to prueba02.

A real POST /api/mobile/sales may consume fiscal numbering.

Preflight is safe because it does not create sales.

For the first real sale smoke test, prefer:

- a dedicated non-fiscal tenant
or
- a controlled fiscal test setup

Never disable SAR merely to simplify a test.

---

# 23. INVENTORY SCREEN — IMPLEMENTED

Inventory is connected to the real backend endpoint:

GET /api/mobile/inventory

Key files: app/(tabs)/inventory.tsx,
src/services/inventory/mobileInventoryService.ts.

Gated client-side by the `Pos_view` permission (same permission the backend
policy checks for this endpoint — `SalePolicy::Sales_pos` ->
`hasPermissionName('Pos_view')`) via
src/components/ui/PermissionGuard.tsx and hidden from the tab bar in
app/(tabs)/_layout.tsx when absent. The backend remains authoritative — the
client gate only keeps the UI from offering a screen the API would reject.

There is no mock/demo data path left in this screen or its service. Do not
reintroduce one.

Modern stock truth:
inventory_location_stocks

---

# 24. SALES SCREEN — IMPLEMENTED

Sales history is connected to the real backend endpoint:

GET /api/mobile/sales

Key files: app/(tabs)/sales.tsx, app/sales/[id].tsx,
src/services/sales/mobileSalesService.ts.

Gated client-side by the `Sales_view` permission (matches the backend
`SalePolicy::view` ability) via src/components/ui/PermissionGuard.tsx and
hidden from the tab bar in app/(tabs)/_layout.tsx when absent. The backend
remains authoritative.

There is no mock/demo data path left in this screen or its service. Do not
reintroduce one.

---

# 25. MORE SCREEN

More is visually organized into groups.

Rows that look interactive should have interaction feedback.

Do not add fake settings functionality.

---

# 26. UI COMPONENTS / DESIGN SYSTEM

The application has shared visual components and theme tokens.

Important reusable pieces include:

- AppHeader
- EmptyState
- PressableScale
- FadeInView
- PermissionGuard (src/components/ui/PermissionGuard.tsx) — client-side
  permission gate; wraps a screen and renders EmptyState when the current
  user lacks the given permission
- ErrorBoundary (src/components/ErrorBoundary.tsx) — root-level render
  error boundary mounted in app/_layout.tsx; last resort against a
  crash-to-blank-screen, not a substitute for per-screen error states

Theme contains concepts for:

- colors
- spacing
- radii
- typography
- sizing
- surfaces
- motion

Prefer using the shared system rather than adding arbitrary styles.

Avoid magic numbers where a theme token exists.

---

# 27. CURRENT MOTION / UX PHASE

Current work focuses on UX and motion polish.

Implemented concepts include:

- button/card press feedback
- product add feedback
- cart bar entrance
- cart total/count transitions
- cart sheet motion
- checkout transitions
- payment method transitions
- preflight state transitions
- client selector transitions
- errors / empty state transitions
- Reduced Motion support

expo-haptics is NOT currently installed.

Do NOT install it without explicit approval.

Potential future haptic uses:

- successful barcode scan
- completed sale
- important error

Do not add haptic feedback to every tap.

---

# 28. PERFORMANCE RULES

Maintain smooth interaction.

Prefer animations based on:

- transform
- opacity

Avoid expensive continuous animation of:

- width
- height
- layout-heavy properties

Do not introduce unnecessary global rerenders.

POS should remain responsive during rapid product entry.

Animations should never slow down cashier workflows.

---

# 29. PHASES COMPLETED

Major completed phases include:

2A:
POS UI

2B:
checkout mock architecture / cart

2C:
barcode scanner

3A:
backend mobile product resolver

3B:
mobile authentication

3C:
real barcode resolver integration

3D-A:
backend mobile POS catalog

3D-B:
mobile real POS catalog

4A:
audit existing backend sale flow

4B-1:
backend checkout context + clients + preflight

4B-2:
backend mobile sale submission adapter

4B-2.1:
payment configuration hardening

4B-2.2:
mobile fiscal totals contract hardening

4C-1:
mobile checkout context + customers + server preflight

4C-2:
real sale submission (POST /api/mobile/sales), sale_uuid idempotency,
uncertain-retry handling — see §30 for the current contract

Post-4C-2 (undocumented as phases in earlier versions of this file, but
implemented and tested):

- real Inventory screen (GET /api/mobile/inventory)
- real Sales history + sale receipt screens
- Reports screen (backend sales/fiscal reporting)
- Cash register: open / close / movements / history, durable
  fail-closed guard around POS
- Customer management: create, edit, quick-create from POS checkout

Visual polish:
completed

UX / motion:
completed and committed (see §6)

---

# 30. PHASE 4C-2 — REAL SALE SUBMISSION — IMPLEMENTED

4C-2 is implemented. POST /api/mobile/sales is called from mobile checkout.
This section now documents the contract actually in code, not a future
proposal — treat any change to this contract as a change to production
financial logic, not routine cleanup.

Implementation:

- src/services/sales/mobileSaleSubmissionService.ts —
  `buildSaleSubmissionRequest` whitelists intent fields, validates
  sale_uuid as UUID v4, validates quantity/amount shapes;
  `parseSaleSubmissionResponse` validates the response shape strictly.
- src/services/sales/saleSubmissionController.ts — orchestrates submit /
  uncertain / retry / success state.
- src/services/sales/saleAttemptStorage.ts — persists the in-flight
  attempt (including its sale_uuid) so an uncertain outcome can be
  recovered and retried with the SAME sale_uuid after an app restart.

Semantics that must be preserved:

sale_uuid is a UUID v4 generated ONCE per logical checkout attempt.

If the submission result is uncertain due to:

- timeout
- network failure
- connection loss
- an ambiguous/5xx response

retry using the SAME sale_uuid. Never generate a new UUID for an uncertain
retry — this is what makes the backend idempotency guarantee (sale_uuid
idempotency, §31) actually safe to rely on.

Payload sent (see `buildSaleSubmissionRequest`):

{
  "sale_uuid": "...",
  "client_id": ...,
  "lines": [{ "product_id": ..., "product_variant_id": ..., "quantity": "..." }],
  "payments": [{ "payment_method_id": ..., "amount": "...", "account_id": ... }]
}

Never send server-authoritative financial calculations (price, tax,
subtotal, grand total) in this payload.

Cart must clear ONLY after a confirmed successful sale response.

After success:

- refresh catalog/stock
- refresh sales
- handle idempotent response (`data.idempotent === true`)
- show real sale reference (`sale.ref`)
- show fiscal data if present (`sale.fiscal_number`, `sale.fiscal_status`)

Blocked / unsupported (rejected before or by the backend, not silently
allowed):

- Stripe sensitive card data
- serial-required products without serial UI
- batch-required products without batch UI
- unsupported combos/packs

See §22 for the fiscal-numbering warning on the prueba02 tenant — it still
applies now that real submission exists.

---

# 31. BACKEND SALE ARCHITECTURE

Backend mobile sale submission already exists.

POST /api/mobile/sales

Backend adapter delegates to the real existing POS sales engine.

Do NOT create a second independent sales engine in Mobile.

Backend handles:

- server pricing
- taxes
- stock
- Sale
- SaleDetail
- payments
- fiscal logic
- sale_uuid idempotency
- stock updates

Mobile should express user intent, not duplicate accounting logic.

---

# 32. CURRENT PRODUCT TYPES / MVP

Mobile MVP currently supports conceptually:

- simple products
- variants
- services
- weighted products
- cash
- external/manual card where backend supports
- mixed payment

Blocked / future:

- combos
- packs
- Stripe sensitive card flow
- store credit
- points
- quotation
- draft
- kitchen
- overselling
- serial selection UI
- batch selection UI

Do not silently enable unsupported product types.

---

# 33. SERVER ERROR HANDLING

Map stable backend errors to clear UI.

Known concepts include:

- insufficient_stock
- invalid client
- invalid quantity
- unsupported product type
- serial required
- batch required
- combo unsupported
- unavailable payment
- account required
- invalid operational context

Preserve server error semantics.

Do not replace every backend error with a generic alert.

---

# 34. SECURITY

Never expose:

- bearer tokens
- passwords
- database credentials
- client secrets
- API secrets

Mobile must not contain privileged backend secrets.

Use HTTPS APIs.

SecureStore holds mobile authentication material.

Do not log full access tokens.

---

# 35. DEPENDENCY POLICY

Do not install dependencies casually.

Before adding any package:

1. confirm existing stack cannot solve it
2. confirm Expo SDK 57 compatibility
3. explain why it is necessary

Never run:

npm audit fix --force

Do not perform major dependency upgrades as part of unrelated work.

Keep dependency maintenance in isolated commits.

---

# 36. DEVELOPMENT WORKFLOW

For every task:

1. Read CLAUDE.md.
2. Inspect git status.
3. Inspect existing implementation.
4. Identify affected files.
5. Make the smallest safe change.
6. Preserve previous work.
7. Validate.
8. Report exactly what changed.
9. Do not continue into another phase unless asked.

Never assume a requested feature does not already partially exist.

Search before creating duplicate services/components.

---

# 37. USER WORKFLOW PREFERENCE

The project owner prefers:

- carefully scoped changes
- staged rollout
- explicit validation
- exact reports
- no unnecessary questions
- no regressions
- no unrelated refactors
- clear separation between backend and mobile
- no surprise dependency changes

When a task is complete, report:

- files changed
- behavior changed
- tests
- typecheck
- expo-doctor when relevant
- export/build
- git status
- blockers
- anything intentionally not implemented

---

# 38. CURRENT PRIORITY

UX/motion is frozen (§6). Inventory, Sales, Reports, Cash register,
Customer management, and real sale submission (4C-2) are all implemented
(§29/§30) — do not treat them as pending or re-implement them.

Immediate priority is production-readiness hardening, not new business
features. Known open items as of the last audit:

1. store identity: ios.bundleIdentifier, android.package, eas.json,
   EAS projectId are not yet configured (do NOT set these up without
   explicit approval — see §35's spirit; EAS config is a deliberate,
   separate step)
2. serial/batch workflows (still blocked, §32)
3. broader offline handling (no proactive connectivity detection beyond
   reacting to failed requests)
4. reducing duplicated 401/session-expired mapping across services

Do not automatically skip ahead. Confirm scope before starting any of the
above.

---

# 39. FIRST ACTION WHEN STARTING A NEW SESSION

Before editing anything, run/read:

git status --short
git branch --show-current
git log -5 --oneline

Then inspect CLAUDE.md and the relevant existing files.

If there are uncommitted changes:

PRESERVE THEM.

Do not reset them.

Do not assume they were generated by mistake.

---

# 40. MOST IMPORTANT PRINCIPLES

1. Do not break stable functionality.
2. Mobile never connects directly to DB.
3. Server is authoritative for business/financial logic.
4. No fake runtime business data.
5. No surprise commits or pushes.
6. No uncontrolled dependency updates.
7. Preserve multitenancy.
8. Preserve operational context.
9. Preserve fiscal correctness.
10. Validate every meaningful change.

# REQUIRED SPECIALIZED SKILLS

For PRODEX Mobile development, use the installed specialized skills when
relevant.

## UI/UX work

Use:

ui-ux-pro-max

for:

- UI/UX audits
- visual hierarchy
- spacing
- typography
- accessibility
- ergonomics
- interaction design
- motion design
- responsive/mobile usability

## React Native implementation

Use:

react-native

for:

- React Native architecture
- component patterns
- FlatList/list performance
- React state
- Reanimated
- rendering performance
- iOS/Android behavior
- Expo-compatible React Native implementation
- mobile performance reviews

## Expo-specific work

Use the installed official Expo skills for:

- Expo SDK
- Expo Router
- Expo configuration
- native Expo modules
- development builds
- EAS
- SDK upgrades
- Expo-specific debugging and deployment

For tasks involving UI/UX AND React Native implementation, use BOTH:

ui-ux-pro-max
+
react-native

and use the relevant Expo skill when the implementation depends on Expo.

Skills are advisory.

They MUST NOT override:

- PRODEX business rules
- CLAUDE.md architecture rules
- existing backend contracts
- approved branding
- existing stable functionality
- Expo SDK 57 compatibility

Do not introduce dependencies merely because a skill recommends them.

Before adopting a skill recommendation, verify that it fits the current
PRODEX architecture.