import * as SecureStore from 'expo-secure-store';

import type { AuthSession } from '../../types/auth';

const SESSION_KEY = 'prodex.auth.session.v1';

export async function saveSession(session: AuthSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function getSession(): Promise<AuthSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed.version !== 1 || !parsed.workspace || !parsed.baseUrl || !parsed.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}