import React, { useState } from 'react';
import { Mail, Heart, ArrowUp, X, Info } from 'lucide-react';

export default function Footer({ onCategorySelect, onPageChange, categories = [] }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activePolicy, setActivePolicy] = useState(null); // null | 'cancellation' | 'privacy'

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryNav = (cat) => {
    if (cat === 'all') {
      window.location.hash = '#/shop';
    } else {
      window.location.hash = `#/shop/category/${cat}`;
    }
  };

  return (
    <footer className="site-footer">
      <div className="footer-top-line">
        <div className="footer-line-wrapper">
          <span>STAY CONNECTED WITH DAITRA</span>
          <button className="back-to-top-btn" onClick={scrollToTop}>
            <span>BACK TO TOP</span>
            <ArrowUp size={16} />
          </button>
        </div>
      </div>

      <div className="footer-main-grid">
        {/* Brand Column */}
        <div className="footer-col brand-col">
          <div className="footer-logo-row">
            <img src="/assets/logo.png" alt="DAITRA Logo" className="footer-logo-img" />
            <div className="logo-text">
              <span className="brand-name">DAITRA</span>
              <span className="brand-tagline">WHEN TRADITION MEETS GRACE</span>
            </div>
          </div>
          <p className="brand-paragraph">
            Handcrafted with love in Ahmedabad, Gujarat. We design outfits that weave traditional Indian fabrics with contemporary grace for the modern woman.
          </p>
          <div className="social-links-row">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link" title="Follow us on Facebook">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a href="https://instagram.com/daitra_couture" target="_blank" rel="noopener noreferrer" className="social-link" title="Follow us on Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
          </div>
        </div>

        {/* Shop links Column */}
        <div className="footer-col links-col">
          <h4>Shop Collections</h4>
          <ul>
            <li><button onClick={() => handleCategoryNav('all')}>All Outfits</button></li>
            {categories.map((cat) => (
              <li key={cat.id}><button onClick={() => handleCategoryNav(cat.id)}>{cat.name}</button></li>
            ))}
          </ul>
        </div>

        {/* Policies Column */}
        <div className="footer-col links-col">
          <h4>Customer Care</h4>
          <ul>
            <li><a href="#/">Contact Support</a></li>
            <li><a href="#/">Shipping & Delivery</a></li>
            <li><a href="#/" onClick={(e) => { e.preventDefault(); setActivePolicy('cancellation'); }}>Cancellation Policy</a></li>
            <li><a href="#/">Returns & Exchange Policy</a></li>
            <li><a href="#/" onClick={(e) => { e.preventDefault(); onPageChange('admin'); }}>Boutique Admin Portal</a></li>
            <li><a href="#/" onClick={(e) => { e.preventDefault(); setActivePolicy('privacy'); }}>Privacy Policy</a></li>
          </ul>
        </div>

        {/* Newsletter Column */}
        <div className="footer-col newsletter-col">
          <h4>Newsletter</h4>
          <p>Subscribe to receive updates on our latest drops, festive collections, and private sales.</p>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <div className="newsletter-input-wrapper">
              <input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" aria-label="Subscribe to newsletter">
                <Mail size={18} />
              </button>
            </div>
            {subscribed && <span className="newsletter-success">Thank you for subscribing! ✨</span>}
          </form>
        </div>
      </div>

      {/* Footer Bottom copyright banner */}
      <div className="footer-bottom">
        <div className="footer-bottom-wrapper">
          <span>&copy; {new Date().getFullYear()} DAITRA Couture. All Rights Reserved.</span>
          <span className="designed-by">
            Made with <Heart size={12} fill="var(--primary-gold)" stroke="var(--primary-gold)" /> in Gujarat, India.
          </span>
        </div>
      </div>

      {/* Premium Glassmorphic Cancellation Policy Modal */}
      {activePolicy === 'cancellation' && (
        <div className="policy-modal-overlay" onClick={() => setActivePolicy(null)}>
          <div className="policy-modal-card fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="policy-modal-header">
              <div className="header-title-row">
                <Info size={20} className="gold-text" />
                <h3>Cancellation & Refund Policy</h3>
              </div>
              <button className="policy-modal-close" onClick={() => setActivePolicy(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="policy-modal-body">
              <div className="policy-section">
                <h4>Order Cancellation</h4>
                <ul>
                  <li>Orders can be cancelled free of charge within <strong>24 hours</strong> of placement.</li>
                  <li>Once an order is packaged and dispatched from our Ahmedabad boutique, cancellations are no longer accepted.</li>
                </ul>
              </div>
              
              <div className="policy-section">
                <h4>Refund Issuance</h4>
                <ul>
                  <li>For online payments, refunds will be processed and credited back to your original payment source within <strong>5-7 business days</strong>.</li>
                  <li>Cash on Delivery (COD) orders do not require any online refunds.</li>
                </ul>
              </div>

              <div className="policy-section contact-highlight">
                <h4>How to Request Cancellation?</h4>
                <p>Please email us at <strong className="gold-text">yakshbarot597@gmail.com</strong> or message us on WhatsApp at <strong>+91 98765 43210</strong> with your unique <strong>Order ID</strong>.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Glassmorphic Privacy & Security Policy Modal */}
      {activePolicy === 'privacy' && (
        <div className="policy-modal-overlay" onClick={() => setActivePolicy(null)}>
          <div className="policy-modal-card fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="policy-modal-header">
              <div className="header-title-row">
                <Info size={20} className="gold-text" />
                <h3>Privacy & Security Policy</h3>
              </div>
              <button className="policy-modal-close" onClick={() => setActivePolicy(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="policy-modal-body">
              <div className="policy-section">
                <h4>Secure Order Access (URL Gating)</h4>
                <p>
                  To protect your shopping privacy, your order tracking dashboard is fully secured. Guessing or changing the Order ID in the URL will not reveal your details.
                </p>
                <ul>
                  <li>Any guest or third-party access to an order details link requires a mandatory email address or phone number verification check.</li>
                  <li>Only logged-in owners whose Google email matches the order can bypass verification.</li>
                </ul>
              </div>
              
              <div className="policy-section">
                <h4>Authentication Security</h4>
                <p>
                  We utilize secure Google OAuth authentication. We do not store or access your personal password credentials. Only your basic public profile information (name and email) is accessed to link your orders.
                </p>
              </div>

              <div className="policy-section">
                <h4>Payment Data Security</h4>
                <p>
                  All online payments are securely processed. We do not store, log, or track credit cards, net banking login details, or UPI credentials on our databases.
                </p>
              </div>

              <div className="policy-section contact-highlight">
                <h4>Your Privacy Matters</h4>
                <p>We are committed to securing your personal shopping data. If you have questions about how your info is handled, reach us at <strong className="gold-text">yakshbarot597@gmail.com</strong>.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
