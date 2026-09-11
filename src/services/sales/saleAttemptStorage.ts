import * as SecureStore from 'expo-secure-store';
import type { AttemptStorage } from './saleSubmissionController';

export function saleAttemptStorage(owner: string): AttemptStorage {
  // Only supported SecureStore key characters; isolate tenant AND operator, never tokens.
  const key = `prodex.sale.v1.${Array.from(owner).map(char => char.codePointAt(0)!.toString(16)).join('-')}`;
  return {
    read: () => SecureStore.getItemAsync(key),
    write: value => SecureStore.setItemAsync(key, value),
    remove: () => SecureStore.deleteItemAsync(key),
  };
}
