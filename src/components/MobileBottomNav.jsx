import React from 'react';
import { Home, Grid, Heart, ShoppingBag, Truck } from 'lucide-react';

export default function MobileBottomNav({
  activePage,
  onPageChange,
  cartCount,
  wishlistCount,
  onCartToggle
}) {
  const currentHash = window.location.hash || '#/';

  const isHomeActive = activePage === 'home' && currentHash === '#/';
  const isShopActive = activePage === 'shop' && !currentHash.includes('/wishlist');
  const isWishlistActive = currentHash === '#/shop/wishlist';
  const isTrackActive = activePage === 'track';

  const handleNav = (target) => {
    if (target === 'home') {
      window.location.hash = '#/';
    } else if (target === 'shop') {
      window.location.hash = '#/shop';
    } else if (target === 'wishlist') {
      window.location.hash = '#/shop/wishlist';
    } else if (target === 'track') {
      window.location.hash = '#/track';
    }
  };

  return (
    <nav className="mobile-bottom-nav">
      <button
        className={`mobile-nav-item ${isHomeActive ? 'active' : ''}`}
        onClick={() => handleNav('home')}
      >
        <Home size={20} />
        <span>Home</span>
      </button>

      <button
        className={`mobile-nav-item ${isShopActive ? 'active' : ''}`}
        onClick={() => handleNav('shop')}
      >
        <Grid size={20} />
        <span>Catalog</span>
      </button>

      <button
        className={`mobile-nav-item ${isWishlistActive ? 'active' : ''}`}
        onClick={() => handleNav('wishlist')}
      >
        <div className="nav-icon-wrapper">
          <Heart size={20} className={wishlistCount > 0 ? 'filled-heart' : ''} />
          {wishlistCount > 0 && <span className="mobile-badge">{wishlistCount}</span>}
        </div>
        <span>Wishlist</span>
      </button>

      <button
        className="mobile-nav-item"
        onClick={onCartToggle}
      >
        <div className="nav-icon-wrapper">
          <ShoppingBag size={20} />
          {cartCount > 0 && <span className="mobile-badge gold">{cartCount}</span>}
        </div>
        <span>Bag</span>
      </button>

      <button
        className={`mobile-nav-item ${isTrackActive ? 'active' : ''}`}
        onClick={() => handleNav('track')}
      >
        <Truck size={20} />
        <span>Track</span>
      </button>
    </nav>
  );
}
