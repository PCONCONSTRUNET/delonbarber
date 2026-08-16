import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ErrorBoundary global — captura qualquer erro de render não tratado.
 * Sem isso, qualquer exceção no React desmonta toda a árvore → tela preta.
 * Com isso, o usuário vê uma tela amigável com botão de recarregar.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro desconhecido',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error, info.componentStack);
  }

  handleReload = () => {
    // Tenta limpar possível estado corrompido antes de recarregar
    try {
      // Remove apenas chaves do Supabase que podem estar corrompidas
      const keys = Object.keys(localStorage).filter(
        (k) => k.startsWith('sb-') || k.includes('supabase')
      );
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      // localStorage pode estar inacessível — sem problema, recarrega mesmo assim
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0B0B0B',
            color: '#ffffff',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Ícone */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: 'rgba(214, 40, 40, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              fontSize: 32,
            }}
          >
            ✂️
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 8,
              color: '#ffffff',
            }}
          >
            Algo deu errado
          </h1>

          <p
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 32,
              maxWidth: 280,
              lineHeight: 1.6,
            }}
          >
            O app encontrou um problema inesperado. Recarregue para continuar.
          </p>

          <button
            onClick={this.handleReload}
            style={{
              backgroundColor: '#D62828',
              color: '#ffffff',
              border: 'none',
              borderRadius: 16,
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              maxWidth: 260,
            }}
          >
            Recarregar App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
