import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PosCartProvider } from '../src/context/PosCartContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PosCartProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </PosCartProvider>
    </SafeAreaProvider>
  );
}
