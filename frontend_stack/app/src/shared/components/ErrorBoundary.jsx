import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--be-bg, #f6f7f9)',
        }}>
          <div style={{
            maxWidth: 480,
            width: '100%',
            background: '#fff',
            borderRadius: 16,
            padding: '40px 32px',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--be-danger-light, #fee2e2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 28,
            }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--be-ink, #1a1d2b)' }}>
              Something went wrong
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--be-slate, #6b7280)', lineHeight: 1.6 }}>
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--be-primary, #1a56db)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Refresh page
            </button>
            {this.props.showDetails && this.state.error && (
              <pre style={{
                marginTop: 20,
                padding: 12,
                background: 'var(--be-surface, #f3f4f6)',
                borderRadius: 8,
                fontSize: 11,
                color: 'var(--be-ink, #1a1d2b)',
                overflow: 'auto',
                textAlign: 'left',
                maxHeight: 200,
              }}>
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
