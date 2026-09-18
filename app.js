import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN غير موجود في ملف .env');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '✅ البوت يعمل');
});

bot.on('message', (msg) => {
  console.log(msg.text);
  if (!msg.text?.startsWith('/')) {
    bot.sendMessage(msg.chat.id, '✅ تم');
  }
});

bot.on('polling_error', (error) => {
  console.error('❌ Polling Error:', error.message);
});

console.log('البوت شغّال');
