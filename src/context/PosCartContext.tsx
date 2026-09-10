import { createContext, useContext, useReducer } from 'react';

import { posTaxConfig } from '../config/posMockData';
import type { CartItem, PosProduct } from '../types/pos';
import { calculateTaxMinorUnits, toMinorUnits } from '../utils/formatCurrency';
import { getCartItemCount, getCartSubtotal } from '../utils/posCart';

type CartState = { items: CartItem[] };
type CartAction =
  | { type: 'add'; product: PosProduct }
  | { type: 'increase'; productId: string }
  | { type: 'decrease'; productId: string }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

const initialState: CartState = { items: [] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      if (action.product.stockStatus === 'Sin stock') return state;
      const existing = state.items.find((item) => item.product.id === action.product.id);
      if (!existing) return { items: [...state.items, { product: action.product, quantity: 1, unitPriceCents: toMinorUnits(action.product.price) }] };
      if (existing.quantity >= action.product.stock) return state;
      return { items: state.items.map((item) => item.product.id === action.product.id ? { ...item, quantity: item.quantity + 1 } : item) };
    }
    case 'increase':
      return { items: state.items.map((item) => item.product.id === action.productId && item.quantity < item.product.stock ? { ...item, quantity: item.quantity + 1 } : item) };
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
  addProduct: (product: PosProduct) => void;
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
  const taxCents = calculateTaxMinorUnits(subtotalCents - discountCents, posTaxConfig.rate);

  const value: PosCartValue = {
    items: state.items,
    itemCount: getCartItemCount(state.items),
    subtotalCents,
    discountCents,
    taxCents,
    totalCents: subtotalCents - discountCents + taxCents,
    addProduct: (product) => dispatch({ type: 'add', product }),
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