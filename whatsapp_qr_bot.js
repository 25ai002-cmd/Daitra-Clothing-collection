import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { handleWhatsAppMessage } from './src/utils/whatsappBotService.js';
import fs from 'fs';
import path from 'path';

async function connectToWhatsApp() {
  const authDir = './auth_info_baileys';
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`===================================================`);
  console.log(` DAITRA WhatsApp Real Bot Engine (WhatsApp Web QR)`);
  console.log(` Baileys Version: ${version.join('.')} (Latest: ${isLatest})`);
  console.log(`===================================================`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📲 SCAN THIS QR CODE WITH YOUR WHATSAPP MOBILE APP:');
      console.log('   (WhatsApp -> Settings / Menu -> Linked Devices -> Link a Device)\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
      console.log('Connection closed due to:', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('✅ SUCCESS: DAITRA WhatsApp Bot is now CONNECTED and LIVE!');
      console.log('📲 Ready to automatically answer incoming WhatsApp messages!\n');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const senderJid = msg.key.remoteJid;
        const textMessage = msg.message.conversation || 
                           msg.message.extendedTextMessage?.text || 
                           msg.message.buttonsResponseMessage?.selectedButtonId || 
                           msg.message.listResponseMessage?.singleSelectReply?.selectedRowId || '';

        if (!textMessage) continue;

        console.log(`📩 Received WhatsApp message from ${senderJid}: "${textMessage}"`);

        // Generate response using DAITRA AI Chatbot Service
        const replyText = await handleWhatsAppMessage(textMessage);

        // Send reply back to customer on WhatsApp
        await sock.sendMessage(senderJid, { text: replyText }, { quoted: msg });
        console.log(`📤 Reply sent to ${senderJid}`);
      }
    } catch (err) {
      console.error('Error processing incoming WhatsApp message:', err);
    }
  });
}

connectToWhatsApp().catch(err => console.error('Failed to launch WhatsApp Bot:', err));
