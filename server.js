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

    const ctaHtml = recipientType === 'customer'
      ? `
        <!-- Track & Cancel Order CTA -->
        <div style="margin: 25px 30px; text-align: center;">
          <a href="${websiteUrl}#/track/${order.orderId}" style="display: inline-block; padding: 12px 24px; border-radius: 4px; font-size: 14px; font-weight: bold; background-color: #0b0b0b; border: 1.5px solid #D4AF37; color: #D4AF37; text-decoration: none; margin: 5px; text-transform: uppercase; letter-spacing: 1px;">
            Track Order Details
          </a>
          ${(order.status < 4 && !isCancelled) ? `
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

// Fallback all other GET traffic to Vite's static index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
