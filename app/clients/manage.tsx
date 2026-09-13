import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomerEditor } from '../../src/components/clients/CustomerEditor';
export default function ManageCustomerScreen() {
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  return <SafeAreaView style={{ flex: 1 }}><CustomerEditor clientId={clientId} origin="clients" onCancel={() => router.back()} onSuccess={client => {
    if (clientId) router.back();
    else router.replace({ pathname: '/clients/[id]', params: { id: String(client.id) } });
  }} /></SafeAreaView>;
}
