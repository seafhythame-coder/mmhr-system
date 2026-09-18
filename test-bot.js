import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_TOKEN;

if (!token) {
  throw new Error('TELEGRAM_TOKEN is required');
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '✅ البوت يعمل!');
});

bot.on('message', (msg) => {
  if (!msg.text || msg.text.startsWith('/start')) {
    return;
  }

  console.log('رسالة:', msg.text);
  bot.sendMessage(msg.chat.id, '✅ استقبلت رسالتك: ' + msg.text);
});

console.log('البوت يعمل!');
