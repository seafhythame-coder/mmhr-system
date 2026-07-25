// 🤖 Telegram Bot للنظام
// ═══════════════════════════════════════════════════════════════════

import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔑 البوت توكن
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN_HERE';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// إنشاء البوت
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// 📦 تخزين جلسات المستخدمين
const userSessions = new Map();

// ═══════════════════════════════════════════════════════════════════
// 🎯 أوامر البوت الرئيسية
// ═══════════════════════════════════════════════════════════════════

// ✅ كلمة البداية /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;

  const welcomeMessage = `
👋 مرحباً بك في بوت MMHR الذكي!

أنا هنا لساعدك في معالجة المستندات بسرعة واحترافية.

📋 **الأوامر المتاحة:**

/help - عرض المساعدة الكاملة
/register - تسجيل حساب جديد
/login - تسجيل دخول
/documents - عرض مستنداتك
/stats - إحصائيات المعالجة
/upload - رفع ملف جديد

💡 **أو ببساطة:**
أرسل لي أي ملف (PDF, Word, صورة) وسأعالجه تلقائياً!

---
📞 هل تحتاج مساعدة؟ اكتب /help
  `;

  bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        [{ text: '📤 رفع ملف' }, { text: '📋 مستنداتي' }],
        [{ text: '📊 الإحصائيات' }, { text: '❓ مساعدة' }],
        [{ text: '🔓 تسجيل دخول' }, { text: '📝 تسجيل جديد' }]
      ],
      resize_keyboard: true
    }
  });
});

// ❓ /help - المساعدة
bot.onText(/\/help|❓ مساعدة/, (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
🎯 **دليل الاستخدام**

**1️⃣ تسجيل حساب:**
اكتب: /register
ثم اتبع التعليمات

**2️⃣ تسجيل الدخول:**
اكتب: /login
استخدم بريدك وكلمة المرور

**3️⃣ رفع ملف:**
ببساطة أرسل الملف مباشرة!
- PDF
- Word (.docx, .doc)
- صور (.jpg, .png)
- Excel (.xlsx)

**4️⃣ عرض المستندات:**
اكتب: /documents

**5️⃣ الإحصائيات:**
اكتب: /stats

---

✨ **الميزات:**
✅ معالجة سريعة (دقائق معدودة)
✅ قراءة عربي وإنجليزي
✅ استخراج النصوص تلقائياً
✅ تنظيف وتنسيق المستندات

---

❓ **هل لديك سؤال؟**
تواصل معنا: /support
  `;

  bot.sendMessage(chatId, helpMessage, {
    parse_mode: 'Markdown'
  });
});

// 📝 /register - التسجيل
bot.onText(/\/register|📝 تسجيل جديد/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, '📝 **التسجيل في النظام**\n\nأرسل اسم المستخدم الخاص بك:', {
    parse_mode: 'Markdown'
  });

  userSessions.set(chatId, { step: 'username' });
});

// 🔓 /login - تسجيل الدخول
bot.onText(/\/login|🔓 تسجيل دخول/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, '🔓 **تسجيل الدخول**\n\nأرسل بريدك الإلكتروني:', {
    parse_mode: 'Markdown'
  });

  userSessions.set(chatId, { step: 'email' });
});

// 📋 /documents - عرض المستندات
bot.onText(/\/documents|📋 مستنداتي/, async (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions.get(chatId);

  if (!session || !session.token) {
    bot.sendMessage(chatId, '❌ يجب تسجيل الدخول أولاً\n/login', {
      parse_mode: 'Markdown'
    });
    return;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });

    const docs = response.data;
    if (!docs || docs.length === 0) {
      bot.sendMessage(chatId, '📭 لا توجد مستندات حالياً');
      return;
    }

    let message = '📋 **مستنداتك:**\n\n';
    docs.forEach((doc, index) => {
      message += `${index + 1}. ${doc.file_name}\n`;
      message += `   📊 الحالة: ${doc.status}\n`;
      message += `   📅 التاريخ: ${new Date(doc.created_at).toLocaleDateString('ar-EG')}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, '❌ حدث خطأ في جلب المستندات');
    console.error('Error fetching documents:', error.message);
  }
});

// 📊 /stats - الإحصائيات
bot.onText(/\/stats|📊 الإحصائيات/, async (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions.get(chatId);

  if (!session || !session.token) {
    bot.sendMessage(chatId, '❌ يجب تسجيل الدخول أولاً\n/login', {
      parse_mode: 'Markdown'
    });
    return;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${session.token}` }
    });

    const stats = response.data;

    let statsMessage = `
📊 **الإحصائيات:**

📄 إجمالي المستندات: ${stats.totalDocuments || 0}
✅ المعالجة: ${stats.processedDocuments || 0}
⏳ قيد المعالجة: ${stats.pendingDocuments || 0}
❌ الأخطاء: ${stats.failedDocuments || 0}

📈 **المعدل:**
⚡ متوسط الوقت: ${stats.avgProcessingTime || 0} ثانية

---
💾 إجمالي الملفات المعالجة: ${stats.totalProcessedFiles || 0}
    `;

    bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    bot.sendMessage(chatId, '❌ حدث خطأ في جلب الإحصائيات');
    console.error('Error fetching stats:', error.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 📥 معالجة الملفات والرسائل النصية
// ═══════════════════════════════════════════════════════════════════

// معالجة الملفات
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions.get(chatId);

  if (!session || !session.token) {
    bot.sendMessage(chatId, '❌ يجب تسجيل الدخول أولاً\n/login', {
      parse_mode: 'Markdown'
    });
    return;
  }

  const fileId = msg.document.file_id;
  const fileName = msg.document.file_name;

  try {
    bot.sendMessage(chatId, '⏳ جاري تحميل الملف...');

    // الحصول على رابط الملف
    const fileUrl = await bot.getFileLink(fileId);

    // تحميل الملف
    const fileResponse = await axios.get(fileUrl, { responseType: 'stream' });

    // حفظ الملف مؤقتاً
    const uploadsDir = path.join(__dirname, 'telegram_uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    await new Promise((resolve, reject) => {
      fileResponse.data.pipe(fs.createWriteStream(filePath))
        .on('finish', resolve)
        .on('error', reject);
    });

    bot.sendMessage(chatId, '⏳ جاري معالجة الملف...');

    // رفع الملف إلى API
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(
      `${API_BASE_URL}/api/documents/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${session.token}`
        }
      }
    );

    const docId = uploadResponse.data.id;

    // إرسال رسالة النجاح
    const successMessage = `
✅ **تم الرفع بنجاح!**

📄 الملف: ${fileName}
📊 الحالة: قيد المعالجة
🔔 سيتم إخطارك عند الانتهاء

🆔 رقم المستند: ${docId}
    `;

    bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

    // مراقبة حالة المعالجة
    monitorDocumentProcessing(chatId, docId, session.token, fileName);

    // حذف الملف المؤقت
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

  } catch (error) {
    console.error('Error processing file:', error);
    bot.sendMessage(chatId, `❌ حدث خطأ: ${error.response?.data?.error || error.message}`);
  }
});

// معالجة الصور
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const session = userSessions.get(chatId);

  if (!session || !session.token) {
    bot.sendMessage(chatId, '❌ يجب تسجيل الدخول أولاً\n/login', {
      parse_mode: 'Markdown'
    });
    return;
  }

  const fileId = msg.photo[msg.photo.length - 1].file_id;

  try {
    bot.sendMessage(chatId, '⏳ جاري معالجة الصورة...');

    const fileUrl = await bot.getFileLink(fileId);
    const fileResponse = await axios.get(fileUrl, { responseType: 'stream' });

    const uploadsDir = path.join(__dirname, 'telegram_uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `photo_${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);

    await new Promise((resolve, reject) => {
      fileResponse.data.pipe(fs.createWriteStream(filePath))
        .on('finish', resolve)
        .on('error', reject);
    });

    // رفع الصورة
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(
      `${API_BASE_URL}/api/documents/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${session.token}`
        }
      }
    );

    const docId = uploadResponse.data.id;

    bot.sendMessage(chatId, `✅ تم معالجة الصورة!\n🆔 رقم المستند: ${docId}`, {
      parse_mode: 'Markdown'
    });

    monitorDocumentProcessing(chatId, docId, session.token, 'photo');

    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

  } catch (error) {
    console.error('Error processing photo:', error);
    bot.sendMessage(chatId, `❌ حدث خطأ في معالجة الصورة`);
  }
});

// معالجة الرسائل النصية
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // تجاهل الأوامر
  if (text.startsWith('/')) return;

  const session = userSessions.get(chatId);

  // معالجة خطوات التسجيل والدخول
  if (session?.step === 'username') {
    session.username = text;
    session.step = 'email';
    bot.sendMessage(chatId, '📧 الآن أرسل بريدك الإلكتروني:');
    return;
  }

  if (session?.step === 'email' && !session.token) {
    session.email = text;
    session.step = 'password';
    bot.sendMessage(chatId, '🔐 أرسل كلمة المرور:');
    return;
  }

  if (session?.step === 'password' && !session.token) {
    try {
      // إذا كان لدينا username، هذا تسجيل جديد
      if (session.username) {
        // تسجيل حساب جديد
        const registerResponse = await axios.post(
          `${API_BASE_URL}/api/auth/register`,
          {
            username: session.username,
            email: session.email,
            password: text
          }
        );

        bot.sendMessage(chatId, '✅ تم التسجيل بنجاح!\n\nالآن سجل دخولك: /login');
        userSessions.delete(chatId);
      } else {
        // تسجيل دخول
        const loginResponse = await axios.post(
          `${API_BASE_URL}/api/auth/login`,
          {
            email: session.email,
            password: text
          }
        );

        session.token = loginResponse.data.token;
        session.step = null;

        bot.sendMessage(chatId, `
✅ **تسجيل الدخول ناجح!**

👋 أهلاً بك يا ${loginResponse.data.username}

الآن يمكنك:
📤 رفع الملفات
📋 عرض مستنداتك
📊 مشاهدة الإحصائيات

🎯 ماذا تريد أن تفعل؟
        `, {
          parse_mode: 'Markdown',
          reply_markup: {
            keyboard: [
              [{ text: '📤 رفع ملف' }, { text: '📋 مستنداتي' }],
              [{ text: '📊 الإحصائيات' }]
            ],
            resize_keyboard: true
          }
        });
      }
    } catch (error) {
      bot.sendMessage(chatId, `❌ خطأ: ${error.response?.data?.error || error.message}`);
      userSessions.delete(chatId);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
// 📊 مراقبة معالجة المستندات
// ═══════════════════════════════════════════════════════════════════

async function monitorDocumentProcessing(chatId, docId, token, fileName) {
  let attempts = 0;
  const maxAttempts = 120; // 10 دقائق (كل 5 ثواني)

  const checkStatus = setInterval(async () => {
    attempts++;

    if (attempts > maxAttempts) {
      clearInterval(checkStatus);
      bot.sendMessage(chatId, '⏳ المعالجة استغرقت وقتاً أطول من المتوقع. تحقق لاحقاً.');
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const doc = response.data;

      if (doc.status === 'completed') {
        clearInterval(checkStatus);

        bot.sendMessage(chatId, `
✅ **تم معالجة الملف بنجاح!**

📄 الملف: ${fileName}
⏱️ المدة: ${attempts * 5} ثانية

🆔 رقم المستند: ${docId}

📥 لتحميل النتيجة:
/download_${docId}
        `, { parse_mode: 'Markdown' });

      } else if (doc.status === 'failed' || doc.status === 'error') {
        clearInterval(checkStatus);

        bot.sendMessage(chatId, `
❌ **فشلت معالجة الملف**

📄 الملف: ${fileName}
❌ السبب: ${doc.error_message || 'خطأ غير معروف'}

🔄 يرجى محاولة ملف آخر
        `, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      console.error('Error checking document status:', error.message);
    }
  }, 5000); // فحص كل 5 ثواني
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 بدء البوت
// ═══════════════════════════════════════════════════════════════════

console.log('\n');
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║    🤖 Telegram Bot للنظام MMHR يعمل بنجاح!           ║');
console.log('╠════════════════════════════════════════════════════════╣');
console.log('║ 📱 Token: ' + TELEGRAM_TOKEN.substring(0, 20) + '...   ║');
console.log('║ 🌐 API: ' + API_BASE_URL + '                     ║');
console.log('║ ⏰ التشغيل: جاري الاستماع للرسائل...                ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('\n');

// معالجة الأخطاء
bot.on('polling_error', (error) => {
  console.error('❌ Polling Error:', error.message);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error.message);
});

export default bot;