import * as SecureStore from 'expo-secure-store';
import type { AttemptStorage } from './cashRegisterOperationController';

export function cashRegisterAttemptStorage(owner: string, kind: string): AttemptStorage {
  // Only supported SecureStore key characters; isolate tenant, operator AND kind (open vs movement).
  const key = `prodex.cashregister.v1.${kind}.${Array.from(owner).map(char => char.codePointAt(0)!.toString(16)).join('-')}`;
  return {
    read: () => SecureStore.getItemAsync(key),
    write: value => SecureStore.setItemAsync(key, value),
    remove: () => SecureStore.deleteItemAsync(key),
  };
}
