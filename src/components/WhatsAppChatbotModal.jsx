import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Phone, MoreVertical, ExternalLink } from 'lucide-react';
import { handleWhatsAppMessage } from '../utils/whatsappBotService';

export default function WhatsAppChatbotModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initialize with welcome message
      const initialReply = `✨ *DAITRA Couture WhatsApp Assistant* 💫\n_When Tradition Meets Grace_\n\nHow can I help you today? Please reply with a number or click a button below:\n\n1️⃣ *Catalog* — Browse Kurtas, Gowns & Fusion Wear\n2️⃣ *Track [Order ID]* — Track your order (e.g. DAI-849201)\n3️⃣ *Boutique* — Store location & hours in Ahmedabad\n4️⃣ *Offers* — Get 10% OFF discount coupon\n5️⃣ *Size Guide* — View Indian measurement chart\n6️⃣ *Support* — Speak directly with boutique owner`;
      
      setMessages([
        {
          id: 1,
          sender: 'bot',
          text: initialReply,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const sendMessage = async (textToSend) => {
    const query = textToSend || inputMessage;
    if (!query.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    // Process reply locally via bot engine
    setTimeout(async () => {
      const replyText = await handleWhatsAppMessage(query);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: replyText,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleQuickChip = (chipText) => {
    sendMessage(chipText);
  };

  const formatText = (txt) => {
    // Basic Markdown format helper (*bold* -> <strong>)
    let formatted = txt.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
    formatted = formatted.replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.1);padding:2px 4px;border-radius:3px;">$1</code>');
    formatted = formatted.replace(/\n/g, '<br/>');
    return { __html: formatted };
  };

  return (
    <div className="whatsapp-modal-overlay" onClick={onClose}>
      <div className="whatsapp-modal-box fade-in" onClick={(e) => e.stopPropagation()}>
        {/* WhatsApp Header */}
        <div className="whatsapp-chat-header">
          <div className="whatsapp-avatar-wrap">
            <img src="/assets/logo.png" alt="DAITRA Logo" className="whatsapp-bot-avatar" />
            <span className="online-indicator"></span>
          </div>
          <div className="whatsapp-header-info">
            <h3 className="whatsapp-bot-name">DAITRA Couture Support</h3>
            <span className="whatsapp-bot-status">Online | Official WhatsApp Assistant</span>
          </div>
          <div className="whatsapp-header-actions">
            <a 
              href="https://wa.me/918469441014" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="whatsapp-external-link"
              title="Open in WhatsApp App"
            >
              <ExternalLink size={18} />
            </a>
            <button className="whatsapp-close-btn" onClick={onClose} title="Close Chat">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Chat Body */}
        <div className="whatsapp-chat-body">
          <div className="whatsapp-encrypted-banner">
            🔒 Messages are end-to-end encrypted for DAITRA Customer Support.
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className={`whatsapp-bubble-row ${msg.sender}`}>
              <div className={`whatsapp-bubble ${msg.sender}`}>
                <div 
                  className="whatsapp-message-content" 
                  dangerouslySetInnerHTML={formatText(msg.text)} 
                />
                <span className="whatsapp-msg-time">{msg.time}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="whatsapp-bubble-row bot">
              <div className="whatsapp-bubble bot typing">
                <span>DAITRA Bot is typing...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Action Chips */}
        <div className="whatsapp-quick-chips">
          <button onClick={() => handleQuickChip('1')}>👗 Catalog</button>
          <button onClick={() => handleQuickChip('2')}>📦 Track Order</button>
          <button onClick={() => handleQuickChip('3')}>📍 Boutique Location</button>
          <button onClick={() => handleQuickChip('4')}>🏷️ 10% Off Offer</button>
          <button onClick={() => handleQuickChip('5')}>📏 Size Guide</button>
          <button onClick={() => handleQuickChip('6')}>💬 Talk to Owner</button>
        </div>

        {/* Input Bar */}
        <form className="whatsapp-chat-input-bar" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
          <input
            type="text"
            placeholder="Type a message or number (1-6)..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="whatsapp-input"
          />
          <button type="submit" className="whatsapp-send-btn" title="Send message">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
