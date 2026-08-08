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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ dest: 'uploads/' });
const { Pool } = pg;

// ✅ قاعدة البيانات - يدعم DATABASE_URL (Render) أو الإعدادات الفردية
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
        port: parseInt(process.env.DB_PORT || '5432'),
      }
);

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static('public'));

const SECRET_KEY = process.env.JWT_SECRET || 'mmhr_secret_key_2026';

console.log('\n🔧 إعدادات النظام:');
console.log(`📊 قاعدة البيانات: ${process.env.DATABASE_URL ? 'DATABASE_URL (Render PostgreSQL)' : process.env.DB_NAME || 'mmhr_db'}`);
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

// ✅ تسجيل (Sign Up)
app.post('/api/auth/register', async (req, res) => {
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
app.post('/api/auth/login', async (req, res) => {
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

// ✅ Diagnostic Endpoint - فحص شامل للنظام (يتطلب تسجيل دخول)
app.get('/api/diagnostic', authenticateToken, async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks: {},
  };

  // فحص قاعدة البيانات
  try {
    const dbResult = await pool.query('SELECT NOW() as time, version() as version');
    results.checks.database = {
      status: '✅ متصل',
      time: dbResult.rows[0].time,
      version: dbResult.rows[0].version.split(' ').slice(0, 2).join(' '),
      using: process.env.DATABASE_URL ? 'DATABASE_URL' : 'DB_* variables',
    };
  } catch (err) {
    results.checks.database = { status: '❌ فشل الاتصال', error: err.message };
  }

  // فحص الجداول
  try {
    const tablesResult = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    results.checks.tables = {
      status: tablesResult.rows.length > 0 ? '✅ موجودة' : '⚠️ لا توجد جداول',
      tables: tablesResult.rows.map((r) => r.table_name),
    };
  } catch (err) {
    results.checks.tables = { status: '❌ خطأ', error: err.message };
  }

  // فحص المتغيرات البيئية
  const telegramToken = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  results.checks.env = {
    DATABASE_URL: process.env.DATABASE_URL ? '✅ مضبوط' : '❌ غير موجود',
    JWT_SECRET: process.env.JWT_SECRET ? '✅ مضبوط' : '⚠️ يستخدم الافتراضي',
    TELEGRAM_TOKEN: telegramToken && !telegramToken.includes('YOUR_') ? '✅ مضبوط' : '❌ غير مضبوط',
    TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL ? `✅ ${process.env.TELEGRAM_WEBHOOK_URL}` : '⚠️ غير مضبوط (سيستخدم polling)',
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN ? '✅ مضبوط' : '❌ غير موجود',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  const hasErrors = Object.values(results.checks).some(
    (c) => typeof c === 'object' && c.status && c.status.startsWith('❌')
  );

  res.status(hasErrors ? 500 : 200).json(results);
});

// ✅ Telegram Webhook Endpoint
app.post('/api/telegram/webhook', (req, res) => {
  res.sendStatus(200);
  if (global.telegramBot) {
    try {
      global.telegramBot.processUpdate(req.body);
    } catch (err) {
      console.error('❌ خطأ في معالجة Telegram update:', err.message);
    }
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
app.listen(PORT, async () => {
  console.log('\n╔════════════════════════════════════╗');
  console.log('║    ✅ نظام MMHR يعمل بنجاح        ║');
  console.log('╚════════════════════════════════════╝\n');
  console.log(`🌐 الرابط: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api\n`);
  console.log('💡 نصيحة: استخدم Postman لاختبار الـ APIs\n');

  // ✅ تحقق من الاتصال بقاعدة البيانات
  try {
    await pool.query('SELECT 1');
    console.log('✅ قاعدة البيانات متصلة بنجاح');
  } catch (err) {
    console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
    console.error('💡 تأكد من إعداد DATABASE_URL في متغيرات البيئة');
  }

  // ✅ تشغيل بوت Telegram
  const telegramToken = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  if (telegramToken && !telegramToken.includes('YOUR_')) {
    try {
      const { default: TelegramBot } = await import('node-telegram-bot-api');
      const bot = new TelegramBot(telegramToken);

      // تسجيل معالجات الأحداث
      const { registerBotHandlers } = await import('./telegram-bot.js');
      registerBotHandlers(bot);

      global.telegramBot = bot;

      const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
      if (webhookUrl && webhookUrl !== 'https://onrender.com') {
        const fullWebhookUrl = `${webhookUrl.replace(/\/$/, '')}/api/telegram/webhook`;
        await bot.setWebHook(fullWebhookUrl);
        console.log(`✅ Telegram Webhook: ${fullWebhookUrl}`);
      } else {
        await bot.deleteWebHook();
        bot.startPolling({ restart: true });
        console.log('✅ Telegram Bot: بدأ الاستماع (polling)');
      }
    } catch (err) {
      console.error('❌ فشل تشغيل Telegram Bot:', err.message);
    }
  } else {
    console.warn('⚠️ TELEGRAM_TOKEN غير مضبوط — بوت Telegram لن يعمل');
  }
});

export default app;
