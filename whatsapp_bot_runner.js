/**
 * DAITRA COUTURE — Standalone WhatsApp Business Bot Engine
 * 
 * Runs as a background service or standalone bot.
 * Integrates with WhatsApp Business Cloud API / Twilio / Webhook.
 */

import http from 'http';
import { handleWhatsAppMessage } from './src/utils/whatsappBotService.js';

const PORT = process.env.BOT_PORT || 10001;

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/whatsapp/webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const userMsg = parsed.message || parsed.Body || 'hi';
        const reply = await handleWhatsAppMessage(userMsg);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, reply }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('DAITRA WhatsApp Bot Engine is Running!');
});

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(` DAITRA WhatsApp Bot Server Running on Port ${PORT}`);
  console.log(` Webhook URL: http://localhost:${PORT}/whatsapp/webhook`);
  console.log(`===================================================`);
});
