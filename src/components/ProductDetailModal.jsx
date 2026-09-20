import React, { useState, useEffect } from 'react';
import { X, Heart, Star, Shield, RefreshCw, Truck, Check, AlertCircle, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { db } from '../utils/db';

const isVideo = (url) => {
  if (!url) return false;
  if (url.startsWith('data:video/')) return true;
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().split('?')[0].endsWith(ext));
};

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
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Touch Swipe States
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

  // Reviews states
  const [reviews, setReviews] = useState([]);
  const [writeMode, setWriteMode] = useState(false);
  const [newReview, setNewReview] = useState({ name: '', rating: 5, comment: '' });
  const [attachedImage, setAttachedImage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [validationError, setValidationError] = useState('');

  const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('daitra_admin_logged') === 'true';

  const getMyReviewIds = () => {
    try {
      return JSON.parse(localStorage.getItem('daitra_my_review_ids') || '[]');
    } catch (e) {
      return [];
    }
  };

  useEffect(() => {
    if (!product) return;
    
    const loadReviews = async () => {
      const allReviews = await db.getReviews();
      setReviews(allReviews.filter(r => r.productId === product.id));
    };
    
    loadReviews();
    setActiveImgIndex(0); // Reset index on product change
    setSelectedSize('');
    setErrorMsg('');

    window.addEventListener('daitra_reviews_updated', loadReviews);
    return () => window.removeEventListener('daitra_reviews_updated', loadReviews);
  }, [product?.id]);

  if (!product) return null;

  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  const imagesList = product.images && product.images.length > 0 ? product.images : [product.image];
  const mediaList = [...imagesList];
  if (product.video && !mediaList.includes(product.video)) {
    mediaList.push(product.video);
  }

  const handleTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 35;

    if (distance > minSwipeDistance && mediaList.length > 1) {
      // Swiped left -> Next image
      setActiveImgIndex((prev) => (prev + 1) % mediaList.length);
    } else if (distance < -minSwipeDistance && mediaList.length > 1) {
      // Swiped right -> Prev image
      setActiveImgIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
    }

    setTouchStartX(null);
    setTouchEndX(null);
  };

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

  const whatsappMessage = encodeURIComponent(
    `Hello DAITRA Boutique! I am interested in purchasing:\n\n*Product:* ${product.title}\n*Price:* ₹${product.price.toLocaleString('en-IN')}\n*Selected Size:* ${selectedSize || 'Not selected yet'}\n\nPlease share availability details.`
  );
  const whatsappUrl = `https://wa.me/918469441014?text=${whatsappMessage}`;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setValidationError('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImage(reader.result);
      setValidationError('');
    };
    reader.readAsDataURL(file);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.comment.trim()) {
      setValidationError('Please fill in both name and review comment.');
      return;
    }
    setValidationError('');

    const newId = Date.now();
    const reviewObject = {
      id: newId,
      productId: product.id,
      name: newReview.name,
      rating: newReview.rating,
      date: "Just now",
      comment: newReview.comment,
      image: attachedImage || null,
      ownerReply: null,
      verified: true
    };

    await db.saveReview(reviewObject);

    // Save to user created review IDs
    const myIds = getMyReviewIds();
    myIds.push(newId);
    localStorage.setItem('daitra_my_review_ids', JSON.stringify(myIds));

    const allReviews = await db.getReviews();
    const productReviews = allReviews.filter(r => r.productId === product.id);
    setReviews(productReviews);

    // Sync product reviewsCount and rating back to catalogs in localStorage
    const newReviewsCount = productReviews.length;
    const newAverageRating = Number((productReviews.reduce((sum, r) => sum + r.rating, 0) / newReviewsCount).toFixed(1));

    const savedProds = localStorage.getItem('daitra_db_products');
    if (savedProds) {
      const parsed = JSON.parse(savedProds);
      const pIdx = parsed.findIndex(p => p.id === product.id);
      if (pIdx > -1) {
        parsed[pIdx].reviewsCount = newReviewsCount;
        parsed[pIdx].rating = newAverageRating;
        localStorage.setItem('daitra_db_products', JSON.stringify(parsed));
      }
    }

    // Update in-memory references and fire update event
    product.reviewsCount = newReviewsCount;
    product.rating = newAverageRating;
    window.dispatchEvent(new Event('daitra_catalog_updated'));

    setNewReview({ name: '', rating: 5, comment: '' });
    setAttachedImage('');
    setSuccessMsg('Thank you! Your product review has been submitted.');
    setWriteMode(false);
    
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  const handleDeleteReview = async (reviewId) => {
    if (window.confirm('Are you sure you want to delete this review?')) {
      await db.deleteReview(reviewId);
      const myIds = getMyReviewIds().filter(id => id !== reviewId);
      localStorage.setItem('daitra_my_review_ids', JSON.stringify(myIds));

      const allReviews = await db.getReviews();
      const productReviews = allReviews.filter(r => r.productId === product.id);
      setReviews(productReviews);

      const newReviewsCount = productReviews.length;
      const newAverageRating = newReviewsCount > 0 
        ? Number((productReviews.reduce((sum, r) => sum + r.rating, 0) / newReviewsCount).toFixed(1))
        : 5.0;

      const savedProds = localStorage.getItem('daitra_db_products');
      if (savedProds) {
        const parsed = JSON.parse(savedProds);
        const pIdx = parsed.findIndex(p => p.id === product.id);
        if (pIdx > -1) {
          parsed[pIdx].reviewsCount = newReviewsCount;
          parsed[pIdx].rating = newAverageRating;
          localStorage.setItem('daitra_db_products', JSON.stringify(parsed));
        }
      }

      product.reviewsCount = newReviewsCount;
      product.rating = newAverageRating;
      window.dispatchEvent(new Event('daitra_catalog_updated'));
    }
  };

  // Calculations for dynamic average
  const calculatedRating = reviews.length > 0
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
    : product.rating;

  const calculatedCount = reviews.length > 0 ? reviews.length : product.reviewsCount;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-content-grid">
          {/* Left: Product Images Gallery */}
          <div className="modal-image-gallery">
            <div 
              className="main-image-wrapper"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {isVideo(mediaList[activeImgIndex]) ? (
                <video 
                  src={mediaList[activeImgIndex]} 
                  controls 
                  autoPlay 
                  muted 
                  loop 
                  className="modal-main-img" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <img src={mediaList[activeImgIndex]} alt={product.title} className="modal-main-img" />
              )}
              {product.tags && product.tags.length > 0 && (
                <div className="modal-badge">{product.tags[0]}</div>
              )}
              
              {/* Navigation Arrows */}
              {mediaList.length > 1 && (
                <>
                  <button 
                    className="gallery-nav-btn gallery-nav-left" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImgIndex((activeImgIndex - 1 + mediaList.length) % mediaList.length);
                    }}
                    title="Previous media"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    className="gallery-nav-btn gallery-nav-right" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImgIndex((activeImgIndex + 1) % mediaList.length);
                    }}
                    title="Next media"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
            {mediaList.length > 1 && (
              <div className="thumbnail-row">
                {mediaList.map((mediaUrl, idx) => (
                  <button
                    key={idx}
                    className={`thumbnail-btn ${activeImgIndex === idx ? 'active' : ''}`}
                    onClick={() => setActiveImgIndex(idx)}
                    style={{ position: 'relative' }}
                  >
                    {isVideo(mediaUrl) ? (
                      <div className="video-thumbnail-placeholder" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', color: 'var(--primary-gold)' }}>
                        <Play size={20} fill="var(--primary-gold)" />
                      </div>
                    ) : (
                      <img src={mediaUrl} alt={`${product.title} view ${idx + 1}`} />
                    )}
                  </button>
                ))}
              </div>
            )}
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
                    fill={i < Math.floor(calculatedRating) ? "var(--primary-gold)" : "transparent"} 
                    stroke="var(--primary-gold)" 
                  />
                ))}
              </div>
              <span className="rating-text">{calculatedRating.toFixed(1)}</span>
              <span className="reviews-link">({calculatedCount} verified reviews)</span>
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

            {/* Material & Fabric description */}
            {product.material && (
              <div className="modal-material-section">
                <span className="section-label">Material & Fabric</span>
                <p className="material-desc-text">{product.material}</p>
              </div>
            )}

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

            {/* WhatsApp Quick Inquiry Button */}
            <a 
              href={whatsappUrl}
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-whatsapp-inquire"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.56 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>Order / Inquire via WhatsApp</span>
            </a>

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

        {/* Dress Reviews Portal */}
        <div className="modal-reviews-container">
          <div className="modal-reviews-header">
            <h3>Customer Reviews ({calculatedCount})</h3>
            {!writeMode ? (
              <button className="btn btn-gold btn-sm" onClick={() => setWriteMode(true)}>
                WRITE A REVIEW
              </button>
            ) : (
              <button className="btn btn-dark btn-sm" onClick={() => setWriteMode(false)}>
                CANCEL
              </button>
            )}
          </div>

          {successMsg && (
            <div className="review-success-alert" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-gold-light)' }}>
              <Check size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {writeMode && (
            <form className="modal-write-review-form" onSubmit={handleReviewSubmit}>
              <h4 style={{ color: 'var(--primary-gold)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>Share Your Feedback</h4>
              
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sonal Vyas"
                  value={newReview.name}
                  onChange={(e) => setNewReview(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '10px', backgroundColor: '#161616', border: '1px solid var(--border-color)', color: '#fff' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Rating</label>
                <div className="rating-selector-stars" style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((starNum) => (
                    <button
                      key={starNum}
                      type="button"
                      onClick={() => setNewReview(prev => ({ ...prev, rating: starNum }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <Star
                        size={22}
                        fill={newReview.rating >= starNum ? "var(--primary-gold)" : "transparent"}
                        stroke="var(--primary-gold)"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Comment</label>
                <textarea
                  placeholder="Write details about fabric, material feel, size fit, and look..."
                  rows="3"
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '10px', backgroundColor: '#161616', border: '1px solid var(--border-color)', color: '#fff', resize: 'vertical' }}
                />
              </div>

              {/* Photo Upload for Product Review */}
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Attach Outfit Photo (Optional)</label>
                {!attachedImage ? (
                  <label className="photo-upload-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', backgroundColor: '#161616', border: '1px dashed var(--primary-gold)', color: 'var(--primary-gold)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}>
                    <Camera size={18} />
                    <span>Upload Photo from Device</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                ) : (
                  <div className="attached-photo-preview" style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={attachedImage} alt="Review attachment preview" style={{ width: '80px', height: '80px', objectFit: 'cover', border: '1px solid var(--primary-gold)', borderRadius: '4px' }} />
                    <button
                      type="button"
                      className="remove-attached-photo"
                      onClick={() => setAttachedImage('')}
                      style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: '#ff4d4d', color: '#fff', borderRadius: '50%', padding: '2px', border: 'none', cursor: 'pointer' }}
                      title="Remove Photo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {validationError && (
                <div className="review-validation-error-card" style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)' }}>
                  <AlertCircle size={16} />
                  <span>{validationError}</span>
                </div>
              )}

              <button type="submit" className="btn btn-gold" style={{ padding: '8px 18px', fontSize: '0.8rem' }}>
                SUBMIT FEEDBACK
              </button>
            </form>
          )}

          <div className="modal-reviews-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {reviews.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No reviews yet for this dress. Be the first to share your feedback!</p>
            ) : (
              reviews.map((rev) => {
                const myReviewIds = getMyReviewIds();
                const isMyReview = myReviewIds.includes(rev.id);
                const canDelete = isAdmin || isMyReview;

                return (
                  <div key={rev.id} className="review-card" style={{ padding: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
                    <div className="review-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="reviewer-avatar" style={{ width: '36px', height: '36px', fontSize: '0.95rem', borderRadius: '50%', backgroundColor: 'var(--border-color)', color: 'var(--primary-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--primary-gold)' }}>
                          {rev.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="reviewer-info">
                          <div className="reviewer-name-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h4 style={{ fontSize: '0.85rem', margin: 0, fontWeight: 600, color: 'var(--text-white)' }}>{rev.name}</h4>
                            {rev.verified && <span className="verified-badge" style={{ fontSize: '0.55rem', padding: '2px 6px', color: 'var(--primary-gold)', backgroundColor: 'rgba(212, 175, 55, 0.1)' }}>Verified Buyer</span>}
                          </div>
                          <div className="review-meta-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div className="stars-small" style={{ display: 'flex', gap: '2px' }}>
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} fill={i < rev.rating ? "var(--primary-gold)" : "transparent"} stroke="var(--primary-gold)" />
                              ))}
                            </div>
                            <span className="review-date" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{rev.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Customer / Admin Delete Button */}
                      {canDelete && (
                        <button
                          className="delete-review-btn"
                          onClick={() => handleDeleteReview(rev.id)}
                          style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '4px' }}
                          title={isAdmin ? "Admin: Delete Review" : "Delete My Review"}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <p className="review-comment" style={{ fontSize: '0.85rem', marginTop: '8px', color: '#d3d3d3', fontStyle: 'italic', margin: '8px 0 0 0' }}>"{rev.comment}"</p>

                    {/* Attached Photo */}
                    {rev.image && (
                      <div className="review-attached-photo-container" style={{ marginTop: '10px' }}>
                        <img src={rev.image} alt={`Review by ${rev.name}`} style={{ maxWidth: '140px', maxHeight: '140px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                      </div>
                    )}
                    
                    {rev.ownerReply && (
                      <div className="owner-reply-box" style={{ padding: '12px', marginTop: '10px', backgroundColor: '#161616', borderLeft: '2px solid var(--primary-gold)' }}>
                        <div className="reply-header" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <strong style={{ color: 'var(--primary-gold)' }}>Response from the owner</strong>
                        </div>
                        <p style={{ fontSize: '0.8rem', marginTop: '4px', color: 'var(--text-white)', margin: '4px 0 0 0' }}>"{rev.ownerReply}"</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sticky Mobile Action Bar */}
        <div className="mobile-modal-sticky-bar">
          <button className="btn btn-gold mobile-sticky-btn" onClick={handleAddToCart}>
            ADD TO BAG
          </button>
          <button className="btn btn-dark mobile-sticky-btn" onClick={handleBuyNow}>
            BUY NOW
          </button>
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
