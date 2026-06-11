import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSlider from './components/HeroSlider';
import CategoryGrid from './components/CategoryGrid';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import StoreLocator from './components/StoreLocator';
import ReviewPortal from './components/ReviewPortal';
import Footer from './components/Footer';
import OrderTracker from './components/OrderTracker';
import BoutiqueAdmin from './components/BoutiqueAdmin';
import GoogleLoginModal from './components/GoogleLoginModal';
import { db } from './utils/db';
import { Sparkles, Star, Award, Heart } from 'lucide-react';

export default function App() {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [googleLoginOpen, setGoogleLoginOpen] = useState(false);
  const [activePage, setActivePage] = useState('home'); // 'home' | 'shop'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [sortOption, setSortOption] = useState('featured');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, title: '', size: '', image: '' });
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  const [productsList, setProductsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);

  // Sync activePage state with window.location.hash to support back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/';
      
      if (hash === '#/boutique') {
        setActivePage('home');
        setSelectedProduct(null);
        setTimeout(() => {
          const element = document.getElementById('boutique-section');
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else if (hash === '#/reviews') {
        setActivePage('home');
        setSelectedProduct(null);
        setTimeout(() => {
          const element = document.getElementById('reviews-section');
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else if (hash === '#/' || hash === '') {
        setActivePage('home');
        setSelectedProduct(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (hash === '#/shop') {
        setActivePage('shop');
        setSelectedCategory('all');
        setShowWishlistOnly(false);
        setSelectedProduct(null);
        setTimeout(() => {
          const element = document.getElementById('shop-section');
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else if (hash.startsWith('#/shop/category/')) {
        const categoryId = hash.replace('#/shop/category/', '');
        setActivePage('shop');
        setSelectedCategory(categoryId);
        setShowWishlistOnly(false);
        setSelectedProduct(null);
        setTimeout(() => {
          const element = document.getElementById('shop-section');
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else if (hash === '#/shop/wishlist') {
        setActivePage('shop');
        setShowWishlistOnly(true);
        setSelectedCategory('all');
        setSelectedSize('all');
        setSearchTerm('');
        setSelectedProduct(null);
        setTimeout(() => {
          const element = document.getElementById('shop-section');
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } else if (hash.startsWith('#/product/')) {
        const productId = parseInt(hash.replace('#/product/', ''), 10);
        setActivePage(prev => (prev === 'home' || prev === 'shop') ? prev : 'shop');
        const prod = productsList.find(p => p.id === productId);
        if (prod) {
          setSelectedProduct(prod);
        } else if (productsList.length > 0) {
          setSelectedProduct(null);
        }
      } else if (hash === '#/track' || hash.startsWith('#/track/')) {
        setActivePage('track');
        setSelectedProduct(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (hash === '#/admin') {
        setActivePage('admin');
        setSelectedProduct(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Sync initial load page

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [productsList]);

  // Load initial user state and catalog items on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('daitra_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    loadCatalog();

    // Listen to catalog changes from Admin
    window.addEventListener('daitra_catalog_updated', loadCatalog);
    return () => {
      window.removeEventListener('daitra_catalog_updated', loadCatalog);
    };
  }, []);

  const loadCatalog = async () => {
    const prods = await db.getProducts();
    setProductsList(prods);
    const cats = await db.getCategories();
    setCategoriesList(cats);
  };

  const checkPurchaseStatus = async () => {
    const orders = await db.getOrders();
    if (user) {
      const userHasOrder = orders.some(o => o.customerEmail?.toLowerCase() === user.email.toLowerCase());
      setHasPurchased(userHasOrder);
    } else {
      setHasPurchased(orders.length > 0);
    }
  };

  useEffect(() => {
    checkPurchaseStatus();
    window.addEventListener('daitra_new_order_placed', checkPurchaseStatus);
    return () => {
      window.removeEventListener('daitra_new_order_placed', checkPurchaseStatus);
    };
  }, [user]);

  // Synchronize cart and wishlist whenever user session state changes
  useEffect(() => {
    const cartKey = user ? `daitra_cart_${user.email}` : 'daitra_cart_guest';
    const wishlistKey = user ? `daitra_wishlist_${user.email}` : 'daitra_wishlist_guest';
    
    const savedCart = localStorage.getItem(cartKey);
    const savedWishlist = localStorage.getItem(wishlistKey);
    
    setCart(savedCart ? JSON.parse(savedCart) : []);
    setWishlist(savedWishlist ? JSON.parse(savedWishlist) : []);
  }, [user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('daitra_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('daitra_user');
    window.location.hash = '#/';
  };

  const handlePageChange = (page) => {
    const targetHash = page === 'home' ? '#/' : `#/${page}`;
    if (window.location.hash === targetHash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.hash = targetHash;
    }
  };

  const saveCartToStorage = (newCart) => {
    setCart(newCart);
    const cartKey = user ? `daitra_cart_${user.email}` : 'daitra_cart_guest';
    localStorage.setItem(cartKey, JSON.stringify(newCart));
  };

  const saveWishlistToStorage = (newWishlist) => {
    setWishlist(newWishlist);
    const wishlistKey = user ? `daitra_wishlist_${user.email}` : 'daitra_wishlist_guest';
    localStorage.setItem(wishlistKey, JSON.stringify(newWishlist));
  };

  // Add Item to Cart
  const handleAddToCart = (product, size, openCart = false) => {
    const existingIndex = cart.findIndex(
      (item) => item.id === product.id && item.selectedSize === size
    );

    let updatedCart = [...cart];
    if (existingIndex > -1) {
      updatedCart[existingIndex].quantity += 1;
    } else {
      updatedCart.push({
        ...product,
        selectedSize: size,
        quantity: 1
      });
    }

    saveCartToStorage(updatedCart);

    if (openCart) {
      setCartOpen(true);
    } else {
      // Trigger custom sliding toast alert
      setToast({
        visible: true,
        title: product.title,
        size: size,
        image: product.image
      });
      
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 3000);
    }
  };

  const handleCopyCoupon = () => {
    navigator.clipboard.writeText('WELCOME10');
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Update Cart Quantity
  const handleUpdateQty = (itemId, size, newQty) => {
    const updatedCart = cart.map((item) => {
      if (item.id === itemId && item.selectedSize === size) {
        return { ...item, quantity: newQty };
      }
      return item;
    });
    saveCartToStorage(updatedCart);
  };

  // Remove Item from Cart
  const handleRemoveItem = (itemId, size) => {
    const updatedCart = cart.filter(
      (item) => !(item.id === itemId && item.selectedSize === size)
    );
    saveCartToStorage(updatedCart);
  };

  // Clear Cart
  const handleClearCart = () => {
    saveCartToStorage([]);
  };

  // Toggle Wishlist
  const handleToggleWishlist = (productId) => {
    let updatedWishlist = [...wishlist];
    if (wishlist.includes(productId)) {
      updatedWishlist = updatedWishlist.filter((id) => id !== productId);
    } else {
      updatedWishlist.push(productId);
    }
    saveWishlistToStorage(updatedWishlist);
  };

  // Select Category from Hero or Grid
  const handleCategorySelect = (category) => {
    if (category === 'all') {
      window.location.hash = '#/shop';
    } else {
      window.location.hash = `#/shop/category/${category}`;
    }
  };

  const handleProductClick = (product) => {
    window.location.hash = `#/product/${product.id}`;
  };

  const handleProductClose = () => {
    if (window.location.hash.startsWith('#/product/')) {
      window.history.back();
      setTimeout(() => {
        if (window.location.hash.startsWith('#/product/')) {
          window.location.hash = '#/shop';
        }
      }, 100);
    } else {
      setSelectedProduct(null);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedSize('all');
    setSearchTerm('');
    setSortOption('featured');
    if (window.location.hash !== '#/shop') {
      window.location.hash = '#/shop';
    } else {
      setSelectedCategory('all');
      setShowWishlistOnly(false);
    }
  };

  // Filtering & Sorting Math
  const filteredProducts = productsList.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSize = selectedSize === 'all' || product.sizes.includes(selectedSize);
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWishlist = !showWishlistOnly || wishlist.includes(product.id);
    return matchesCategory && matchesSize && matchesSearch && matchesWishlist;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortOption === 'lowToHigh') return a.price - b.price;
    if (sortOption === 'highToLow') return b.price - a.price;
    return b.rating - a.rating; // default: featured (by rating/bestseller)
  });

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const bestSellers = productsList.filter(p => p.tags.includes('Best Seller') || p.rating >= 4.9);

  return (
    <div className="app-container">
      <Header
        cartCount={totalCartCount}
        wishlistCount={wishlist.length}
        onCartToggle={() => setCartOpen(true)}
        onPageChange={handlePageChange}
        activePage={activePage}
        onSearchChange={setSearchTerm}
        searchTerm={searchTerm}
        onCategorySelect={setSelectedCategory}
        user={user}
        onLogout={handleLogout}
        onLoginOpen={() => setGoogleLoginOpen(true)}
        onWishlistClick={() => {
          setShowWishlistOnly(true);
          setSelectedCategory('all');
          setSelectedSize('all');
          setSearchTerm('');
        }}
      />

      {activePage === 'home' && (
        <main className="page-home fade-in">
          {/* Hero slider */}
          <HeroSlider onShopClick={handleCategorySelect} />

          {/* Category Spotlights */}
          <CategoryGrid onCategorySelect={handleCategorySelect} />

          {/* Best Sellers Segment */}
          <section className="best-sellers-section">
            <div className="section-header-center">
              <span className="section-subtitle">OUR FAVORITES</span>
              <h2 className="section-title">Best Sellers</h2>
              <div className="section-divider"></div>
            </div>
            <div className="product-grid">
              {bestSellers.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onProductClick={handleProductClick}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={wishlist.includes(product.id)}
                />
              ))}
            </div>
          </section>

          {/* Brand Philosophy Overlay Banner */}
          <section className="philosophy-section">
            <div className="philosophy-wrapper">
              <div className="philosophy-content">
                <Sparkles size={32} className="philosophy-icon" />
                <span className="philosophy-sub">THE DAITRA PROMISE</span>
                <h3>When Tradition Meets Grace</h3>
                <p>
                  At DAITRA, we believe that garments carry stories of culture, loom, and lineage. Inspired by the heritage of Gujarat and the vibrant colors of Indian handlooms, every weave is crafted to bring comfort and graceful luxury to your wardrobe. From block-printed cottons to pure hand-embroidered Chanderi silks, we celebrate the artisan and the woman.
                </p>
                <div className="philosophy-highlights">
                  <div className="p-badge">
                    <Award size={18} />
                    <span>Premium Artisan Blends</span>
                  </div>
                  <div className="p-badge">
                    <Sparkles size={18} />
                    <span> Ahmedabad Designer Boutique</span>
                  </div>
                </div>
                <button className="btn btn-gold" onClick={() => handleCategorySelect('all')}>
                  EXPLORE THE CATALOG
                </button>
              </div>
              <div className="philosophy-image-box">
              <img src="/dresses/14.jpg" alt="Traditional Elegance" className="philosophy-img" />
              </div>
            </div>
          </section>

          {/* Store Location Panel */}
          <StoreLocator />

          {/* Reviews Rating Panel */}
          <ReviewPortal />
        </main>
      )}

      {activePage === 'shop' && (
        <main className="page-shop fade-in" id="shop-section">
          {/* Shop Header banner */}
          <div className="shop-hero-banner">
            <div className="shop-hero-content">
              <h2>{showWishlistOnly ? 'Your Wishlist' : 'DAITRA Collections'}</h2>
              <p>{showWishlistOnly ? 'Explore and checkout your handpicked traditional outfits.' : 'Explore handcrafted ethnic suits, flowing gowns, and modern Indo-Western fusion wear.'}</p>
            </div>
          </div>

          <div className="shop-layout-grid">
            {/* Left: Filters Sidebar */}
            <aside className="shop-filters-sidebar">
              <div className="filter-group">
                <h3>Favorites</h3>
                <div className="filter-links-list">
                  <button 
                    className={showWishlistOnly ? 'active' : ''} 
                    onClick={() => {
                      if (showWishlistOnly) {
                        window.location.hash = '#/shop';
                      } else {
                        window.location.hash = '#/shop/wishlist';
                      }
                    }}
                  >
                    My Wishlist ({wishlist.length})
                  </button>
                </div>
              </div>

              <div className="filter-group">
                <h3>Category</h3>
                <div className="filter-links-list">
                  <button 
                    className={selectedCategory === 'all' && !showWishlistOnly ? 'active' : ''} 
                    onClick={() => {
                      window.location.hash = '#/shop';
                    }}
                  >
                    All Outfits
                  </button>
                  {categoriesList.map((cat) => (
                    <button 
                      key={cat.id}
                      className={selectedCategory === cat.id && !showWishlistOnly ? 'active' : ''} 
                      onClick={() => {
                        window.location.hash = `#/shop/category/${cat.id}`;
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <h3>Filter by Size</h3>
                <div className="size-filters-row">
                  {['all', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                    <button
                      key={size}
                      className={`size-filter-btn ${selectedSize === size ? 'selected' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size === 'all' ? 'All' : size}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-dark reset-filters-btn" onClick={handleResetFilters}>
                Clear All Filters
              </button>
            </aside>

            {/* Right: Products Area */}
            <div className="shop-products-container">
              {/* Toolbar */}
              <div className="shop-toolbar-row">
                <span className="results-count">Showing {sortedProducts.length} outfits</span>
                
                <div className="sorting-selector-wrapper">
                  <label htmlFor="sort-select">Sort By:</label>
                  <select 
                    id="sort-select"
                    value={sortOption} 
                    onChange={(e) => setSortOption(e.target.value)}
                    className="sort-dropdown-input"
                  >
                    <option value="featured">Best Rating / Featured</option>
                    <option value="lowToHigh">Price: Low to High</option>
                    <option value="highToLow">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* Grid */}
              {sortedProducts.length === 0 ? (
                <div className="no-products-found">
                  <h3>No Outfits Found</h3>
                  <p>We couldn't find any clothing matching your specific filters. Try resetting.</p>
                  <button className="btn btn-gold" onClick={handleResetFilters}>
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="product-grid shop-grid">
                  {sortedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onProductClick={handleProductClick}
                      onAddToCart={handleAddToCart}
                      onToggleWishlist={handleToggleWishlist}
                      isWishlisted={wishlist.includes(product.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {activePage === 'track' && (
        <main className="page-track fade-in">
          <OrderTracker user={user} />
        </main>
      )}

      {activePage === 'admin' && (
        <main className="page-admin fade-in">
          <BoutiqueAdmin />
        </main>
      )}

      {/* Footer */}
      <Footer 
        onCategorySelect={setSelectedCategory} 
        onPageChange={handlePageChange} 
        categories={categoriesList}
      />

      {/* Product Detail Modal Quick view */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={handleProductClose}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
          isWishlisted={wishlist.includes(selectedProduct.id)}
        />
      )}

      {/* Sliding Shopping Bag Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        user={user}
        onLoginOpen={() => setGoogleLoginOpen(true)}
        hasPurchased={hasPurchased}
      />

      {/* Custom Premium Toast Notification */}
      {toast.visible && (
        <div className="toast-notification-card">
          <img src={toast.image} alt={toast.title} className="toast-thumb" />
          <div className="toast-info-block">
            <span className="toast-badge-success">Added to Bag</span>
            <h4 className="toast-title-text">{toast.title}</h4>
            <span className="toast-desc-text">Size: {toast.size} | Qty: 1</span>
          </div>
          <button className="toast-close" onClick={() => setToast(prev => ({ ...prev, visible: false }))}>
            &times;
          </button>
        </div>
      )}

      {/* Floating Interactive Coupon Ribbon */}
      {!hasPurchased && (
        <div className="floating-coupon-widget" onClick={handleCopyCoupon} title="Click to copy coupon code">
          <div className="coupon-emoji">🏷️</div>
          <div className="coupon-widget-content">
            <span className="coupon-widget-tag">FIRST PURCHASE</span>
            <strong className="coupon-widget-code">{copiedMessage ? 'COPIED! 🎉' : 'WELCOME10'}</strong>
          </div>
        </div>
      )}

      {/* Google Login Dialog */}
      <GoogleLoginModal
        isOpen={googleLoginOpen}
        onClose={() => setGoogleLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
