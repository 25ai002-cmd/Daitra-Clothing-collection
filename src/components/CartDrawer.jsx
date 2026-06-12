import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, CreditCard, ChevronLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import PaymentGateway from './PaymentGateway';
import { sendOrderAlertEmail, sendCustomerConfirmationEmail } from '../utils/emailService';
import { db } from '../utils/db';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  user,
  onLoginOpen,
  hasPurchased
}) {
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' | 'form' | 'success'
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0); // in percentage
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [showPlacedPopup, setShowPlacedPopup] = useState(false);

  // Shipping Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    paymentMethod: 'cod'
  });
  const [formErrors, setFormErrors] = useState({});
  const [orderId, setOrderId] = useState('');
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false);
  const [paymentWarning, setPaymentWarning] = useState('');

  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: user.email || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        name: '',
        email: ''
      }));
    }
  }, [user]);

  const saveOrderToDb = async (id, methodUsed) => {
    const newOrder = {
      orderId: id,
      date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      customerInfo: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode
      },
      items: cartItems,
      totals: {
        subtotal: subtotal,
        discountAmount: discountAmount,
        finalTotal: finalTotal
      },
      paymentType: methodUsed,
      status: 0 // Ordered
    };

    // Show success step and popup instantly to the customer
    setCheckoutStep('success');
    setShowPlacedPopup(true);

    // Clear the cart immediately so it is persisted on page refresh
    onClearCart();

    // Perform database save in the background
    db.saveOrder(newOrder).then(() => {
      // Dispatch event to refresh admin consoles
      window.dispatchEvent(new Event('daitra_new_order_placed'));
    }).catch(err => {
      console.error("Error saving order to database:", err);
    });

    // Trigger real transactional email send to the owner via Brevo
    sendOrderAlertEmail(newOrder).then((res) => {
      if (res.success) {
        console.log('Real email notification sent to owner successfully! Message ID:', res.messageId);
      } else {
        console.warn('Real email notification failed to send to owner:', res.error);
      }
    }).catch(err => console.warn(err));

    // Trigger confirmation email send to the customer
    sendCustomerConfirmationEmail(newOrder).then((res) => {
      if (res.success) {
        console.log('Confirmation email sent to customer successfully! Message ID:', res.messageId);
      } else {
        console.warn('Confirmation email failed to send to customer:', res.error);
      }
    }).catch(err => console.warn(err));
  };

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discountAmount = Math.round(subtotal * (appliedDiscount / 100));
  const finalTotal = subtotal - discountAmount;

  const handleApplyPromoClick = (codeToApply) => {
    const code = codeToApply.trim().toUpperCase();
    if (code === 'WELCOME10') {
      if (hasPurchased) {
        setPromoError('This promo code is only valid for your first purchase.');
        setPromoSuccess('');
        setAppliedDiscount(0);
        return;
      }
      setAppliedDiscount(10);
      setPromoSuccess('Promo code applied successfully! 10% OFF');
      setPromoError('');
    } else if (code === 'DAITRA10') {
      setAppliedDiscount(10);
      setPromoSuccess('Promo code applied successfully! 10% OFF');
      setPromoError('');
    } else {
      setPromoError('Invalid promo code');
      setPromoSuccess('');
    }
  };

  const handleApplyPromo = () => {
    handleApplyPromoClick(promoCode);
  };

  const handleQtyChange = (itemId, size, action) => {
    const item = cartItems.find(i => i.id === itemId && i.selectedSize === size);
    if (!item) return;

    if (action === 'dec') {
      if (item.quantity === 1) {
        onRemoveItem(itemId, size);
      } else {
        onUpdateQty(itemId, size, item.quantity - 1);
      }
    } else {
      onUpdateQty(itemId, size, item.quantity + 1);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      errors.phone = 'Enter a valid 10-digit phone number';
    }
    if (!formData.address.trim()) errors.address = 'Shipping address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.pincode.trim()) {
      errors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = 'Enter a valid 6-digit pincode';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const randomId = 'DAI-' + Math.floor(100000 + Math.random() * 900000);
    setOrderId(randomId);

    if (formData.paymentMethod === 'online') {
      setIsPaymentGatewayOpen(true);
    } else {
      saveOrderToDb(randomId, 'Cash on Delivery (COD)');
    }
  };

  const handlePaymentSuccess = (methodUsed) => {
    setIsPaymentGatewayOpen(false);
    saveOrderToDb(orderId, methodUsed);
  };

  const handlePaymentCancel = () => {
    setIsPaymentGatewayOpen(false);
    setPaymentWarning('Payment was cancelled. You can change payment method to COD or try again.');
    setTimeout(() => setPaymentWarning(''), 8000);
  };

  const handleContinueShopping = () => {
    onClearCart();
    setCheckoutStep('cart');
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      pincode: '',
      paymentMethod: 'cod'
    });
    setPromoCode('');
    setAppliedDiscount(0);
    setPromoSuccess('');
    setPaymentWarning('');
    setShowPlacedPopup(false);
    onClose();
  };

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cart-header">
          {checkoutStep === 'form' ? (
            <button className="cart-back-btn" onClick={() => setCheckoutStep('cart')}>
              <ChevronLeft size={20} />
              <span>Back to Bag</span>
            </button>
          ) : (
            <div className="cart-title-row">
              <ShoppingBag size={20} />
              <h3>Your Bag ({cartItems.length})</h3>
            </div>
          )}
          <button className="cart-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Dynamic Content Body */}
        {cartItems.length === 0 && checkoutStep !== 'success' ? (
          <div className="empty-cart-body">
            <ShoppingBag size={64} strokeWidth={1} className="empty-icon" />
            <h4>Your shopping bag is empty</h4>
            <p>Fill it with traditional grace from our premium catalog.</p>
            <button className="btn btn-gold continue-btn" onClick={onClose}>
              Shop Collections
            </button>
          </div>
        ) : (
          <>
            {checkoutStep === 'cart' && (
              <div className="cart-items-body">
                {/* Gift Progress Bar */}
                <div className="gift-progress-wrapper">
                  {subtotal < 5000 ? (
                    <p className="gift-progress-text">Add <strong>₹{(5000 - subtotal).toLocaleString('en-IN')}</strong> more for a <strong>Free Handcrafted Silk Scrunchie & Gift Box!</strong> 🎁</p>
                  ) : (
                    <p className="gift-progress-text success">🎉 Congratulations! Your order qualifies for a <strong>Free Silk Scrunchie & Luxury Gift Box!</strong></p>
                  )}
                  <div className="gift-progress-bar-bg">
                    <div className="gift-progress-bar-fill" style={{ width: `${Math.min((subtotal / 5000) * 100, 100)}%` }}></div>
                  </div>
                </div>

                {/* Product List */}
                <div className="cart-items-list">
                  {cartItems.map((item) => (
                    <div key={`${item.id}-${item.selectedSize}`} className="cart-item">
                      <img src={item.image} alt={item.title} className="cart-item-img" />
                      <div className="cart-item-info">
                        <div className="cart-item-title-row">
                          <h4>{item.title}</h4>
                          <button 
                            className="remove-item-btn"
                            onClick={() => onRemoveItem(item.id, item.selectedSize)}
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <span className="cart-item-details">Size: {item.selectedSize}</span>
                        <div className="cart-item-footer">
                          <div className="quantity-selector">
                            <button onClick={() => handleQtyChange(item.id, item.selectedSize, 'dec')}>
                              <Minus size={14} />
                            </button>
                            <span>{item.quantity}</span>
                            <button onClick={() => handleQtyChange(item.id, item.selectedSize, 'inc')}>
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="cart-item-price">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Promo Code section */}
                <div className="promo-section">
                  <div className="promo-input-row">
                    <input
                      type="text"
                      placeholder="Enter promo code (e.g. WELCOME10)"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="promo-input"
                    />
                    <button className="promo-apply-btn" onClick={handleApplyPromo}>
                      Apply
                    </button>
                  </div>
                  <div className="promo-quick-tags">
                    <span>Click to apply:</span>
                    {!hasPurchased && (
                      <button type="button" className="promo-tag-btn" onClick={() => { setPromoCode('WELCOME10'); handleApplyPromoClick('WELCOME10'); }}>WELCOME10</button>
                    )}
                    <button type="button" className="promo-tag-btn" onClick={() => { setPromoCode('DAITRA10'); handleApplyPromoClick('DAITRA10'); }}>DAITRA10</button>
                  </div>
                  {promoError && <p className="promo-error">{promoError}</p>}
                  {promoSuccess && <p className="promo-success">{promoSuccess}</p>}
                </div>

                {/* Pricing Summary */}
                <div className="cart-summary">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="summary-row discount-row">
                      <span>Promo Discount ({appliedDiscount}%)</span>
                      <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span className="shipping-free">FREE</span>
                  </div>
                  <div className="summary-divider"></div>
                  <div className="summary-row total-row">
                    <span>Total</span>
                    <span>₹{finalTotal.toLocaleString('en-IN')}</span>
                  </div>
                  
                  <button className="btn btn-gold checkout-btn" onClick={() => setCheckoutStep('form')}>
                    PROCEED TO CHECKOUT
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'form' && (
              <div className="cart-checkout-body">
                {paymentWarning && (
                  <div className="checkout-payment-warning fade-in">
                    <AlertTriangle size={16} />
                    <span>{paymentWarning}</span>
                  </div>
                )}
                {!user ? (
                  <div className="checkout-auth-block fade-in">
                    <svg className="google-logo-svg" viewBox="0 0 24 24" width="32" height="32" style={{ marginBottom: '15px' }}>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <h4>Google Sign-In Required</h4>
                    <p>To place an order from the DAITRA boutique, please sign in with your Google email ID first.</p>
                    <button type="button" className="btn-google-signin" onClick={onLoginOpen}>
                      <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Sign In with Google
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePlaceOrder} className="checkout-form">
                    <div className="form-section-title">Shipping Information</div>
                    
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. Seema Singh"
                        className={formErrors.name ? 'error' : ''}
                      />
                      {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                    </div>

                    <div className="form-group">
                      <label>Email Address</label>
                      <div className="checkout-locked-input-wrapper">
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          readOnly
                          placeholder="customer@example.com"
                          className={formErrors.email ? 'error' : ''}
                        />
                        <svg className="checkout-lock-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                      <div className="checkout-logged-in-indicator">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Logged in with Google</span>
                      </div>
                      {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                    </div>

                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="10-digit mobile number"
                        maxLength="10"
                        className={formErrors.phone ? 'error' : ''}
                      />
                      {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
                    </div>

                    <div className="form-group">
                      <label>Shipping Address</label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="House No, Street name, Land mark"
                        rows="3"
                        className={formErrors.address ? 'error' : ''}
                      />
                      {formErrors.address && <span className="field-error">{formErrors.address}</span>}
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>City</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="e.g. Ahmedabad"
                          className={formErrors.city ? 'error' : ''}
                        />
                        {formErrors.city && <span className="field-error">{formErrors.city}</span>}
                      </div>

                      <div className="form-group">
                        <label>Pincode</label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleInputChange}
                          placeholder="6-digit PIN"
                          maxLength="6"
                          className={formErrors.pincode ? 'error' : ''}
                        />
                        {formErrors.pincode && <span className="field-error">{formErrors.pincode}</span>}
                      </div>
                    </div>

                    <div className="form-section-title">Payment Method</div>
                    <div className="payment-options">
                      <label className={`payment-label ${formData.paymentMethod === 'cod' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cod"
                          checked={formData.paymentMethod === 'cod'}
                          onChange={handleInputChange}
                        />
                        <span>Cash on Delivery (COD)</span>
                      </label>

                      <label className={`payment-label ${formData.paymentMethod === 'online' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="online"
                          checked={formData.paymentMethod === 'online'}
                          onChange={handleInputChange}
                        />
                        <span>UPI / Credit / Debit Card</span>
                      </label>
                    </div>

                    <div className="checkout-summary-mini">
                      <div className="mini-row">
                        <span>Total Amount to Pay:</span>
                        <span className="price-bold">₹{finalTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-gold place-order-btn">
                      PLACE ORDER (₹{finalTotal.toLocaleString('en-IN')})
                    </button>
                  </form>
                )}
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="cart-success-body">
                <CheckCircle2 size={72} className="success-icon" />
                <h3>Order Placed Successfully!</h3>
                <p className="success-tagline">Thank you for shopping from DAITRA. Your trust is our inspiration.</p>
                
                <div className="success-details-box">
                  <div className="success-row">
                    <span>Order ID:</span>
                    <strong 
                      className="order-id-highlight" 
                      style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary-gold)' }}
                      onClick={() => {
                        onClose();
                        window.location.hash = `#/track/${orderId}`;
                      }}
                      title="Click to track order details"
                    >
                      {orderId}
                    </strong>
                  </div>
                  <div className="success-row">
                    <span>Estimated Delivery:</span>
                    <span>3 to 5 Business Days</span>
                  </div>
                  <div className="success-row">
                    <span>Payment Method:</span>
                    <span>{formData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
                  </div>
                  <div className="success-row">
                    <span>Deliver to:</span>
                    <span>{formData.name}</span>
                  </div>
                </div>

                <div className="success-action-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '15px' }}>
                  <button 
                    className="btn btn-gold" 
                    onClick={() => {
                      onClose();
                      window.location.hash = `#/track/${orderId}`;
                    }}
                  >
                    Track Order Details
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => {
                      onClose();
                      window.location.hash = `#/track/${orderId}?cancel=true`;
                    }}
                    style={{ 
                      background: 'rgba(255, 77, 77, 0.1)', 
                      border: '1px solid #ff4d4d', 
                      color: '#ff4d4d',
                      padding: '12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Cancel Order
                  </button>
                </div>

                <button className="btn btn-gold continue-shopping-btn" onClick={handleContinueShopping} style={{ marginTop: '10px', opacity: 0.8 }}>
                  CONTINUE SHOPPING
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Razorpay Online Payment Gateway Mockup Modal */}
      {isPaymentGatewayOpen && (
        <PaymentGateway
          isOpen={isPaymentGatewayOpen}
          amount={finalTotal}
          customerInfo={formData}
          orderId={orderId}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}
      {/* Placed Popup Confirmation Modal */}
      {showPlacedPopup && (
        <div className="popup-overlay" onClick={handleContinueShopping}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <CheckCircle2 size={48} className="success-icon" style={{ color: 'var(--primary-gold)' }} />
              <h3>Order Placed!</h3>
            </div>
            <div className="popup-body">
              <p>Your order has been placed successfully. All details of your order have been sent to your email{formData.email ? <> <strong>{formData.email}</strong></> : ''}.</p>
            </div>
            <div className="popup-footer">
              <button className="btn btn-gold popup-close-btn" onClick={handleContinueShopping}>
                OK, Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
