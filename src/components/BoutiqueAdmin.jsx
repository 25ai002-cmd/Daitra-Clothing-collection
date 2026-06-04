import React, { useState, useEffect } from 'react';
import { Package, ShieldAlert, CheckCircle2, Truck, ClipboardList, Search, Eye, ArrowRight, DollarSign, LogOut, PlusCircle, Settings, HelpCircle } from 'lucide-react';
import { sendCustomerConfirmationEmail } from '../utils/emailService';
import { db } from '../utils/db';

export default function BoutiqueAdmin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Dashboard states
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [emailNotify, setEmailNotify] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');

  // Admin Tab Navigation
  const [adminTab, setAdminTab] = useState('orders'); // 'orders' | 'catalog'

  // Catalog Management States
  const [categories, setCategories] = useState([]);
  const [upiId, setUpiId] = useState('daitracouture@okaxis');
  const [upiQrUrl, setUpiQrUrl] = useState('');
  
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatName, setNewCatName] = useState('');
  
  const [newProd, setNewProd] = useState({
    title: '',
    category: '',
    price: '',
    originalPrice: '',
    image: '',
    description: '',
    fabric: '',
    work: '',
    style: '',
    care: ''
  });
  const [prodSizes, setProdSizes] = useState([]);
  const [prodTags, setProdTags] = useState([]);
  
  const [catalogSuccess, setCatalogSuccess] = useState('');
  const [catalogError, setCatalogError] = useState('');

  // Status Labels matching OrderTracker.jsx
  const STATUSES = [
    { label: 'Order Placed', color: '#AA7C11' },
    { label: 'Processing', color: '#1E90FF' },
    { label: 'Dispatched', color: '#FF8C00' },
    { label: 'Out For Delivery', color: '#9370DB' },
    { label: 'Delivered', color: '#32CD32' }
  ];

  useEffect(() => {
    // Check if session is already active
    const activeSession = sessionStorage.getItem('daitra_admin_logged');
    if (activeSession === 'true') {
      setIsLoggedIn(true);
    }
    loadOrders();
    loadCatalogData();
    
    // Listen for new orders
    window.addEventListener('daitra_new_order_placed', loadOrders);
    return () => window.removeEventListener('daitra_new_order_placed', loadOrders);
  }, []);

  const loadOrders = async () => {
    const data = await db.getOrders();
    setOrders(data);
  };

  const loadCatalogData = async () => {
    const cats = await db.getCategories();
    setCategories(cats);
    const settings = await db.getSettings();
    if (settings) {
      setUpiId(settings.upi_id || 'daitracouture@okaxis');
      setUpiQrUrl(settings.upi_qr_url || '');
    }
    // Set default category in form if categories loaded
    if (cats.length > 0 && !newProd.category) {
      setNewProd(prev => ({ ...prev, category: cats[0].id }));
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim() === 'admin' && password === 'daitra123') {
      setIsLoggedIn(true);
      sessionStorage.setItem('daitra_admin_logged', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid username or password. (Hint: admin / daitra123)');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('daitra_admin_logged');
  };

  const handleUpdateStatus = async (orderId, nextStatusIndex) => {
    const updatedStatus = parseInt(nextStatusIndex);
    await db.updateOrderStatus(orderId, updatedStatus);
    
    // Get updated orders list
    const updatedOrders = await db.getOrders();
    setOrders(updatedOrders);

    // Sync selectedOrder preview if currently viewing
    const matchingOrder = updatedOrders.find(o => o.orderId === orderId);
    if (matchingOrder) {
      setSelectedOrder(matchingOrder);
      // Optionally send email confirmation to customer
      if (emailNotify && matchingOrder.customerInfo.email) {
        triggerStatusEmail(matchingOrder);
      }
    }
    
    setActionSuccess(`Order status updated successfully!`);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const triggerStatusEmail = async (order) => {
    const statusLabel = STATUSES[order.status].label;
    console.log(`Sending status update notification to customer: ${order.customerInfo.email}...`);
    
    const statusOrderCopy = {
      ...order,
      statusUpdateText: `Your order status has been updated to: **${statusLabel}**.`
    };

    try {
      const res = await sendCustomerConfirmationEmail(statusOrderCopy);
      if (res.success) {
        console.log('Customer tracking update email sent successfully! Msg ID:', res.messageId);
      } else {
        console.warn('Customer tracking email failed:', res.error);
      }
    } catch (e) {
      console.error('Failed dispatching tracking update email:', e);
    }
  };

  // UPI settings save
  const handleSaveUpiSettings = async (e) => {
    e.preventDefault();
    if (!upiId.trim()) {
      setCatalogError('UPI ID cannot be blank.');
      return;
    }
    setCatalogError('');
    await db.saveSettings({ upi_id: upiId.trim(), upi_qr_url: upiQrUrl.trim() });
    
    setCatalogSuccess('UPI Secure settings updated successfully!');
    setTimeout(() => setCatalogSuccess(''), 4000);
  };

  // Add Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatSlug.trim() || !newCatName.trim()) {
      setCatalogError('Category ID slug and Display Name are required.');
      return;
    }
    setCatalogError('');
    
    const categoryId = newCatSlug.trim().toLowerCase().replace(/\s+/g, '-');
    const categoryObj = { id: categoryId, name: newCatName.trim() };
    
    await db.saveCategory(categoryObj);
    await loadCatalogData();
    
    setNewCatSlug('');
    setNewCatName('');
    
    // Notify application that catalog structure updated
    window.dispatchEvent(new Event('daitra_catalog_updated'));

    setCatalogSuccess(`New section "${categoryObj.name}" added successfully!`);
    setTimeout(() => setCatalogSuccess(''), 4000);
  };

  // Add Product Dress
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProd.title.trim() || !newProd.price || !newProd.category || !newProd.image.trim()) {
      setCatalogError('Title, Category, Price, and Photo URL are required.');
      return;
    }
    setCatalogError('');

    const priceNum = parseFloat(newProd.price);
    const origPriceNum = newProd.originalPrice ? parseFloat(newProd.originalPrice) : Math.round(priceNum * 1.3);

    const productObj = {
      id: Date.now(),
      title: newProd.title.trim(),
      category: newProd.category,
      price: priceNum,
      originalPrice: origPriceNum,
      rating: 5.0,
      reviewsCount: 1,
      image: newProd.image.trim(),
      images: [newProd.image.trim()],
      description: newProd.description.trim() || 'A beautiful handcrafted garment by DAITRA designer boutique.',
      details: [
        `Fabric: ${newProd.fabric.trim() || 'Premium Handloom Blend'}`,
        `Work: ${newProd.work.trim() || 'Traditional Artisanal Craft'}`,
        `Style: ${newProd.style.trim() || 'Designer Tailored Fit'}`,
        `Care Instructions: ${newProd.care.trim() || 'Dry Clean Recommended'}`
      ],
      sizes: prodSizes.length > 0 ? prodSizes : ['S', 'M', 'L', 'XL'],
      tags: prodTags.length > 0 ? prodTags : ['New Arrival'],
      inStock: true
    };

    await db.saveProduct(productObj);
    
    // Reset product fields
    setNewProd({
      title: '',
      category: categories[0]?.id || '',
      price: '',
      originalPrice: '',
      image: '',
      description: '',
      fabric: '',
      work: '',
      style: '',
      care: ''
    });
    setProdSizes([]);
    setProdTags([]);
    
    // Notify application that catalog items updated
    window.dispatchEvent(new Event('daitra_catalog_updated'));
    
    setCatalogSuccess(`Dress "${productObj.title}" successfully added to catalog!`);
    setTimeout(() => setCatalogSuccess(''), 4000);
  };

  const handleSizeToggle = (size) => {
    if (prodSizes.includes(size)) {
      setProdSizes(prev => prev.filter(s => s !== size));
    } else {
      setProdSizes(prev => [...prev, size]);
    }
  };

  const handleTagToggle = (tag) => {
    if (prodTags.includes(tag)) {
      setProdTags(prev => prev.filter(t => t !== tag));
    } else {
      setProdTags(prev => [...prev, tag]);
    }
  };

  // Math totals
  const totalRevenue = orders.reduce((acc, o) => acc + o.totals.finalTotal, 0);
  const pendingCount = orders.filter(o => o.status < 4).length;
  const completedCount = orders.filter(o => o.status === 4).length;

  // Filters
  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.orderId.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          o.customerInfo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          o.customerInfo.phone.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'pending' && o.status < 4) ||
                          (statusFilter === 'delivered' && o.status === 4) ||
                          o.status === parseInt(statusFilter);

    return matchesSearch && matchesStatus;
  });

  if (!isLoggedIn) {
    return (
      <section className="admin-login-section">
        <div className="login-card-wrapper fade-in">
          <div className="login-header">
            <img src="/assets/logo.png" alt="DAITRA Couture" className="login-logo" />
            <h2>DAITRA Admin Portal</h2>
            <p>Access store management & order dispatch controls</p>
          </div>
          
          <form onSubmit={handleLogin} className="login-form">
            {loginError && (
              <div className="login-error-banner">
                <ShieldAlert size={16} />
                <span>{loginError}</span>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="admin-username">Username</label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            
            <button type="submit" className="btn btn-gold login-btn">
              LOG IN SECURELY
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-dashboard-section fade-in">
      <div className="admin-dashboard-header">
        <div>
          <span className="admin-badge">BOUTIQUE OFFICE</span>
          <h2>Store Management Dashboard</h2>
        </div>
        <button className="btn-logout" onClick={handleLogout} title="Log out from dashboard">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>

      {/* Tab controls */}
      <div className="admin-tab-nav">
        <button 
          className={`admin-nav-btn ${adminTab === 'orders' ? 'active' : ''}`}
          onClick={() => setAdminTab('orders')}
        >
          <ClipboardList size={16} />
          <span>Fulfill Orders ({orders.length})</span>
        </button>
        <button 
          className={`admin-nav-btn ${adminTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setAdminTab('catalog')}
        >
          <Package size={16} />
          <span>Manage Catalog & Settings</span>
        </button>
      </div>

      {/* Action Banners */}
      {actionSuccess && (
        <div className="admin-success-banner fade-in animate-bounce">
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {catalogSuccess && (
        <div className="admin-success-banner fade-in">
          <CheckCircle2 size={18} />
          <span>{catalogSuccess}</span>
        </div>
      )}

      {catalogError && (
        <div className="login-error-banner fade-in" style={{ margin: '15px 0' }}>
          <ShieldAlert size={18} />
          <span>{catalogError}</span>
        </div>
      )}

      {adminTab === 'orders' ? (
        <>
          {/* Stats row */}
          <div className="admin-stats-grid">
            <div className="stat-card">
              <ClipboardList className="stat-icon purple" size={24} />
              <div className="stat-info">
                <h4>Total Orders</h4>
                <p>{orders.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <Truck className="stat-icon gold" size={24} />
              <div className="stat-info">
                <h4>Pending Delivery</h4>
                <p>{pendingCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <CheckCircle2 className="stat-icon green" size={24} />
              <div className="stat-info">
                <h4>Delivered</h4>
                <p>{completedCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <DollarSign className="stat-icon green" size={24} />
              <div className="stat-info">
                <h4>Fulfillment Volume</h4>
                <p>₹{totalRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="admin-layout-grid">
            {/* Left: Orders List */}
            <div className="admin-panel orders-list-panel">
              <div className="panel-header-row">
                <h3>Active Store Orders ({filteredOrders.length})</h3>
                
                {/* Filters selectors */}
                <div className="panel-controls">
                  <div className="search-input-wrapper">
                    <Search size={14} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search order ID or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>

                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="status-filter-select"
                  >
                    <option value="all">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="delivered">Delivered</option>
                    <option value="0">Placed</option>
                    <option value="1">Processing</option>
                    <option value="2">Dispatched</option>
                    <option value="3">Out for Delivery</option>
                    <option value="4">Delivered</option>
                  </select>
                </div>
              </div>

              <div className="orders-table-wrapper">
                {filteredOrders.length === 0 ? (
                  <div className="no-orders-found">
                    <Package size={48} strokeWidth={1} />
                    <p>No orders matched your search filters.</p>
                  </div>
                ) : (
                  <table className="admin-orders-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Fulfillment Status</th>
                        <th>Total Value</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const statusObj = STATUSES[order.status] || STATUSES[0];
                        return (
                          <tr key={order.orderId} className={selectedOrder?.orderId === order.orderId ? 'selected' : ''}>
                            <td className="bold-text">{order.orderId}</td>
                            <td>{order.date.split(',')[0]}</td>
                            <td>
                              <div className="customer-info-col">
                                <strong>{order.customerInfo.name}</strong>
                                <span>{order.customerInfo.phone}</span>
                              </div>
                            </td>
                            <td>
                              <span className="status-badge" style={{ backgroundColor: `${statusObj.color}20`, color: statusObj.color, border: `1px solid ${statusObj.color}` }}>
                                {statusObj.label}
                              </span>
                            </td>
                            <td className="gold-text bold-text">₹{order.totals.finalTotal.toLocaleString('en-IN')}</td>
                            <td>
                              <button className="btn-table-action" onClick={() => setSelectedOrder(order)} title="View order details">
                                <Eye size={14} />
                                <span>Preview</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right: Order details sidebar */}
            <div className="admin-panel order-details-panel">
              {selectedOrder ? (
                <div className="order-details-wrapper fade-in">
                  <div className="details-header">
                    <h3>Order Fulfillment</h3>
                    <span className="order-id-tag">{selectedOrder.orderId}</span>
                  </div>

                  {/* Status Update Control */}
                  <div className="status-update-box">
                    <label>Change Status</label>
                    <div className="select-action-row">
                      <select 
                        value={selectedOrder.status}
                        onChange={(e) => handleUpdateStatus(selectedOrder.orderId, e.target.value)}
                        className="status-selector"
                      >
                        {STATUSES.map((status, index) => (
                          <option key={index} value={index}>{status.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <label className="checkbox-label notify-checkbox">
                      <input
                        type="checkbox"
                        checked={emailNotify}
                        onChange={(e) => setEmailNotify(e.target.checked)}
                      />
                      <span>Send status update email to customer</span>
                    </label>
                  </div>

                  <div className="details-divider"></div>

                  {/* Customer summary */}
                  <div className="details-section">
                    <h4>Customer & Shipping Details</h4>
                    <p>
                      <strong>Name:</strong> {selectedOrder.customerInfo.name}<br />
                      <strong>Email:</strong> {selectedOrder.customerInfo.email || 'None'}<br />
                      <strong>Phone:</strong> +91 {selectedOrder.customerInfo.phone}<br />
                      <strong>Address:</strong> {selectedOrder.customerInfo.address}, {selectedOrder.customerInfo.city} — {selectedOrder.customerInfo.pincode}<br />
                      <strong>Payment Method:</strong> {selectedOrder.paymentType}
                    </p>
                  </div>

                  <div className="details-divider"></div>

                  {/* Items summary */}
                  <div className="details-section">
                    <h4>Order Items ({selectedOrder.items.length})</h4>
                    <div className="admin-items-list">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="admin-item-row">
                          <img src={item.image} alt={item.title} className="admin-item-thumb" />
                          <div className="admin-item-info">
                            <h5>{item.title}</h5>
                            <span>Size: {item.selectedSize} | Qty: {item.quantity}</span>
                          </div>
                          <span className="admin-item-price">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="details-divider"></div>

                  {/* Pricing breakdown */}
                  <div className="admin-invoice-breakdown">
                    <div className="invoice-row">
                      <span>Subtotal</span>
                      <span>₹{selectedOrder.totals.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    {selectedOrder.totals.discountAmount > 0 && (
                      <div className="invoice-row discount">
                        <span>Promo Discount</span>
                        <span>- ₹{selectedOrder.totals.discountAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="invoice-row">
                      <span>Shipping Fee</span>
                      <span className="free-text">FREE</span>
                    </div>
                    <div className="invoice-row grand-total">
                      <span>Fulfillment Amount</span>
                      <span>₹{selectedOrder.totals.finalTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="details-empty-state">
                  <ClipboardList size={48} strokeWidth={1} />
                  <h4>No Order Selected</h4>
                  <p>Select an active order from the table to manage fulfillment, update BlueDart tracking, and trigger customer status emails.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="admin-catalog-settings-panel fade-in">
          {/* Top: Double columns settings and Category Form */}
          <div className="catalog-top-grid">
            {/* Store Secure Payment Settings Card */}
            <div className="catalog-settings-card">
              <div className="card-title-row">
                <Settings size={18} className="gold-text" />
                <h3>Store Secure Payment Settings</h3>
              </div>
              <p className="card-subtitle">Set your boutique's active UPI ID and scanner QR code. The checkout gateway displays these live to shoppers.</p>
              
              <form onSubmit={handleSaveUpiSettings} className="catalog-editor-form">
                <div className="form-group">
                  <label htmlFor="upi-id-input">Boutique UPI ID</label>
                  <input
                    id="upi-id-input"
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. daitracouture@okaxis"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="upi-qr-input">UPI QR Code Image URL</label>
                  <input
                    id="upi-qr-input"
                    type="text"
                    value={upiQrUrl}
                    onChange={(e) => setUpiQrUrl(e.target.value)}
                    placeholder="e.g. https://i.imgur.com/your-qr-image.png"
                  />
                  <span className="helper-text-label">Leave empty to auto-render the default golden geometric QR vector.</span>
                </div>
                
                <button type="submit" className="btn btn-gold">
                  SAVE SECURE SETTINGS
                </button>
              </form>
            </div>

            {/* Manage Sections Category Card */}
            <div className="catalog-settings-card">
              <div className="card-title-row">
                <PlusCircle size={18} className="gold-text" />
                <h3>Add New Section / Category</h3>
              </div>
              <p className="card-subtitle">Create a brand new department filter for clothes (e.g. Lehengas). They appear in the filters immediately.</p>
              
              <form onSubmit={handleAddCategory} className="catalog-editor-form">
                <div className="form-group">
                  <label htmlFor="category-slug">Category Slug ID (No Spaces, lowercase)</label>
                  <input
                    id="category-slug"
                    type="text"
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                    placeholder="e.g. lehengas"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="category-name">Display Name (Visible in Shop filters)</label>
                  <input
                    id="category-name"
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Designer Lehengas"
                    required
                  />
                </div>
                
                <button type="submit" className="btn btn-gold">
                  CREATE SECTION
                </button>
              </form>

              <div className="current-categories-list">
                <h4>Active Catalog Sections:</h4>
                <div className="categories-badges-row">
                  {categories.map(c => (
                    <span key={c.id} className="cat-badge-item">{c.name} ({c.id})</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Add Dress Form */}
          <div className="catalog-settings-card add-dress-card">
            <div className="card-title-row">
              <Package size={18} className="gold-text" />
              <h3>Add New Dress Collection</h3>
            </div>
            <p className="card-subtitle">Launch a new traditional dress in the DAITRA catalog with detailed materials, sizing options, and photos.</p>
            
            <form onSubmit={handleAddProduct} className="dress-multi-column-form">
              <div className="form-column">
                <div className="form-group">
                  <label>Dress Title</label>
                  <input
                    type="text"
                    value={newProd.title}
                    onChange={(e) => setNewProd(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Royal Banarasi Silk Lehenga"
                    required
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Catalog Section</label>
                    <select
                      value={newProd.category}
                      onChange={(e) => setNewProd(prev => ({ ...prev, category: e.target.value }))}
                      required
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Amount / Price (₹)</label>
                    <input
                      type="number"
                      value={newProd.price}
                      onChange={(e) => setNewProd(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="e.g. 4500"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Original Price (₹ - For Strikethrough Discount)</label>
                  <input
                    type="number"
                    value={newProd.originalPrice}
                    onChange={(e) => setNewProd(prev => ({ ...prev, originalPrice: e.target.value }))}
                    placeholder="e.g. 5999 (Leave blank to auto-calculate 30% OFF)"
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>Dress Photo / Image URL</label>
                  <input
                    type="text"
                    value={newProd.image}
                    onChange={(e) => setNewProd(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="e.g. https://images.unsplash.com/... or /assets/banner_festive.png"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Product Description</label>
                  <textarea
                    value={newProd.description}
                    onChange={(e) => setNewProd(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the fabric look, aesthetics, and fit design..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-column">
                <div className="form-section-subheader">Fabric & Materials Used</div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Material / Fabric Type</label>
                    <input
                      type="text"
                      value={newProd.fabric}
                      onChange={(e) => setNewProd(prev => ({ ...prev, fabric: e.target.value }))}
                      placeholder="e.g. Art Silk & Banarasi Dupatta"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Embroidery / Work Type</label>
                    <input
                      type="text"
                      value={newProd.work}
                      onChange={(e) => setNewProd(prev => ({ ...prev, work: e.target.value }))}
                      placeholder="e.g. Zari Borders & Weaves"
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Fit Style</label>
                    <input
                      type="text"
                      value={newProd.style}
                      onChange={(e) => setNewProd(prev => ({ ...prev, style: e.target.value }))}
                      placeholder="e.g. Floor length pleated flared fit"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Care Instructions</label>
                    <input
                      type="text"
                      value={newProd.care}
                      onChange={(e) => setNewProd(prev => ({ ...prev, care: e.target.value }))}
                      placeholder="e.g. Dry Clean Only"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-section-title">Available Sizes</label>
                  <div className="sizes-checkboxes-row">
                    {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <label key={size} className="checkbox-item-label">
                        <input
                          type="checkbox"
                          checked={prodSizes.includes(size)}
                          onChange={() => handleSizeToggle(size)}
                        />
                        <span>{size}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-section-title">Marketing Badges / Tags</label>
                  <div className="sizes-checkboxes-row">
                    {['Best Seller', 'New Arrival', 'Trending', 'Festive Edit', 'Luxury Edition'].map(tag => (
                      <label key={tag} className="checkbox-item-label">
                        <input
                          type="checkbox"
                          checked={prodTags.includes(tag)}
                          onChange={() => handleTagToggle(tag)}
                        />
                        <span>{tag}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-gold add-dress-submit-btn">
                  ADD DRESS TO CATALOG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
