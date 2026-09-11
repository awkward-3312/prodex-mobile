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
