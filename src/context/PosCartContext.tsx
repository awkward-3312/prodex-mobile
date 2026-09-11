import { randomUUID } from 'expo-crypto';
import { useAuth } from './AuthContext';
import { SaleSubmissionController } from '../services/sales/saleSubmissionController';
import type { SubmissionState } from '../services/sales/saleSubmissionController';
import { saleAttemptStorage } from '../services/sales/saleAttemptStorage';
import { submitMobileSale } from '../services/sales/mobileSaleSubmissionService';
import { createContext, useContext, useReducer, useMemo, useRef, useEffect, useState, useSyncExternalStore } from 'react';

import type { CartItem, PosProduct } from '../types/pos';
import { toMinorUnits } from '../utils/formatCurrency';
import { getCartItemCount, getCartSubtotal, normalizeCartQuantity } from '../utils/posCart';

type CartState = { items: CartItem[] };
type CartAction =
  | { type: 'add'; product: PosProduct; quantity: number }
  | { type: 'increase'; productId: string }
  | { type: 'decrease'; productId: string }
  | { type: 'remove'; productId: string }
  | { type: 'restore'; items: CartItem[] }
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
    case 'restore':
      return { items: action.items };
    case 'clear':
      return initialState;
    default:
      return state;
  }
}

type PosCartValue = {
  saleSubmission: SaleSubmissionController;
  submission: SubmissionState;
  cartLocked: boolean;
  salesRevision: number;
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
  const { session, user } = useAuth();
  const operator = user?.id ?? user?.email;
  const owner = session && operator != null ? `${session.baseUrl.replace(/\/$/, '')}|${String(operator)}` : '';
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const cartOwner = useRef('');
  const carts = useRef(new Map<string, CartItem[]>());
  const [salesRevision, setSalesRevision] = useState(0);
  const controllers = useRef(new Map<string, SaleSubmissionController>());
  const saleSubmission = useMemo(() => {
    const existing = controllers.current.get(owner);
    if (existing) return existing;
    const controller = new SaleSubmissionController({
      owner,
      uuid: randomUUID,
      storage: owner ? saleAttemptStorage(owner) : { read: async () => null, write: async () => {}, remove: async () => {} },
      send: (request, accessToken) => submitMobileSale({ baseUrl: session?.baseUrl ?? '', accessToken, request }),
      confirmed: () => {
        carts.current.set(owner, []);
        if (ownerRef.current !== owner) return;
        dispatch({ type: 'clear' });
        setSalesRevision(value => value + 1);
      },
    });
    controllers.current.set(owner, controller);
    return controller;
  }, [owner, session?.baseUrl]);
  const submission = useSyncExternalStore(saleSubmission.subscribe, saleSubmission.getSnapshot, saleSubmission.getSnapshot);
  useEffect(() => {
    if (cartOwner.current !== owner) {
      carts.current.set(cartOwner.current, state.items);
      cartOwner.current = owner;
      dispatch({ type: 'restore', items: carts.current.get(owner) ?? [] });
    }
    void saleSubmission.restore();
  }, [owner, saleSubmission]);
  const guardedDispatch = (action: CartAction) => {
    if (!owner || saleSubmission.isLocked()) return;
    if (action.type === 'clear') saleSubmission.resetDraft();
    dispatch(action);
  };
  const visibleItems = cartOwner.current === owner ? state.items : carts.current.get(owner) ?? [];
  useEffect(() => {
    if (visibleItems.length === 0) saleSubmission.resetDraft();
  }, [visibleItems.length, saleSubmission]);
  const subtotalCents = getCartSubtotal(visibleItems);
  const discountCents = 0;
  const taxCents = 0;

  const value: PosCartValue = {
    saleSubmission, submission, cartLocked: !owner || saleSubmission.isLocked(), salesRevision,
    items: visibleItems,
    itemCount: getCartItemCount(visibleItems),
    subtotalCents,
    discountCents,
    taxCents,
    totalCents: subtotalCents - discountCents,
    addProduct: (product, quantity = 1) => guardedDispatch({ type: 'add', product, quantity }),
    increase: (productId) => guardedDispatch({ type: 'increase', productId }),
    decrease: (productId) => guardedDispatch({ type: 'decrease', productId }),
    remove: (productId) => guardedDispatch({ type: 'remove', productId }),
    clearCart: () => guardedDispatch({ type: 'clear' }),
  };

  return <PosCartContext.Provider value={value}>{children}</PosCartContext.Provider>;
}

export function usePosCart() {
  const context = useContext(PosCartContext);
  if (!context) throw new Error('usePosCart must be used inside PosCartProvider');
  return context;
}
