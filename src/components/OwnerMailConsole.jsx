import React, { useState, useEffect } from 'react';
import { Mail, ChevronUp, ChevronDown, CheckCircle, Smartphone, MapPin, Inbox, RefreshCw, AlertTriangle } from 'lucide-react';
import { db } from '../utils/db';

export default function OwnerMailConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const fetchEmailsFromOrders = async () => {
    const orders = await db.getOrders();
    // Map orders to styled inbox emails (orders are returned newest first from db)
    const mappedEmails = orders.map((order) => {
      const orderDate = order.date || new Date().toLocaleString();
      const isOnline = order.paymentType !== 'Cash on Delivery (COD)';
      
      return {
        orderId: order.orderId,
        subject: `🔔 NEW ORDER CAPTURED — ID: ${order.orderId} (${isOnline ? 'Online' : 'COD'})`,
        date: orderDate,
        customer: order.customerInfo,
        items: order.items,
        totals: order.totals,
        paymentType: order.paymentType || 'Cash on Delivery (COD)',
        isOnline: isOnline
      };
    });
    
    setEmails(mappedEmails);
  };

  useEffect(() => {
    // Initial fetch
    fetchEmailsFromOrders();

    // Listen for custom event when order is successfully completed
    const handleNewOrder = () => {
      fetchEmailsFromOrders();
      // Auto expand to show the new email log
      setIsOpen(true);
    };

    window.addEventListener('daitra_new_order_placed', handleNewOrder);
    return () => {
      window.removeEventListener('daitra_new_order_placed', handleNewOrder);
    };
  }, []);

  const clearAllEmails = async () => {
    await db.clearAllOrders();
    setEmails([]);
    setShowConfirmClear(false);
  };

  return (
    <div className={`owner-mail-console ${isOpen ? 'expanded' : 'collapsed'}`}>
      {/* Custom Confirmation Dialog Overlay */}
      {showConfirmClear && (
        <div className="console-confirm-overlay" onClick={() => setShowConfirmClear(false)}>
          <div className="console-confirm-card" onClick={(e) => e.stopPropagation()}>
            <AlertTriangle size={32} className="warning-icon-gold" />
            <h4>Clear Orders Database?</h4>
            <p>This action will permanently erase all order transaction records from the store logger. This cannot be undone.</p>
            <div className="confirm-buttons-row">
              <button type="button" className="btn btn-red" onClick={clearAllEmails}>
                Yes, Clear DB
              </button>
              <button type="button" className="btn btn-dark" onClick={() => setShowConfirmClear(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar toggler */}
      <div className="console-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="console-header-left">
          <Inbox size={16} className="mail-icon-pulsing" />
          <span>Boutique Owner Inbox Logger — <strong>yakshbarot597@gmail.com</strong></span>
          <span className="email-count-badge">{emails.length}</span>
        </div>
        <div className="console-header-right">
          {emails.length > 0 && (
            <button 
              type="button" 
              className="btn-clear-console" 
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirmClear(true);
              }}
            >
              Clear DB
            </button>
          )}
          {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </div>

      {/* Content Area */}
      <div className="console-body">
        {emails.length === 0 ? (
          <div className="empty-console">
            <Mail size={40} className="empty-icon-gray" />
            <p>No order notification dispatches logged yet.</p>
            <span>When a customer makes an order online or chooses COD, the transactional email trigger will render details here.</span>
          </div>
        ) : (
          <div className="emails-list-container">
            {emails.map((email) => (
              <div key={email.orderId} className="email-message-card">
                {/* Subject banner */}
                <div className="email-msg-header">
                  <div className="msg-from">
                    <span>From:</span> <strong>transactional-alerts@daitra.in</strong>
                  </div>
                  <div className="msg-to">
                    <span>To:</span> <strong>yakshbarot597@gmail.com</strong>
                  </div>
                  <div className="msg-date">
                    <span>Sent:</span> {email.date}
                  </div>
                </div>

                <div className="email-msg-subject">
                  <span>Subject:</span> <strong>{email.subject}</strong>
                </div>

                {/* Email Body HTML design */}
                <div className="email-msg-body">
                  <div className="email-newsletter-layout">
                    {/* Header */}
                    <div className="email-layout-header">
                      <h2>DAITRA COUTURE</h2>
                      <p>Order Notification System</p>
                    </div>

                    <div className="email-layout-intro">
                      <h3>Hello DAITRA Owner,</h3>
                      <p>A new purchase has been finalized by a customer. Below are the order receipt and payment parameters for fulfillment.</p>
                    </div>

                    {/* Order Details box */}
                    <div className="email-layout-details-box">
                      <div className="email-detail-header">Order Summary — {email.orderId}</div>
                      <div className="email-detail-grid">
                        <div className="email-detail-col">
                          <strong>Customer Information</strong>
                          <p>
                            Name: {email.customer.name}<br />
                            Mobile: +91 {email.customer.phone}
                          </p>
                        </div>
                        <div className="email-detail-col">
                          <strong>Shipping Destination</strong>
                          <p>
                            Address: {email.customer.address}<br />
                            City: {email.customer.city} — {email.customer.pincode}
                          </p>
                        </div>
                      </div>

                      {/* Items */}
                      <table className="email-items-table">
                        <thead>
                          <tr>
                            <th>Item Name</th>
                            <th>Size</th>
                            <th>Qty</th>
                            <th>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {email.items.map((item, index) => (
                            <tr key={index}>
                              <td>{item.title}</td>
                              <td>{item.selectedSize}</td>
                              <td>{item.quantity}</td>
                              <td>₹{(item.price * item.quantity).toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals */}
                      <div className="email-totals-panel">
                        <div className="email-total-row">
                          <span>Subtotal:</span>
                          <span>₹{email.totals.subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        {email.totals.discountAmount > 0 && (
                          <div className="email-total-row">
                            <span>Promo Discount:</span>
                            <span>- ₹{email.totals.discountAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="email-total-row">
                          <span>Shipping:</span>
                          <span>FREE</span>
                        </div>
                        <div className="email-total-row grand-total">
                          <span>Total Captured:</span>
                          <span>₹{email.totals.finalTotal.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Status indicator */}
                    <div className={`email-payment-banner ${email.isOnline ? 'online' : 'cod'}`}>
                      {email.isOnline ? (
                        <>
                          <CheckCircle size={18} />
                          <span><strong>PAYMENT CAPTURED ONLINE</strong> via RazorPay: {email.paymentType}</span>
                        </>
                      ) : (
                        <>
                          <Smartphone size={18} />
                          <span><strong>CASH ON DELIVERY (COD) REQUESTED</strong> — Capture ₹{email.totals.finalTotal.toLocaleString('en-IN')} upon delivery.</span>
                        </>
                      )}
                    </div>

                    <div className="email-layout-footer">
                      <p>This is an automated transactional notification sent from your store's API endpoint. Please prepare the catalog packaging for shipment within 24 hours.</p>
                      <span>DAITRA Couture — Chandkheda, Ahmedabad</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
