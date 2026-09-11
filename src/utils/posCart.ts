import type { CartItem } from '../types/pos';

export function getCartItemCount(items: CartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function normalizeCartQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.round(quantity * 1000) / 1000;
}

export function calculateLineSubtotalMinorUnits(unitPriceCents: number, quantity: number) {
  const scaledQuantity = Math.round(normalizeCartQuantity(quantity) * 1000);
  return Math.round(Math.max(0, Math.round(unitPriceCents)) * scaledQuantity / 1000);
}

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce((total, item) => total + calculateLineSubtotalMinorUnits(item.unitPriceCents, item.quantity), 0);
}

export type CheckoutNavigationDecision = 'ignore' | 'close_then_navigate' | 'navigate';

/**
 * PosScreen is the sole owner of CartSheet visibility. Tapping "Cobrar" (from the
 * summary bar or from inside the sheet) must never push /pos/checkout while the
 * sheet is still marked visible, or the sheet's native Modal stays rendered on top
 * of the checkout route.
 */
export function decideCheckoutNavigation({ cartVisible, navigating }: { cartVisible: boolean; navigating: boolean }): CheckoutNavigationDecision {
  if (navigating) return 'ignore';
  return cartVisible ? 'close_then_navigate' : 'navigate';
}
