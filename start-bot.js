// 🤖 Start Bot - Simple Telegram Bot Entry Point
// ═══════════════════════════════════════════════════════════════════

import TelegramBot from 'node-telegram-bot-api';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

// 🔑 توكن البوت من متغيرات البيئة
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ خطأ: TELEGRAM_BOT_TOKEN غير موجود في .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// اتصال قاعدة البيانات
const db = new Client({
  connectionString: process.env.DATABASE_URL || process.env.DB_URL
});

db.connect()
  .then(() => {
    console.log('✅ قاعدة البيانات متصلة!');
  })
  .catch((err) => {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
  });

// بوت التليجرام
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '👋 مرحباً! البوت يعمل الآن ✅');
});

bot.on('message', (msg) => {
  if (!msg.text?.startsWith('/')) {
    bot.sendMessage(msg.chat.id, `✅ استقبلت: ${msg.text}`);
  }
});

bot.on('polling_error', (error) => {
  console.error('❌ Polling Error:', error.message);
});

console.log('🤖 البوت يعمل الآن!');
