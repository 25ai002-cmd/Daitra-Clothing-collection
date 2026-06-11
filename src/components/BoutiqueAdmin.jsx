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
  const [products, setProducts] = useState([]);
  const [upiId, setUpiId] = useState('daitracouture@okaxis');
  const [upiQrUrl, setUpiQrUrl] = useState('');
  
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [dressSearchQuery, setDressSearchQuery] = useState('');
  const [editingProductId, setEditingProductId] = useState(null);
  
  const [newProd, setNewProd] = useState({
    title: '',
    category: '',
    price: '',
    originalPrice: '',
    discount: '',
    image: '',
    additionalImages: '',
    video: '',
    description: '',
    material: '',
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
    const prods = await db.getProducts();
    setProducts(prods);
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
  const handleFileRead = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProd(prev => ({
        ...prev,
        [fieldName]: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleMultipleFilesRead = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    let loadedCount = 0;
    const loadedUrls = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        loadedUrls.push(reader.result);
        loadedCount++;
        if (loadedCount === files.length) {
          setNewProd(prev => {
            const current = prev.additionalImages ? prev.additionalImages + ', ' : '';
            return {
              ...prev,
              additionalImages: current + loadedUrls.join(', ')
            };
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePriceFieldChange = (field, value) => {
    setNewProd(prev => {
      const updated = { ...prev, [field]: value };
      
      const price = parseFloat(updated.price);
      const originalPrice = parseFloat(updated.originalPrice);
      const discount = parseFloat(updated.discount);
      
      if (field === 'price') {
        if (!isNaN(price) && !isNaN(originalPrice) && originalPrice > 0) {
          updated.discount = Math.max(0, Math.min(99, Math.round((1 - price / originalPrice) * 100))).toString();
        } else if (!isNaN(price) && !isNaN(discount) && discount < 100) {
          updated.originalPrice = Math.round(price / (1 - discount / 100)).toString();
        }
      } else if (field === 'originalPrice') {
        if (!isNaN(originalPrice) && !isNaN(price) && originalPrice > 0) {
          updated.discount = Math.max(0, Math.min(99, Math.round((1 - price / originalPrice) * 100))).toString();
        } else if (!isNaN(originalPrice) && !isNaN(discount)) {
          updated.price = Math.round(originalPrice * (1 - discount / 100)).toString();
        }
      } else if (field === 'discount') {
        if (!isNaN(discount)) {
          if (!isNaN(originalPrice) && originalPrice > 0) {
            updated.price = Math.round(originalPrice * (1 - discount / 100)).toString();
          } else if (!isNaN(price)) {
            updated.originalPrice = Math.round(price / (1 - discount / 100)).toString();
          }
        }
      }
      
      return updated;
    });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProd.title.trim() || !newProd.price || !newProd.category || !newProd.image.trim()) {
      setCatalogError('Title, Category, Price, and Photo URL are required.');
      return;
    }
    setCatalogError('');

    const priceNum = parseFloat(newProd.price);
    const origPriceNum = newProd.originalPrice ? parseFloat(newProd.originalPrice) : Math.round(priceNum * 1.3);

    const additionalImgs = newProd.additionalImages
      ? newProd.additionalImages.split(',').map(url => url.trim()).filter(Boolean)
      : [];
    const imagesArray = [newProd.image.trim(), ...additionalImgs];

    const productObj = {
      id: editingProductId ? editingProductId : Date.now(),
      title: newProd.title.trim(),
      category: newProd.category,
      price: priceNum,
      originalPrice: origPriceNum,
      rating: 5.0,
      reviewsCount: 1,
      image: newProd.image.trim(),
      images: imagesArray,
      video: newProd.video.trim() || null,
      description: newProd.description.trim() || 'A beautiful handcrafted garment by DAITRA designer boutique.',
      material: newProd.material.trim() || 'Handcrafted from fine quality traditional handloom fabric.',
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

    if (editingProductId) {
      await db.updateProduct(productObj);
      setEditingProductId(null);
      setCatalogSuccess(`Dress "${productObj.title}" updated successfully!`);
    } else {
      await db.saveProduct(productObj);
      setCatalogSuccess(`Dress "${productObj.title}" successfully added to catalog!`);
    }

    await loadCatalogData();
    
    // Reset product fields
    setNewProd({
      title: '',
      category: categories[0]?.id || '',
      price: '',
      originalPrice: '',
      discount: '',
      image: '',
      additionalImages: '',
      video: '',
      description: '',
      material: '',
      fabric: '',
      work: '',
      style: '',
      care: ''
    });
    setProdSizes([]);
    setProdTags([]);
    
    // Notify application that catalog items updated
    window.dispatchEvent(new Event('daitra_catalog_updated'));
    setTimeout(() => setCatalogSuccess(''), 4000);
  };

  const handleEditProduct = (product) => {
    // Scroll to the add dress card
    const element = document.querySelector('.add-dress-card');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setEditingProductId(product.id);
    
    let fabric = '';
    let work = '';
    let style = '';
    let care = '';
    
    if (product.details && Array.isArray(product.details)) {
      product.details.forEach(detail => {
        if (detail.startsWith('Fabric:')) fabric = detail.replace('Fabric:', '').trim();
        else if (detail.startsWith('Work:')) work = detail.replace('Work:', '').trim();
        else if (detail.startsWith('Style:')) style = detail.replace('Style:', '').trim();
        else if (detail.startsWith('Care Instructions:')) care = detail.replace('Care Instructions:', '').trim();
      });
    }

    const additionalImagesStr = product.images && product.images.length > 1
      ? product.images.slice(1).join(', ')
      : '';

    setNewProd({
      title: product.title || '',
      category: product.category || '',
      price: product.price || '',
      originalPrice: product.originalPrice || '',
      discount: product.discount || '',
      image: product.image || '',
      additionalImages: additionalImagesStr,
      video: product.video || '',
      description: product.description || '',
      material: product.material || '',
      fabric: fabric,
      work: work,
      style: style,
      care: care
    });
    
    setProdSizes(product.sizes || []);
    setProdTags(product.tags || []);
  };

  const handleCancelProductEdit = () => {
    setEditingProductId(null);
    setNewProd({
      title: '',
      category: categories[0]?.id || '',
      price: '',
      originalPrice: '',
      discount: '',
      image: '',
      additionalImages: '',
      video: '',
      description: '',
      material: '',
      fabric: '',
      work: '',
      style: '',
      care: ''
    });
    setProdSizes([]);
    setProdTags([]);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this dress from the catalog? This action cannot be undone.")) {
      await db.deleteProduct(productId);
      await loadCatalogData();
      window.dispatchEvent(new Event('daitra_catalog_updated'));
      setCatalogSuccess("Dress successfully removed from the catalog!");
      setTimeout(() => setCatalogSuccess(''), 4000);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm("Are you sure you want to delete this category? All products in this category will remain, but the category filter will be removed.")) {
      await db.deleteCategory(categoryId);
      await loadCatalogData();
      window.dispatchEvent(new Event('daitra_catalog_updated'));
      setCatalogSuccess("Category deleted successfully!");
      setTimeout(() => setCatalogSuccess(''), 4000);
    }
  };

  const handleSaveCategoryEdit = async (categoryId) => {
    if (!editingCatName.trim()) {
      setCatalogError("Category name cannot be blank.");
      return;
    }
    await db.updateCategory({ id: categoryId, name: editingCatName.trim() });
    setEditingCatId(null);
    await loadCatalogData();
    window.dispatchEvent(new Event('daitra_catalog_updated'));
    setCatalogSuccess("Category updated successfully!");
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

  const filteredProducts = products.filter(p => {
    const term = dressSearchQuery.toLowerCase();
    return p.title.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
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
                <div className="categories-badges-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px' }}>
                  {categories.map(c => {
                    const isEditing = editingCatId === c.id;
                    return (
                      <div key={c.id} className="cat-badge-card" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input 
                              type="text" 
                              value={editingCatName} 
                              onChange={(e) => setEditingCatName(e.target.value)} 
                              style={{ padding: '2px 6px', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.8rem', borderRadius: '4px', width: '120px' }}
                              autoFocus
                            />
                            <button type="button" onClick={() => handleSaveCategoryEdit(c.id)} style={{ padding: '2px 6px', background: 'var(--primary-gold)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>Save</button>
                            <button type="button" onClick={() => setEditingCatId(null)} style={{ padding: '2px 6px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Cancel</button>
                          </div>
                        ) : (
                          <>
                            <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{c.name} ({c.id})</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button 
                                type="button" 
                                onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name); }} 
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary-gold)', padding: '0 4px' }}
                              >
                                Edit
                              </button>
                              {c.id !== 'kurtas' && c.id !== 'gowns' && c.id !== 'fusion' && (
                                <button 
                                  type="button" 
                                  onClick={() => handleDeleteCategory(c.id)} 
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#ff4d4d', padding: '0 4px' }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
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
                      onChange={(e) => handlePriceFieldChange('price', e.target.value)}
                      placeholder="e.g. 4500"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Original Price (₹ - For Strikethrough Discount)</label>
                    <input
                      type="number"
                      value={newProd.originalPrice}
                      onChange={(e) => handlePriceFieldChange('originalPrice', e.target.value)}
                      placeholder="e.g. 5999"
                      min="1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Discount (%)</label>
                    <input
                      type="number"
                      value={newProd.discount}
                      onChange={(e) => handlePriceFieldChange('discount', e.target.value)}
                      placeholder="e.g. 30"
                      min="0"
                      max="99"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Primary Dress Photo URL</label>
                  <input
                    type="text"
                    value={newProd.image}
                    onChange={(e) => setNewProd(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="e.g. /dresses/1.jpg or paste remote URL"
                    required
                  />
                  <div className="file-upload-row" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label className="btn btn-dark" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.75rem', margin: 0, textTransform: 'none', letterSpacing: '0.5px' }}>
                      Choose Local Photo File...
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileRead(e, 'image')} 
                        style={{ display: 'none' }}
                      />
                    </label>
                    {newProd.image && (
                      <div className="admin-photo-preview" style={{ position: 'relative', width: '40px', height: '40px', border: '1px solid var(--border-color)' }}>
                        <img src={newProd.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={() => setNewProd(prev => ({ ...prev, image: '' }))} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>&times;</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Additional Angle Photos (Comma-separated URLs)</label>
                  <input
                    type="text"
                    value={newProd.additionalImages}
                    onChange={(e) => setNewProd(prev => ({ ...prev, additionalImages: e.target.value }))}
                    placeholder="e.g. /assets/aarya_back.png, /assets/aarya_side.png"
                  />
                  <div className="file-upload-row" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label className="btn btn-dark" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.75rem', margin: 0, textTransform: 'none', letterSpacing: '0.5px' }}>
                      Add Local Angle Files...
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        onChange={handleMultipleFilesRead} 
                        style={{ display: 'none' }}
                      />
                    </label>
                    {newProd.additionalImages && (
                      <span className="helper-text-label" style={{ color: 'var(--primary-gold)', fontSize: '0.7rem' }}>
                        {newProd.additionalImages.split(',').length} files added.
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Dress Video URL / Upload File</label>
                  <input
                    type="text"
                    value={newProd.video}
                    onChange={(e) => setNewProd(prev => ({ ...prev, video: e.target.value }))}
                    placeholder="e.g. https://www.w3schools.com/html/mov_bbb.mp4"
                  />
                  <div className="file-upload-row" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label className="btn btn-dark" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.75rem', margin: 0, textTransform: 'none', letterSpacing: '0.5px' }}>
                      Choose Local Video File...
                      <input 
                        type="file" 
                        accept="video/*" 
                        onChange={(e) => handleFileRead(e, 'video')} 
                        style={{ display: 'none' }}
                      />
                    </label>
                    {newProd.video && (
                      <div className="admin-photo-preview" style={{ position: 'relative', width: '40px', height: '40px', border: '1px solid var(--border-color)' }}>
                        <video src={newProd.video} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={() => setNewProd(prev => ({ ...prev, video: '' }))} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '14px', height: '14px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>&times;</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Product Description</label>
                  <textarea
                    value={newProd.description}
                    onChange={(e) => setNewProd(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the fabric look, aesthetics, and fit design..."
                    rows="2"
                  />
                </div>

                <div className="form-group">
                  <label>Material & Fabric Description</label>
                  <textarea
                    value={newProd.material}
                    onChange={(e) => setNewProd(prev => ({ ...prev, material: e.target.value }))}
                    placeholder="e.g. Crafted from 100% premium silk-blend for luxury comfort..."
                    rows="2"
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

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-gold add-dress-submit-btn" style={{ flex: 1 }}>
                    {editingProductId ? 'SAVE DRESS CHANGES' : 'ADD DRESS TO CATALOG'}
                  </button>
                  {editingProductId && (
                    <button type="button" onClick={handleCancelProductEdit} className="btn btn-dark" style={{ flex: 1, textTransform: 'uppercase' }}>
                      CANCEL EDIT
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Active Dress Catalog */}
          <div className="catalog-settings-card catalog-list-card" style={{ marginTop: '20px' }}>
            <div className="card-title-row">
              <Package size={18} className="gold-text" />
              <h3>Active Dress Catalog ({products.length})</h3>
            </div>
            
            {/* Search filter for products */}
            <div className="catalog-search-row" style={{ marginBottom: '15px' }}>
              <div className="search-input-wrapper" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 12px', width: 'fit-content' }}>
                <Search size={14} className="search-icon" style={{ color: '#888', marginRight: '8px' }} />
                <input
                  type="text"
                  placeholder="Search dresses by title or category..."
                  value={dressSearchQuery}
                  onChange={(e) => setDressSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '250px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div className="catalog-dresses-list-wrapper" style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              {filteredProducts.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: '#888' }}>No dresses found.</p>
              ) : (
                <table className="admin-orders-table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px' }}>Image</th>
                      <th style={{ padding: '12px' }}>Title</th>
                      <th style={{ padding: '12px' }}>Category</th>
                      <th style={{ padding: '12px' }}>Price</th>
                      <th style={{ padding: '12px' }}>In Stock</th>
                      <th style={{ padding: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px' }}>
                          <img src={p.image} alt={p.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                        </td>
                        <td className="bold-text" style={{ padding: '12px' }}>{p.title}</td>
                        <td style={{ textTransform: 'capitalize', padding: '12px' }}>{p.category}</td>
                        <td className="gold-text bold-text" style={{ padding: '12px' }}>₹{p.price.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '12px' }}>{p.inStock ? 'Yes' : 'No'}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="button" className="btn-table-action" onClick={() => handleEditProduct(p)} style={{ padding: '4px 8px', fontSize: '0.75rem' }} title="Edit dress details">
                              <span>Edit</span>
                            </button>
                            <button type="button" className="btn-table-action" onClick={() => handleDeleteProduct(p.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#ffebeb', color: '#ff4d4d', borderColor: '#ff4d4d' }} title="Delete dress">
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
