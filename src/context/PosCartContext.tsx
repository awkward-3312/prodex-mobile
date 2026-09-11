import { createContext, useContext, useReducer } from 'react';

import type { CartItem, PosProduct } from '../types/pos';
import { toMinorUnits } from '../utils/formatCurrency';
import { getCartItemCount, getCartSubtotal, normalizeCartQuantity } from '../utils/posCart';

type CartState = { items: CartItem[] };
type CartAction =
  | { type: 'add'; product: PosProduct; quantity: number }
  | { type: 'increase'; productId: string }
  | { type: 'decrease'; productId: string }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

const initialState: CartState = { items: [] };

export function canAddProductQuantity(item: CartItem | undefined, product: PosProduct, quantity: number) {
  if (product.stockStatus === 'Sin stock' && !product.oversellingAllowed) return false;
  if (product.manageStock === false || product.oversellingAllowed) return true;
  const currentQuantity = item?.quantity ?? 0;
  return currentQuantity + quantity <= product.stock;
}

export function addProductToCartItems(items: CartItem[], product: PosProduct, quantity = 1): CartItem[] {
  const normalizedQuantity = normalizeCartQuantity(quantity);
  if (normalizedQuantity <= 0) return items;
  const existing = items.find((item) => item.product.id === product.id);
  if (!canAddProductQuantity(existing, product, normalizedQuantity)) return items;
  if (!existing) return [...items, { product, quantity: normalizedQuantity, unitPriceCents: product.priceMinorUnits ?? toMinorUnits(product.price) }];
  return items.map((item) => item.product.id === product.id ? { ...item, quantity: normalizeCartQuantity(item.quantity + normalizedQuantity) } : item);
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      return { items: addProductToCartItems(state.items, action.product, action.quantity) };
    }
    case 'increase':
      return { items: state.items.map((item) => item.product.id === action.productId && canAddProductQuantity(item, item.product, 1) ? { ...item, quantity: normalizeCartQuantity(item.quantity + 1) } : item) };
    case 'decrease':
      return { items: state.items.flatMap((item) => item.product.id === action.productId ? (item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : []) : [item]) };
    case 'remove':
      return { items: state.items.filter((item) => item.product.id !== action.productId) };
    case 'clear':
      return initialState;
    default:
      return state;
  }
}

type PosCartValue = {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  addProduct: (product: PosProduct, quantity?: number) => void;
  increase: (productId: string) => void;
  decrease: (productId: string) => void;
  remove: (productId: string) => void;
  clearCart: () => void;
};

const PosCartContext = createContext<PosCartValue | null>(null);

export function PosCartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const subtotalCents = getCartSubtotal(state.items);
  const discountCents = 0;
  const taxCents = 0;

  const value: PosCartValue = {
    items: state.items,
    itemCount: getCartItemCount(state.items),
    subtotalCents,
    discountCents,
    taxCents,
    totalCents: subtotalCents - discountCents,
    addProduct: (product, quantity = 1) => dispatch({ type: 'add', product, quantity }),
    increase: (productId) => dispatch({ type: 'increase', productId }),
    decrease: (productId) => dispatch({ type: 'decrease', productId }),
    remove: (productId) => dispatch({ type: 'remove', productId }),
    clearCart: () => dispatch({ type: 'clear' }),
  };

  return <PosCartContext.Provider value={value}>{children}</PosCartContext.Provider>;
}

export function usePosCart() {
  const context = useContext(PosCartContext);
  if (!context) throw new Error('usePosCart must be used inside PosCartProvider');
  return context;
}
