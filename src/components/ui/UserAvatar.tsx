import { resolveUserAvatar } from '../../utils/resolveUserAvatar';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, fontWeights, sizing } from '../../theme';

/** Uses the tenant's supplied user photo; never sends credentials to image hosts. */
export function UserAvatar({ size = sizing.headerAvatar }: { size?: number }) {
  const { user, session } = useAuth();
  const name = user?.name?.trim() || user?.email || 'Usuario PRODEX';
  const uri = resolveUserAvatar(user, session?.baseUrl);
  const identity = JSON.stringify([session?.baseUrl, user?.id, user?.email, name, uri]);
  return <AvatarImage key={identity} name={name} uri={uri} size={size} />;
}

function AvatarImage({ name, uri, size }: { name: string; uri?: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <View accessible accessibilityLabel={`Perfil de ${name}`} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    {uri && !failed ? <Image key={uri} source={{ uri }} resizeMode="cover" onError={() => setFailed(true)} style={StyleSheet.absoluteFill} /> : <Text style={[styles.initials, { fontSize: size * 0.3 }]}>{initials}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  avatar: { flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft, borderWidth: 3, borderColor: colors.white, overflow: 'hidden' },
  initials: { color: colors.brandDark, fontWeight: fontWeights.bold },
});
