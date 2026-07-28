// ═══════════════════════════════════════════════════════════════════
// 🔍 ملف تشخيص نظام MMHR
// ═══════════════════════════════════════════════════════════════════
// الاستخدام: node diagnostic.js

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

console.log('\n╔═══════════════════════════════════════════╗');
console.log('║      🔍 تشخيص نظام MMHR                 ║');
console.log('╚═══════════════════════════════════════════╝\n');

// ─── 1. فحص متغيرات البيئة ──────────────────────────────────────
console.log('📋 متغيرات البيئة:');

const checks = [
  { key: 'DATABASE_URL', label: 'قاعدة البيانات (URL)' },
  { key: 'DB_HOST',      label: 'DB_HOST (بديل)' },
  { key: 'JWT_SECRET',   label: 'JWT_SECRET' },
  { key: 'TELEGRAM_TOKEN',     label: 'TELEGRAM_TOKEN' },
  { key: 'TELEGRAM_BOT_TOKEN', label: 'TELEGRAM_BOT_TOKEN (بديل)' },
  { key: 'TWILIO_ACCOUNT_SID', label: 'TWILIO_ACCOUNT_SID' },
  { key: 'TWILIO_AUTH_TOKEN',  label: 'TWILIO_AUTH_TOKEN' },
  { key: 'PORT',         label: 'PORT (السيرفر)' },
  { key: 'NODE_ENV',     label: 'NODE_ENV' },
];

for (const { key, label } of checks) {
  const val = process.env[key];
  if (val) {
    // إخفاء الجزء الحساس
    const display = val.length > 20 ? val.substring(0, 15) + '***' : '***';
    console.log(`  ✅ ${label}: ${display}`);
  } else {
    console.log(`  ⚠️  ${label}: غير محدد`);
  }
}

// ─── 2. فحص الاتصال بقاعدة البيانات ────────────────────────────
console.log('\n📊 فحص الاتصال بقاعدة البيانات...');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'mmhr_db',
      password: process.env.DB_PASSWORD || 'password',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    };

const pool = new Pool({ ...poolConfig, connectionTimeoutMillis: 8000 });

try {
  const result = await pool.query('SELECT NOW() AS now');
  console.log(`  ✅ الاتصال ناجح - التوقيت: ${result.rows[0].now}`);

  // فحص وجود الجداول
  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'`
  );
  const tableNames = tables.rows.map((r) => r.table_name);
  console.log(`  📁 الجداول الموجودة: ${tableNames.length > 0 ? tableNames.join(', ') : 'لا توجد جداول'}`);

  const required = ['users', 'documents'];
  for (const tbl of required) {
    if (tableNames.includes(tbl)) {
      console.log(`  ✅ الجدول '${tbl}' موجود`);
    } else {
      console.log(`  ❌ الجدول '${tbl}' غير موجود - شغّل DATABASE_SETUP.sql لإنشائه`);
    }
  }
} catch (err) {
  console.error(`  ❌ فشل الاتصال: ${err.message}`);
  if (process.env.DATABASE_URL) {
    console.error('     تأكد من صحة DATABASE_URL وأن قاعدة البيانات تعمل على Render');
  } else {
    console.error('     تأكد من إعدادات DB_HOST / DB_NAME / DB_USER / DB_PASSWORD');
  }
} finally {
  await pool.end();
}

// ─── 3. فحص إعدادات Telegram ────────────────────────────────────
console.log('\n🤖 فحص إعدادات Telegram...');
const telegramToken = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
if (telegramToken) {
  console.log('  ✅ توكن Telegram محدد');
} else {
  console.log('  ❌ لم يتم تحديد TELEGRAM_TOKEN في .env');
}

// ─── 4. فحص إعدادات WhatsApp / Twilio ───────────────────────────
console.log('\n📱 فحص إعدادات WhatsApp (Twilio)...');
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  console.log('  ✅ بيانات Twilio محددة');
} else {
  console.log('  ⚠️  بيانات Twilio غير محددة - بوت WhatsApp لن يعمل');
  console.log('     أضف TWILIO_ACCOUNT_SID و TWILIO_AUTH_TOKEN في .env');
}

// ─── 5. ملخص ────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════\n');
console.log('💡 للتشغيل:');
console.log('   npm start          - تشغيل السيرفر فقط');
console.log('   npm run telegram   - تشغيل بوت Telegram');
console.log('   npm run whatsapp   - تشغيل بوت WhatsApp');
console.log('   npm run bots       - تشغيل الكل معاً\n');
