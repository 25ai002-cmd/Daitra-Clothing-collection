import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Calendar, Clock, Truck, CheckCircle2, ChevronRight, Package, Info, XCircle, AlertTriangle } from 'lucide-react';
import { db } from '../utils/db';
import { sendCustomerConfirmationEmail, sendOrderAlertEmail } from '../utils/emailService';

export default function OrderTracker({ user }) {
  const [orderIdInput, setOrderIdInput] = useState('');
  const [searchedOrder, setSearchedOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [userOrders, setUserOrders] = useState([]);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupDesc, setPopupDesc] = useState('');
  const [popupType, setPopupType] = useState('success'); // 'success' | 'warning' | 'error'
  const detailsRef = useRef(null);

  // Statuses: 0=Placed, 1=Processing, 2=Dispatched, 3=Out for Delivery, 4=Delivered, 5=Cancelled
  const STATUSES = [
    { label: 'Order Placed',      desc: 'We have received your order request.' },
    { label: 'Processing',        desc: 'Preparing & packing at Chandkheda Boutique, Ahmedabad.' },
    { label: 'Dispatched',        desc: 'Shipped via BlueDart. Tracking Ref: BD-8492048' },
    { label: 'Out For Delivery',  desc: 'Delivery partner is arriving today.' },
    { label: 'Delivered',         desc: 'Successfully delivered to your doorstep.' },
  ];

  // Load user's order history from db
  useEffect(() => {
    const loadMatchedOrders = async () => {
      if (user) {
        const orders = await db.getOrders();
        // db.getOrders returns them newest first
        const matched = orders.filter(
          (o) => o.customerInfo.email.toLowerCase() === user.email.toLowerCase()
        );
        setUserOrders(matched);
        
        // Auto-select the first order in history if none is currently selected and no hash-based order ID is present
        if (matched.length > 0 && !searchedOrder && !window.location.hash.startsWith('#/track/')) {
          setSearchedOrder(matched[0]);
          setOrderIdInput(matched[0].orderId);
        }
      } else {
        setUserOrders([]);
        if (!window.location.hash.startsWith('#/track/')) {
          setSearchedOrder(null);
        }
      }
    };

    loadMatchedOrders();
    
    // Listen to store updates
    window.addEventListener('daitra_new_order_placed', loadMatchedOrders);
    return () => {
      window.removeEventListener('daitra_new_order_placed', loadMatchedOrders);
    };
  }, [user]);

  // Handle hash-based deep tracking links (e.g. #/track/DAI-123456?cancel=true)
  useEffect(() => {
    const checkHashForOrder = async () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#/track/')) {
        // Strip out orderId, ignoring query params like ?cancel=true
        const pathPart = hash.replace('#/track/', '');
        const orderIdFromUrl = pathPart.split('?')[0].trim();
        
        if (orderIdFromUrl) {
          const orders = await db.getOrders();
          const found = orders.find(
            (o) => o.orderId.toUpperCase() === orderIdFromUrl.toUpperCase()
          );
          
          if (found) {
            setSearchedOrder(found);
            setOrderIdInput(found.orderId);
            setErrorMsg('');
            
            // Check for cancel parameter (only allowed if order is placed/processing)
            const shouldCancel = hash.includes('cancel=true') && found.status <= 1;
            setCancelConfirm(shouldCancel);
            setCancelDone(false);
          } else {
            setErrorMsg(`No order found with ID "${orderIdFromUrl}".`);
            setSearchedOrder(null);
          }
        }
      }
    };

    checkHashForOrder();
    window.addEventListener('hashchange', checkHashForOrder);
    return () => {
      window.removeEventListener('hashchange', checkHashForOrder);
    };
  }, []);

  // Scroll to details when searchedOrder is selected
  useEffect(() => {
    if (searchedOrder) {
      const timer = setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchedOrder]);

  const handleSearchOrder = async (e) => {
    if (e) e.preventDefault();
    if (!orderIdInput.trim()) {
      setErrorMsg('Please enter an Order ID');
      setSearchedOrder(null);
      return;
    }

    const orders = await db.getOrders();
    if (orders && orders.length > 0) {
      const found = orders.find(
        (o) => o.orderId.toUpperCase() === orderIdInput.trim().toUpperCase()
      );
      
      if (found) {
        // Set hash to navigate to the order
        window.location.hash = `#/track/${found.orderId}`;
      } else {
        setErrorMsg('No order found with this ID. (Demo Tip: Copy the Order ID from your cart checkout success screen!)');
        setSearchedOrder(null);
      }
    } else {
      setErrorMsg('No orders database found. Place an order first!');
      setSearchedOrder(null);
    }
  };

  const handleSelectOrder = (order) => {
    const targetHash = `#/track/${order.orderId}`;
    if (window.location.hash === targetHash) {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.location.hash = targetHash;
    }
  };

  const triggerCancellationEmails = async (order) => {
    console.log("Sending cancellation emails to owner and customer...");
    
    // 1. Send to Customer
    try {
      if (order.customerInfo.email) {
        await sendCustomerConfirmationEmail(order);
      }
    } catch (e) {
      console.error("Failed to send cancellation email to customer:", e);
    }
    
    // 2. Send to Owner
    try {
      await sendOrderAlertEmail(order);
    } catch (e) {
      console.error("Failed to send cancellation email to owner:", e);
    }
  };

  const handleCancelOrder = async () => {
    if (!searchedOrder || searchedOrder.status > 1) return;

    // Check if order was paid via Razorpay
    const paymentType = searchedOrder.paymentType || '';
    const match = paymentType.match(/pay_[A-Za-z0-9]+/);
    const paymentId = match ? match[0] : null;

    if (paymentId) {
      setRefundProcessing(true);
      try {
        const response = await fetch('/api/refund', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paymentId,
            amount: searchedOrder.totals.finalTotal,
            orderId: searchedOrder.orderId
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setPopupTitle('Refund Initiated!');
          setPopupDesc(`Refund of ₹${searchedOrder.totals.finalTotal.toLocaleString('en-IN')} has been successfully initiated to your original payment method. Refund Transaction ID: ${data.refund.id}`);
          setPopupType('success');
        } else {
          console.error('Refund failed:', data.error);
          setPopupTitle('Cancellation Warning');
          setPopupDesc(`Order cancellation proceeding, but automatic refund failed: ${data.error || 'invalid request sent'}. Our support team will process it manually during office hours.`);
          setPopupType('warning');
        }
      } catch (err) {
        console.error('Refund error:', err);
        setPopupTitle('Cancellation Warning');
        setPopupDesc('Order cancellation proceeding, but we encountered a network error while initiating the refund. Our support team will process it manually during office hours.');
        setPopupType('warning');
      } finally {
        setRefundProcessing(false);
      }
    } else {
      // Check if it was COD or Manual UPI
      const isOnlineUPI = searchedOrder.paymentType && searchedOrder.paymentType.includes('UPI');
      if (isOnlineUPI) {
        setPopupTitle('Order Cancelled!');
        setPopupDesc('Your order has been cancelled successfully. If paid online via UPI QR or App, the refund will be credited to your respective payment gateway during office hours.');
        setPopupType('success');
      } else {
        setPopupTitle('Order Cancelled!');
        setPopupDesc('Your order has been cancelled successfully. Since this was Cash on Delivery (COD), no refund is required.');
        setPopupType('success');
      }
    }

    const CANCELLED_STATUS = 5;
    await db.updateOrderStatus(searchedOrder.orderId, CANCELLED_STATUS);
    const cancelled = { ...searchedOrder, status: CANCELLED_STATUS };
    setSearchedOrder(cancelled);
    // Refresh history list
    setUserOrders(prev => prev.map(o =>
      o.orderId === searchedOrder.orderId ? cancelled : o
    ));
    setCancelConfirm(false);
    setCancelDone(true);
    setShowCancelPopup(true);
    
    // Trigger emails in the background
    triggerCancellationEmails(cancelled);
  };

  // Simulate advancing the order status for demonstration
  const handleAdvanceStatus = async () => {
    if (!searchedOrder) return;
    const currentStatus = searchedOrder.status !== undefined ? searchedOrder.status : 1;
    const nextStatus = (currentStatus + 1) % 5;
    
    // Update order in state
    const updatedOrder = { ...searchedOrder, status: nextStatus };
    setSearchedOrder(updatedOrder);

    // Update in database
    await db.updateOrderStatus(searchedOrder.orderId, nextStatus);
    
    // Update local state orders list
    const orders = await db.getOrders();
    if (user) {
      const matched = orders.filter(
        (o) => o.customerInfo.email.toLowerCase() === user.email.toLowerCase()
      );
      setUserOrders(matched);
    }
  };

  return (
    <section className="tracker-section">
      <div className="section-header-center">
        <span className="section-subtitle">DELIVERY STATUS</span>
        <h2 className="section-title">Track Your Order</h2>
        <div className="section-divider"></div>
      </div>

      <div className="tracker-wrapper">
        {/* If logged in, show order history list */}
        {user && userOrders.length > 0 && (
          <div className="tracker-history-section fade-in">
            <h3 className="tracker-history-title">Your Order History</h3>
            <div className="tracker-history-grid">
              {userOrders.map((order) => {
                const currentStatus = order.status !== undefined ? order.status : 0;
                let statusLabel = STATUSES[currentStatus]?.label || 'Placed';
                
                return (
                  <div 
                    key={order.orderId}
                    className={`tracker-history-card ${searchedOrder && searchedOrder.orderId === order.orderId ? 'active' : ''}`}
                    onClick={() => handleSelectOrder(order)}
                  >
                    <div className="history-card-header">
                      <span className="history-order-id">{order.orderId}</span>
                      <span className="history-date">{order.date.split(',')[0]}</span>
                    </div>
                    <div className="history-card-body">
                      <div className="history-items-summary">
                        {order.items.map(item => `${item.title} (${item.selectedSize})`).join(', ')}
                      </div>
                      <span className="history-total">₹{order.totals.finalTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="history-card-footer">
                      <span className="history-status-text" style={{ color: currentStatus === 4 ? '#32cd32' : 'var(--primary-gold)' }}>
                        {statusLabel}
                      </span>
                      <button
                        className="history-view-link"
                        onClick={(e) => { e.stopPropagation(); handleSelectOrder(order); }}
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Header Bar */}
        <div style={{ marginBottom: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {user ? 'Search another order by ID:' : 'Search by Order ID:'}
        </div>
        <form onSubmit={handleSearchOrder} className="tracker-search-form">
          <input
            type="text"
            placeholder="Enter Order ID (e.g. DAI-123456)"
            value={orderIdInput}
            onChange={(e) => setOrderIdInput(e.target.value)}
            className="tracker-input"
          />
          <button type="submit" className="btn btn-gold tracker-search-btn">
            <Search size={18} />
            <span>TRACK</span>
          </button>
        </form>
        {errorMsg && <p className="tracker-error-msg">{errorMsg}</p>}

        {/* Demo Tip Panel */}
        {!searchedOrder && !errorMsg && (
          <div className="tracker-tip-box">
            <Info size={18} />
            <span>
              {user 
                ? "Select an order from your history above or search by another Order ID." 
                : "To track automatically, sign in with Google or search by pasting your Order ID (e.g. DAI-XXXXXX) below."}
            </span>
          </div>
        )}

        {/* Searched Order Details */}
        {searchedOrder && (
          <div ref={detailsRef} className="tracker-results-container fade-in">

            {/* Stepper Timeline */}
            <div className="tracker-stepper">
              {STATUSES.map((step, idx) => {
                const currentStatus = searchedOrder.status !== undefined ? searchedOrder.status : 1;
                const isCompleted = idx <= currentStatus;
                const isActive = idx === currentStatus;
                
                return (
                  <div 
                    key={idx} 
                    className={`step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                  >
                    <div className="step-circle">
                      {isCompleted ? <CheckCircle2 size={16} fill="var(--primary-gold)" stroke="var(--text-dark)" /> : idx + 1}
                    </div>
                    <div className="step-content">
                      <h4 className="step-label">{step.label}</h4>
                      <p className="step-desc">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Layout Grid */}
            <div className="tracker-details-grid">
              {/* Left Column: Shipment Info */}
              <div className="tracker-details-card">
                <h3>Shipment Information</h3>
                <div className="tracker-info-list">
                  <div className="tracker-info-item">
                    <Package className="tracker-info-icon" size={18} />
                    <div>
                      <h4>Order ID</h4>
                      <p className="order-id-track-text">{searchedOrder.orderId}</p>
                    </div>
                  </div>

                  <div className="tracker-info-item">
                    <Calendar className="tracker-info-icon" size={18} />
                    <div>
                      <h4>Order Date</h4>
                      <p>{searchedOrder.date || 'June 4, 2026'}</p>
                    </div>
                  </div>

                  <div className="tracker-info-item">
                    <MapPin className="tracker-info-icon" size={18} />
                    <div>
                      <h4>Delivery Address</h4>
                      <p>
                        <strong>{searchedOrder.customerInfo.name}</strong><br />
                        {searchedOrder.customerInfo.address}, {searchedOrder.customerInfo.city} — {searchedOrder.customerInfo.pincode}<br />
                        Mobile: +91 {searchedOrder.customerInfo.phone}<br />
                        {searchedOrder.customerInfo.email && <span>Email: {searchedOrder.customerInfo.email}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="tracker-info-item">
                    <Truck className="tracker-info-icon" size={18} />
                    <div>
                      <h4>Payment Method</h4>
                      <p className="payment-type-pill">{searchedOrder.paymentType || 'Cash on Delivery (COD)'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Invoice summary */}
              <div className="tracker-details-card">
                <h3>Items Purchased</h3>
                <div className="purchased-items-list">
                  {searchedOrder.items.map((item) => (
                    <div key={`${item.id}-${item.selectedSize}`} className="purchased-item-row">
                      <img src={item.image} alt={item.title} className="purchased-item-img" />
                      <div className="purchased-item-info">
                        <h4>{item.title}</h4>
                        <span>Size: {item.selectedSize} | Qty: {item.quantity}</span>
                      </div>
                      <span className="purchased-item-price">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                <div className="tracker-invoice-summary">
                  <div className="invoice-row">
                    <span>Subtotal</span>
                    <span>₹{searchedOrder.totals.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {searchedOrder.totals.discountAmount > 0 && (
                    <div className="invoice-row discount">
                      <span>Promo Discount</span>
                      <span>- ₹{searchedOrder.totals.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="invoice-row">
                    <span>Shipping Fee</span>
                    <span className="free-text">FREE</span>
                  </div>
                  <div className="invoice-divider"></div>
                  <div className="invoice-row total">
                    <span>Total Paid</span>
                    <span>₹{searchedOrder.totals.finalTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Cancel / Cancelled Banner */}
                {searchedOrder.status === 5 ? (
                  <div className="order-cancelled-banner">
                    <XCircle size={20} />
                    <div>
                      <strong>Order Cancelled</strong>
                      <p>This order has been cancelled. If you paid online, a refund will be processed within 5–7 business days.</p>
                    </div>
                  </div>
                ) : searchedOrder.status <= 1 ? (
                  <div className="cancel-order-section">
                    {!cancelConfirm ? (
                      <button
                        className="btn cancel-order-btn"
                        onClick={() => setCancelConfirm(true)}
                      >
                        <XCircle size={16} />
                        Cancel This Order
                      </button>
                    ) : (
                      <div className="cancel-confirm-box">
                        <AlertTriangle size={18} className="cancel-warn-icon" />
                        <div>
                          <p className="cancel-confirm-title">
                            {refundProcessing ? 'Processing Refund...' : 'Are you sure you want to cancel?'}
                          </p>
                          <p className="cancel-confirm-sub">
                            {refundProcessing 
                              ? 'Please do not close this window. We are processing your automatic refund with Razorpay...'
                              : 'This cannot be undone. The order will be marked as cancelled.'}
                          </p>
                        </div>
                        {!refundProcessing && (
                          <div className="cancel-confirm-btns">
                            <button className="btn btn-dark cancel-no-btn" onClick={() => setCancelConfirm(false)}>No, Keep It</button>
                            <button className="btn cancel-yes-btn" onClick={handleCancelOrder}>Yes, Cancel</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="cancel-not-allowed">
                    ⚠ Your order has already been {STATUSES[searchedOrder.status]?.label?.toLowerCase()} and cannot be cancelled.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Cancel Popup Confirmation Modal */}
      {showCancelPopup && (
        <div className="popup-overlay" onClick={() => setShowCancelPopup(false)}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              {popupType === 'success' ? (
                <CheckCircle2 size={48} className="success-icon" style={{ color: 'var(--primary-gold)' }} />
              ) : popupType === 'warning' ? (
                <AlertTriangle size={48} className="warning-icon-gold" style={{ color: 'var(--primary-gold)' }} />
              ) : (
                <XCircle size={48} className="cancelled-icon" style={{ color: '#ff4d4d' }} />
              )}
              <h3>{popupTitle}</h3>
            </div>
            <div className="popup-body">
              <p>{popupDesc}</p>
            </div>
            <div className="popup-footer">
              <button 
                className="btn popup-close-btn" 
                onClick={() => setShowCancelPopup(false)}
                style={popupType === 'success' ? {} : { background: '#ff4d4d', border: '1px solid #ff4d4d', color: '#fff' }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
