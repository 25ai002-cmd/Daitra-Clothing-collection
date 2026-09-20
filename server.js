import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve static assets from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// POST endpoint for sending email notifications
app.post('/api/send-email', async (req, res) => {
  try {
    const body = req.body;
    let order, recipientType, recipientEmail;
    
    if (body.order) {
      order = body.order;
      recipientType = body.recipientType || 'owner';
      recipientEmail = body.recipientEmail;
    } else {
      order = body;
      recipientType = 'owner';
      recipientEmail = null;
    }

    if (!order || !order.orderId || !order.customerInfo || !order.items || !order.totals) {
      return res.status(400).json({ error: 'Invalid or incomplete order data.' });
    }

    const apiKey = process.env.BREVO_API_KEY || process.env.VITE_BREVO_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Brevo API key configuration is missing on the server.' });
    }

    const isOnline = order.paymentType !== 'Cash on Delivery (COD)';
    const OWNER_EMAIL = 'yakshbarot597@gmail.com';

    const targetEmail = recipientType === 'customer' 
      ? (recipientEmail || order.customerInfo.email)
      : OWNER_EMAIL;

    const targetName = recipientType === 'customer'
      ? order.customerInfo.name
      : 'DAITRA Owner';

    const isCompleted = recipientType === 'customer' && order.status === 4;
    const isCancelled = order.status === 5;

    const subject = isCancelled
      ? (recipientType === 'customer'
        ? `❌ ORDER CANCELLED — ID: ${order.orderId} (DAITRA Couture)`
        : `🚨 ORDER CANCELLED BY CUSTOMER — ID: ${order.orderId}`)
      : (isCompleted
        ? `🎉 ORDER COMPLETED — ID: ${order.orderId} (DAITRA Couture)`
        : (recipientType === 'customer'
          ? `🎉 ORDER CONFIRMED — ID: ${order.orderId} (DAITRA Couture)`
          : `🔔 NEW ORDER CAPTURED — ID: ${order.orderId} (${isOnline ? 'Online' : 'COD'})`));

    // Dynamic website origin for absolute image and page routing URLs
    const origin = req.headers.origin || req.headers.referer || `http://localhost:${PORT}`;
    const websiteUrl = origin.endsWith('/') ? origin : (origin + '/');

    const getAbsoluteImageUrl = (imgUrl, baseUrl) => {
      if (!imgUrl) return '';
      if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
        return imgUrl;
      }
      const relativePath = imgUrl.startsWith('/') ? imgUrl.substring(1) : imgUrl;
      return baseUrl + relativePath;
    };

    const itemsRows = order.items.map(item => {
      const itemImgUrl = getAbsoluteImageUrl(item.image, websiteUrl);
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; width: 50px; text-align: center;">
            <img src="${itemImgUrl}" alt="${item.title}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px; border: 1px solid #dddddd;" />
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-weight: 500; text-align: left;">${item.title}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: center;">${item.selectedSize}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
        </tr>
      `;
    }).join('');

    const introHtml = isCancelled
      ? (recipientType === 'customer'
        ? `
          <h2 style="font-size: 18px; margin-top: 0; color: #dc3545;">Your order has been cancelled</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #555555;">This email confirms that your order <strong>${order.orderId}</strong> has been cancelled at your request. If any payment was made online, it will be automatically refunded to your original payment method within 5-7 business days.</p>
        `
        : `
          <h2 style="font-size: 18px; margin-top: 0; color: #dc3545;">Order Cancelled by Customer</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #555555;">Customer <strong>${order.customerInfo.name}</strong> has cancelled order <strong>${order.orderId}</strong> from the tracking dashboard. Please do not process or ship this order.</p>
        `)
      : (isCompleted
        ? `
          <h2 style="font-size: 18px; margin-top: 0; color: #111111;">Your order is completed, ${order.customerInfo.name}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #555555;">Thank you for shopping at DAITRA Couture! We are pleased to confirm that your order has been successfully delivered and completed. We hope you absolutely love your handcrafted traditional outfit. Below is the final summary invoice of your purchase.</p>
        `
        : (recipientType === 'customer'
          ? `
            <h2 style="font-size: 18px; margin-top: 0; color: #111111;">Thank you for shopping at DAITRA, ${order.customerInfo.name}!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #555555;">We are thrilled to confirm your order. Our boutique artisans in Ahmedabad are already preparing your traditional garments with the utmost care. Below are your order details and delivery invoice.</p>
          `
          : `
            <h2 style="font-size: 18px; margin-top: 0; color: #111111;">Hello DAITRA Owner,</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #555555;">You have received a new customer order on your website dashboard. Below are the order receipt and payment parameters for fulfillment.</p>
          `));

    const ctaHtml = (recipientType === 'customer' && !isCancelled)
      ? `
        <!-- Track & Cancel Order CTA -->
        <div style="margin: 25px 30px; text-align: center;">
          <a href="${websiteUrl}#/track/${order.orderId}" style="display: inline-block; padding: 12px 24px; border-radius: 4px; font-size: 14px; font-weight: bold; background-color: #0b0b0b; border: 1.5px solid #D4AF37; color: #D4AF37; text-decoration: none; margin: 5px; text-transform: uppercase; letter-spacing: 1px;">
            Track Order Details
          </a>
          ${(order.status < 4) ? `
            <a href="${websiteUrl}#/track/${order.orderId}?cancel=true" style="display: inline-block; padding: 12px 24px; border-radius: 4px; font-size: 14px; font-weight: bold; background-color: #721c24; border: 1.5px solid #f5c6cb; color: #f8d7da; text-decoration: none; margin: 5px; text-transform: uppercase; letter-spacing: 1px;">
              Cancel Order
            </a>
          ` : ''}
        </div>
      `
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${isCompleted ? 'Order Completed' : (recipientType === 'customer' ? 'Order Confirmation' : 'New Order Alert')}</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f6f6f6; margin: 0; padding: 20px; color: #333333;">
        <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; border: 1px solid #dddddd; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <!-- Header -->
          <div style="background-color: #0b0b0b; padding: 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
            <img src="${websiteUrl}assets/logo.png" alt="DAITRA Couture Logo" style="width: 80px; height: 80px; margin-bottom: 15px; border-radius: 50%; border: 2px solid #D4AF37; background-color: #0b0b0b; display: inline-block; vertical-align: middle;" />
            <h1 style="color: #D4AF37; margin: 0; font-size: 24px; letter-spacing: 2px; font-family: 'Georgia', serif; text-transform: uppercase;">DAITRA COUTURE</h1>
            <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8;">${recipientType === 'customer' ? 'Order Confirmation' : 'Order Notification System'}</p>
          </div>
          
          <!-- Intro -->
          <div style="padding: 30px 30px 15px 30px;">
            ${introHtml}
          </div>

          <!-- Details -->
          <div style="margin: 0 30px 20px 30px; border: 1px solid #dddddd; background-color: #fafafa; border-radius: 4px; overflow: hidden;">
            <div style="background-color: #eeeeee; padding: 12px 15px; font-size: 12px; font-weight: bold; color: #333333; text-transform: uppercase; letter-spacing: 0.5px;">
              Order Information — ${order.orderId}
            </div>
            
            <div style="padding: 15px; display: table; width: 100%; box-sizing: border-box; border-bottom: 1px solid #dddddd;">
              <div style="display: table-cell; width: 50%; font-size: 12px; line-height: 1.5; color: #555555; vertical-align: top;">
                <strong style="color: #111111; display: block; margin-bottom: 4px;">Customer Information</strong>
                Name: ${order.customerInfo.name}<br>
                Phone: +91 ${order.customerInfo.phone}<br>
                Email: ${order.customerInfo.email}
              </div>
              <div style="display: table-cell; width: 50%; font-size: 12px; line-height: 1.5; color: #555555; vertical-align: top;">
                <strong style="color: #111111; display: block; margin-bottom: 4px;">Shipping Address</strong>
                Address: ${order.customerInfo.address}<br>
                City: ${order.customerInfo.city} — ${order.customerInfo.pincode}
              </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background-color: #f5f5f5; color: #333333; font-weight: bold;">
                  <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dddddd;" colspan="2">Item Description</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 1px solid #dddddd;">Size</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 1px solid #dddddd;">Qty</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 1px solid #dddddd;">Total Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- Pricing summary -->
            <div style="padding: 15px; background-color: #fafafa; text-align: right; font-size: 12px;">
              <div style="margin-bottom: 6px; color: #666666;">
                Subtotal: <span style="font-weight: bold; color: #333333; margin-left: 10px;">₹${order.totals.subtotal.toLocaleString('en-IN')}</span>
              </div>
              ${order.totals.discountAmount > 0 ? `
                <div style="margin-bottom: 6px; color: #32CD32;">
                  Promo Discount: <span style="font-weight: bold; margin-left: 10px;">- ₹${order.totals.discountAmount.toLocaleString('en-IN')}</span>
                </div>
              ` : ''}
              <div style="margin-bottom: 6px; color: #666666;">
                Shipping: <span style="font-weight: bold; color: #D4AF37; margin-left: 10px;">FREE</span>
              </div>
              <div style="border-top: 1px solid #dddddd; padding-top: 8px; margin-top: 8px; font-size: 14px; font-weight: bold; color: #111111;">
                Grand Total: <span style="color: #D4AF37; margin-left: 10px;">₹${order.totals.finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <!-- Payment Status Indicator -->
          ${isCancelled
            ? `
              <div style="margin: 20px 30px; padding: 15px; border-radius: 4px; font-size: 13px; text-align: center; background-color: rgba(220, 53, 69, 0.1); border: 1px solid #dc3545; color: #bd2130;">
                <strong>❌ ORDER CANCELLED</strong>
              </div>
            `
            : `
              <div style="margin: 20px 30px; padding: 15px; border-radius: 4px; font-size: 13px; text-align: center; ${
                isOnline 
                  ? 'background-color: rgba(50, 205, 50, 0.1); border: 1px solid #32CD32; color: #228B22;' 
                  : 'background-color: rgba(212, 175, 55, 0.1); border: 1px solid #AA7C11; color: #8A6D0F;'
              }">
                ${isOnline 
                  ? `<strong>✓ PAYMENT SECURED ONLINE</strong> via ${order.paymentType}` 
                  : `<strong>⚠ CASH ON DELIVERY (COD) REQUESTED</strong> — Collect ₹${order.totals.finalTotal.toLocaleString('en-IN')} in cash.`
                }
              </div>
            `
          }

          ${ctaHtml}

          <!-- Footer -->
          <div style="padding: 20px 30px; border-top: 1px solid #eeeeee; text-align: center; font-size: 11px; color: #888888;">
            <p style="margin: 0 0 5px 0; line-height: 1.4;">${recipientType === 'customer' ? 'Thank you for choosing DAITRA. We hope to serve you again soon!' : 'This is an automated transactional notification sent from your store\'s web API. Please verify details and prepare the catalog shipment.'}</p>
            <strong>DAITRA Couture — Ahmedabad, Gujarat</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    const requestBody = {
      sender: { name: 'Yaksh Barot', email: 'yakshbarot597@gmail.com' },
      to: [{ email: targetEmail, name: targetName }],
      subject: subject,
      htmlContent: htmlContent
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (response.ok) {
      return res.status(200).json({ success: true, messageId: data.messageId });
    } else {
      return res.status(response.status).json({ success: false, error: data.message || 'Unknown Brevo API error' });
    }
  } catch (error) {
    console.error('Server send-email error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// POST endpoint to process Razorpay refunds
app.post('/api/refund', async (req, res) => {
  try {
    const { paymentId, amount, orderId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ success: false, error: 'Payment ID is required.' });
    }

    const keyId = 'rzp_test_T01br2Bnh2Rgp1';
    const keySecret = '35HVf4YzPFr5bmIXIRnDAMoc';
    const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    console.log(`Checking Razorpay payment status for ID: ${paymentId}...`);

    // 1. Fetch payment details from Razorpay to check its status
    const statusRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });

    if (!statusRes.ok) {
      const errorData = await statusRes.json();
      console.error('Fetch payment details error from Razorpay:', errorData);
      return res.status(statusRes.status).json({
        success: false,
        error: errorData.error?.description || 'Failed to retrieve payment details from Razorpay.'
      });
    }

    const paymentInfo = await statusRes.json();
    console.log(`Razorpay Payment Status: ${paymentInfo.status}, Amount: ${paymentInfo.amount} paise`);

    // 2. If the payment is only 'authorized', capture it first
    if (paymentInfo.status === 'authorized') {
      console.log(`Payment is 'authorized'. Automatically capturing transaction before refunding...`);
      const captureRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        body: JSON.stringify({
          amount: paymentInfo.amount,
          currency: paymentInfo.currency || 'INR'
        })
      });

      if (!captureRes.ok) {
        const captureError = await captureRes.json();
        console.error('Automatic capture failed:', captureError);
        return res.status(captureRes.status).json({
          success: false,
          error: captureError.error?.description || 'Failed to capture the payment before refunding.'
        });
      }

      const captureData = await captureRes.json();
      console.log(`Payment successfully captured: ${captureData.status}`);
    } else if (paymentInfo.status === 'refunded') {
      return res.status(200).json({
        success: true,
        message: 'Payment has already been refunded.',
        refund: { id: 'already_refunded' }
      });
    } else if (paymentInfo.status !== 'captured') {
      return res.status(400).json({
        success: false,
        error: `Cannot refund payment in status: ${paymentInfo.status}. Only captured payments can be refunded.`
      });
    }

    // 3. Initiate the refund
    const refundBody = {};
    if (amount) {
      refundBody.amount = Math.round(amount * 100); // Razorpay expects amount in paise (1 INR = 100 paise)
    }
    if (orderId) {
      refundBody.notes = { order_id: orderId };
      refundBody.receipt = `refund_${orderId}`;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authString}`
    };

    if (orderId) {
      headers['X-Refund-Idempotency'] = `refund_${orderId}`;
    }

    console.log(`Initiating refund request to Razorpay for Payment ID: ${paymentId}, Order ID: ${orderId}...`);

    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(refundBody)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`Refund successfully processed by Razorpay. Refund ID: ${data.id}`);
      return res.status(200).json({ success: true, refund: data });
    } else {
      console.error('Razorpay Refund API error response:', data);
      return res.status(response.status).json({ 
        success: false, 
        error: data.error?.description || 'Razorpay API returned an error' 
      });
    }
  } catch (error) {
    console.error('Server /api/refund exception:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST endpoint for secure online file uploads
app.post('/api/upload', express.raw({ limit: '50mb', type: '*/*' }), async (req, res) => {
  try {
    const filename = req.query.filename || 'upload.jpg';
    const contentType = req.headers['content-type'] || 'image/jpeg';
    
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: 'No file data received.' });
    }

    // Try uploading to Supabase if credentials exist on the server
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const bucketName = 'daitra_media';
        const fileName = `${Date.now()}_${filename.replace(/\s+/g, '_')}`;

        // Create bucket if it doesn't exist
        const headers = {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        };
        await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            id: bucketName,
            name: bucketName,
            public: true,
            file_size_limit: 52428800,
            allowed_mime_types: ['image/*', 'video/*']
          })
        });

        // Upload file
        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucketName}/${fileName}`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': contentType
          },
          body: req.body
        });

        if (uploadRes.ok) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`;
          return res.json({ url: publicUrl });
        }
      } catch (err) {
        console.error("Express Supabase Storage upload failed, falling back:", err);
      }
    }

    // Fallback: Upload to tmpfiles.org
    const formData = new FormData();
    const blob = new Blob([req.body], { type: contentType });
    formData.append('file', blob, filename);

    const tmpfilesRes = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });

    return res.status(500).json({ error: 'Failed to upload file to online storage.' });
  } catch (err) {
    console.error("Server upload API error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// WHATSAPP CHATBOT API ENDPOINTS
// ==========================================

// Helper logic for responding to WhatsApp bot messages
const processBotReply = (userMessage) => {
  const text = (userMessage || '').trim().toLowerCase();

  if (text.includes('1') || text.includes('catalog') || text.includes('collection') || text.includes('kurta') || text.includes('gown') || text.includes('fusion') || text.includes('dress') || text.includes('shop')) {
    return `👗 *DAITRA COUTURE CATALOG* 💫\n\n` +
           `Explore our handcrafted traditional women's wear collections:\n\n` +
           `✨ *Navy Sunflower Midi Dress*\n   Price: ₹1,899 | Sizes: S, M, L, XL, XXL\n\n` +
           `✨ *Midnight Navy Zari Anarkali Gown*\n   Price: ₹4,999 | Sizes: S, M, L, XL, XXL\n\n` +
           `✨ *Sage Green Embroidered Coord Set*\n   Price: ₹2,799 | Sizes: S, M, L, XL\n\n` +
           `🛍️ *Browse Full Website:* https://daitra-clothing-collection.onrender.com/#/shop\n\n` +
           `Reply with *MENU* for main options.`;
  }

  if (text.includes('2') || text.includes('track') || text.match(/dai-\d+/i) || text.match(/\b\d{6}\b/)) {
    const orderIdMatch = text.match(/dai-\d+/i) || text.match(/\b\d{6}\b/);
    if (orderIdMatch) {
      const rawId = orderIdMatch[0].toUpperCase();
      const queriedId = rawId.startsWith('DAI-') ? rawId : `DAI-${rawId}`;
      return `📦 *ORDER STATUS FOR ${queriedId}*\n\n` +
             `*Status:* Dispatched 🚚\n` +
             `*Carrier:* Bluedart Express\n` +
             `*Estimated Delivery:* 3 to 5 Business Days\n\n` +
             `🚚 *Tracking Link:* https://daitra-clothing-collection.onrender.com/#/track/${queriedId}\n\n` +
             `Reply *SUPPORT* to talk with boutique manager.`;
    }
    return `📦 *DAITRA Order Tracking*\n\nPlease reply with your 6-digit Order ID.\n*Example:* \`DAI-849201\` or \`Track DAI-849201\``;
  }

  if (text.includes('3') || text.includes('boutique') || text.includes('location') || text.includes('address') || text.includes('store') || text.includes('ahmedabad') || text.includes('chandkheda')) {
    return `📍 *DAITRA DESIGNER BOUTIQUE*\n\n` +
           `*Address:* Shop #4, Devnandan Heights, Near Tapovan Circle, Chandkheda, Ahmedabad, Gujarat - 382424 🇮🇳\n\n` +
           `⏰ *Opening Hours:* 10:00 AM – 9:00 PM (Open 7 Days)\n` +
           `📞 *Contact:* +91 84694 41014\n\n` +
           `🗺️ *Google Maps:* https://maps.google.com/?q=Chandkheda+Ahmedabad\n\n` +
           `Visit us for custom fitting, bridal trousseau consultation, and exclusive fabric previews! ✨`;
  }

  if (text.includes('4') || text.includes('offer') || text.includes('coupon') || text.includes('promo') || text.includes('discount')) {
    return `🏷️ *DAITRA EXCLUSIVE OFFERS* 🎉\n\n` +
           `🎁 *FIRST PURCHASE DISCOUNT*\n` +
           `Use Code: *WELCOME10* for *10% OFF* your first order!\n\n` +
           `✨ *FREE GIFT BOX*\n` +
           `Get a *Free Handcrafted Silk Scrunchie & Gift Box* on all orders above ₹5,000!\n\n` +
           `🚚 *Free Shipping PAN India & COD Available!*`;
  }

  if (text.includes('5') || text.includes('size') || text.includes('chart') || text.includes('fit') || text.includes('measurement')) {
    return `📏 *DAITRA SIZE GUIDE (Inches)*\n\n` +
           `• *S (36):* Chest 36" | Waist 32" | Hip 39"\n` +
           `• *M (38):* Chest 38" | Waist 34" | Hip 41"\n` +
           `• *L (40):* Chest 40" | Waist 36" | Hip 43"\n` +
           `• *XL (42):* Chest 42" | Waist 38" | Hip 45"\n` +
           `• *XXL (44):* Chest 44" | Waist 40" | Hip 47"\n\n` +
           `All sizes crafted according to standard Indian boutique fitting. Custom tailoring available at boutique!`;
  }

  if (text.includes('6') || text.includes('support') || text.includes('owner') || text.includes('agent') || text.includes('human') || text.includes('help')) {
    return `📞 *DAITRA CUSTOMER CARE*\n\n` +
           `Would you like to speak directly with our boutique founder?\n\n` +
           `💬 *WhatsApp Direct Chat:* https://wa.me/918469441014\n` +
           `📧 *Email Support:* yakshbarot597@gmail.com\n\n` +
           `Our manager will reply to your message within 15 minutes!`;
  }

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
};

// Meta WhatsApp Cloud API Configurations
const META_WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'EAAPrdlJBZBZAEBSj88TaZAqqrvQDTr7vDWYnZA3Omec7v7P8uIa1PIs7YPDcE4n6sC7CPjqyOBvoi9fmSTzkyoCwMlGmPicf8wMKjzFn0mcusQyKXPd8PP0jGMxUle61ZBD0UttGcfwGoQ5S0qsaOFZBbCn5Vd5RAv90mGs3sJkT9jaPWsPZCvR8ydJYHyFDlpzs8DAZAxzEc1p95C1B6U0ZCSAQUfgO8gKhIkXGyxlZCHZBYjTJ6DN6fNIrZAo8aA6BnugZCVRIg0Duk64GXOPiU2GLrzu9u6WMZD';
const META_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1357988067390761';
const META_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '953979850442776';

// Helper function to send messages via Meta WhatsApp Cloud API
async function sendMetaWhatsAppMessage(toPhone, textBody) {
  try {
    const url = `https://graph.facebook.com/v19.0/${META_PHONE_NUMBER_ID}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhone,
        type: 'text',
        text: {
          preview_url: true,
          body: textBody
        }
      })
    });

    const data = await response.json();
    console.log(`[Meta WhatsApp API Response]:`, JSON.stringify(data));
    return data;
  } catch (err) {
    console.error(`[Meta WhatsApp Send Error]:`, err);
  }
}

// 1. Interactive Chatbot Simulator API for Website Widget
app.post('/api/whatsapp/chat', (req, res) => {
  try {
    const { message } = req.body;
    const botReply = processBotReply(message);
    res.json({ success: true, reply: botReply, timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Meta WhatsApp Cloud API / Twilio Webhook Verification (GET)
app.get('/api/whatsapp/webhook', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'daitra_whatsapp_secret';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === verifyToken) {
    console.log('✅ Meta WhatsApp Webhook Verified Successfully!');
    res.status(200).send(challenge);
  } else {
    console.warn('⚠️ Meta WhatsApp Webhook Verification Failed.');
    res.sendStatus(403);
  }
});

// 3. Meta / Twilio WhatsApp Webhook Event Handler (POST)
app.post('/api/whatsapp/webhook', async (req, res) => {
  try {
    const body = req.body;
    let userMsg = '';
    let fromPhone = '';

    // Handle Meta WhatsApp Cloud API Format
    if (body.entry && body.entry[0]?.changes[0]?.value?.messages[0]) {
      const msgObj = body.entry[0].changes[0].value.messages[0];
      userMsg = msgObj.text?.body || '';
      fromPhone = msgObj.from || '';

      if (userMsg && fromPhone) {
        const replyText = processBotReply(userMsg);
        console.log(`[Meta WhatsApp Bot] Message from ${fromPhone}: "${userMsg}" -> Sending reply...`);
        
        // Dispatch reply back via Meta Cloud API
        await sendMetaWhatsAppMessage(fromPhone, replyText);

        return res.status(200).json({ status: 'success', from: fromPhone, reply: replyText });
      }
    } else if (body.Body) {
      // Handle Twilio WhatsApp Webhook Format
      userMsg = body.Body;
      fromPhone = body.From;
      const replyText = processBotReply(userMsg);
      return res.json({ status: 'success', from: fromPhone, reply: replyText });
    }

    res.status(200).json({ status: 'no_message_processed' });
  } catch (err) {
    console.error("[WhatsApp Webhook Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// Fallback all other GET traffic to Vite's static index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
