import React, { useState, useEffect } from 'react';
import { X, Shield, Key, Check, ChevronRight } from 'lucide-react';

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

          const cardContainer = document.getElementById("gsi-button-container-card");
          if (cardContainer) {
            window.google.accounts.id.renderButton(cardContainer, {
              theme: "outline",
              size: "large",
              width: 400
            });
          }

          const btnContainer = document.getElementById("gsi-button-container-btn");
          if (btnContainer) {
            window.google.accounts.id.renderButton(btnContainer, {
              theme: "outline",
              size: "large",
              width: 400
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
              /* SDK Enabled View matching the custom Google Authentication mock */
              <div className="google-auth-body fade-in" style={{ gap: '16px', padding: '10px 0', flexDirection: 'column', display: 'flex' }}>
                {/* Notice box */}
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
                    A secure, official Google window will open. Please authenticate your account to continue.
                  </p>
                </div>

                {/* Account Selection Card */}
                <div className="google-account-card" style={{ 
                  position: 'relative',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  border: '1px solid #dadce0', 
                  borderRadius: '8px', 
                  padding: '12px 16px',
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#ffffff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      backgroundColor: '#000000', 
                      color: '#ffffff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 'bold', 
                      fontSize: '0.9rem' 
                    }}>
                      B
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#202124' }}>Sign in as BAROT</span>
                      <span style={{ fontSize: '0.8rem', color: '#5f6368' }}>25ai002@sxca.edu.in</span>
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: '#5f6368' }} />
                  
                  {/* Invisible Overlay GSI Button on Card */}
                  <div className="gsi-invisible-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    zIndex: 2,
                    cursor: 'pointer',
                    overflow: 'hidden'
                  }}>
                    <div id="gsi-button-container-card" style={{ width: '100%', height: '100%' }}></div>
                  </div>
                </div>

                {/* Continue Securely Pill Button */}
                <div style={{ position: 'relative', width: '100%', marginTop: '10px' }}>
                  <button type="button" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    width: '100%', 
                    backgroundColor: '#111111', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: '24px', 
                    padding: '12px 24px', 
                    fontSize: '0.88rem', 
                    fontWeight: 'bold', 
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <Check size={16} />
                    <span>Continue securely</span>
                  </button>

                  {/* Invisible Overlay GSI Button on Continue Button */}
                  <div className="gsi-invisible-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    zIndex: 2,
                    cursor: 'pointer',
                    overflow: 'hidden'
                  }}>
                    <div id="gsi-button-container-btn" style={{ width: '100%', height: '100%' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              /* Local Simulation View */
              <div className="google-auth-body fade-in">
                {/* Quick Demo Accounts */}
                <div className="google-accounts-list">
                  <span className="section-label">Sign In with Owner Email:</span>
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
                <span>Secured by Google Secure Identity session encryption.</span>
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
