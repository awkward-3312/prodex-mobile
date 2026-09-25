import { Component, type ReactNode } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import { EmptyState } from './ui/EmptyState';
import { colors } from '../theme';

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Last-resort guard against a crash-to-blank-screen during a render error.
 * Does not replace per-screen error/empty states — those stay local to each
 * service call. This only catches what nothing else caught.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    if (__DEV__) console.error('[PRODEX] Unhandled render error', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.safe}>
          <EmptyState
            icon="alert-circle-outline"
            title="Ocurrió un problema inesperado."
            message="Puedes reintentar. Si el problema continúa, cierra y vuelve a abrir la aplicación."
            actionLabel="Reintentar"
            onAction={this.handleRetry}
          />
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
});
