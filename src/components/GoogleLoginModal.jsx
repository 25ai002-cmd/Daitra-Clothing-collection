import React, { useState, useEffect } from 'react';
import { X, Shield, Key } from 'lucide-react';

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

export default function GoogleLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = select/input email, 2 = password, 3 = loading
  const [errorMsg, setErrorMsg] = useState('');

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Initialize Google Identity Services and render button if client ID is set
  useEffect(() => {
    if (!isOpen || !clientId) return;

    let buttonRendered = false;

    const renderGsiButton = () => {
      if (window.google && !buttonRendered) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              const payload = decodeJwt(response.credential);
              if (payload) {
                onLoginSuccess({
                  name: payload.name || 'Google Customer',
                  email: payload.email.toLowerCase(),
                  picture: payload.picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(payload.email)}`
                });
                onClose();
              }
            }
          });

          const container = document.getElementById("gsi-button-container");
          if (container) {
            window.google.accounts.id.renderButton(container, {
              theme: "outline",
              size: "large",
              width: 320
            });
            buttonRendered = true;
          }
        } catch (e) {
          console.error("Failed to render Google Identity Services button:", e);
        }
      }
    };

    if (window.google) {
      const timer = setTimeout(renderGsiButton, 100);
      return () => clearTimeout(timer);
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          renderGsiButton();
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  const handleNext = (e) => {
    e.preventDefault();
    const enteredEmail = email.trim().toLowerCase();
    if (!enteredEmail || !enteredEmail.includes('@')) {
      setErrorMsg('Enter a valid email address');
      return;
    }
    if (!enteredEmail.endsWith('@gmail.com')) {
      setErrorMsg('Google Sign-In requires an authenticated Google account ending in @gmail.com');
      return;
    }
    setErrorMsg('');
    
    // Guess a name from email if not already typed
    const emailPrefix = enteredEmail.split('@')[0];
    const formattedName = emailPrefix
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    setName(formattedName);
    
    setStep(2);
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters');
      return;
    }
    
    setErrorMsg('');
    setStep(3);
    
    // Simulate short loader
    setTimeout(() => {
      onLoginSuccess({
        name: name || 'Google Customer',
        email: email.toLowerCase(),
        picture: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`
      });
      onClose();
    }, 1500);
  };

  const handleSelectQuickAccount = (selectedEmail, selectedName) => {
    setStep(3);
    setTimeout(() => {
      onLoginSuccess({
        name: selectedName,
        email: selectedEmail,
        picture: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(selectedEmail)}`
      });
      onClose();
    }, 1200);
  };

  return (
    <div className="google-auth-overlay">
      <div className="google-auth-window">
        {/* Header logo */}
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

        <button className="google-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Step 1: Input Email */}
        {step === 1 && (
          <>
            {clientId ? (
              /* SDK Enabled View */
              <div className="google-auth-body fade-in" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '260px', gap: '20px' }}>
                <p style={{ fontSize: '0.88rem', color: '#5f6368', textAlign: 'center', maxWidth: '320px', lineHeight: '1.5' }}>
                  A secure official Google window will open. Please authenticate your Google account:
                </p>
                <div id="gsi-button-container" style={{ margin: '10px 0' }}></div>
                
                <div className="google-divider-row" style={{ width: '100%' }}>
                  <span>or bypass for test</span>
                </div>
                
                <button 
                  type="button" 
                  className="google-account-item"
                  style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}
                  onClick={() => handleSelectQuickAccount('yakshbarot597@gmail.com', 'Yaksh Barot')}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--primary-gold-dark)' }}>
                    Bypass with Developer Account (Yaksh)
                  </span>
                </button>
              </div>
            ) : (
              /* Local Simulation View */
              <div className="google-auth-body fade-in">
                {/* Quick Demo Accounts */}
                <div className="google-accounts-list">
                  <span className="section-label">Select a test account:</span>
                  <button 
                    className="google-account-item" 
                    onClick={() => handleSelectQuickAccount('yakshbarot597@gmail.com', 'Yaksh Barot')}
                  >
                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=yaksh" alt="Yaksh Barot" className="account-avatar" />
                    <div className="account-info">
                      <strong>Yaksh Barot</strong>
                      <span>yakshbarot597@gmail.com</span>
                    </div>
                  </button>
                  
                  <button 
                    className="google-account-item" 
                    onClick={() => handleSelectQuickAccount('customer.daitra@gmail.com', 'Dev Customer')}
                  >
                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=daitra" alt="Customer Test" className="account-avatar" />
                    <div className="account-info">
                      <strong>Dev Customer</strong>
                      <span>customer.daitra@gmail.com</span>
                    </div>
                  </button>
                </div>

                <div className="google-divider-row">
                  <span>or use another account</span>
                </div>

                <form onSubmit={handleNext} className="google-email-form">
                  {errorMsg && <div className="google-error-msg">{errorMsg}</div>}
                  
                  <div className="google-input-group">
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email or phone"
                      required
                    />
                  </div>
                  
                  <div className="google-actions-row">
                    <span className="create-account-link">Create account</span>
                    <button type="submit" className="btn-google-next">
                      Next
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* Step 2: Enter Password */}
        {step === 2 && (
          <div className="google-auth-body fade-in">
            <div className="selected-email-preview">
              <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(email)}`} alt="User Avatar" className="account-avatar-sm" />
              <div className="account-text">
                <strong>{name}</strong>
                <span>{email}</span>
              </div>
              <button className="change-account-btn" onClick={() => setStep(1)}>Change</button>
            </div>

            <form onSubmit={handleSignIn} className="google-password-form">
              {errorMsg && <div className="google-error-msg">{errorMsg}</div>}
              
              <div className="google-input-group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                />
              </div>

              <div className="security-notice">
                <Shield size={14} />
                <span>To keep this demo secure, any test password will authenticate successfully.</span>
              </div>
              
              <div className="google-actions-row">
                <span className="create-account-link">Forgot password?</span>
                <button type="submit" className="btn-google-next">
                  Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Loading spinner */}
        {step === 3 && (
          <div className="google-auth-loading fade-in">
            <div className="google-spinner"></div>
            <p>Authenticating credentials...</p>
            <span>Securing session token with Google Auth...</span>
          </div>
        )}

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
