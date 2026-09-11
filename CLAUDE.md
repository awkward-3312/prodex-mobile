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

Expected current baseline:

- 9 test suites
- 136 tests
- TypeScript passing
- expo-doctor 21/21
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

Important recent stable commits:

9cbcb2113e9cdb95d1bf51d220b4f792c44ac6c0
feat: connect and polish mobile POS checkout

d533153d7b2802c390920763fdc69ea4fdd1b001
chore: align Expo SDK 57 dependencies

---

# 6. CURRENT UNCOMMITTED UX / MOTION WORK

IMPORTANT:

There may currently be uncommitted UX + motion changes.

Do NOT overwrite them.

Always inspect git status and diff before modifying anything.

The UX/motion phase introduced or modified:

- app/(tabs)/_layout.tsx
- app/(tabs)/more.tsx
- app/(tabs)/pos.tsx
- app/login.tsx
- app/pos/checkout.tsx
- app/pos/scanner.tsx
- src/components/QuickAction.tsx
- src/components/pos/*
- src/components/pos/payment/*
- src/components/ui/AppHeader.tsx
- src/components/ui/EmptyState.tsx
- src/theme/index.ts

New reusable motion components:

src/components/motion/FadeInView.tsx
src/components/motion/PressableScale.tsx
src/components/motion/index.ts

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

Main tabs:

- Inicio
- POS
- Inventario
- Ventas
- Más

Other important screens:

- Login
- POS Scanner
- POS Checkout
- Client selector
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

Mobile checkout is currently READ-ONLY with server preflight.

It does NOT create a sale yet.

This is intentional.

Endpoints integrated:

GET /api/mobile/pos/checkout-context
GET /api/mobile/pos/clients
POST /api/mobile/pos/sale-preflight

DO NOT call:

POST /api/mobile/sales

unless implementing the explicitly approved future phase 4C-2.

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

# 23. INVENTORY SCREEN

Inventory visual UI exists.

Runtime demo/mock inventory was intentionally removed.

Until real inventory API integration is implemented:

show EmptyState.

Do not show fake records as if they were real.

Future target:
connect real mobile inventory read endpoints.

Modern stock truth:
inventory_location_stocks

---

# 24. SALES SCREEN

Sales visual UI exists.

Runtime fake sales were intentionally removed.

Until real sales history API integration is implemented:

show EmptyState.

Do not display fake customers or fake sales as real data.

Future target:
connect real sales history API.

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

Visual polish:
completed

UX / motion:
currently undergoing final physical QA

---

# 30. FUTURE PHASE 4C-2 — DO NOT IMPLEMENT WITHOUT APPROVAL

Future 4C-2 will create real sales using:

POST /api/mobile/sales

Do not start automatically.

When explicitly approved, required semantics include:

sale_uuid UUID v4 generated ONCE per logical checkout attempt.

If submission result is uncertain due to:

- timeout
- network failure
- connection loss

retry using the SAME sale_uuid.

Never generate a new UUID for an uncertain retry.

Required payload concept:

{
  "sale_uuid": "...",
  "client_id": ...,
  "lines": [...],
  "payments": [...],
  "notes": "..."
}

Never send server-authoritative financial calculations.

Cart must clear ONLY after confirmed successful sale response.

After success:

- refresh catalog/stock
- refresh sales
- handle idempotent response
- show real sale reference
- show fiscal data if present

Block unsupported:

- Stripe sensitive card data
- serial-required products without serial UI
- batch-required products without batch UI
- unsupported combos/packs

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

Current priority is NOT adding more complex backend functionality yet.

Immediate priority:

1. finish physical UX/motion QA
2. fix only UX/motion issues found
3. validate
4. commit UX/motion separately when approved

After UX/motion is frozen, likely roadmap:

1. real Inventory screen
2. real Sales/history screen
3. 4C-2 real sale submission
4. post-sale stock/history refresh
5. cash/session improvements
6. serial/batch workflows
7. production store preparation

Do not automatically skip ahead.

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