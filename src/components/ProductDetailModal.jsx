import React, { useState } from 'react';
import { X, Heart, Star, Shield, RefreshCw, Truck } from 'lucide-react';

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onToggleWishlist,
  isWishlisted
}) {
  const [selectedSize, setSelectedSize] = useState('');
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!product) return null;

  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  const handleAddToCart = () => {
    if (!selectedSize) {
      setErrorMsg('Please select a size before adding to cart');
      return;
    }
    setErrorMsg('');
    onAddToCart(product, selectedSize);
    onClose();
  };

  const handleBuyNow = () => {
    if (!selectedSize) {
      setErrorMsg('Please select a size to proceed');
      return;
    }
    setErrorMsg('');
    onAddToCart(product, selectedSize, true); // True triggers cart drawer auto-open
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-content-grid">
          {/* Left: Product Images */}
          <div className="modal-image-gallery">
            <div className="main-image-wrapper">
              <img src={product.image} alt={product.title} className="modal-main-img" />
              {product.tags && product.tags.length > 0 && (
                <div className="modal-badge">{product.tags[0]}</div>
              )}
            </div>
          </div>

          {/* Right: Product Details */}
          <div className="modal-details-container">
            <span className="modal-category">{product.category.toUpperCase()} Wear</span>
            <h2 className="modal-title">{product.title}</h2>

            <div className="modal-rating-row">
              <div className="stars-row">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    size={16} 
                    fill={i < Math.floor(product.rating) ? "var(--primary-gold)" : "transparent"} 
                    stroke="var(--primary-gold)" 
                  />
                ))}
              </div>
              <span className="rating-text">{product.rating.toFixed(1)}</span>
              <span className="reviews-link">({product.reviewsCount} verified reviews)</span>
            </div>

            <div className="modal-price-row">
              <span className="price-now">₹{product.price.toLocaleString('en-IN')}</span>
              {product.originalPrice > product.price && (
                <>
                  <span className="price-was">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                  <span className="discount-tag">{discount}% OFF</span>
                </>
              )}
            </div>

            <p className="modal-description">{product.description}</p>

            {/* Size Selector */}
            <div className="modal-size-section">
              <div className="size-header-row">
                <span className="section-label">Select Size</span>
                <button className="size-chart-link" onClick={() => setShowSizeChart(true)}>
                  Size Guide
                </button>
              </div>
              
              <div className="size-options-grid">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    className={`size-option-btn ${selectedSize === size ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedSize(size);
                      setErrorMsg('');
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {errorMsg && <p className="size-error-msg">{errorMsg}</p>}
            </div>

            {/* Action Buttons */}
            <div className="modal-actions-row">
              <button className="btn btn-gold flex-grow" onClick={handleAddToCart}>
                ADD TO BAG
              </button>
              <button className="btn btn-dark flex-grow" onClick={handleBuyNow}>
                BUY NOW
              </button>
              <button 
                className={`wishlist-icon-btn ${isWishlisted ? 'active' : ''}`}
                onClick={() => onToggleWishlist(product.id)}
                title="Save to Wishlist"
              >
                <Heart size={20} fill={isWishlisted ? "var(--primary-gold)" : "transparent"} />
              </button>
            </div>

            {/* Product Details Accents */}
            <div className="product-specifications">
              <h4 className="specs-title">Product Details</h4>
              <ul className="specs-list">
                {product.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>

            {/* Trust Badges */}
            <div className="trust-badges-grid">
              <div className="trust-badge">
                <Truck size={18} />
                <span>Pan-India Delivery</span>
              </div>
              <div className="trust-badge">
                <RefreshCw size={18} />
                <span>7-Day Return</span>
              </div>
              <div className="trust-badge">
                <Shield size={18} />
                <span>100% Quality Assured</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Size Chart Modal */}
      {showSizeChart && (
        <div className="size-chart-overlay" onClick={() => setShowSizeChart(false)}>
          <div className="size-chart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="size-chart-header">
              <h3>DAITRA Size Guide</h3>
              <button className="close-chart-btn" onClick={() => setShowSizeChart(false)}>
                <X size={20} />
              </button>
            </div>
            <p className="size-chart-note">All measurements are in inches. Standard Indian sizes.</p>
            <table className="size-chart-table">
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Chest</th>
                  <th>Waist</th>
                  <th>Hip</th>
                  <th>Shoulder</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>S (36)</td>
                  <td>36"</td>
                  <td>32"</td>
                  <td>39"</td>
                  <td>14.0"</td>
                </tr>
                <tr>
                  <td>M (38)</td>
                  <td>38"</td>
                  <td>34"</td>
                  <td>41"</td>
                  <td>14.5"</td>
                </tr>
                <tr>
                  <td>L (40)</td>
                  <td>40"</td>
                  <td>36"</td>
                  <td>43"</td>
                  <td>15.0"</td>
                </tr>
                <tr>
                  <td>XL (42)</td>
                  <td>42"</td>
                  <td>38"</td>
                  <td>45"</td>
                  <td>15.5"</td>
                </tr>
                <tr>
                  <td>XXL (44)</td>
                  <td>44"</td>
                  <td>40"</td>
                  <td>47"</td>
                  <td>16.0"</td>
                </tr>
              </tbody>
            </table>
            <button className="btn btn-dark close-chart-btn-bottom" onClick={() => setShowSizeChart(false)}>
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
