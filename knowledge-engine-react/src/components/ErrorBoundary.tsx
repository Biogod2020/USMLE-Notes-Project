import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-color, #fff)',
          color: 'var(--text-color, #333)',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😵</div>
          <h1 style={{ margin: '0 0 1rem 0' }}>Something went wrong</h1>
          <p style={{ maxWidth: '400px', marginBottom: '2rem', color: 'var(--text-muted, #666)' }}>
            The application encountered an unexpected error.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Reload Application
          </button>
          {this.state.error && (
            <pre style={{
              marginTop: '2rem',
              padding: '1rem',
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              overflow: 'auto',
              maxWidth: '100%',
              textAlign: 'left'
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
