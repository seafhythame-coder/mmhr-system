#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// 🔧 سكريبت إعداد نظام MMHR التلقائي (SQLite)
// ═══════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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
// 1️⃣ التحقق من Node.js
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

// ═══════════════════════════════════════════════════════════════════
// 2️⃣ إنشاء المجلدات
// ═══════════════════════════════════════════════════════════════════

function createDirectories() {
  logStep(2, 'إنشاء المجلدات المطلوبة');

  const dirs = ['uploads', 'data', 'processed_files', 'logs'];

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
  logStep(3, 'تثبيت مكتبات Node.js');

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

// ═══════════════════════════════════════════════════════════════════
// 4️⃣ إنشاء ملف .env
// ═══════════════════════════════════════════════════════════════════

function createEnvFile() {
  logStep(4, 'إعداد ملف الإعدادات (.env)');

  const envPath = path.join(__dirname, '.env');
  const examplePath = path.join(__dirname, '.env.example');

  if (fs.existsSync(envPath)) {
    log('✓ ملف .env موجود بالفعل', 'cyan');
    return;
  }

  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    logSuccess('✓ تم إنشاء ملف .env من .env.example');
  } else {
    const envContent = `# 🔧 إعدادات نظام MMHR
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
JWT_SECRET=mmhr_secret_key_2026_super_secure_key_change_this
PORT=5000
NODE_ENV=development
API_BASE_URL=http://localhost:5000
`;
    fs.writeFileSync(envPath, envContent);
    logSuccess('✓ تم إنشاء ملف .env');
  }

  logWarning('💡 افتح ملف .env وضع فيه Telegram Bot Token الخاص بك');
}

// ═══════════════════════════════════════════════════════════════════
// 5️⃣ عرض الملخص النهائي
// ═══════════════════════════════════════════════════════════════════

function showSummary() {
  log('\n\n', 'reset');
  log('╔════════════════════════════════════════════════════════════╗', 'green');
  log('║           ✅ الإعداد اكتمل بنجاح!                        ║', 'green');
  log('╚════════════════════════════════════════════════════════════╝', 'green');

  log('\n📋 الخطوات التالية:\n', 'cyan');

  log('1️⃣  افتح ملف .env وضع فيه token التليجرام:', 'yellow');
  log('   TELEGRAM_BOT_TOKEN=your_token_here', 'blue');

  log('\n2️⃣  شغّل بوت تليجرام:', 'yellow');
  log('   npm run telegram', 'cyan');

  log('\n3️⃣  أو شغّل السيرفر الكامل:', 'yellow');
  log('   npm start', 'cyan');

  log('\n📖 اقرأ QUICK_START.md للتفاصيل الكاملة\n', 'blue');

  log('\n✨ مبروك! النظام جاهز للعمل!\n', 'green');
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 تشغيل السكريبت
// ═══════════════════════════════════════════════════════════════════

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     🔧 مرحباً بك في سكريبت إعداد نظام MMHR               ║', 'cyan');
  log('║     معالج المستندات الذكي - يعمل مع SQLite               ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');

  try {
    const hasNode = checkNodeVersion();

    if (!hasNode) {
      logError('\n❌ Node.js غير مثبت!');
      log('الرجاء تثبيت Node.js من: https://nodejs.org/', 'yellow');
      process.exit(1);
    }

    createDirectories();
    installNodePackages();
    createEnvFile();
    showSummary();
  } catch (err) {
    logError(`\n❌ حدث خطأ: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  logError(`خطأ: ${err.message}`);
  process.exit(1);
});

