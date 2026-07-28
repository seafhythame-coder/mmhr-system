import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import twilio from 'twilio';
import rateLimit from 'express-rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });
const { Pool } = pg;

// ✅ قاعدة البيانات - يدعم DATABASE_URL (Render) أو المتغيرات المنفصلة
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'mmhr_db',
        password: process.env.DB_PASSWORD || 'password',
        port: process.env.DB_PORT || 5432,
      }
);

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static('public'));

const SECRET_KEY = process.env.JWT_SECRET || 'mmhr_secret_key_2026';

console.log('\n🔧 إعدادات النظام:');
console.log(`📊 قاعدة البيانات: ${process.env.DB_NAME || 'mmhr_db'}`);
console.log(`🌐 البيئة: ${process.env.NODE_ENV || 'development'}\n`);

// ✅ Middleware للتحقق من Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: '❌ لا يوجد token',
      code: 'NO_TOKEN'
    });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: '❌ Token غير صحيح أو منتهي الصلاحية',
        code: 'INVALID_TOKEN'
      });
    }
    req.user = user;
    next();
  });
};

// ================================
// 🔐 APIs المصادقة
// ================================

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: '❌ محاولات كثيرة، حاول بعد 15 دقيقة', code: 'RATE_LIMIT' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ تسجيل (Sign Up)
app.post('/api/auth/register', authRateLimit, async (req, res) => {
  const { username, email, password } = req.body;

  // التحقق من البيانات
  if (!username || !email || !password) {
    return res.status(400).json({ 
      error: '❌ البيانات ناقصة (username, email, password مطلوبة)',
      code: 'MISSING_FIELDS'
    });
  }

  // التحقق من صيغة البريد
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: '❌ صيغة البريد غير صحيحة',
      code: 'INVALID_EMAIL'
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    res.status(201).json({
      status: '✅ تم التسجيل بنجاح',
      message: 'يمكنك الآن تسجيل الدخول',
      user: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ 
        error: '❌ البريد أو اسم المستخدم موجود بالفعل',
        code: 'DUPLICATE_USER'
      });
    }
    res.status(500).json({ 
      error: `❌ خطأ في السيرفر: ${err.message}`,
      code: 'SERVER_ERROR'
    });
  }
});

// ✅ دخول (Login)
app.post('/api/auth/login', authRateLimit, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      error: '❌ البريد وكلمة السر مطلوبان',
      code: 'MISSING_CREDENTIALS'
    });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: '❌ بريد أو كلمة سر خاطئة',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ 
        error: '❌ بريد أو كلمة سر خاطئة',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({
      status: '✅ تم تسجيل الدخول',
      message: 'مرحباً بك في النظام',
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ 
      error: `❌ خطأ في السيرفر: ${err.message}`,
      code: 'SERVER_ERROR'
    });
  }
});

// ================================
// 📄 APIs المستندات
// ================================

// ✅ رفع ملف
app.post('/api/documents/upload', authenticateToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      error: '❌ لم يتم رفع ملف',
      code: 'NO_FILE'
    });
  }

  const filePath = req.file.path;
  const fileName = req.file.originalname;
  const fileType = req.file.mimetype;
  const fileSize = req.file.size;
  const userId = req.user.id;

  // التحقق من نوع الملف
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/tiff'];
  if (!allowedTypes.includes(fileType)) {
    fs.unlinkSync(filePath); // حذف الملف
    return res.status(400).json({ 
      error: '❌ نوع ملف غير مدعوم. استخدم: PDF, Word, صور',
      code: 'INVALID_FILE_TYPE'
    });
  }

  try {
    // حفظ معلومات الملف في قاعدة البيانات
    const dbResult = await pool.query(
      'INSERT INTO documents (user_id, file_name, file_path, file_type, file_size, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [userId, fileName, filePath, fileType, fileSize, 'processing']
    );

    const documentId = dbResult.rows[0].id;

    console.log(`\n📥 ملف جديد: ${fileName} (ID: ${documentId})`);
    console.log(`📊 الحجم: ${(fileSize / 1024).toFixed(2)} KB`);
    console.log(`⏳ جاري المعالجة...\n`);

    // استدعاء Python Processor
    const pythonProcess = spawn('python3', [
      path.join(__dirname, 'processor.py'),
      filePath,
      String(documentId),
    ]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log(`⚠️ تحذير من Python: ${data.toString()}`);
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        await pool.query(
          'UPDATE documents SET status = $1, processed_text = $2 WHERE id = $3',
          ['completed', output, documentId]
        );

        console.log(`✅ تم معالجة الملف: ${fileName}`);
      } else {
        await pool.query(
          'UPDATE documents SET status = $1, error_message = $2 WHERE id = $3',
          ['error', errorOutput, documentId]
        );

        console.log(`❌ خطأ في المعالجة: ${errorOutput}`);
      }
    });

    res.json({
      status: '✅ تم رفع الملف',
      documentId,
      fileName,
      fileSize: `${(fileSize / 1024).toFixed(2)} KB`,
      message: 'الملف جاري المعالجة... انتظر دقيقة',
    });
  } catch (err) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).json({ 
      error: `❌ خطأ في المعالجة: ${err.message}`,
      code: 'UPLOAD_ERROR'
    });
  }
});

// ✅ جلب المستندات
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({
      status: '✅ تم جلب المستندات',
      count: result.rows.length,
      documents: result.rows,
    });
  } catch (err) {
    res.status(500).json({ 
      error: `❌ خطأ في جلب المستندات: ${err.message}`,
      code: 'FETCH_ERROR'
    });
  }
});

// ✅ جلب مستند واحد
app.get('/api/documents/:id', authenticateToken, async (req, res) => {
  const documentId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
      [documentId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: '❌ الملف غير موجود',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      status: '✅ تم جلب الملف',
      document: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ 
      error: `❌ خطأ: ${err.message}`,
      code: 'FETCH_ERROR'
    });
  }
});

// ✅ تحميل الملف المعالج
app.get('/api/documents/:id/download', authenticateToken, async (req, res) => {
  const documentId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
      [documentId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: '❌ الملف غير موجود',
        code: 'NOT_FOUND'
      });
    }

    const document = result.rows[0];

    if (document.status !== 'completed') {
      return res.status(400).json({ 
        error: `❌ الملف لم تتم معالجته بعد (الحالة: ${document.status})`,
        code: 'NOT_PROCESSED'
      });
    }

    const outputPath = document.file_path.replace(/\.[^/.]+$/, '_processed.txt');

    if (!fs.existsSync(outputPath)) {
      return res.status(404).json({ 
        error: '❌ الملف المعالج غير موجود',
        code: 'FILE_NOT_FOUND'
      });
    }

    res.download(outputPath, `${document.file_name}_processed.txt`, (err) => {
      if (err) {
        console.error(`❌ خطأ في التحميل: ${err.message}`);
      } else {
        console.log(`✅ تم تحميل: ${document.file_name}`);
      }
    });
  } catch (err) {
    res.status(500).json({ 
      error: `❌ خطأ: ${err.message}`,
      code: 'DOWNLOAD_ERROR'
    });
  }
});

// ✅ حذف ملف
app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  const documentId = req.params.id;

  try {
    const result = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
      [documentId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: '❌ الملف غير موجود',
        code: 'NOT_FOUND'
      });
    }

    const document = result.rows[0];

    // حذف الملفات من النظام
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    const outputPath = document.file_path.replace(/\.[^/.]+$/, '_processed.txt');
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    // حذف من قاعدة البيانات
    await pool.query('DELETE FROM documents WHERE id = $1', [documentId]);

    res.json({
      status: '✅ تم حذف الملف بنجاح',
      documentId,
    });
  } catch (err) {
    res.status(500).json({ 
      error: `❌ خطأ: ${err.message}`,
      code: 'DELETE_ERROR'
    });
  }
});

// ================================
// 📊 APIs الإحصائيات
// ================================

// ✅ احصائيات المستخدم
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM documents WHERE user_id = $1',
      [req.user.id]
    );

    const statusResult = await pool.query(
      'SELECT status, COUNT(*) as count FROM documents WHERE user_id = $1 GROUP BY status',
      [req.user.id]
    );

    const sizeResult = await pool.query(
      'SELECT SUM(file_size) as total_size FROM documents WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      status: '✅ إحصائيات المستخدم',
      stats: {
        total_documents: totalResult.rows[0].total || 0,
        by_status: statusResult.rows,
        total_size: `${((sizeResult.rows[0].total_size || 0) / 1024 / 1024).toFixed(2)} MB`,
      },
    });
  } catch (err) {
    res.status(500).json({ 
      error: `❌ خطأ: ${err.message}`,
      code: 'STATS_ERROR'
    });
  }
});

// ✅ Health Check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: '✅ النظام يعمل بشكل طبيعي',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(500).json({
      status: '❌ النظام غير متصل بقاعدة البيانات',
      error: err.message,
    });
  }
});

// ✅ الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>نظام MMHR</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 500px; }
        h1 { color: #667eea; margin-bottom: 20px; }
        p { color: #666; margin: 10px 0; }
        .status { color: #27ae60; font-weight: bold; }
        .api-list { text-align: left; margin-top: 30px; background: #f8f9fa; padding: 20px; border-radius: 5px; }
        .api-list li { margin: 10px 0; font-size: 0.9em; }
        a { color: #667eea; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📄 نظام MMHR</h1>
        <p>معالج المستندات الذكي</p>
        <p class="status">✅ النظام يعمل بشكل طبيعي</p>
        
        <div class="api-list">
          <h3>🔗 API الرئيسية:</h3>
          <ul>
            <li>📝 التسجيل: <code>POST /api/auth/register</code></li>
            <li>🔐 الدخول: <code>POST /api/auth/login</code></li>
            <li>📤 رفع ملف: <code>POST /api/documents/upload</code></li>
            <li>📁 جلب المستندات: <code>GET /api/documents</code></li>
            <li>⬇️ تحميل: <code>GET /api/documents/:id/download</code></li>
            <li>📊 الإحصائيات: <code>GET /api/dashboard/stats</code></li>
          </ul>
        </div>
        
        <p style="margin-top: 30px; font-size: 0.9em; color: #999;">
          <a href="https://github.com">📚 اقرأ الدليل الكامل</a>
        </p>
      </div>
    </body>
    </html>
  `);
});

// ================================
// 📱 WhatsApp Webhook (Twilio)
// ================================

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

// تخزين جلسات WhatsApp
const whatsappSessions = new Map();

const whatsappRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false,
});

let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_ACCOUNT_SID.startsWith('AC') && TWILIO_AUTH_TOKEN) {
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } catch (err) {
    console.error('⚠️ لم يتم تهيئة Twilio:', err.message);
  }
}

function sendWhatsAppMessage(to, message) {
  if (!twilioClient) return;
  twilioClient.messages.create({
    from: TWILIO_WHATSAPP_NUMBER,
    to,
    body: message,
  }).catch((err) => console.error('❌ خطأ في إرسال رسالة WhatsApp:', err.message));
}

app.post('/api/whatsapp/webhook', whatsappRateLimit, async (req, res) => {
  const { Body: incomingMessage, From: senderNumber, NumMedia: messageMedia } = req.body;

  console.log(`📨 WhatsApp من ${senderNumber}: ${incomingMessage}`);
  res.status(200).send('OK');

  if (!incomingMessage && !messageMedia) return;

  if (parseInt(messageMedia) > 0) {
    const session = whatsappSessions.get(senderNumber) || {};
    if (!session.token) {
      sendWhatsAppMessage(senderNumber, '❌ يجب تسجيل الدخول أولاً\n/login');
      return;
    }
    sendWhatsAppMessage(senderNumber, '⏳ جاري معالجة الملف... (استخدم رابط الـ API لرفع الملفات)');
    return;
  }

  const lowerMsg = (incomingMessage || '').toLowerCase().trim();
  let session = whatsappSessions.get(senderNumber) || {};

  try {
    if (lowerMsg === 'hello' || lowerMsg === 'مرحبا' || lowerMsg === '/start') {
      sendWhatsAppMessage(senderNumber, `👋 *مرحباً في بوت MMHR!*\n\n📋 الأوامر:\n/register - تسجيل\n/login - دخول\n/documents - مستنداتي\n/stats - إحصائيات\n/help - مساعدة`);
      return;
    }
    if (lowerMsg === 'help' || lowerMsg === 'مساعدة' || lowerMsg === '/help') {
      sendWhatsAppMessage(senderNumber, `🎯 *دليل الاستخدام*\n\n1️⃣ /register - تسجيل حساب جديد\n2️⃣ /login - تسجيل الدخول\n3️⃣ /documents - عرض مستنداتك\n4️⃣ /stats - الإحصائيات\n\n✅ أو أرسل ملف مباشرة!`);
      return;
    }
    if (lowerMsg === 'register' || lowerMsg === 'تسجيل' || lowerMsg === '/register') {
      session.step = 'username';
      whatsappSessions.set(senderNumber, session);
      sendWhatsAppMessage(senderNumber, '📝 *التسجيل*\n\nأرسل اسم المستخدم:');
      return;
    }
    if (lowerMsg === 'login' || lowerMsg === 'دخول' || lowerMsg === '/login') {
      session.step = 'email';
      whatsappSessions.set(senderNumber, session);
      sendWhatsAppMessage(senderNumber, '🔓 *تسجيل الدخول*\n\nأرسل بريدك الإلكتروني:');
      return;
    }
    if (lowerMsg === '/documents' || lowerMsg === 'مستندات') {
      if (!session.token) { sendWhatsAppMessage(senderNumber, '❌ يجب تسجيل الدخول أولاً\n/login'); return; }
      const result = await pool.query('SELECT id, file_name, status, created_at FROM documents WHERE user_id = (SELECT id FROM users WHERE id = $1) ORDER BY created_at DESC LIMIT 5', [session.userId]);
      if (!result.rows.length) { sendWhatsAppMessage(senderNumber, '📭 لا توجد مستندات'); return; }
      let msg = '📋 *مستنداتك:*\n\n';
      result.rows.forEach((d, i) => { msg += `${i + 1}. ${d.file_name} (${d.status})\n`; });
      sendWhatsAppMessage(senderNumber, msg);
      return;
    }
    if (lowerMsg === '/stats' || lowerMsg === 'إحصائيات') {
      if (!session.token) { sendWhatsAppMessage(senderNumber, '❌ يجب تسجيل الدخول أولاً\n/login'); return; }
      const r = await pool.query('SELECT COUNT(*) as total, status FROM documents WHERE user_id = $1 GROUP BY status', [session.userId]);
      let msg = '📊 *الإحصائيات:*\n\n';
      r.rows.forEach(row => { msg += `${row.status}: ${row.total}\n`; });
      sendWhatsAppMessage(senderNumber, msg);
      return;
    }

    if (session.step === 'username') {
      session.username = incomingMessage;
      session.step = 'email';
      whatsappSessions.set(senderNumber, session);
      sendWhatsAppMessage(senderNumber, '📧 أرسل بريدك الإلكتروني:');
      return;
    }
    if (session.step === 'email') {
      session.email = incomingMessage;
      session.step = 'password';
      whatsappSessions.set(senderNumber, session);
      sendWhatsAppMessage(senderNumber, '🔐 أرسل كلمة المرور:');
      return;
    }
    if (session.step === 'password') {
      try {
        if (session.username) {
          const hashedPassword = await bcrypt.hash(incomingMessage, 10);
          await pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3)', [session.username, session.email, hashedPassword]);
          sendWhatsAppMessage(senderNumber, '✅ تم التسجيل بنجاح!\n\nسجل دخولك: /login');
        } else {
          const result = await pool.query('SELECT * FROM users WHERE email = $1', [session.email]);
          if (!result.rows.length || !(await bcrypt.compare(incomingMessage, result.rows[0].password))) {
            sendWhatsAppMessage(senderNumber, '❌ بريد أو كلمة سر خاطئة');
          } else {
            const user = result.rows[0];
            const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, SECRET_KEY, { expiresIn: '24h' });
            session.token = token;
            session.userId = user.id;
            session.step = null;
            whatsappSessions.set(senderNumber, session);
            sendWhatsAppMessage(senderNumber, `✅ مرحباً ${user.username}!\n\nأوامر:\n/documents - مستنداتي\n/stats - إحصائيات`);
          }
        }
        whatsappSessions.set(senderNumber, {});
      } catch (err) {
        sendWhatsAppMessage(senderNumber, `❌ خطأ: ${err.message}`);
        whatsappSessions.set(senderNumber, {});
      }
      return;
    }

    sendWhatsAppMessage(senderNumber, `🤖 الأوامر:\n/register - تسجيل\n/login - دخول\n/documents - مستنداتي\n/stats - إحصائيات\n/help - مساعدة`);
  } catch (err) {
    console.error('❌ خطأ في WhatsApp webhook:', err.message);
    sendWhatsAppMessage(senderNumber, `❌ حدث خطأ: ${err.message}`);
  }
});

// ✅ معالجة الأخطاء 404
app.use((req, res) => {
  res.status(404).json({
    status: '❌ الرابط غير موجود',
    path: req.path,
    method: req.method,
  });
});

// ================================
// 🚀 تشغيل السيرفر
// ================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════╗');
  console.log('║    ✅ نظام MMHR يعمل بنجاح        ║');
  console.log('╚════════════════════════════════════╝\n');
  console.log(`🌐 الرابط: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`📱 WhatsApp Webhook: http://localhost:${PORT}/api/whatsapp/webhook\n`);

  // 🤖 تشغيل بوت Telegram تلقائياً
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  if (telegramToken && telegramToken !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    import('./telegram-bot.js')
      .then(() => console.log('✅ بوت Telegram يعمل (polling)'))
      .catch((err) => console.error('❌ خطأ في تشغيل بوت Telegram:', err.message));
  } else {
    console.log('⚠️  بوت Telegram غير مُفعّل - أضف TELEGRAM_BOT_TOKEN في متغيرات البيئة');
  }

  if (twilioClient) {
    console.log('✅ بوت WhatsApp (Twilio) جاهز على /api/whatsapp/webhook');
  } else {
    console.log('⚠️  بوت WhatsApp غير مُفعّل - أضف TWILIO_ACCOUNT_SID و TWILIO_AUTH_TOKEN');
  }
});

export default app;
