import os
print("جاري تشغيل البوت الأول وتجهيز المكتبات...")
os.system('pip install pyTelegramBotAPI')
import telebot
TOKEN = "8709790066:AAHDQV6ukT27wAKXiOmX_PgVdiuORHk5DMs"
bot = telebot.TeleBot(TOKEN)

@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.reply_to(message, "أهلاً بك! البوت الأول يعمل بنجاح الآن من جهازك.")

@bot.message_handler(func=lambda message: True)
def echo_all(message):
    bot.reply_to(message, f"وصلت رسالتك: {message.text}")

print("🚀 البوت بدأ العمل والآن في وضع الاستماع... اترك الشاشة مفتوحة")
bot.infinity_polling()