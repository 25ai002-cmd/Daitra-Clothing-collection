import React from 'react';
import { Heart, Star } from 'lucide-react';

export default function ProductCard({
  product,
  onProductClick,
  onAddToCart,
  onToggleWishlist,
  isWishlisted
}) {
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  const handleQuickAdd = (e, size) => {
    e.stopPropagation();
    onAddToCart(product, size);
  };

  return (
    <div className="product-card" onClick={() => onProductClick(product)}>
      {/* Product Image Wrapper */}
      <div className="product-img-container">
        {/* Badges */}
        {product.tags && product.tags.length > 0 && (
          <div className="product-badge">{product.tags[0]}</div>
        )}
        {discount > 0 && (
          <div className="discount-badge">-{discount}%</div>
        )}

        {/* Wishlist Button */}
        <button
          className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          <Heart size={18} fill={isWishlisted ? "var(--primary-gold)" : "transparent"} />
        </button>

        {/* Images */}
        <img src={product.image} alt={product.title} className="product-card-img main-img" />
        {product.images && product.images[1] && (
          <img src={product.images[1]} alt={product.title} className="product-card-img hover-img" />
        )}

        {/* Quick Add Slide-up Panel */}
        <div className="quick-add-panel">
          <span className="quick-add-title">QUICK ADD</span>
          <div className="quick-add-sizes">
            {product.sizes.map((size) => (
              <button
                key={size}
                className="size-add-btn"
                onClick={(e) => handleQuickAdd(e, size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="product-card-info">
        <div className="product-rating">
          <Star size={13} fill="var(--primary-gold)" stroke="var(--primary-gold)" />
          <span className="rating-value">{product.rating.toFixed(1)}</span>
          <span className="reviews-count">({product.reviewsCount})</span>
        </div>
        <h3 className="product-card-title">{product.title}</h3>
        <div className="product-price-row">
          <span className="price-current">₹{product.price.toLocaleString('en-IN')}</span>
          {product.originalPrice > product.price && (
            <>
              <span className="price-original">₹{product.originalPrice.toLocaleString('en-IN')}</span>
              <span className="discount-text">({discount}% OFF)</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
