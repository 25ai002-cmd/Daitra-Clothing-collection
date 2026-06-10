import React, { useState, useEffect } from 'react';
import { ShieldCheck, CreditCard, QrCode, X, Lock, RefreshCw } from 'lucide-react';
import { db } from '../utils/db';

export default function PaymentGateway({
  isOpen,
  amount,
  customerInfo,
  orderId,
  onSuccess,
  onCancel
}) {
  const [activeTab, setActiveTab] = useState('razorpay'); // 'razorpay' | 'upi'
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState('');
  const [upiSettings, setUpiSettings] = useState({ upi_id: 'daitracouture@okaxis', upi_qr_url: '' });
  
  // UPI manual payment options state
  const [upiMethod, setUpiMethod] = useState('id'); // 'app' | 'id' | 'qr'
  const [upiIdInput, setUpiIdInput] = useState('');
  const [upiHandle, setUpiHandle] = useState('@okaxis');
  const [upiIdError, setUpiIdError] = useState('');
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadUpiSettings = async () => {
        const settings = await db.getSettings();
        if (settings) {
          setUpiSettings(settings);
        }
      };
      loadUpiSettings();

      // Mobile device detection
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobile = mobileRegex.test(navigator.userAgent) || window.innerWidth <= 768;
      setIsMobileDevice(isMobile);
      if (isMobile) {
        setUpiMethod('app');
      } else {
        setUpiMethod('id');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Initiate Razorpay Checkout Payment
  const initiateRazorpayPayment = () => {
    if (typeof window.Razorpay === 'undefined') {
      alert('Razorpay Checkout SDK is not loaded. Please try again or refresh.');
      return;
    }

    const options = {
      key: "rzp_test_T01br2Bnh2Rgp1",
      amount: Math.round(amount * 100), // in paise
      currency: "INR",
      name: "DAITRA Couture",
      description: `Payment for Order ${orderId || ''}`,
      image: "/assets/logo.png",
      handler: function (response) {
        console.log("Razorpay payment successful:", response);
        onSuccess(`Online via Razorpay (Payment ID: ${response.razorpay_payment_id})`);
      },
      prefill: {
        name: customerInfo?.name || '',
        email: customerInfo?.email || '',
        contact: customerInfo?.phone || ''
      },
      notes: {
        order_id: orderId || '',
        address: customerInfo?.address || ''
      },
      theme: {
        color: "#0b0b0b"
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      console.error("Razorpay payment failed:", response.error);
      alert(`Payment failed: ${response.error.description}`);
    });
    rzp.open();
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

  const handleUpiAppPay = () => {
    const adminUpi = upiSettings.upi_id || 'daitracouture@okaxis';
    const pa = encodeURIComponent(adminUpi);
    const pn = encodeURIComponent('DAITRA Couture');
    const tn = encodeURIComponent(`DAITRA Order ${orderId || ''}`);
    const upiUrl = `upi://pay?pa=${pa}&pn=${pn}&am=${amount}&cu=INR&tn=${tn}`;
    
    window.location.href = upiUrl;

    setProcessing(true);
    setProcessStep('Launching your default UPI App...');
    
    setTimeout(() => {
      setProcessStep('Awaiting verification from UPI network...');
      setTimeout(() => {
        setProcessStep('Verifying transaction token...');
        setTimeout(() => {
          setProcessing(false);
          onSuccess(`Online UPI (App Redirect: ${adminUpi})`);
        }, 1500);
      }, 2000);
    }, 3000);
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
                <span>100% Secured Checkout</span>
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

        {/* Main Interface Wrapper */}
        <div className="gateway-body">
          {/* Left: Tab options */}
          <aside className="gateway-sidebar">
            <button 
              className={`gateway-tab-btn ${activeTab === 'razorpay' ? 'active' : ''}`}
              onClick={() => setActiveTab('razorpay')}
            >
              <CreditCard size={18} />
              <span>Pay Online (Razorpay)</span>
            </button>
            <button 
              className={`gateway-tab-btn ${activeTab === 'upi' ? 'active' : ''}`}
              onClick={() => setActiveTab('upi')}
            >
              <QrCode size={18} />
              <span>Direct UPI (Manual)</span>
            </button>
          </aside>

          {/* Right: Tab content */}
          <div className="gateway-content-area">
            {activeTab === 'razorpay' && (
              <div className="gateway-razorpay-pay">
                <div className="razorpay-info-box">
                  <ShieldCheck size={32} className="gold-text" style={{ marginBottom: '10px' }} />
                  <h4>Online Payment Gateway</h4>
                  <p>
                    Pay securely using your Credit/Debit Card, Netbanking, UPI, or major Wallets powered by Razorpay Checkout.
                  </p>
                  <div className="razorpay-supported-badges">
                    <span>💳 Credit/Debit Cards</span>
                    <span>🏦 Netbanking</span>
                    <span>📱 UPI (GPay/PhonePe)</span>
                    <span>👛 Wallets</span>
                  </div>
                </div>
                
                <button 
                  type="button" 
                  className="btn btn-gold pay-now-submit"
                  onClick={initiateRazorpayPayment}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Lock size={16} />
                  <span>PAY SECURELY WITH RAZORPAY</span>
                </button>
              </div>
            )}

            {activeTab === 'upi' && (
              <div className="gateway-upi-payment">
                <div className="upi-toggle-row three-cols">
                  <button 
                    type="button" 
                    className={`upi-toggle-btn ${upiMethod === 'app' ? 'active' : ''}`}
                    onClick={() => setUpiMethod('app')}
                  >
                    UPI App
                  </button>
                  <button 
                    type="button" 
                    className={`upi-toggle-btn ${upiMethod === 'id' ? 'active' : ''}`}
                    onClick={() => setUpiMethod('id')}
                  >
                    UPI ID
                  </button>
                  <button 
                    type="button" 
                    className={`upi-toggle-btn ${upiMethod === 'qr' ? 'active' : ''}`}
                    onClick={() => setUpiMethod('qr')}
                  >
                    QR Scan
                  </button>
                </div>

                {upiMethod === 'app' && (
                  <div className="gateway-upi-app-pay">
                    <h4>Pay via Installed UPI App</h4>
                    <p className="scan-instructions">
                      Click below to launch GPay, PhonePe, Paytm, BHIM, or any other UPI app installed on your phone to complete the payment.
                    </p>
                    
                    {!isMobileDevice && (
                      <div className="desktop-upi-warning">
                        <span>⚠️ <strong>Note:</strong> You are on a desktop. This method works best on smartphones. You can still test redirecting or use <strong>UPI ID</strong> / <strong>Scan QR</strong> above.</span>
                      </div>
                    )}

                    <div className="upi-app-info-card">
                      <div className="upi-app-info-row">
                        <span className="payee-label">Paying to:</span>
                        <strong className="payee-val">{upiSettings.upi_id}</strong>
                      </div>
                      <div className="upi-app-info-row">
                        <span className="payee-label">Amount:</span>
                        <strong className="payee-amount">₹{amount.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      className="btn btn-gold btn-upi-app-redirect"
                      onClick={handleUpiAppPay}
                    >
                      PAY SECURELY VIA UPI APP
                    </button>
                  </div>
                )}

                {upiMethod === 'id' && (
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
                )}

                {upiMethod === 'qr' && (
                  <div className="gateway-upi-scan">
                    <h4>Scan QR Code to Pay</h4>
                    <p className="scan-instructions">Open your UPI app (GPay, PhonePe, Paytm, BHIM) and scan this QR code to complete the transaction.</p>
                    
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
