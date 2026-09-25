import { resolveOperationalContext } from '../../utils/resolveOperationalContext';
import { UserAvatar } from '../ui/UserAvatar';
import { AppHeader } from '../ui/AppHeader';
import { StyleSheet, Text } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { colors, fontWeights, typography } from '../../theme';

/** Same shell as AppHeader (title/subtitle + trailing), with the user
 * avatar as the trailing control instead of a back/icon/action button. */
export function PosHeader() {
  const { operationalContext } = useAuth();
  const context = resolveOperationalContext(operationalContext);

  return (
    <>
      <AppHeader title="Punto de venta" subtitle={context.label} trailing={<UserAvatar />} />
      {context.readyForLocationPos === false ? <Text style={styles.notReady}>Contexto no listo para POS</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  notReady: { marginTop: -4, marginBottom: 4, color: colors.inkMuted, fontSize: typography.caption, fontWeight: fontWeights.medium },
});
