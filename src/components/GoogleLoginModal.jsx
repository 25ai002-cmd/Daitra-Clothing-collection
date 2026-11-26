import React, { useState, useEffect, useRef } from 'react';
import { X, Shield } from 'lucide-react';

// Native JWT Decoder helper to parse Google ID Tokens
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to decode Google JWT:", e);
    return null;
  }
};

const DEFAULT_GOOGLE_CLIENT_ID = '543056256986-j1o530gh5sjjlrvc91699gvf3k4eplau.apps.googleusercontent.com';

export default function GoogleLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [gsiReady, setGsiReady] = useState(false);
  const [gsiError, setGsiError] = useState('');
  const buttonContainerRef = useRef(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!isOpen) return;

    setGsiReady(false);
    setGsiError('');

    const renderGsiButton = () => {
      if (!window.google?.accounts?.id || !buttonContainerRef.current) return false;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            const payload = decodeJwt(response.credential);
            if (payload && payload.email) {
              onLoginSuccess({
                name: payload.name || 'Google Customer',
                email: payload.email.toLowerCase(),
                picture: payload.picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(payload.email)}`
              });
              onClose();
            } else {
              setGsiError('Could not verify your Google account. Please try again.');
            }
          }
        });

        buttonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'signin_with',
          width: 320
        });
        setGsiReady(true);
        return true;
      } catch (e) {
        console.error('Failed to render Google Identity Services button:', e);
        setGsiError('Unable to load Google Sign-In. Please refresh and try again.');
        return true;
      }
    };

    if (renderGsiButton()) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      if (renderGsiButton()) {
        clearInterval(interval);
      } else if (attempts >= 25) {
        clearInterval(interval);
        setGsiError('Google Sign-In failed to load. Please check your connection or disable ad blockers.');
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen, clientId, onClose, onLoginSuccess]);

  if (!isOpen) return null;

  return (
    <div className="google-auth-overlay" onClick={onClose}>
      <div className="google-auth-window" onClick={(e) => e.stopPropagation()}>
        <div className="google-auth-header">
          <svg className="google-logo-svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <h3>Sign in with Google</h3>
          <p>to continue to <strong>DAITRA Couture</strong></p>
        </div>

        <button className="google-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="google-auth-body fade-in" style={{ gap: '16px', padding: '12px 0', flexDirection: 'column', display: 'flex', alignItems: 'center' }}>
          <div className="google-notice-box" style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            backgroundColor: '#f8f9fa',
            padding: '12px 16px',
            borderRadius: '8px',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <Shield size={16} style={{ color: '#5f6368', marginTop: '2px', flexShrink: 0 }} />
            <p style={{
              fontSize: '0.82rem',
              color: '#5f6368',
              margin: 0,
              lineHeight: '1.4',
              textAlign: 'left'
            }}>
              Use your Google account to sign in securely to DAITRA Couture.
            </p>
          </div>

          {gsiError && <div className="google-error-msg" style={{ width: '100%' }}>{gsiError}</div>}

          {!gsiReady && !gsiError && (
            <div style={{ fontSize: '0.85rem', color: '#5f6368', padding: '8px 0' }}>
              Loading Google Sign-In...
            </div>
          )}

          <div
            ref={buttonContainerRef}
            id="gsi-button-container"
            style={{
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
              minHeight: '44px'
            }}
          />
        </div>

        <div className="google-auth-footer">
          <span>English (United States)</span>
          <div className="footer-links">
            <span>Help</span>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </div>
    </div>
  );
}
