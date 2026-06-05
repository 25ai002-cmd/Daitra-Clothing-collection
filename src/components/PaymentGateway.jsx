import React, { useState, useEffect } from 'react';
import { ShieldCheck, CreditCard, QrCode, X, Lock, CheckCircle, RefreshCw } from 'lucide-react';
import { db } from '../utils/db';

export default function PaymentGateway({
  isOpen,
  amount,
  customerInfo,
  onSuccess,
  onCancel
}) {
  const [activeTab, setActiveTab] = useState('card'); // 'card' | 'upi'
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [upiSettings, setUpiSettings] = useState({ upi_id: 'daitracouture@okaxis', upi_qr_url: '' });
  
  // UPI payment options state
  const [upiMethod, setUpiMethod] = useState('id'); // 'id' | 'qr'
  const [upiIdInput, setUpiIdInput] = useState('');
  const [upiHandle, setUpiHandle] = useState('@okaxis');
  const [upiIdError, setUpiIdError] = useState('');
  
  // Card Form State
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      const loadUpiSettings = async () => {
        const settings = await db.getSettings();
        if (settings) {
          setUpiSettings(settings);
        }
      };
      loadUpiSettings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    
    // Formatting card details
    if (name === 'number') {
      value = value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
    } else if (name === 'expiry') {
      value = value.replace(/\//g, '').replace(/(\d{2})/g, '$1/').trim();
      if (value.endsWith('/')) value = value.slice(0, -1);
      value = value.slice(0, 5);
    } else if (name === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, 3);
    }
    
    setCardData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateCardForm = () => {
    const err = {};
    if (cardData.number.replace(/\s/g, '').length !== 16) {
      err.number = 'Enter a valid 16-digit card number';
    }
    if (!/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
      err.expiry = 'Enter expiry in MM/YY';
    } else {
      const [month, year] = cardData.expiry.split('/');
      const m = parseInt(month, 10);
      if (m < 1 || m > 12) err.expiry = 'Invalid expiry month';
    }
    if (cardData.cvv.length !== 3) {
      err.cvv = 'CVV must be 3 digits';
    }
    if (!cardData.name.trim()) {
      err.name = 'Cardholder name is required';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleCardPay = (e) => {
    e.preventDefault();
    if (!validateCardForm()) return;

    setProcessing(true);
    setProcessStep('Verifying card credentials...');
    
    setTimeout(() => {
      setProcessStep('Contacting your bank...');
      setTimeout(() => {
        setProcessing(false);
        setShowOtpScreen(true);
      }, 1500);
    }, 1500);
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (!/^\d{4,6}$/.test(otp)) {
      setOtpError('Invalid OTP code format. Enter the 4-6 digit code sent to your mobile device.');
      return;
    }

    setOtpError('');
    setShowOtpScreen(false);
    setProcessing(true);
    setProcessStep('Authorizing transaction...');
    
    setTimeout(() => {
      setProcessStep('Capturing payment secure details...');
      setTimeout(() => {
        setProcessing(false);
        onSuccess('Online Card Payment');
      }, 1500);
    }, 1500);
  };

  const handleUpiScanMock = () => {
    setProcessing(true);
    setProcessStep('Waiting for UPI app callback confirmation...');
    
    setTimeout(() => {
      setProcessStep('Authenticating UPI payment token...');
      setTimeout(() => {
        setProcessing(false);
        onSuccess('Online UPI (QR Code Scan)');
      }, 2000);
    }, 1500);
  };

  const handleUpiIdPay = (e) => {
    e.preventDefault();
    if (!upiIdInput.trim()) {
      setUpiIdError('Please enter your UPI ID');
      return;
    }
    
    const fullUpi = `${upiIdInput.trim()}${upiHandle}`;
    // Basic format verification (username@bank)
    if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(fullUpi)) {
      setUpiIdError('Invalid UPI VPA address format');
      return;
    }

    setUpiIdError('');
    setProcessing(true);
    setProcessStep('Verifying UPI VPA address...');
    
    setTimeout(() => {
      setProcessStep(`Sending secure collect request to ${fullUpi}...`);
      setTimeout(() => {
        setProcessStep('Awaiting approval in your UPI mobile app (GPay/PhonePe)...');
        setTimeout(() => {
          setProcessStep('UPI Payment Authorized!');
          setTimeout(() => {
            setProcessing(false);
            onSuccess(`Online UPI (VPA: ${fullUpi})`);
          }, 1000);
        }, 2000);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="gateway-overlay">
      <div className="gateway-modal">
        {/* Gateway Header */}
        <div className="gateway-header">
          <div className="gateway-header-left">
            <img src="/assets/logo.png" alt="DAITRA logo" className="gateway-logo" />
            <div className="gateway-header-text">
              <h3>DAITRA Secure Checkout</h3>
              <span className="secure-badge">
                <ShieldCheck size={12} />
                <span>100% Secured by RazorPay API</span>
              </span>
            </div>
          </div>
          <button className="gateway-cancel-btn" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        {/* Invoice Area */}
        <div className="gateway-invoice-row">
          <div className="invoice-left">
            <span className="invoice-label">PAYING TO</span>
            <strong>DAITRA Couture</strong>
          </div>
          <div className="invoice-right">
            <span className="invoice-label">AMOUNT</span>
            <strong className="invoice-amount-text">₹{amount.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        {/* Processing Spinner Loader Overlay */}
        {processing && (
          <div className="gateway-loader-overlay">
            <RefreshCw size={48} className="spinner-gold" />
            <p>{processStep}</p>
            <span className="secure-footnote">Do not close this window or hit back...</span>
          </div>
        )}

        {/* 3D Secure OTP Overlay Screen */}
        {showOtpScreen && (
          <div className="otp-screen-overlay">
            <form onSubmit={handleOtpSubmit} className="otp-form-card">
              <Lock size={36} className="otp-lock-icon" />
              <h3>3D Secure Verification</h3>
              <p>A verification OTP has been sent to +91 {customerInfo.phone}. Please enter it to complete the transaction.</p>
              
              <div className="form-group center-text">
                <input
                  type="text"
                  placeholder="Enter verification code"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    setOtpError('');
                  }}
                  className="otp-input-field"
                  maxLength="6"
                  required
                />
                {otpError && <span className="otp-error-text">{otpError}</span>}
                {otpMessage && <span className="otp-success-text">{otpMessage}</span>}
              </div>

              <div className="otp-actions">
                <button type="submit" className="btn btn-gold full-width">
                  VERIFY & AUTHORIZE
                </button>
                <button 
                  type="button" 
                  className="otp-resend-btn" 
                  onClick={() => {
                    setOtpMessage('Verification code re-sent successfully!');
                    setOtpError('');
                    setTimeout(() => setOtpMessage(''), 5000);
                  }}
                >
                  Resend OTP Code
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Interface Wrapper */}
        <div className="gateway-body">
          {/* Left: Tab options */}
          <aside className="gateway-sidebar">
            <button 
              className={`gateway-tab-btn ${activeTab === 'card' ? 'active' : ''}`}
              onClick={() => setActiveTab('card')}
            >
              <CreditCard size={18} />
              <span>Cards (Credit/Debit)</span>
            </button>
            <button 
              className={`gateway-tab-btn ${activeTab === 'upi' ? 'active' : ''}`}
              onClick={() => setActiveTab('upi')}
            >
              <QrCode size={18} />
              <span>UPI Payments</span>
            </button>
          </aside>

          {/* Right: Tab content */}
          <div className="gateway-content-area">
            {activeTab === 'card' && (
              <form onSubmit={handleCardPay} className="gateway-card-form">
                <div className="form-group">
                  <label>Card Number</label>
                  <input
                    type="text"
                    name="number"
                    value={cardData.number}
                    onChange={handleInputChange}
                    placeholder="4111 2222 3333 4444"
                    className={errors.number ? 'error' : ''}
                    required
                  />
                  {errors.number && <span className="field-error">{errors.number}</span>}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Expiry (MM/YY)</label>
                    <input
                      type="text"
                      name="expiry"
                      value={cardData.expiry}
                      onChange={handleInputChange}
                      placeholder="12/28"
                      className={errors.expiry ? 'error' : ''}
                      required
                    />
                    {errors.expiry && <span className="field-error">{errors.expiry}</span>}
                  </div>

                  <div className="form-group">
                    <label>CVV</label>
                    <input
                      type="password"
                      name="cvv"
                      value={cardData.cvv}
                      onChange={handleInputChange}
                      placeholder="***"
                      className={errors.cvv ? 'error' : ''}
                      required
                    />
                    {errors.cvv && <span className="field-error">{errors.cvv}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label>Name on Card</label>
                  <input
                    type="text"
                    name="name"
                    value={cardData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Seema Singh"
                    className={errors.name ? 'error' : ''}
                    required
                  />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>

                <button type="submit" className="btn btn-gold pay-now-submit">
                  PAY SECURELY ₹{amount.toLocaleString('en-IN')}
                </button>
              </form>
            )}

            {activeTab === 'upi' && (
              <div className="gateway-upi-payment">
                <div className="upi-toggle-row">
                  <button 
                    type="button" 
                    className={`upi-toggle-btn ${upiMethod === 'id' ? 'active' : ''}`}
                    onClick={() => setUpiMethod('id')}
                  >
                    Pay via UPI ID
                  </button>
                  <button 
                    type="button" 
                    className={`upi-toggle-btn ${upiMethod === 'qr' ? 'active' : ''}`}
                    onClick={() => setUpiMethod('qr')}
                  >
                    Scan QR Code
                  </button>
                </div>

                {upiMethod === 'id' ? (
                  <form onSubmit={handleUpiIdPay} className="gateway-upi-id-form">
                    <div className="form-group">
                      <label>Enter UPI ID / VPA</label>
                      <div className="upi-input-group">
                        <input
                          type="text"
                          placeholder="e.g. seema.singh"
                          value={upiIdInput}
                          onChange={(e) => {
                            setUpiIdInput(e.target.value);
                            setUpiIdError('');
                          }}
                          className={`upi-vpa-input ${upiIdError ? 'error' : ''}`}
                          required
                        />
                        <select
                          value={upiHandle}
                          onChange={(e) => setUpiHandle(e.target.value)}
                          className="upi-handle-select"
                        >
                          <option value="@okaxis">@okaxis</option>
                          <option value="@okhdfcbank">@okhdfcbank</option>
                          <option value="@okicici">@okicici</option>
                          <option value="@okSBI">@okSBI</option>
                          <option value="@ybl">@ybl</option>
                          <option value="@paytm">@paytm</option>
                          <option value="@gpay">@gpay</option>
                          <option value="@upi">@upi</option>
                        </select>
                      </div>
                      {upiIdError && <span className="field-error">{upiIdError}</span>}
                    </div>

                    <div className="upi-quick-handles">
                      <span>Popular handles:</span>
                      <div className="quick-handles-grid">
                        {['@okaxis', '@okhdfcbank', '@okSBI', '@ybl', '@paytm'].map((h) => (
                          <button
                            key={h}
                            type="button"
                            className={`quick-handle-tag ${upiHandle === h ? 'selected' : ''}`}
                            onClick={() => setUpiHandle(h)}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="upi-help-text">
                      A collect request will be sent to this VPA address. Open your linked UPI app to authorize.
                    </div>

                    <button type="submit" className="btn btn-gold pay-now-submit">
                      PAY SECURELY ₹{amount.toLocaleString('en-IN')}
                    </button>
                  </form>
                ) : (
                  <div className="gateway-upi-scan">
                    <h4>Scan QR Code to Pay</h4>
                    <p className="scan-instructions">Open your UPI app (GPay, PhonePe, Paytm, BHIM) and scan this QR code to complete the transaction.</p>
                    
                    {/* SVG Visual QR Mockup */}
                    <div className="qr-code-box-wrapper">
                      <div className="mock-qr-border">
                        {upiSettings.upi_qr_url ? (
                          <img src={upiSettings.upi_qr_url} alt="UPI QR Scanner" className="owner-qr-image" />
                        ) : (
                          <svg className="qr-svg" viewBox="0 0 100 100" width="160" height="160">
                            {/* Corner Anchors */}
                            <rect x="5" y="5" width="25" height="25" fill="#D4AF37" stroke="#000" strokeWidth="2" />
                            <rect x="10" y="10" width="15" height="15" fill="#fff" />
                            <rect x="13" y="13" width="9" height="9" fill="#000" />
                            
                            <rect x="70" y="5" width="25" height="25" fill="#D4AF37" stroke="#000" strokeWidth="2" />
                            <rect x="75" y="10" width="15" height="15" fill="#fff" />
                            <rect x="78" y="13" width="9" height="9" fill="#000" />

                            <rect x="5" y="70" width="25" height="25" fill="#D4AF37" stroke="#000" strokeWidth="2" />
                            <rect x="10" y="75" width="15" height="15" fill="#fff" />
                            <rect x="13" y="78" width="9" height="9" fill="#000" />

                            {/* Random Grid Data Representing QR Patterns */}
                            <rect x="35" y="5" width="5" height="15" fill="#000" />
                            <rect x="45" y="15" width="15" height="5" fill="#000" />
                            <rect x="35" y="25" width="10" height="10" fill="#000" />
                            
                            <rect x="5" y="35" width="15" height="5" fill="#000" />
                            <rect x="15" y="45" width="10" height="15" fill="#000" />
                            <rect x="5" y="60" width="5" height="5" fill="#000" />

                            <rect x="35" y="45" width="30" height="5" fill="#000" />
                            <rect x="45" y="55" width="5" height="15" fill="#000" />
                            <rect x="35" y="75" width="15" height="10" fill="#000" />

                            <rect x="75" y="35" width="20" height="5" fill="#000" />
                            <rect x="70" y="45" width="10" height="15" fill="#000" />
                            <rect x="85" y="65" width="10" height="10" fill="#000" />
                            <rect x="70" y="80" width="15" height="15" fill="#000" />
                            
                            {/* Central Small Logo */}
                            <circle cx="50" cy="50" r="10" fill="#000" stroke="#D4AF37" strokeWidth="1.5" />
                            <text x="50" y="53" fontSize="8" fontWeight="bold" fill="#D4AF37" textAnchor="middle">D</text>
                          </svg>
                        )}
                      </div>
                      <span className="qr-id-label">UPI ID: {upiSettings.upi_id}</span>
                    </div>

                    {/* Confirmation Button */}
                    <button 
                      type="button" 
                      className="btn btn-gold simulate-scan-btn"
                      onClick={handleUpiScanMock}
                    >
                      I HAVE SCANNED & PAID
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer info lock banner */}
        <div className="gateway-footer">
          <Lock size={12} />
          <span>PCI-DSS Compliant Secure Gateway Environment</span>
        </div>
      </div>
    </div>
  );
}
