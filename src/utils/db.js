import { products as seedProducts } from '../data/products';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isCloudEnabled = SUPABASE_URL && SUPABASE_ANON_KEY;

const SEED_REVIEWS = [
  // Store Testimonials
  {
    id: 1,
    name: "Prit Shah",
    rating: 5,
    date: "a week ago",
    comment: "Must visit",
    ownerReply: "THANK YOU PLS VISIT AGAIN",
    verified: true,
    productId: null
  },
  {
    id: 2,
    name: "Seema Singh",
    rating: 5,
    date: "2 weeks ago",
    comment: "Excellent Collection. Must Visit.",
    ownerReply: "Thank you for shopping from DAITRA hope visit again",
    verified: true,
    productId: null
  },
  {
    id: 3,
    name: "ARTI GUPTA",
    rating: 5,
    date: "2 weeks ago",
    comment: "I like the dresses",
    ownerReply: null,
    verified: true,
    productId: null
  },
  {
    id: 4,
    name: "Priyal Patel",
    rating: 5,
    date: "20 days ago",
    comment: "Unique collection and the response of staff is very nice.",
    ownerReply: "Thank you so much Priyal! We look forward to serving you again.",
    verified: true,
    productId: null
  },
  {
    id: 5,
    name: "Kunjal Mehta",
    rating: 5,
    date: "1 month ago",
    comment: "The material quality, variety, and presentation were excellent.",
    ownerReply: "We appreciate your kind feedback Kunjal! It inspires us.",
    verified: true,
    productId: null
  },
  // Dress Specific Reviews
  {
    id: 101,
    productId: 1,
    name: "Meera Vyas",
    rating: 5,
    date: "3 days ago",
    comment: "Absolutely gorgeous dress! The pure silk has a very rich sheen and the embroidery is extremely neat. Worth every rupee.",
    ownerReply: "Thank you Meera! We are thrilled that you loved the Aarya set.",
    verified: true
  },
  {
    id: 102,
    productId: 1,
    name: "Kavita Shah",
    rating: 4,
    date: "1 week ago",
    comment: "Stunning color and fit is perfect. The organza dupatta is a bit stiff initially but gets soft after dry clean. Very premium.",
    ownerReply: null,
    verified: true
  },
  {
    id: 103,
    productId: 2,
    name: "Deepal Patel",
    rating: 5,
    date: "5 days ago",
    comment: "Very breathable and soft organic cotton. The hand block print indigo doesn't bleed. Ideal for daily designer wear.",
    ownerReply: "Thank you for the wonderful feedback, Deepal!",
    verified: true
  },
  {
    id: 104,
    productId: 5,
    name: "Shreya Joshi",
    rating: 5,
    date: "2 days ago",
    comment: "This Anarkali gown has an incredible flare! The micro-georgette is light and bouncy. Lined with shantoon which makes it very comfortable.",
    ownerReply: "Thank you Shreya! The 5m flare is indeed designed to make you feel like royalty.",
    verified: true
  },
  {
    id: 105,
    productId: 8,
    name: "Radhika Iyer",
    rating: 5,
    date: "4 days ago",
    comment: "Royal velvet fabric feels so heavy and premium. Neck zardozi is very intricate. Got so many compliments at a winter wedding!",
    ownerReply: "We are delighted to hear this, Radhika!",
    verified: true
  }
];

const SEED_CATEGORIES = [
  { id: 'kurtas', name: 'Kurtas & Sets' },
  { id: 'gowns', name: 'Ethnic Gowns' },
  { id: 'fusion', name: 'Fusion Wear' }
];

const SEED_SETTINGS = {
  upi_id: 'daitracouture@okaxis',
  upi_qr_url: ''
};

// Headers helper for Supabase REST requests
const getHeaders = () => ({
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
});

export const db = {
  // --- PRODUCTS ---
  async getProducts() {
    if (isCloudEnabled) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/daitra_products?select=*`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            // Sort by id to maintain default catalog order
            return data.sort((a, b) => a.id - b.id);
          }
          // Seed cloud DB if empty
          console.log("Cloud products database empty, seeding seedProducts...");
          for (const prod of seedProducts) {
            await this.saveProduct(prod);
          }
          return seedProducts;
        }
      } catch (err) {
        console.error("Error loading products from Supabase:", err);
      }
    }
    
    // LocalStorage Fallback
    const saved = localStorage.getItem('daitra_db_products');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration v2: Re-seed if still using old /assets/ image paths (switch to /dresses/ real photos)
      const isOldData = parsed.length > 0 && parsed[0].image && parsed[0].image.startsWith('/assets/');
      const isCorrectCount = parsed.length >= seedProducts.length;
      if (!isOldData && parsed.length > 0 && parsed[0].material && isCorrectCount) {
        return parsed;
      }
    }
    localStorage.setItem('daitra_db_products', JSON.stringify(seedProducts));
    return seedProducts;
  },

  async saveProduct(product) {
    if (isCloudEnabled) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/daitra_products`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(product)
        });
        if (res.ok) {
          const data = await res.json();
          return data[0];
        }
      } catch (err) {
        console.error("Error saving product to Supabase:", err);
      }
    }

    // LocalStorage Fallback
    const prods = await this.getProducts();
    const updated = [...prods, product];
    localStorage.setItem('daitra_db_products', JSON.stringify(updated));
    return product;
  },

  // --- CATEGORIES ---
  async getCategories() {
    if (isCloudEnabled) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/daitra_categories?select=*`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) return data;
          
          // Seed categories
          console.log("Cloud categories database empty, seeding SEED_CATEGORIES...");
          for (const cat of SEED_CATEGORIES) {
            await this.saveCategory(cat);
          }
          return SEED_CATEGORIES;
        }
      } catch (err) {
        console.error("Error loading categories from Supabase:", err);
      }
    }

    // LocalStorage Fallback
    const saved = localStorage.getItem('daitra_db_categories');
    if (saved) {
      return JSON.parse(saved);
    } else {
      localStorage.setItem('daitra_db_categories', JSON.stringify(SEED_CATEGORIES));
      return SEED_CATEGORIES;
    }
  },

  async saveCategory(category) {
    if (isCloudEnabled) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/daitra_categories`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(category)
        });
        if (res.ok) {
          const data = await res.json();
          return data[0];
        }
      } catch (err) {
        console.error("Error saving category to Supabase:", err);
      }
    }

    // LocalStorage Fallback
    const cats = await this.getCategories();
    if (cats.some(c => c.id === category.id)) return category;
    const updated = [...cats, category];
    localStorage.setItem('daitra_db_categories', JSON.stringify(updated));
    return category;
  },

  // --- SETTINGS (UPI ID & Scanner QR) ---
  async getSettings() {
    if (isCloudEnabled) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/daitra_settings?select=*`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) return data[0];
          
          // Seed settings
          console.log("Cloud settings database empty, seeding SEED_SETTINGS...");
          await this.saveSettings(SEED_SETTINGS);
          return SEED_SETTINGS;
        }
      } catch (err) {
        console.error("Error loading settings from Supabase:", err);
      }
    }

    // LocalStorage Fallback
    const saved = localStorage.getItem('daitra_db_settings');
    if (saved) {
      return JSON.parse(saved);
    } else {
      localStorage.setItem('daitra_db_settings', JSON.stringify(SEED_SETTINGS));
      return SEED_SETTINGS;
    }
  },

  async saveSettings(settings) {
    if (isCloudEnabled) {
      try {
        // Delete old settings first to keep a single row
        await fetch(`${SUPABASE_URL}/rest/v1/daitra_settings?select=*`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        const res = await fetch(`${SUPABASE_URL}/rest/v1/daitra_settings`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(settings)
        });
        if (res.ok) {
          const data = await res.json();
          return data[0];
        }
      } catch (err) {
        console.error("Error saving settings to Supabase:", err);
      }
    }

    // LocalStorage Fallback
    localStorage.setItem('daitra_db_settings', JSON.stringify(settings));
    return settings;
  },

  // --- ORDERS ---
  async getOrders() {
    if (isCloudEnabled) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/daitra_orders?select=*&order=created_at.desc`, {
          headers: getHeaders()
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.error("Error loading orders from Supabase:", err);
      }
    }

    // LocalStorage Fallback
    const saved = localStorage.getItem('daitra_orders');
    return saved ? JSON.parse(saved).reverse() : [];
  },

  async saveOrder(order) {
    if (isCloudEnabled) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/daitra_orders`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(order)
        });
        if (res.ok) {
          const data = await res.json();
          window.dispatchEvent(new Event('daitra_new_order_placed'));
          return data[0];
        }
      } catch (err) {
        console.error("Error saving order to Supabase:", err);
      }
    }

    // LocalStorage Fallback
    const saved = localStorage.getItem('daitra_orders');
    const orders = saved ? JSON.parse(saved) : [];
    orders.push(order);
    localStorage.setItem('daitra_orders', JSON.stringify(orders));
    window.dispatchEvent(new Event('daitra_new_order_placed'));
    return order;
  },

  async updateOrderStatus(orderId, statusIndex) {
    const status = parseInt(statusIndex, 10);
    if (isCloudEnabled) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/daitra_orders?order_id=eq.${orderId}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ status })
        });
        if (res.ok) {
          const data = await res.json();
          window.dispatchEvent(new Event('daitra_new_order_placed'));
          return data[0];
        }
      } catch (err) {
        console.error("Error updating order status in Supabase:", err);
      }
    }

    // LocalStorage Fallback
    const saved = localStorage.getItem('daitra_orders');
    if (saved) {
      const orders = JSON.parse(saved);
      const updated = orders.map(o => o.orderId === orderId ? { ...o, status } : o);
      localStorage.setItem('daitra_orders', JSON.stringify(updated));
      window.dispatchEvent(new Event('daitra_new_order_placed'));
    }
  },

  async clearAllOrders() {
    if (isCloudEnabled) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/daitra_orders?select=*`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        window.dispatchEvent(new Event('daitra_new_order_placed'));
        return;
      } catch (err) {
        console.error("Error deleting orders in Supabase:", err);
      }
    }

    // LocalStorage Fallback
    localStorage.removeItem('daitra_orders');
    window.dispatchEvent(new Event('daitra_new_order_placed'));
  },

  // --- REVIEWS ---
  async getReviews() {
    if (isCloudEnabled) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/daitra_reviews?select=*&order=id.desc`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) return data;
          
          // Seed reviews
          console.log("Cloud reviews database empty, seeding SEED_REVIEWS...");
          for (const rev of SEED_REVIEWS) {
            await this.saveReview(rev);
          }
          return SEED_REVIEWS;
        }
      } catch (err) {
        console.error("Error loading reviews from Supabase:", err);
      }
    }

    // LocalStorage Fallback
    const saved = localStorage.getItem('daitra_reviews');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: Verify we have loaded the product-specific reviews
      if (parsed.some(r => r.id === 101)) {
        return parsed;
      }
    }
    localStorage.setItem('daitra_reviews', JSON.stringify(SEED_REVIEWS));
    return SEED_REVIEWS;
  },

  async saveReview(review) {
    if (isCloudEnabled) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/daitra_reviews`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(review)
        });
        if (res.ok) {
          const data = await res.json();
          return data[0];
        }
      } catch (err) {
        console.error("Error saving review to Supabase:", err);
      }
    }

    // LocalStorage Fallback
    const reviews = await this.getReviews();
    const updated = [review, ...reviews];
    localStorage.setItem('daitra_reviews', JSON.stringify(updated));
    return review;
  }
};
