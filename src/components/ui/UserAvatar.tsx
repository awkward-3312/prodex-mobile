import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, fontWeights, sizing } from '../../theme';

/** Uses the tenant's supplied user photo; never sends credentials to image hosts. */
export function UserAvatar({ size = sizing.headerAvatar }: { size?: number }) {
  const { user, session } = useAuth();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const name = user?.name?.trim() || user?.email || 'Usuario PRODEX';
  const photo = [user?.profile_photo_url, user?.avatar_url, user?.photo_url, user?.avatar, user?.photo].find(value => typeof value === 'string' && value.trim());
  let uri: string | undefined;
  if (typeof photo === 'string') {
    try {
      const url = new URL(photo, session?.baseUrl);
      if (url.protocol === 'https:' || url.protocol === 'http:') uri = url.href;
    } catch { /* Missing or invalid photo: show initials. */ }
  }
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <View accessible accessibilityLabel={`Perfil de ${name}`} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    {uri && uri !== failedUri ? <Image key={uri} source={{ uri }} resizeMode="cover" onError={() => setFailedUri(uri ?? null)} style={StyleSheet.absoluteFill} /> : <Text style={[styles.initials, { fontSize: size * 0.3 }]}>{initials}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  avatar: { flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft, borderWidth: 3, borderColor: colors.white, overflow: 'hidden' },
  initials: { color: colors.brandDark, fontWeight: fontWeights.bold },
});
