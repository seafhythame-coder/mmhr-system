import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN غير موجود في متغيرات البيئة');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  console.log('رسالة /start من:', msg.from.first_name);
  bot.sendMessage(msg.chat.id, '✅ البوت يعمل الآن!');
});

bot.on('message', (msg) => {
  console.log('رسالة:', msg.text);
  if (!msg.text?.startsWith('/')) {
    bot.sendMessage(msg.chat.id, `✅ استقبلت: ${msg.text}`);
  }
});

console.log('🤖 البوت يعمل!');
