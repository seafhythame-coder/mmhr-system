# 🤖 دليل البوتات الكاملة

---

## 📦 البوتات المتاحة

### 1️⃣ **WhatsApp Bot** ✅
- معالجة الملفات مباشرة عبر واتس
- دعم الملفات والصور
- أوامر سهلة بالعربية

### 2️⃣ **Telegram Bot** ✅
- بوت تلغرام متقدم
- أوامر شاملة
- واجهة سهلة الاستخدام

### 3️⃣ **Web Dashboard** ✅
- لوحة تحكم ويب احترافية
- إدارة شاملة للملفات
- إحصائيات وتقارير

### 4️⃣ **Discord Bot** (قادم)
- بوت لـ Discord

### 5️⃣ **Slack Bot** (قادم)
- بوت لـ Slack

---

## 🚀 تثبيت وتشغيل البوتات

### المتطلبات الإضافية

```bash
npm install twilio telegraf axios form-data
```

### المتغيرات البيئية (.env)

أضف إلى `.env`:

```
# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+1234567890

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_NAME=your_bot_name
TELEGRAM_PORT=3002

# Dashboard
DASHBOARD_PORT=3003

# API الرئيسي
MAIN_API_URL=http://localhost:5000/api
```

---

## 📱 WhatsApp Bot

### الإعدادات

**1. إنشاء حساب Twilio:**
- اذهب: https://www.twilio.com
- سجل حساب جديد
- احصل على `Account SID` و `Auth Token`

**2. تفعيل WhatsApp Sandbox:**
- في Twilio Console
- اذهب إلى Messaging → Sandbox
- اتبع التعليمات

**3. التشغيل:**
```bash
node whatsapp-bot.js
```

### استخدام WhatsApp Bot

**الأوامر:**
- `مرحبا` - البدء
- `المستندات` - عرض المستندات
- `إحصائيات` - الإحصائيات
- أرسل ملف مباشرة

---

## 🤖 Telegram Bot

### الإعدادات

**1. إنشاء البوت:**
- افتح Telegram
- ابحث عن `@BotFather`
- اكتب `/newbot`
- اتبع التعليمات
- احصل على `Token`

**2. التشغيل:**
```bash
node telegram-bot.js
```

### استخدام Telegram Bot

**الأوامر:**
- `/start` - البدء
- `/documents` - المستندات
- `/stats` - الإحصائيات
- `/help` - المساعدة
- أرسل ملف أو صورة مباشرة

---

## 🌐 Web Dashboard

### التشغيل

```bash
node dashboard.js
```

### الوصول

افتح في المتصفح:
```
http://localhost:3003/dashboard
```

### الميزات

✅ رفع الملفات بـ Drag & Drop
✅ عرض الإحصائيات الحية
✅ قائمة المستندات
✅ تحميل الملفات المعالجة

---

## 🚀 تشغيل كل البوتات معاً

### الطريقة 1: استخدام PM2

```bash
npm install -g pm2

pm2 start server.js --name "API"
pm2 start whatsapp-bot.js --name "WhatsApp"
pm2 start telegram-bot.js --name "Telegram"
pm2 start dashboard.js --name "Dashboard"

pm2 status
pm2 logs
```

### الطريقة 2: استخدام Docker Compose

ستجد ملف `docker-compose.yml` للنشر السريع.

### الطريقة 3: يدوياً (3 نوافذ Terminal)

**النافذة 1:**
```bash
npm start
```

**النافذة 2:**
```bash
node whatsapp-bot.js
node telegram-bot.js
```

**النافذة 3:**
```bash
node dashboard.js
```

---

## 📊 المنافذ

| البوت | المنفذ | الرابط |
|------|--------|--------|
| API الرئيسي | 5000 | http://localhost:5000 |
| WhatsApp | 3001 | - |
| Telegram | 3002 | - |
| Dashboard | 3003 | http://localhost:3003 |

---

## 🔧 استكشاف الأخطاء

### ❌ خطأ: "Token غير صحيح"

**الحل:**
- تحقق من `.env`
- تأكد من نسخ Token صحيح
- أعد التشغيل

### ❌ خطأ: "Port already in use"

**الحل:**
```bash
# غير المنفذ في .env
TELEGRAM_PORT=3002
DASHBOARD_PORT=3003
```

### ❌ خطأ: "Cannot find module"

**الحل:**
```bash
npm install
```

---

## 📈 التطوير المستقبلي

- [ ] Discord Bot
- [ ] Slack Bot
- [ ] Instagram Bot
- [ ] Scheduling (جدولة المعالجة)
- [ ] Analytics (تحليلات)
- [ ] Multiple Language Support

---

## 💡 نصائح مهمة

1. **أمان:** استخدم variables البيئية للمفاتيح
2. **Scaling:** استخدم PM2 أو Docker
3. **Logging:** مراقبة السجلات بانتظام
4. **Updates:** حدّث المكتبات بانتظام

---

**مبروك! البوتات جاهزة للعمل!** 🎉
