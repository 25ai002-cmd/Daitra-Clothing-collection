import { db } from './db';

export async function handleWhatsAppMessage(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') {
    return getMainMenuResponse();
  }

  const text = userMessage.trim().toLowerCase();

  // 1. Order Tracking Check (e.g. "track DAI-123456" or "DAI-123456")
  const orderIdMatch = text.match(/dai-\d+/i) || text.match(/\b\d{6}\b/);
  if (orderIdMatch || text.includes('track')) {
    if (orderIdMatch) {
      const queriedId = orderIdMatch[0].toUpperCase();
      const rawId = queriedId.startsWith('DAI-') ? queriedId : `DAI-${queriedId}`;
      
      const orders = await db.getOrders();
      const matchedOrder = orders.find(o => o.orderId.toUpperCase() === rawId.toUpperCase());
      
      if (matchedOrder) {
        const STATUSES = ['Order Placed 📝', 'Processing ⚙️', 'Dispatched 🚚', 'Out For Delivery 📦', 'Delivered ✅', 'Cancelled ❌'];
        const statusText = STATUSES[matchedOrder.status] || 'Processing ⚙️';
        const itemsList = matchedOrder.items ? matchedOrder.items.map(i => `• ${i.title} (${i.selectedSize})`).join('\n') : '';

        return `📦 *ORDER STATUS FOR ${matchedOrder.orderId}*\n\n` +
               `*Customer:* ${matchedOrder.customerInfo?.name || 'Valued Customer'}\n` +
               `*Status:* ${statusText}\n` +
               `*Date Placed:* ${matchedOrder.date}\n` +
               `*Total:* ₹${matchedOrder.totals?.finalTotal?.toLocaleString('en-IN') || 0}\n` +
               `*Payment:* ${matchedOrder.paymentType}\n\n` +
               `*Items Ordered:*\n${itemsList}\n\n` +
               `🚚 *Estimated Delivery:* 3 to 5 Business Days\n` +
               `🔗 *Track Order:* https://daitra-clothing-collection.onrender.com/#/track/${matchedOrder.orderId}\n\n` +
               `Need help? Reply *SUPPORT* to talk with boutique manager.`;
      } else {
        return `⚠️ *Order Not Found*\n\nWe couldn't locate order *${rawId}*. Please verify your 6-digit Order ID (e.g. *DAI-849201*).\n\nReply *2* to try again or *SUPPORT* to speak with our owner.`;
      }
    } else {
      return `📦 *DAITRA Order Tracking*\n\nPlease reply with your 6-digit Order ID.\n*Example:* \`DAI-849201\` or \`Track DAI-849201\``;
    }
  }

  // 2. Catalog & Collections ("1", "catalog", "collection", "kurta", "gown", "fusion", "dress", "shop")
  if (text === '1' || text.includes('catalog') || text.includes('collection') || text.includes('kurta') || text.includes('gown') || text.includes('fusion') || text.includes('dress') || text.includes('shop')) {
    const products = await db.getProducts();
    const featured = products.slice(0, 3);
    const productListText = featured.map(p => `✨ *${p.title}*\n   Category: ${p.category.toUpperCase()} | Price: ₹${p.price.toLocaleString('en-IN')}\n   Sizes: ${p.sizes.join(', ')}`).join('\n\n');

    return `👗 *DAITRA COUTURE CATALOG* 💫\n\n` +
           `Explore our handcrafted traditional women's wear collections:\n\n` +
           `${productListText}\n\n` +
           `🛍️ *Browse Full Website:* https://daitra-clothing-collection.onrender.com/#/shop\n\n` +
           `Reply with dress name or *MENU* for main options.`;
  }

  // 3. Boutique Location & Hours ("3", "boutique", "location", "address", "store", "ahmedabad", "chandkheda")
  if (text === '3' || text.includes('boutique') || text.includes('location') || text.includes('address') || text.includes('store') || text.includes('ahmedabad') || text.includes('chandkheda')) {
    return `📍 *DAITRA DESIGNER BOUTIQUE*\n\n` +
           `*Address:* Shop #4, Devnandan Heights, Near Tapovan Circle, Chandkheda, Ahmedabad, Gujarat - 382424 🇮🇳\n\n` +
           `⏰ *Opening Hours:* 10:00 AM – 9:00 PM (Open 7 Days)\n` +
           `📞 *Contact:* +91 84694 41014\n\n` +
           `🗺️ *Google Maps:* https://maps.google.com/?q=Chandkheda+Ahmedabad\n\n` +
           `Visit us for custom fitting, bridal trousseau consultation, and exclusive fabric previews! ✨`;
  }

  // 4. Discounts & Coupons ("4", "offer", "offers", "coupon", "promo", "discount")
  if (text === '4' || text.includes('offer') || text.includes('coupon') || text.includes('promo') || text.includes('discount')) {
    return `🏷️ *DAITRA EXCLUSIVE OFFERS* 🎉\n\n` +
           `🎁 *FIRST PURCHASE DISCOUNT*\n` +
           `Use Code: *WELCOME10* for *10% OFF* your first order!\n\n` +
           `✨ *FREE GIFT BOX*\n` +
           `Get a *Free Handcrafted Silk Scrunchie & Gift Box* on all orders above ₹5,000!\n\n` +
           `🚚 *Free Shipping PAN India & COD Available!*`;
  }

  // 5. Size Guide ("5", "size", "sizes", "chart", "fit", "measurement")
  if (text === '5' || text.includes('size') || text.includes('chart') || text.includes('fit') || text.includes('measurement')) {
    return `📏 *DAITRA SIZE GUIDE (Inches)*\n\n` +
           `• *S (36):* Chest 36" | Waist 32" | Hip 39"\n` +
           `• *M (38):* Chest 38" | Waist 34" | Hip 41"\n` +
           `• *L (40):* Chest 40" | Waist 36" | Hip 43"\n` +
           `• *XL (42):* Chest 42" | Waist 38" | Hip 45"\n` +
           `• *XXL (44):* Chest 44" | Waist 40" | Hip 47"\n\n` +
           `All sizes crafted according to standard Indian boutique fitting. Custom tailoring available at boutique!`;
  }

  // 6. Support & Owner Contact ("6", "support", "owner", "contact", "agent", "human", "help")
  if (text === '6' || text.includes('support') || text.includes('owner') || text.includes('agent') || text.includes('human') || text.includes('help')) {
    return `📞 *DAITRA CUSTOMER CARE*\n\n` +
           `Would you like to speak directly with our boutique founder?\n\n` +
           `💬 *WhatsApp Direct Chat:* https://wa.me/918469441014\n` +
           `📧 *Email Support:* yakshbarot597@gmail.com\n\n` +
           `Our manager will reply to your message within 15 minutes!`;
  }

  // Return Main Menu for any unrecognized message or greeting
  return getMainMenuResponse();
}

function getMainMenuResponse() {
  return `Hello! Welcome to *DAITRA Couture* ✨\n` +
         `_When Tradition Meets Grace_\n\n` +
         `How can I help you today? Please reply with a number or keyword:\n\n` +
         `1️⃣ *Catalog* — Browse Kurtas, Gowns & Fusion Wear 👗\n` +
         `2️⃣ *Track [Order ID]* — Track your order details (e.g. DAI-849201) 📦\n` +
         `3️⃣ *Boutique* — Store address & hours in Ahmedabad 📍\n` +
         `4️⃣ *Offers* — Get 10% OFF discount coupon code 🏷️\n` +
         `5️⃣ *Size Guide* — View Indian measurement chart 📏\n` +
         `6️⃣ *Support* — Speak directly with boutique owner 💬\n\n` +
         `_Type any number (1-6) or your question below!_`;
}
