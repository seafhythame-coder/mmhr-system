import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ Please set TELEGRAM_BOT_TOKEN before running test-bot.js');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '✅ البوت يعمل!');
});

bot.on('message', (msg) => {
  if (!msg.text?.startsWith('/')) {
    bot.sendMessage(msg.chat.id, '✅ تم الاستقبال');
  }
});

console.log('🤖 البوت يعمل الآن!');
