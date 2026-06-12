import React, { useState } from 'react';
import { MapPin, Clock, Phone, Navigation, Heart, Award, ChevronDown } from 'lucide-react';

export default function StoreLocator() {
  const [activeFaq, setActiveFaq] = useState(null);
  const mapAddressUrl = "https://maps.google.com/?q=2,+Aavkar+Bunglows+Sona+Cross+Road,+New+CG+Rd,+Chandkheda,+Ahmedabad,+Gujarat+382424";

  const FAQS = [
    {
      q: "Does DAITRA provide custom sizing or alterations?",
      a: "Yes! We specialize in custom tailoring and size custom modifications. Visit our flagship boutique in Ahmedabad or connect with our designer team on WhatsApp (+91 84694 41014) to share your specifications."
    },
    {
      q: "What is your return & exchange policy?",
      a: "We support a standard 7-day hassle-free return and exchange policy for all unworn garments with tags intact. Indigo hand-blocks and velvet pieces can be exchanged directly at our Chandkheda boutique."
    },
    {
      q: "How do I care for Hand-block Indigo and Silk garments?",
      a: "For organic cotton Indigos, we recommend hand washing separately in cold water. For heavy silks and velvet sets with zardozi embroidery, dry cleaning is strictly recommended to preserve the metallic weave."
    },
    {
      q: "Is Cash on Delivery (COD) available?",
      a: "Yes! We offer free Cash on Delivery (COD) shipping across India. There are no additional charges, and standard delivery takes 3-5 business days."
    },
    {
      q: "What is your order cancellation policy?",
      a: "Orders can be cancelled free of charge within 24 hours of placement, provided they have not yet been shipped from our Ahmedabad boutique. To request cancellation, contact us at daitracouture@gmail.com or WhatsApp +91 84694 41014 with your Order ID. Refunds for online payments are processed back to the original method in 5-7 business days."
    }
  ];

  const handleFaqToggle = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  return (
    <section id="boutique-section" className="boutique-section">
      <div className="section-header-center">
        <span className="section-subtitle">VISIT US</span>
        <h2 className="section-title">Our Flagship Boutique</h2>
        <div className="section-divider"></div>
      </div>

      <div className="boutique-grid">
        {/* Left Panel: Store Details */}
        <div className="boutique-info-card">
          <div className="brand-logo-mini">
            <img src="/assets/logo.png" alt="DAITRA" className="logo-mini-img" />
            <h3>DAITRA Couture</h3>
          </div>
          
          <p className="boutique-desc">
            Step into a world where modern fashion embraces heritage craftsmanship. Visit our physical store in Ahmedabad to touch, feel, and try on our exclusive collections with personalized styling assistance.
          </p>

          <div className="boutique-details-list">
            <div className="boutique-detail-item">
              <MapPin className="detail-icon" size={22} />
              <div>
                <h4>Boutique Location</h4>
                <p>2, Aavkar Bungalows, Sona Cross Road, New CG Rd, Chandkheda, Ahmedabad, Gujarat 382424</p>
              </div>
            </div>

            <div className="boutique-detail-item">
              <Clock className="detail-icon" size={22} />
              <div>
                <h4>Opening Hours</h4>
                <p className="status-open">Open Today: 11:00 AM — 9:00 PM</p>
                <span className="days-list">Monday to Saturday: 11:00 AM - 9:00 PM (Sunday Closed)</span>
              </div>
            </div>

            <div className="boutique-detail-item">
              <Phone className="detail-icon" size={22} />
              <div>
                <h4>Contact Store</h4>
                <p>+91 84694 41014 &nbsp;|&nbsp; daitracouture@gmail.com</p>
              </div>
            </div>
          </div>

          <div className="boutique-badges-row">
            <div className="boutique-badge">
              <Award size={16} />
              <span>Women-Owned</span>
            </div>
            <div className="boutique-badge">
              <Heart size={16} />
              <span>LGBTQ+ Friendly</span>
            </div>
          </div>

          <a 
            href={mapAddressUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-gold boutique-directions-btn"
          >
            <Navigation size={18} />
            <span>GET DIRECTIONS ON MAPS</span>
          </a>
        </div>

        {/* Right Panel: Beautiful Mock Map Layout */}
        <div className="boutique-map-container">
          <div className="mock-map">
            {/* Grid styling background representing city blocks */}
            <div className="map-grid-bg"></div>
            
            {/* Roads Layout */}
            <div className="map-road road-horizontal road-cg">
              <span className="road-label">New CG Road</span>
            </div>
            <div className="map-road road-vertical road-sona">
              <span className="road-label">Sona Cross Road</span>
            </div>
            <div className="map-road road-horizontal road-aavkar">
              <span className="road-label">Aavkar Lane</span>
            </div>

            {/* Landmarks */}
            <div className="map-landmark block-residential">Aavkar Bungalows</div>
            <div className="map-landmark block-commercial">Sona Cross Intersection</div>
            <div className="map-landmark block-shopping">Chandkheda Market</div>

            {/* Pulsing Pin for DAITRA */}
            <div className="map-pin-daitra">
              <div className="pin-pulse"></div>
              <div className="pin-dot">
                <img src="/assets/logo.png" alt="Pin Logo" className="pin-logo" />
              </div>
              <div className="pin-tooltip">
                <strong>DAITRA COUTURE</strong>
                <span>Tradition Meets Grace</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion FAQ Block */}
      <div className="boutique-faq-section">
        <h3 className="faq-section-title">Boutique Service FAQ</h3>
        <div className="faq-accordions-list">
          {FAQS.map((faq, idx) => (
            <div key={idx} className={`faq-accordion-card ${activeFaq === idx ? 'active' : ''}`}>
              <button 
                type="button" 
                className="faq-question-btn" 
                onClick={() => handleFaqToggle(idx)}
              >
                <span>{faq.q}</span>
                <ChevronDown className="faq-chevron" size={16} />
              </button>
              <div className="faq-answer-container">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
