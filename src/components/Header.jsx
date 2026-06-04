import React, { useState, useEffect } from 'react';
import { Search, Heart, ShoppingBag, MapPin, Star, Menu, X, User, LogOut } from 'lucide-react';

export default function Header({
  cartCount,
  wishlistCount,
  onCartToggle,
  onPageChange,
  activePage,
  onSearchChange,
  searchTerm,
  onCategorySelect,
  user,
  onLogout,
  onLoginOpen,
  onWishlistClick
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [mobileImageError, setMobileImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
    setMobileImageError(false);
  }, [user]);

  const handleNavClick = (page, selector = null) => {
    setMobileMenuOpen(false);
    if (page === 'boutique') {
      window.location.hash = '#/boutique';
      const el = document.getElementById('boutique-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (page === 'reviews') {
      window.location.hash = '#/reviews';
      const el = document.getElementById('reviews-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      onPageChange(page);
      if (selector) {
        setTimeout(() => {
          const element = document.querySelector(selector);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleCategoryNav = (cat) => {
    setMobileMenuOpen(false);
    if (cat === 'all') {
      window.location.hash = '#/shop';
    } else {
      window.location.hash = `#/shop/category/${cat}`;
    }
  };

  return (
    <header className="site-header">
      {/* Announcement Bar */}
      <div className="announcement-bar">
        <div className="announcement-slide">
          <span>✨ DAITRA — When Tradition Meets Grace ✨ &nbsp;&nbsp;|&nbsp;&nbsp; Visit our Boutique at Chandkheda, Ahmedabad &nbsp;&nbsp;|&nbsp;&nbsp; Free Shipping PAN India & COD Available 💫</span>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="nav-container">
        <div className="nav-wrapper">
          {/* Mobile Menu Icon */}
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo Section */}
          <div className="logo-section" onClick={() => handleNavClick('home')}>
            <img src="/assets/logo.png" alt="DAITRA Logo" className="logo-img" />
            <div className="logo-text">
              <span className="brand-name">DAITRA</span>
              <span className="brand-tagline">WHEN TRADITION MEETS GRACE</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav">
            <button className={activePage === 'home' ? 'active' : ''} onClick={() => handleNavClick('home')}>Home</button>
            <div className="dropdown">
              <button className={activePage === 'shop' ? 'active' : ''} onClick={() => handleNavClick('shop', '#shop-section')}>Collections</button>
              <div className="dropdown-content">
                <button onClick={() => handleCategoryNav('all')}>All Collections</button>
                <button onClick={() => handleCategoryNav('kurtas')}>Kurtas & Sets</button>
                <button onClick={() => handleCategoryNav('gowns')}>Ethnic Gowns</button>
                <button onClick={() => handleCategoryNav('fusion')}>Fusion Wear</button>
              </div>
            </div>
            <button onClick={() => handleNavClick('boutique')}>Our Boutique</button>
            <button onClick={() => handleNavClick('reviews')}>Customer Reviews</button>
            <button className={activePage === 'track' ? 'active' : ''} onClick={() => handleNavClick('track')}>Track Order</button>
          </nav>

          {/* Right Action Icons */}
          <div className="header-actions">
            {/* Search Bar */}
            <div className="search-bar-wrapper">
              <input
                type="text"
                placeholder="Search outfits..."
                value={searchTerm}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (activePage !== 'shop') {
                    onPageChange('shop');
                  }
                }}
                className="search-input"
              />
              <Search className="search-icon" size={18} />
            </div>

            {/* Wishlist Button */}
            <button 
              className="action-btn wishlist-toggle" 
              onClick={() => {
                window.location.hash = '#/shop/wishlist';
              }}
              title="View Wishlist"
            >
              <Heart size={20} className={wishlistCount > 0 ? 'filled-heart' : ''} />
              {wishlistCount > 0 && <span className="badge">{wishlistCount}</span>}
            </button>

            {/* Cart Button */}
            <button className="action-btn cart-toggle-btn" onClick={onCartToggle} title="Open Cart">
              <ShoppingBag size={20} />
              {cartCount > 0 && <span className="badge badge-gold">{cartCount}</span>}
            </button>

            {/* Google User Avatar Profile / Sign In */}
            {user ? (
              <div 
                className="header-user-profile" 
                onMouseLeave={() => setProfileDropdownOpen(false)}
              >
                <button 
                  className="user-avatar-btn" 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  onMouseEnter={() => setProfileDropdownOpen(true)}
                  title="User Account"
                >
                  {user.picture && !imageError ? (
                    <img 
                      src={user.picture} 
                      alt="" 
                      className="header-user-avatar" 
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="header-user-avatar-initial" aria-label={user.name}>
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </button>
                {profileDropdownOpen && (
                  <div className="user-dropdown-menu" onMouseEnter={() => setProfileDropdownOpen(true)}>
                    <div className="user-dropdown-info">
                      <span className="user-name">{user.name}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                    <button className="user-dropdown-item" onClick={() => { onPageChange('track'); setProfileDropdownOpen(false); }}>
                      <ShoppingBag size={14} /> My Orders
                    </button>
                    <button className="user-dropdown-item" onClick={() => { onPageChange('admin'); setProfileDropdownOpen(false); }}>
                      <User size={14} /> Boutique Admin
                    </button>
                    <div className="user-dropdown-divider"></div>
                    <button className="user-dropdown-item logout-btn" onClick={() => { onLogout(); setProfileDropdownOpen(false); }}>
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn-header-login" onClick={onLoginOpen} title="Sign in with Google">
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <nav className="mobile-nav">
          {user ? (
            <div className="mobile-user-profile">
              {user.picture && !mobileImageError ? (
                <img 
                  src={user.picture} 
                  alt="" 
                  className="mobile-user-avatar" 
                  onError={() => setMobileImageError(true)}
                />
              ) : (
                <div className="mobile-user-avatar-initial" aria-label={user.name}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="mobile-user-info">
                <span className="mobile-user-name">{user.name}</span>
                <span className="mobile-user-email">{user.email}</span>
              </div>
            </div>
          ) : (
            <div className="mobile-user-login-prompt">
              <button className="btn-mobile-login" onClick={() => { onLoginOpen(); setMobileMenuOpen(false); }}>
                Sign In with Google
              </button>
            </div>
          )}

          <button className={activePage === 'home' ? 'active' : ''} onClick={() => handleNavClick('home')}>Home</button>
          <button className={activePage === 'shop' ? 'active' : ''} onClick={() => handleNavClick('shop', '#shop-section')}>All Collections</button>
          <div className="mobile-sub-nav">
            <button onClick={() => handleCategoryNav('kurtas')}>Kurtas & Sets</button>
            <button onClick={() => handleCategoryNav('gowns')}>Ethnic Gowns</button>
            <button onClick={() => handleCategoryNav('fusion')}>Fusion Wear</button>
          </div>
          <button onClick={() => handleNavClick('boutique')}>Our Boutique</button>
          <button onClick={() => handleNavClick('reviews')}>Customer Reviews</button>
          <button className={activePage === 'track' ? 'active' : ''} onClick={() => handleNavClick('track')}>Track Order</button>
          
          {user && (
            <>
              <div className="mobile-nav-divider"></div>
              <button onClick={() => { handleNavClick('admin'); }}>Boutique Admin</button>
              <button className="mobile-logout-btn" onClick={() => { onLogout(); setMobileMenuOpen(false); }}>
                Sign Out
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
