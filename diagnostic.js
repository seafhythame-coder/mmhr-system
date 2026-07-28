// 🔍 diagnostic.js - اختبار اتصال النظام
// ═══════════════════════════════════════════════════════════════════

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ═══════════════════════════════════════════════════════════════════
// 🔌 اختبار قاعدة البيانات
// ═══════════════════════════════════════════════════════════════════

async function testDatabase() {
  console.log('\n📊 اختبار الاتصال بقاعدة البيانات...');

  const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'mmhr_db',
        password: process.env.DB_PASSWORD || 'password',
        port: parseInt(process.env.DB_PORT) || 5432,
      };

  console.log(
    `   🔗 الاتصال عبر: ${process.env.DATABASE_URL ? 'DATABASE_URL' : `${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`}`
  );

  const pool = new Pool(poolConfig);

  try {
    const result = await pool.query('SELECT version()');
    console.log(`   ✅ تم الاتصال بنجاح`);
    console.log(`   🐘 إصدار PostgreSQL: ${result.rows[0].version.split(' ').slice(0, 2).join(' ')}`);

    // اختبار الجداول
    const tablesResult = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    if (tablesResult.rows.length > 0) {
      console.log(`   📋 الجداول الموجودة: ${tablesResult.rows.map((r) => r.table_name).join(', ')}`);
    } else {
      console.log('   ⚠️ لا توجد جداول بعد - قم بتشغيل DATABASE_SETUP.sql');
    }

    await pool.end();
    return true;
  } catch (err) {
    console.error(`   ❌ فشل الاتصال: ${err.message}`);
    await pool.end();
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 🤖 اختبار متغيرات Telegram
// ═══════════════════════════════════════════════════════════════════

function testTelegram() {
  console.log('\n🤖 اختبار إعدادات Telegram...');
  const token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (token && token !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
    console.log(`   ✅ TELEGRAM_TOKEN محدد`);
    return true;
  } else {
    console.error('   ❌ TELEGRAM_TOKEN غير محدد في متغيرات البيئة');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 📱 اختبار متغيرات WhatsApp
// ═══════════════════════════════════════════════════════════════════

function testWhatsApp() {
  console.log('\n📱 اختبار إعدادات WhatsApp (Twilio)...');
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const whatsappToken = process.env.WHATSAPP_TOKEN;

  if (whatsappToken) {
    console.log(`   ℹ️ WHATSAPP_TOKEN محدد`);
  }

  if (sid && sid !== 'YOUR_ACCOUNT_SID' && token && token !== 'YOUR_AUTH_TOKEN') {
    console.log(`   ✅ TWILIO_ACCOUNT_SID محدد`);
    console.log(`   ✅ TWILIO_AUTH_TOKEN محدد`);
    return true;
  } else {
    console.warn('   ⚠️ TWILIO_ACCOUNT_SID أو TWILIO_AUTH_TOKEN غير محددين');
    console.warn('   ℹ️ يمكن تشغيل webhook بدونهم لاستقبال الرسائل');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 🔐 اختبار الإعدادات العامة
// ═══════════════════════════════════════════════════════════════════

function testGeneral() {
  console.log('\n🔐 اختبار الإعدادات العامة...');

  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret !== 'mmhr_secret_key_2026_super_secure_key_change_this') {
    console.log('   ✅ JWT_SECRET محدد');
  } else {
    console.warn('   ⚠️ JWT_SECRET يستخدم القيمة الافتراضية - غير آمن للإنتاج');
  }

  console.log(`   🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   🔌 PORT: ${process.env.PORT || 5000}`);
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 تشغيل جميع الاختبارات
// ═══════════════════════════════════════════════════════════════════

async function runDiagnostics() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║        🔍 تشخيص نظام MMHR                            ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  testGeneral();
  const dbOk = await testDatabase();
  const telegramOk = testTelegram();
  const whatsappOk = testWhatsApp();

  console.log('\n════════════════════════════════════════════════════════');
  console.log('📋 ملخص النتائج:');
  console.log(`   ${dbOk ? '✅' : '❌'} قاعدة البيانات`);
  console.log(`   ${telegramOk ? '✅' : '❌'} Telegram Bot`);
  console.log(`   ${whatsappOk ? '✅' : '⚠️'} WhatsApp Bot`);
  console.log('════════════════════════════════════════════════════════\n');

  if (!dbOk) {
    console.log('💡 لإصلاح قاعدة البيانات:');
    console.log('   تأكد من وجود DATABASE_URL في متغيرات البيئة');
    console.log('   مثال: DATABASE_URL=******host/dbname\n');
  }

  if (!telegramOk) {
    console.log('💡 لإصلاح Telegram:');
    console.log('   أضف TELEGRAM_TOKEN=<توكنك> إلى متغيرات البيئة\n');
  }

  process.exit(dbOk && telegramOk ? 0 : 1);
}

runDiagnostics().catch((err) => {
  console.error('❌ خطأ غير متوقع:', err.message);
  process.exit(1);
});
