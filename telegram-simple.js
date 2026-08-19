// 🤖 بوت Telegram البسيط - MMHR
// ═══════════════════════════════════════════════════════════════════
// تشغيل: node telegram-simple.js
// ═══════════════════════════════════════════════════════════════════

import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

// 🔑 توكن البوت
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

if (!TELEGRAM_TOKEN) {
  console.error('❌ خطأ: لم يتم تعيين TELEGRAM_TOKEN');
  console.error('   أضف السطر التالي في ملف .env:');
  console.error('   TELEGRAM_TOKEN=توكنك_هنا');
  process.exit(1);
}

// ✅ إنشاء البوت
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ═══════════════════════════════════════════════════════════════════
// 🎯 أوامر البوت
// ═══════════════════════════════════════════════════════════════════

// /start - رسالة الترحيب
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'صديقي';

  bot.sendMessage(chatId, `👋 مرحباً ${name}!

🤖 أنا بوت MMHR.

📋 الأوامر المتاحة:
/start - رسالة الترحيب
/help  - المساعدة
/info  - معلومات عني

💬 أو أرسل أي رسالة وسأرد عليك!`);
});

// /help - المساعدة
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, `❓ المساعدة:

/start - البداية
/help  - هذه القائمة
/info  - معلومات النظام

💡 يمكنك إرسال أي رسالة نصية وسأرد عليها.`);
});

// /info - معلومات
bot.onText(/\/info/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, `ℹ️ معلومات النظام:

🤖 البوت: MMHR Bot
✅ الحالة: يعمل
📅 الوقت: ${new Date().toLocaleString('ar-SA')}`);
});

// 💬 الرسائل النصية العادية
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // تجاهل الأوامر
  if (!text || text.startsWith('/')) return;

  bot.sendMessage(chatId, `✅ استلمت رسالتك:

"${text}"

💬 أرسل /help لعرض الأوامر المتاحة.`);
});

// ═══════════════════════════════════════════════════════════════════
// معالجة الأخطاء
// ═══════════════════════════════════════════════════════════════════

bot.on('polling_error', (error) => {
  console.error('❌ خطأ:', error.message);
});

// ═══════════════════════════════════════════════════════════════════
// 🚀 البوت يعمل
// ═══════════════════════════════════════════════════════════════════

console.log('✅ بوت Telegram يعمل الآن!');
console.log('📱 افتح Telegram وابحث عن البوت الخاص بك');
console.log('⏹  لإيقاف البوت: اضغط Ctrl+C');
