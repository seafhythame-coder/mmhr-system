// 📱 WhatsApp Bot via Twilio
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 إعدادات Twilio
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

if (!ACCOUNT_SID || !AUTH_TOKEN) {
  console.warn('⚠️  TWILIO_ACCOUNT_SID أو TWILIO_AUTH_TOKEN غير محددين.');
  console.warn('   بوت WhatsApp لن يتمكن من إرسال الرسائل حتى تضيف بيانات Twilio في .env\n');
}

const client = ACCOUNT_SID && AUTH_TOKEN ? twilio(ACCOUNT_SID, AUTH_TOKEN) : null;

// إنشاء Express app
const app = express();
const PORT = process.env.WHATSAPP_PORT || 3001;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 📦 تخزين جلسات المستخدمين
const userSessions = new Map();

// ═══════════════════════════════════════════════════════════════════
// 📥 الـ Webhook لاستقبال الرسائل
// ═══════════════════════════════════════════════════════════════════

app.post('/api/whatsapp/webhook', async (req, res) => {
  const body = req.body;
  const incomingMessage = body.Body;
  const senderNumber = body.From;
  const messageMedia = body.NumMedia;

  console.log(`📨 رسالة من ${senderNumber}: ${incomingMessage}`);

  res.status(200).send('OK');

  // معالجة الملفات
  if (messageMedia > 0) {
    await handleMediaMessage(senderNumber, body);
    return;
  }

  // معالجة الرسائل النصية
  await handleTextMessage(senderNumber, incomingMessage);
});

// ═══════════════════════════════════════════════════════════════════
// 💬 معالجة الرسائل النصية
// ═══════════════════════════════════════════════════════════════════

async function handleTextMessage(senderNumber, message) {
  const lowerMessage = message.toLowerCase().trim();
  let session = userSessions.get(senderNumber) || {};

  try {
    // أوامر البداية
    if (lowerMessage === 'hello' || lowerMessage === 'مرحبا' || lowerMessage === '/start') {
      sendWelcomeMessage(senderNumber);
      return;
    }

    if (lowerMessage === 'help' || lowerMessage === 'مساعدة' || lowerMessage === '/help') {
      sendHelpMessage(senderNumber);
      return;
    }

    // تسجيل جديد
    if (lowerMessage === 'register' || lowerMessage === 'تسجيل' || lowerMessage === '/register') {
      session.step = 'username';
      sendMessage(senderNumber, '📝 *التسجيل في النظام*\n\nأرسل اسم المستخدم الخاص بك:');
      userSessions.set(senderNumber, session);
      return;
    }

    // تسجيل دخول
    if (lowerMessage === 'login' || lowerMessage === 'دخول' || lowerMessage === '/login') {
      session.step = 'email';
      sendMessage(senderNumber, '🔓 *تسجيل الدخول*\n\nأرسل بريدك الإلكتروني:');
      userSessions.set(senderNumber, session);
      return;
    }

    // عرض المستندات
    if (lowerMessage === 'documents' || lowerMessage === 'مستندات' || lowerMessage === '/documents') {
      if (!session.token) {
        sendMessage(senderNumber, '❌ يجب تسجيل الدخول أولاً\n/login');
        return;
      }

      await showDocuments(senderNumber, session.token);
      return;
    }

    // الإحصائيات
    if (lowerMessage === 'stats' || lowerMessage === 'إحصائيات' || lowerMessage === '/stats') {
      if (!session.token) {
        sendMessage(senderNumber, '❌ يجب تسجيل الدخول أولاً\n/login');
        return;
      }

      await showStatistics(senderNumber, session.token);
      return;
    }

    // معالجة خطوات التسجيل والدخول
    if (session.step === 'username') {
      session.username = message;
      session.step = 'email';
      sendMessage(senderNumber, '📧 الآن أرسل بريدك الإلكتروني:');
      userSessions.set(senderNumber, session);
      return;
    }

    if (session.step === 'email' && !session.token) {
      session.email = message;
      session.step = 'password';
      sendMessage(senderNumber, '🔐 أرسل كلمة المرور:');
      userSessions.set(senderNumber, session);
      return;
    }

    if (session.step === 'password') {
      try {
        if (session.username) {
          // تسجيل جديد
          const registerResponse = await axios.post(
            `${API_BASE_URL}/api/auth/register`,
            {
              username: session.username,
              email: session.email,
              password: message
            }
          );

          sendMessage(senderNumber, '✅ تم التسجيل بنجاح!\n\nالآن سجل دخولك: /login');
          session = {};
        } else {
          // تسجيل دخول
          const loginResponse = await axios.post(
            `${API_BASE_URL}/api/auth/login`,
            {
              email: session.email,
              password: message
            }
          );

          session.token = loginResponse.data.token;
          session.step = null;

          sendMessage(senderNumber, `
✅ *تسجيل الدخول ناجح!*

👋 أهلاً بك يا ${loginResponse.data.username}

الآن يمكنك:
📤 رفع الملفات
📋 عرض مستنداتك
📊 مشاهدة الإحصائيات

🎯 الخيارات:
• _/documents_ - المستندات
• _/stats_ - الإحصائيات
• أرسل ملف مباشرة
          `);
        }

        userSessions.set(senderNumber, session);
      } catch (error) {
        sendMessage(senderNumber, `❌ خطأ: ${error.response?.data?.error || error.message}`);
        session = {};
        userSessions.set(senderNumber, session);
      }
    }

    // الرسائل العادية
    if (!session.step && message.trim()) {
      sendMessage(senderNumber, `
🤖 *أوامر مفيدة:*

📝 /register - التسجيل
🔓 /login - تسجيل الدخول
📋 /documents - مستنداتي
📊 /stats - الإحصائيات
❓ /help - المساعدة

💡 أو أرسل ملف مباشرة!
      `);
    }

  } catch (error) {
    console.error('Error handling message:', error);
    sendMessage(senderNumber, `❌ حدث خطأ: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 📎 معالجة الملفات والوسائط
// ═══════════════════════════════════════════════════════════════════

async function handleMediaMessage(senderNumber, body) {
  const session = userSessions.get(senderNumber) || {};

  if (!session.token) {
    sendMessage(senderNumber, '❌ يجب تسجيل الدخول أولاً\n/login');
    return;
  }

  try {
    sendMessage(senderNumber, '⏳ جاري تحميل الملف...');

    // الحصول على معلومات الملف
    const mediaUrl = body['MediaUrl0'];
    const mediaType = body['MediaContentType0'];
    const fileName = `whatsapp_${Date.now()}_${mediaType.split('/')[1] || 'file'}`;

    // تحميل الملف
    const fileResponse = await axios.get(mediaUrl, {
      responseType: 'stream',
      auth: {
        username: ACCOUNT_SID,
        password: AUTH_TOKEN
      }
    });

    // حفظ الملف مؤقتاً
    const uploadsDir = path.join(__dirname, 'whatsapp_uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);

    await new Promise((resolve, reject) => {
      fileResponse.data.pipe(fs.createWriteStream(filePath))
        .on('finish', resolve)
        .on('error', reject);
    });

    sendMessage(senderNumber, '⏳ جاري معالجة الملف...');

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

    sendMessage(senderNumber, `
✅ *تم الرفع بنجاح!*

📄 الملف: ${fileName}
📊 الحالة: قيد المعالجة
🆔 رقم المستند: ${docId}

🔔 سيتم إخطارك عند الانتهاء...
    `);

    // مراقبة معالجة المستند
    monitorDocumentProcessing(senderNumber, docId, session.token, fileName);

    // حذف الملف المؤقت
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

  } catch (error) {
    console.error('Error processing media:', error);
    sendMessage(senderNumber, `❌ خطأ في معالجة الملف: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 📊 دوال مساعدة
// ═══════════════════════════════════════════════════════════════════

async function showDocuments(senderNumber, token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const docs = response.data;
    if (!docs || docs.length === 0) {
      sendMessage(senderNumber, '📭 لا توجد مستندات حالياً');
      return;
    }

    let message = '📋 *مستنداتك:*\n\n';
    docs.forEach((doc, index) => {
      message += `${index + 1}. ${doc.file_name}\n`;
      message += `   📊 الحالة: ${doc.status}\n`;
      message += `   📅 التاريخ: ${new Date(doc.created_at).toLocaleDateString('ar-EG')}\n\n`;
    });

    sendMessage(senderNumber, message);
  } catch (error) {
    sendMessage(senderNumber, '❌ خطأ في جلب المستندات');
  }
}

async function showStatistics(senderNumber, token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const stats = response.data;

    const statsMessage = `
📊 *الإحصائيات:*

📄 إجمالي المستندات: ${stats.totalDocuments || 0}
✅ المعالجة: ${stats.processedDocuments || 0}
⏳ قيد المعالجة: ${stats.pendingDocuments || 0}
❌ الأخطاء: ${stats.failedDocuments || 0}

📈 *المعدل:*
⚡ متوسط الوقت: ${stats.avgProcessingTime || 0} ثانية
💾 إجمالي الملفات: ${stats.totalProcessedFiles || 0}
    `;

    sendMessage(senderNumber, statsMessage);
  } catch (error) {
    sendMessage(senderNumber, '❌ خطأ في جلب الإحصائيات');
  }
}

async function monitorDocumentProcessing(senderNumber, docId, token, fileName) {
  let attempts = 0;
  const maxAttempts = 120;

  const checkStatus = setInterval(async () => {
    attempts++;

    if (attempts > maxAttempts) {
      clearInterval(checkStatus);
      sendMessage(senderNumber, '⏳ المعالجة استغرقت وقتاً أطول من المتوقع. تحقق لاحقاً.');
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const doc = response.data;

      if (doc.status === 'completed') {
        clearInterval(checkStatus);

        sendMessage(senderNumber, `
✅ *تم معالجة الملف بنجاح!*

📄 الملف: ${fileName}
⏱️ المدة: ${attempts * 5} ثانية
🆔 رقم المستند: ${docId}

📥 لتحميل النتيجة اكتب: /download_${docId}
        `);

      } else if (doc.status === 'failed' || doc.status === 'error') {
        clearInterval(checkStatus);

        sendMessage(senderNumber, `
❌ *فشلت معالجة الملف*

📄 الملف: ${fileName}
❌ السبب: ${doc.error_message || 'خطأ غير معروف'}

🔄 يرجى محاولة ملف آخر
        `);
      }
    } catch (error) {
      console.error('Error checking document status:', error.message);
    }
  }, 5000);
}

function sendWelcomeMessage(senderNumber) {
  const welcomeMessage = `
👋 *مرحباً بك في بوت MMHR الذكي!*

أنا هنا لساعدك في معالجة المستندات بسرعة واحترافية.

📋 *الأوامر المتاحة:*

/help - عرض المساعدة
/register - تسجيل حساب جديد
/login - تسجيل دخول
/documents - عرض مستنداتك
/stats - الإحصائيات

💡 *أو ببساطة:*
أرسل أي ملف (PDF, Word, صورة) وسأعالجه تلقائياً!
  `;

  sendMessage(senderNumber, welcomeMessage);
}

function sendHelpMessage(senderNumber) {
  const helpMessage = `
🎯 *دليل الاستخدام*

*1️⃣ تسجيل حساب:*
اكتب: /register
ثم اتبع التعليمات

*2️⃣ تسجيل الدخول:*
اكتب: /login
استخدم بريدك وكلمة المرور

*3️⃣ رفع ملف:*
ببساطة أرسل الملف مباشرة!
- PDF
- Word (.docx, .doc)
- صور (.jpg, .png)
- Excel (.xlsx)

*4️⃣ عرض المستندات:*
اكتب: /documents

*5️⃣ الإحصائيات:*
اكتب: /stats

---

✨ *الميزات:*
✅ معالجة سريعة
✅ قراءة عربي وإنجليزي
✅ استخراج النصوص
✅ تنظيم المستندات
  `;

  sendMessage(senderNumber, helpMessage);
}

function sendMessage(to, message) {
  if (!client) {
    console.warn(`⚠️  WhatsApp غير مُعدّ - الرسالة إلى ${to}: ${message.substring(0, 60)}...`);
    return;
  }
  client.messages.create({
    from: WHATSAPP_NUMBER,
    to: to,
    body: message
  }).catch((error) => {
    console.error('Error sending WhatsApp message:', error.message);
  });
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 تشغيل الخادم
// ═══════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║    📱 WhatsApp Bot (Twilio) يعمل بنجاح!              ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║ 🌐 Webhook: http://localhost:${PORT}/api/whatsapp/webhook   ║`);
  console.log(`║ 📱 WhatsApp Number: ${WHATSAPP_NUMBER}     ║`);
  console.log('║ ⏰ التشغيل: جاري الاستماع للرسائل...                ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\n');
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error.message);
});

export default app;