#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// 🔧 سكريبت إعداد نظام MMHR التلقائي
// ═══════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// الألوان
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, title) {
  log(`\n✅ الخطوة ${step}: ${title}`, 'cyan');
  log('═'.repeat(50), 'cyan');
}

function logSuccess(message) {
  log(message, 'green');
}

function logError(message) {
  log(message, 'red');
}

function logWarning(message) {
  log(message, 'yellow');
}

// ═══════════════════════════════════════════════════════════════════
// 1️⃣ التحقق من المتطلبات
// ═══════════════════════════════════════════════════════════════════

function checkNodeVersion() {
  logStep(1, 'التحقق من Node.js');

  try {
    const version = execSync('node --version').toString().trim();
    log(`✓ Node.js ${version}`, 'green');
    logSuccess('✓ Node.js مثبت بنجاح');
    return true;
  } catch {
    logError('✗ Node.js غير مثبت');
    log('حمل من: https://nodejs.org/', 'yellow');
    return false;
  }
}

function checkPythonVersion() {
  logStep(2, 'التحقق من Python');

  try {
    const version = execSync('python3 --version').toString().trim();
    log(`✓ ${version}`, 'green');
    logSuccess('✓ Python مثبت بنجاح');
    return true;
  } catch {
    logError('✗ Python غير مثبت');
    log('حمل من: https://www.python.org/', 'yellow');
    return false;
  }
}

function checkPostgresVersion() {
  logStep(3, 'التحقق من PostgreSQL');

  try {
    const version = execSync('psql --version').toString().trim();
    log(`✓ ${version}`, 'green');
    logSuccess('✓ PostgreSQL مثبت بنجاح');
    return true;
  } catch {
    logWarning('⚠️ PostgreSQL غير مثبت');
    log('حمل من: https://www.postgresql.org/download/', 'yellow');
    log('لكن يمكنك الاستمرار - ستحتاج لـ PostgreSQL لاحقاً', 'yellow');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 2️⃣ إنشاء المجلدات
// ═══════════════════════════════════════════════════════════════════

function createDirectories() {
  logStep(4, 'إنشاء المجلدات المطلوبة');

  const dirs = ['uploads', 'processed_files', 'logs'];

  for (const dir of dirs) {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      log(`✓ تم إنشاء: ${dir}`, 'green');
    } else {
      log(`✓ موجود: ${dir}`, 'cyan');
    }
  }

  logSuccess('✓ جميع المجلدات جاهزة');
}

// ═══════════════════════════════════════════════════════════════════
// 3️⃣ تثبيت المكتبات
// ═══════════════════════════════════════════════════════════════════

function installNodePackages() {
  logStep(5, 'تثبيت مكتبات Node.js');

  try {
    log('⏳ قد يستغرق دقائق معدودة...', 'yellow');
    execSync('npm install', { stdio: 'inherit' });
    logSuccess('✓ تم تثبيت جميع مكتبات Node.js');
    return true;
  } catch (err) {
    logError('✗ خطأ في تثبيت مكتبات Node.js');
    return false;
  }
}

function installPythonPackages() {
  logStep(6, 'تثبيت مكتبات Python');

  try {
    log('⏳ قد يستغرق دقائق معدودة...', 'yellow');
    execSync('pip install -r requirements.txt', { stdio: 'inherit' });
    logSuccess('✓ تم تثبيت جميع مكتبات Python');
    return true;
  } catch (err) {
    logError('✗ خطأ في تثبيت مكتبات Python');
    logWarning('💡 جرب: pip3 install -r requirements.txt');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 4️⃣ إنشاء ملف .env
// ═══════════════════════════════════════════════════════════════════

function createEnvFile() {
  logStep(7, 'إعداد ملف الإعدادات (.env)');

  const envPath = path.join(__dirname, '.env');

  if (fs.existsSync(envPath)) {
    log('✓ ملف .env موجود بالفعل', 'cyan');
    return;
  }

  const envContent = `# 🔧 إعدادات نظام MMHR
# ═══════════════════════════════════════════════════════════════════

# 📊 قاعدة البيانات PostgreSQL
DB_USER=postgres
DB_HOST=localhost
DB_NAME=mmhr_db
DB_PASSWORD=secure_password_here
DB_PORT=5432

# 🔐 الأمان
JWT_SECRET=mmhr_secret_key_2026_super_secure_key_change_this
PORT=5000

# 🌍 البيئة
NODE_ENV=development

# 🤖 API (اختياري)
OPENAI_API_KEY=sk-your_openai_key_here

# ═══════════════════════════════════════════════════════════════════
# ⚠️ تحذير أمان:
# - غير كلمات السر في الإنتاج
# - لا تضع المفاتيح الحقيقية في Git
# ═══════════════════════════════════════════════════════════════════
`;

  fs.writeFileSync(envPath, envContent);
  logSuccess('✓ تم إنشاء ملف .env');
  logWarning('💡 تذكر: غير البيانات الحساسة قبل النشر على الإنتاج');
}

// ═══════════════════════════════════════════════════════════════════
// 5️⃣ عرض الملخص النهائي
// ═══════════════════════════════════════════════════════════════════

function showSummary() {
  log('\n\n', 'reset');
  log('╔════════════════════════════════════════════════════════════╗', 'green');
  log('║           ✅ التثبيت اكتمل بنجاح!                        ║', 'green');
  log('╚════════════════════════════════════════════════════════════╝', 'green');

  log('\n📋 الخطوات التالية:\n', 'cyan');

  log('1️⃣  إعداد قاعدة البيانات:', 'yellow');
  log('   • افتح PostgreSQL', 'blue');
  log('   • شغل الأوامر SQL من README.md', 'blue');

  log('\n2️⃣  تشغيل النظام:', 'yellow');
  log('   npm start', 'cyan');

  log('\n3️⃣  اختبار النظام:', 'yellow');
  log('   • افتح: http://localhost:5000', 'blue');
  log('   • استخدم Postman لاختبار APIs', 'blue');

  log('\n4️⃣  الملفات المهمة:', 'yellow');
  log('   • server.js - السيرفر الرئيسي', 'blue');
  log('   • processor.py - معالج الملفات', 'blue');
  log('   • .env - الإعدادات', 'blue');
  log('   • README.md - التوثيق الكامل', 'blue');

  log('\n📞 للمساعدة:', 'cyan');
  log('   • اقرأ README.md للتفاصيل الكاملة', 'blue');
  log('   • تحقق من استكشاف الأخطاء في الدليل', 'blue');

  log('\n✨ مبروك! النظام جاهز للعمل!\n', 'green');
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 تشغيل السكريبت
// ═══════════════════════════════════════════════════════════════════

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     🔧 مرحباً بك في سكريبت إعداد نظام MMHR               ║', 'cyan');
  log('║     معالج المستندات الذكي                                 ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');

  try {
    // التحقق من المتطلبات
    const hasNode = checkNodeVersion();
    const hasPython = checkPythonVersion();
    const hasPostgres = checkPostgresVersion();

    if (!hasNode || !hasPython) {
      logError('\n❌ المتطلبات الأساسية غير مثبتة!');
      log('الرجاء تثبيت Node.js و Python أولاً.', 'yellow');
      process.exit(1);
    }

    // إنشاء المجلدات
    createDirectories();

    // تثبيت المكتبات
    const nodeOk = installNodePackages();
    const pythonOk = installPythonPackages();

    if (!nodeOk || !pythonOk) {
      logError('\n⚠️ حدثت أخطاء في التثبيت');
      log('تفضل بقراءة الأخطاء أعلاه', 'yellow');
    }

    // إنشاء .env
    createEnvFile();

    // عرض الملخص
    showSummary();
  } catch (err) {
    logError(`\n❌ حدث خطأ: ${err.message}`);
    process.exit(1);
  }
}

// تشغيل الـ main function
main().catch((err) => {
  logError(`خطأ: ${err.message}`);
  process.exit(1);
});
