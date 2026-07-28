import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
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

// ✅ قاعدة البيانات SQLite
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'mmhr.db'));

// إنشاء الجداول تلقائياً إذا لم تكن موجودة
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'processing',
    processed_text TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static('public'));

const SECRET_KEY = process.env.JWT_SECRET || 'mmhr_secret_key_2026';

console.log('\n🔧 إعدادات النظام:');
console.log(`📊 قاعدة البيانات: SQLite (data/mmhr.db)`);
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

    const stmt = db.prepare(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
    );
    const result = stmt.run(username, email, hashedPassword);

    res.status(201).json({
      status: '✅ تم التسجيل بنجاح',
      message: 'يمكنك الآن تسجيل الدخول',
      user: { id: result.lastInsertRowid, username, email },
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
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
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ 
        error: '❌ بريد أو كلمة سر خاطئة',
        code: 'INVALID_CREDENTIALS'
      });
    }

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
    const stmt = db.prepare(
      'INSERT INTO documents (user_id, file_name, file_path, file_type, file_size, status) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const dbResult = stmt.run(userId, fileName, filePath, fileType, fileSize, 'processing');

    const documentId = dbResult.lastInsertRowid;

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

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        db.prepare('UPDATE documents SET status = ?, processed_text = ? WHERE id = ?')
          .run('completed', output, documentId);
        console.log(`✅ تم معالجة الملف: ${fileName}`);
      } else {
        db.prepare('UPDATE documents SET status = ?, error_message = ? WHERE id = ?')
          .run('error', errorOutput, documentId);
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
    const documents = db.prepare(
      'SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id);

    res.json({
      status: '✅ تم جلب المستندات',
      count: documents.length,
      documents,
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
    const document = db.prepare(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?'
    ).get(documentId, req.user.id);

    if (!document) {
      return res.status(404).json({ 
        error: '❌ الملف غير موجود',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      status: '✅ تم جلب الملف',
      document,
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
    const document = db.prepare(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?'
    ).get(documentId, req.user.id);

    if (!document) {
      return res.status(404).json({ 
        error: '❌ الملف غير موجود',
        code: 'NOT_FOUND'
      });
    }

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
    const document = db.prepare(
      'SELECT * FROM documents WHERE id = ? AND user_id = ?'
    ).get(documentId, req.user.id);

    if (!document) {
      return res.status(404).json({ 
        error: '❌ الملف غير موجود',
        code: 'NOT_FOUND'
      });
    }

    // حذف الملفات من النظام
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    const outputPath = document.file_path.replace(/\.[^/.]+$/, '_processed.txt');
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    // حذف من قاعدة البيانات
    db.prepare('DELETE FROM documents WHERE id = ?').run(documentId);

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
    const totalResult = db.prepare(
      'SELECT COUNT(*) as total FROM documents WHERE user_id = ?'
    ).get(req.user.id);

    const statusResult = db.prepare(
      'SELECT status, COUNT(*) as count FROM documents WHERE user_id = ? GROUP BY status'
    ).all(req.user.id);

    const sizeResult = db.prepare(
      'SELECT SUM(file_size) as total_size FROM documents WHERE user_id = ?'
    ).get(req.user.id);

    res.json({
      status: '✅ إحصائيات المستخدم',
      stats: {
        total_documents: totalResult.total || 0,
        by_status: statusResult,
        total_size: `${((sizeResult.total_size || 0) / 1024 / 1024).toFixed(2)} MB`,
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
app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
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
  console.log(`📡 API: http://localhost:${PORT}/api\n`);
  console.log('💡 نصيحة: استخدم Postman لاختبار الـ APIs\n');
});

export default app;
