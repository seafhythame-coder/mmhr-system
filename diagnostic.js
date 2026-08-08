#!/usr/bin/env node
// 🔍 ملف التشخيص — يختبر جميع الاتصالات والإعدادات
// ═══════════════════════════════════════════════════════════════════
// الاستخدام: node diagnostic.js

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ═══════════════════════════════════════════════════════════════════
// 🎨 ألوان الطرفية
// ═══════════════════════════════════════════════════════════════════
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

// Diagnostic output helpers — only masked/non-sensitive data is logged below
/* lgtm[js/clear-text-logging] */
function ok(msg)   { console.log(green(`  ✅ ${msg}`)); }
function fail(msg) { console.log(red(`  ❌ ${msg}`)); }
function warn(msg) { console.log(yellow(`  ⚠️  ${msg}`)); }
function info(msg) { console.log(cyan(`  ℹ️  ${msg}`)); }

// ═══════════════════════════════════════════════════════════════════
// 1️⃣  فحص متغيرات البيئة
// ═══════════════════════════════════════════════════════════════════
function checkEnvironmentVars() {
  console.log(bold("\n1️⃣  متغيرات البيئة:"));

  const DATABASE_URL   = process.env.DATABASE_URL;
  const JWT_SECRET     = process.env.JWT_SECRET;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_WEBHOOK = process.env.TELEGRAM_WEBHOOK_URL;
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const NODE_ENV       = process.env.NODE_ENV;

  if (DATABASE_URL) {
    // Mask credentials in output
    const masked = DATABASE_URL.replace(/:([^:@]+)@/, ':*****@');
    ok(`DATABASE_URL: ${masked}`);
  } else {
    fail('DATABASE_URL: غير مضبوط — سيفشل الاتصال بقاعدة البيانات على Render');
    if (process.env.DB_HOST) {
      warn(`  DB_HOST=${process.env.DB_HOST} DB_NAME=${process.env.DB_NAME || 'mmhr_db'} (وضع محلي)`);
    }
  }

  if (JWT_SECRET) {
    ok(`JWT_SECRET: مضبوط (${JWT_SECRET.length} حرف)`);
  } else {
    warn('JWT_SECRET: غير مضبوط — سيستخدم القيمة الافتراضية (غير آمن في الإنتاج)');
  }

  if (TELEGRAM_TOKEN && !TELEGRAM_TOKEN.startsWith('YOUR_')) {
    const maskedToken = TELEGRAM_TOKEN.split(':')[0] + ':****';
    ok(`TELEGRAM_TOKEN: ${maskedToken}`);
  } else if (TELEGRAM_TOKEN) {
    fail('TELEGRAM_TOKEN: يبدو أنه قيمة افتراضية وليس توكناً حقيقياً');
  } else {
    fail('TELEGRAM_TOKEN / TELEGRAM_BOT_TOKEN: غير مضبوط — بوت Telegram لن يعمل');
  }

  if (TELEGRAM_WEBHOOK) {
    if (TELEGRAM_WEBHOOK === 'https://onrender.com') {
      warn(`TELEGRAM_WEBHOOK_URL: "${TELEGRAM_WEBHOOK}" — هذا ليس رابطك الصحيح على Render!`);
      warn('  الرابط الصحيح يجب أن يكون مثل: https://اسم-مشروعك.onrender.com');
    } else if (TELEGRAM_WEBHOOK.startsWith('https://')) {
      ok(`TELEGRAM_WEBHOOK_URL: ${TELEGRAM_WEBHOOK}`);
    } else {
      warn(`TELEGRAM_WEBHOOK_URL: "${TELEGRAM_WEBHOOK}" — يجب أن يبدأ بـ https://`);
    }
  } else {
    warn('TELEGRAM_WEBHOOK_URL: غير مضبوط — سيستخدم polling (مقبول)');
  }

  if (WHATSAPP_TOKEN) {
    ok(`WHATSAPP_TOKEN: مضبوط`);
    if (/^\d+$/.test(WHATSAPP_TOKEN)) {
      warn('  هذا يبدو رقم هاتف وليس توكن API — بوت WhatsApp يحتاج إلى Twilio credentials');
    }
  } else {
    warn('WHATSAPP_TOKEN: غير مضبوط');
  }

  info(`NODE_ENV: ${NODE_ENV || 'development (غير مضبوط)'}`);
}

// ═══════════════════════════════════════════════════════════════════
// 2️⃣  فحص اتصال قاعدة البيانات
// ═══════════════════════════════════════════════════════════════════
async function checkDatabase() {
  console.log(bold("\n2️⃣  قاعدة البيانات PostgreSQL:"));

  const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user:     process.env.DB_USER     || 'postgres',
        host:     process.env.DB_HOST     || 'localhost',
        database: process.env.DB_NAME     || 'mmhr_db',
        password: process.env.DB_PASSWORD || '',
        port:     parseInt(process.env.DB_PORT || '5432'),
      };

  info(`نوع الاتصال: ${process.env.DATABASE_URL ? 'DATABASE_URL (Render)' : 'إعدادات منفردة (محلي)'}`);

  const pool = new Pool(poolConfig);

  try {
    const start = Date.now();
    const result = await pool.query('SELECT NOW() as time, version() as version, current_database() as db');
    const elapsed = Date.now() - start;

    ok(`متصل بنجاح (${elapsed}ms)`);
    ok(`قاعدة البيانات: ${result.rows[0].db}`);
    ok(`الوقت الحالي: ${result.rows[0].time}`);
    info(`الإصدار: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);

    // فحص الجداول
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );

    if (tables.rows.length === 0) {
      warn('لا توجد جداول — يجب تشغيل DATABASE_SETUP.sql أولاً');
      warn('  قم بتشغيل: psql $DATABASE_URL < DATABASE_SETUP.sql');
    } else {
      ok(`الجداول الموجودة (${tables.rows.length}): ${tables.rows.map(r => r.table_name).join(', ')}`);
    }

    // فحص جدول users تحديداً
    const requiredTables = ['users', 'documents'];
    for (const tbl of requiredTables) {
      const exists = tables.rows.some(r => r.table_name === tbl);
      if (exists) {
        const count = await pool.query(`SELECT COUNT(*) as cnt FROM ${tbl}`);
        ok(`جدول ${tbl}: موجود (${count.rows[0].cnt} سجل)`);
      } else {
        fail(`جدول ${tbl}: غير موجود — يجب إنشاؤه`);
      }
    }

  } catch (err) {
    fail(`فشل الاتصال: ${err.message}`);

    if (err.message.includes('SSL')) {
      warn('  تلميح: قد تحتاج لإضافة ssl: { rejectUnauthorized: false } للاتصال');
    }
    if (err.message.includes('ECONNREFUSED')) {
      warn('  تلميح: قاعدة البيانات لا تعمل أو الرابط غير صحيح');
    }
    if (err.message.includes('password authentication')) {
      warn('  تلميح: كلمة المرور أو اسم المستخدم غير صحيح');
    }
  } finally {
    await pool.end();
  }
}

// ═══════════════════════════════════════════════════════════════════
// 3️⃣  فحص Telegram Bot
// ═══════════════════════════════════════════════════════════════════
async function checkTelegramBot() {
  console.log(bold("\n3️⃣  Telegram Bot:"));

  const token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token || token.startsWith('YOUR_')) {
    fail('TELEGRAM_TOKEN غير مضبوط');
    warn('  أضف TELEGRAM_TOKEN إلى متغيرات البيئة');
    return;
  }

  try {
    // استخدام https مباشرة بدلاً من node-telegram-bot-api
    const https = await import('https');
    
    await new Promise((resolve, reject) => {
      const maskedToken = token.split(':')[0] + ':' + token.split(':')[1].slice(0, 4) + '****';
      const url = `https://api.telegram.org/bot${token}/getMe`;
      
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.ok) {
              ok(`Bot متصل بنجاح!`);
              ok(`اسم البوت: @${parsed.result.username}`);
              ok(`الاسم الكامل: ${parsed.result.first_name}`);
              
              const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
              if (webhookUrl && webhookUrl !== 'https://onrender.com' && webhookUrl.startsWith('https://')) {
                info(`Webhook URL: ${webhookUrl}/api/telegram/webhook`);
                info('  تأكد من إضافة /api/telegram/webhook لرابطك على Render');
              } else {
                info('وضع الاستخدام: Polling (يعمل تلقائياً عند تشغيل السيرفر)');
              }
            } else {
              fail(`فشل: ${parsed.description}`);
              if (parsed.description.includes('Unauthorized')) {
                warn('  التوكن غير صحيح — تحقق من TELEGRAM_TOKEN');
              }
            }
          } catch (e) {
            fail(`خطأ في تحليل الاستجابة: ${e.message}`);
          }
          resolve();
        });
      }).on('error', (e) => {
        fail(`خطأ في الاتصال: ${e.message}`);
        resolve();
      });
    });
  } catch (err) {
    fail(`خطأ: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 4️⃣  فحص WhatsApp / Twilio
// ═══════════════════════════════════════════════════════════════════
function checkWhatsApp() {
  console.log(bold("\n4️⃣  WhatsApp Bot (Twilio):"));

  const accountSid  = process.env.TWILIO_ACCOUNT_SID  || '';
  const authToken   = process.env.TWILIO_AUTH_TOKEN   || '';
  const whatsappNum = process.env.TWILIO_WHATSAPP_NUMBER || '';
  const waToken     = process.env.WHATSAPP_TOKEN || '';

  if (waToken && /^\d+$/.test(waToken)) {
    warn(`WHATSAPP_TOKEN="${waToken}" — هذا رقم هاتف، وليس Twilio credentials`);
    warn('  لتفعيل بوت WhatsApp، أنت بحاجة إلى حساب Twilio:');
    warn('  1. سجل على: https://www.twilio.com');
    warn('  2. احصل على: TWILIO_ACCOUNT_SID و TWILIO_AUTH_TOKEN');
    warn('  3. أضفهما كـ متغيرات بيئة على Render');
    return;
  }

  if (accountSid && !accountSid.startsWith('YOUR_')) {
    ok(`TWILIO_ACCOUNT_SID: ${accountSid.slice(0, 8)}****`);
  } else {
    fail('TWILIO_ACCOUNT_SID: غير مضبوط');
  }

  if (authToken && !authToken.startsWith('YOUR_')) {
    ok('TWILIO_AUTH_TOKEN: مضبوط');
  } else {
    fail('TWILIO_AUTH_TOKEN: غير مضبوط');
  }

  if (whatsappNum) {
    ok(`TWILIO_WHATSAPP_NUMBER: ${whatsappNum}`);
  } else {
    warn('TWILIO_WHATSAPP_NUMBER: غير مضبوط');
  }
}

// ═══════════════════════════════════════════════════════════════════
// 5️⃣  ملخص وتوصيات
// ═══════════════════════════════════════════════════════════════════
function printSummary() {
  console.log(bold("\n5️⃣  ملخص وتوصيات:"));

  if (!process.env.DATABASE_URL) {
    fail('أضف DATABASE_URL كمتغير بيئة على Render (متاح في لوحة قاعدة البيانات)');
  }

  const token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token) {
    fail('أضف TELEGRAM_TOKEN إلى متغيرات البيئة (استخدم اسم المتغير TELEGRAM_TOKEN)');
  }

  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (!webhookUrl || webhookUrl === 'https://onrender.com') {
    warn('TELEGRAM_WEBHOOK_URL: غير صحيح');
    warn('  على Render: ابحث عن رابط خدمتك مثل https://mmhr-system.onrender.com');
    warn('  ثم اضبط TELEGRAM_WEBHOOK_URL=https://mmhr-system.onrender.com');
    warn('  أو اتركه فارغاً وسيستخدم البوت وضع polling');
  }

  console.log(bold("\n📋 متغيرات Render المطلوبة:"));
  console.log(cyan("  DATABASE_URL    = postgresql://... (من لوحة قاعدة البيانات)"));
  console.log(cyan("  TELEGRAM_TOKEN  = 1234567890:AAF..."));
  console.log(cyan("  JWT_SECRET      = كلمة سر قوية"));
  console.log(cyan("  NODE_ENV        = production"));
  console.log(cyan("  PORT            = (يضبطه Render تلقائياً)"));
  console.log(cyan("  TELEGRAM_WEBHOOK_URL = https://اسم-مشروعك.onrender.com (اختياري)"));
  console.log();
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 التشغيل
// ═══════════════════════════════════════════════════════════════════
console.log(bold("\n╔══════════════════════════════════════════════════╗"));
console.log(bold("║  🔍 تشخيص نظام MMHR                            ║"));
console.log(bold("╚══════════════════════════════════════════════════╝"));

checkEnvironmentVars();
await checkDatabase();
await checkTelegramBot();
checkWhatsApp();
printSummary();

console.log(bold("\n════════════════════════════════════════════════════\n"));
