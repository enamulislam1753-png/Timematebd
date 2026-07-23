import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import '../index.css';
import { initSecurityGuardian } from './utils/securityGuardian';

// Safely start security guardian without blocking UI initialization
try {
  initSecurityGuardian();
} catch (e) {
  console.warn("Security guardian init notice:", e);
}

// Global Error Boundary to prevent blank white screens
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught app error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: '#020211',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '24px',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#818cf8',
            fontSize: '28px',
          }}>
            ⚡
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0', color: '#f8fafc' }}>
            টাইমমেট অ্যাপ পুনর্সংযুক্ত করা হচ্ছে
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 24px 0', maxWidth: '320px', lineHeight: '1.5' }}>
            কানেকশনে সামান্য সমস্যা দেখা দিয়েছে। নিচের বাটনে ক্লিক করে পুনরায় চেষ্টা করুন।
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              backgroundColor: '#6366f1',
              color: '#ffffff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            }}
          >
            অ্যাপ রিফ্রেশ ও রিস্টার্ট করুন 🔄
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

