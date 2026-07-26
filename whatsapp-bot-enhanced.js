// 📱 Enhanced WhatsApp Bot with Advanced Features
// ════════════════════════════════════════════════════════════════

import express from 'express';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import axios from 'axios';
import FormData from 'form-data';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Configuration
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'YOUR_ACCOUNT_SID';
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'YOUR_AUTH_TOKEN';
const WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
const app = express();
const PORT = process.env.WHATSAPP_PORT || 3001;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const userSessions = new Map();

// ════════════════════════════════════════════════════════════════
// 🎯 QR Code Generation
// ════════════════════════════════════════════════════════════════

async function generateQRCode(data) {
  try {
    const qrPath = path.join(__dirname, 'whatsapp_uploads', `qr_${Date.now()}.png`);
    
    if (!fs.existsSync(path.dirname(qrPath))) {
      fs.mkdirSync(path.dirname(qrPath), { recursive: true });
    }

    await QRCode.toFile(qrPath, JSON.stringify(data));
    return qrPath;
  } catch (error) {
    console.error('❌ QR Error:', error);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
// 💬 Message Handlers
// ════════════════════════════════════════════════════════════════

app.post('/api/whatsapp/webhook', async (req, res) => {
  const { Body, From, NumMedia } = req.body;

  console.log(`📨 من: ${From} | الرسالة: ${Body}`);
  res.status(200).send('OK');

  if (NumMedia > 0) {
    await handleMedia(From, req.body);
  } else {
    await handleText(From, Body);
  }
});

async function handleText(phoneNumber, message) {
  let session = userSessions.get(phoneNumber) || {};
  const lowerMsg = message.toLowerCase().trim();

  try {
    // Main menu
    if (lowerMsg === 'مرحبا' || lowerMsg === 'menu') {
      const menu = `
👋 *أهلاً بك في MMHR*

📋 *الخيارات الرئيسية:*

1️⃣ *تسجيل* - تسجيل حساب جديد
2️⃣ *دخول* - تسجيل الدخول
3️⃣ *رفع* - رفع ملف
4️⃣ *مستندات* - عرض المستندات
5️⃣ *تعديل* - تحرير المستند
6️⃣ *توقيع* - إضافة توقيع
7️⃣ *إحصائيات* - التحليلات
8️⃣ *مساعدة* - المساعدة
      `;
      sendMessage(phoneNumber, menu);
      return;
    }

    // Authentication flow
    if (lowerMsg === '1' || lowerMsg === 'تسجيل') {
      session.step = 'register_username';
      sendMessage(phoneNumber, '📝 أرسل اسم المستخدم:');
      userSessions.set(phoneNumber, session);
      return;
    }

    if (lowerMsg === '2' || lowerMsg === 'دخول') {
      session.step = 'login_email';
      sendMessage(phoneNumber, '📧 أرسل بريدك الإلكتروني:');
      userSessions.set(phoneNumber, session);
      return;
    }

    // Edit options
    if (lowerMsg === '5' || lowerMsg === 'تعديل') {
      if (!session.token) {
        sendMessage(phoneNumber, '❌ يجب تسجيل الدخول أولاً');
        return;
      }

      const editMenu = `
✏️ *خيارات التعديل:*

1️⃣ إضافة نص
2️⃣ حذف فقرة
3️⃣ استبدال نص
4️⃣ تنسيق المستند
5️⃣ ختم رقمي
6️⃣ توقيع رقمي
      `;
      sendMessage(phoneNumber, editMenu);
      return;
    }

    // Analytics
    if (lowerMsg === '7' || lowerMsg === 'إحصائيات') {
      if (!session.token) {
        sendMessage(phoneNumber, '❌ يجب تسجيل الدخول أولاً');
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${session.token}` }
        });

        const stats = res.data.stats || {};
        const analytics = `
📊 *التحليلات:*

📄 المستندات: ${stats.total_documents || 0}
💾 الحجم: ${stats.total_size || '0 MB'}
✅ مكتملة: ${stats.by_status?.find(s => s.status === 'completed')?.count || 0}
⏳ قيد المعالجة: ${stats.by_status?.find(s => s.status === 'processing')?.count || 0}
❌ أخطاء: ${stats.by_status?.find(s => s.status === 'error')?.count || 0}
        `;
        sendMessage(phoneNumber, analytics);
      } catch (error) {
        sendMessage(phoneNumber, '❌ خطأ في الحصول على الإحصائيات');
      }
      return;
    }

    // Auth flow processing
    if (session.step === 'register_username') {
      session.username = message;
      session.step = 'register_email';
      sendMessage(phoneNumber, '📧 أرسل بريدك الإلكتروني:');
      userSessions.set(phoneNumber, session);
      return;
    }

    if (session.step === 'register_email') {
      session.email = message;
      session.step = 'register_password';
      sendMessage(phoneNumber, '🔐 أرسل كلمة المرور:');
      userSessions.set(phoneNumber, session);
      return;
    }

    if (session.step === 'register_password') {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/register`, {
          username: session.username,
          email: session.email,
          password: message
        });
        sendMessage(phoneNumber, '✅ تم التسجيل بنجاح! الآن سجل الدخول');
        session = {};
      } catch (error) {
        sendMessage(phoneNumber, '❌ خطأ في التسجيل');
      }
      userSessions.set(phoneNumber, session);
      return;
    }

    if (session.step === 'login_email') {
      session.email = message;
      session.step = 'login_password';
      sendMessage(phoneNumber, '🔐 أرسل كلمة المرور:');
      userSessions.set(phoneNumber, session);
      return;
    }

    if (session.step === 'login_password') {
      try {
        const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          email: session.email,
          password: message
        });
        session.token = res.data.token;
        session.username = res.data.user?.username;
        session.step = null;
        sendMessage(phoneNumber, `✅ مرحباً ${session.username || 'User'}!`);
      } catch (error) {
        sendMessage(phoneNumber, '❌ بيانات دخول خاطئة');
        session = {};
      }
      userSessions.set(phoneNumber, session);
      return;
    }

    // Default
    sendMessage(phoneNumber, '👋 اكتب *مرحبا* لعرض القائمة الرئيسية');
  } catch (error) {
    console.error('Error:', error);
    sendMessage(phoneNumber, '❌ حدث خطأ');
  }
}

async function handleMedia(phoneNumber, body) {
  const session = userSessions.get(phoneNumber) || {};

  if (!session.token) {
    sendMessage(phoneNumber, '❌ يجب تسجيل الدخول أولاً');
    return;
  }

  try {
    sendMessage(phoneNumber, '⏳ جاري تحميل الملف...');

    const mediaUrl = body['MediaUrl0'];
    const mediaType = body['MediaContentType0'];

    const fileResponse = await axios.get(mediaUrl, {
      responseType: 'stream',
      auth: { username: ACCOUNT_SID, password: AUTH_TOKEN }
    });

    const uploadsDir = path.join(__dirname, 'whatsapp_uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `wa_${Date.now()}.${mediaType.split('/')[1] || 'file'}`;
    const filePath = path.join(uploadsDir, fileName);

    await new Promise((resolve, reject) => {
      fileResponse.data.pipe(fs.createWriteStream(filePath))
        .on('finish', resolve)
        .on('error', reject);
    });

    sendMessage(phoneNumber, '⏳ جاري معالجة الملف...');

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const uploadRes = await axios.post(
      `${API_BASE_URL}/api/documents/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${session.token}`
        }
      }
    );

    session.lastDocumentId = uploadRes.data.documentId;
    userSessions.set(phoneNumber, session);

    // Generate QR code
    const qrPath = await generateQRCode({
      type: 'mmhr_document',
      documentId: uploadRes.data.documentId,
      fileName: fileName
    });

    sendMessage(phoneNumber, `
✅ *تم الرفع بنجاح!*
📄 ${fileName}
🔔 جاري المعالجة...
    `);

    if (qrPath) {
      await sendQRCode(phoneNumber, qrPath);
      fs.unlink(qrPath, () => {});
    }

    fs.unlink(filePath, () => {});
  } catch (error) {
    console.error('Error:', error);
    sendMessage(phoneNumber, `❌ خطأ: ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════════
// 📤 Send Functions
// ════════════════════════════════════════════════════════════════

function sendMessage(to, message) {
  client.messages.create({
    from: WHATSAPP_NUMBER,
    to: to,
    body: message
  }).catch((error) => {
    console.error('Error sending message:', error);
  });
}

async function sendQRCode(to, filePath) {
  try {
    await client.messages.create({
      from: WHATSAPP_NUMBER,
      to: to,
      mediaUrl: [`file://${filePath}`]
    });
  } catch (error) {
    console.error('Error sending QR:', error);
  }
}

// Health check
app.get('/api/whatsapp/health', (req, res) => {
  res.json({ status: '✅ WhatsApp bot running' });
});

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  📱 Enhanced WhatsApp Bot يعمل بنجاح!               ║');
  console.log('║  ✅ Features: QR Code, Analytics, Digital Sign      ║');
  console.log(`║  🌐 Webhook: http://localhost:${PORT}/api/whatsapp/webhook   ║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');
});

export default app;