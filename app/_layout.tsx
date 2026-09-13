import { Stack, router, usePathname, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CashRegisterProvider } from '../src/context/CashRegisterContext';
import { PosCartProvider } from '../src/context/PosCartContext';
import { AuthLoading } from '../src/components/auth/AuthLoading';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { getAuthRedirect } from '../src/context/authRouting';
import { useEffect, useRef } from 'react';

function AuthGate() {
  const { status, error, retryBootstrap } = useAuth();
  const pathname = usePathname();
  const navigationState = useRootNavigationState();
  const redirecting = useRef<string | null>(null);
  const redirect = getAuthRedirect(status, pathname);

  useEffect(() => {
    if (!navigationState?.key || !redirect) {
      redirecting.current = null;
      return;
    }
    if (redirecting.current === redirect) return;
    redirecting.current = redirect;
    router.replace(redirect);
  }, [navigationState?.key, redirect]);

  if (status === 'initializing' || status === 'bootstrapping') return <AuthLoading />;
  if (status === 'bootstrap_error') return <AuthLoading message={error ?? 'No se pudo restaurar la sesión.'} onRetry={retryBootstrap} />;
  if (redirect) return <AuthLoading />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CashRegisterProvider>
        <PosCartProvider>
          <StatusBar style="dark" />
          <AuthGate />
        </PosCartProvider>
        </CashRegisterProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
