// 🚀 Quick Start - بوت Telegram بسيط بدون قاعدة بيانات
// ═══════════════════════════════════════════════════════════════════
// تشغيل: node quick-start.js
// أو:    npm run quick-start
// ═══════════════════════════════════════════════════════════════════

import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

// ══════════════════════════════════════════
// ✅ فحص التوكن
// ══════════════════════════════════════════
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_TOKEN || TELEGRAM_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  ❌ خطأ: لم يتم تحديد توكن البوت                      ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  📝 الحل:                                               ║');
  console.log('║  1. افتح ملف .env                                       ║');
  console.log('║  2. أضف السطر التالي:                                   ║');
  console.log('║     TELEGRAM_BOT_TOKEN=توكن_البوت_الخاص_بك             ║');
  console.log('║  3. احصل على التوكن من @BotFather في تليجرام            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');
  process.exit(1);
}

// ══════════════════════════════════════════
// 📦 تخزين البيانات في الذاكرة (بدون قاعدة بيانات)
// ══════════════════════════════════════════
const users = new Map();       // بيانات المستخدمين
const documents = new Map();   // بيانات المستندات
const sessions = new Map();    // جلسات المستخدمين
let docCounter = 1;

// ══════════════════════════════════════════
// 🤖 إنشاء البوت
// ══════════════════════════════════════════
let bot;
try {
  bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
} catch (err) {
  console.error('❌ فشل في إنشاء البوت:', err.message);
  process.exit(1);
}

// ══════════════════════════════════════════
// 🎯 دوال مساعدة
// ══════════════════════════════════════════
function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {});
  }
  return sessions.get(chatId);
}

function isLoggedIn(chatId) {
  const session = getSession(chatId);
  return !!session.username;
}

const mainKeyboard = {
  keyboard: [
    [{ text: '📋 مستنداتي' }, { text: '📊 الإحصائيات' }],
    [{ text: '❓ مساعدة' }, { text: '🔒 تسجيل خروج' }]
  ],
  resize_keyboard: true
};

const loginKeyboard = {
  keyboard: [
    [{ text: '🔑 تسجيل دخول' }, { text: '📝 حساب جديد' }],
    [{ text: '❓ مساعدة' }]
  ],
  resize_keyboard: true
};

// ══════════════════════════════════════════
// 🎯 الأوامر الرئيسية
// ══════════════════════════════════════════

// /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'مستخدم';
  sessions.delete(chatId); // مسح الجلسة القديمة

  const welcomeMessage = `
👋 مرحباً ${firstName}!

🤖 أنا بوت MMHR الذكي لمعالجة المستندات.

📋 **ماذا أستطيع أن أفعل؟**
✅ تسجيل حساب مجاني
✅ رفع ومعالجة المستندات
✅ عرض الإحصائيات
✅ البحث في مستنداتك

📌 **للبدء:**
اختر من القائمة أدناه 👇
  `;

  bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: loginKeyboard
  });
});

// /help أو ❓ مساعدة
bot.onText(/\/help|❓ مساعدة/, (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
❓ **المساعدة - دليل الاستخدام**

**الأوامر المتاحة:**
/start - البداية من جديد
/register - تسجيل حساب جديد
/login - تسجيل الدخول
/documents - عرض مستنداتي
/stats - الإحصائيات
/logout - تسجيل الخروج
/help - هذه الرسالة

**رفع الملفات:**
أرسل أي ملف مباشرة وسيتم حفظه
(PDF, Word, صور, Excel)

**ملاحظة:**
هذا النظام يحفظ البيانات مؤقتاً في الذاكرة.
لحفظ دائم، ستحتاج لتفعيل قاعدة البيانات.

📞 **الدعم:** تواصل مع المطور
  `;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// /register أو 📝 حساب جديد
bot.onText(/\/register|📝 حساب جديد/, (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  session.action = 'register';
  session.step = 'username';

  bot.sendMessage(chatId, '📝 **تسجيل حساب جديد**\n\nاكتب اسم المستخدم:', {
    parse_mode: 'Markdown',
    reply_markup: { remove_keyboard: true }
  });
});

// /login أو 🔑 تسجيل دخول
bot.onText(/\/login|🔑 تسجيل دخول/, (msg) => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (isLoggedIn(chatId)) {
    bot.sendMessage(chatId, `✅ أنت مسجل دخول بالفعل كـ **${session.username}**`, {
      parse_mode: 'Markdown',
      reply_markup: mainKeyboard
    });
    return;
  }

  session.action = 'login';
  session.step = 'email';

  bot.sendMessage(chatId, '🔑 **تسجيل الدخول**\n\nاكتب اسم المستخدم أو البريد الإلكتروني:', {
    parse_mode: 'Markdown',
    reply_markup: { remove_keyboard: true }
  });
});

// /logout أو 🔒 تسجيل خروج
bot.onText(/\/logout|🔒 تسجيل خروج/, (msg) => {
  const chatId = msg.chat.id;
  sessions.delete(chatId);

  bot.sendMessage(chatId, '👋 تم تسجيل الخروج بنجاح!\n\nإلى اللقاء 😊', {
    reply_markup: loginKeyboard
  });
});

// /documents أو 📋 مستنداتي
bot.onText(/\/documents|📋 مستنداتي/, (msg) => {
  const chatId = msg.chat.id;

  if (!isLoggedIn(chatId)) {
    bot.sendMessage(chatId, '❌ يجب تسجيل الدخول أولاً\n\nاكتب /login', {
      reply_markup: loginKeyboard
    });
    return;
  }

  const session = getSession(chatId);
  const userDocs = [...documents.values()].filter(d => d.userId === chatId);

  if (userDocs.length === 0) {
    bot.sendMessage(chatId, '📭 لا توجد مستندات بعد.\n\nأرسل ملفاً لرفعه!', {
      reply_markup: mainKeyboard
    });
    return;
  }

  let message = `📋 **مستنداتك** (${userDocs.length} ملف):\n\n`;
  userDocs.forEach((doc, index) => {
    message += `${index + 1}. 📄 ${doc.fileName}\n`;
    message += `   📊 الحالة: ${doc.status === 'completed' ? '✅ مكتمل' : '⏳ جاري'}\n`;
    message += `   💾 الحجم: ${doc.fileSize}\n`;
    message += `   📅 التاريخ: ${doc.date}\n\n`;
  });

  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: mainKeyboard
  });
});

// /stats أو 📊 الإحصائيات
bot.onText(/\/stats|📊 الإحصائيات/, (msg) => {
  const chatId = msg.chat.id;

  if (!isLoggedIn(chatId)) {
    bot.sendMessage(chatId, '❌ يجب تسجيل الدخول أولاً\n\nاكتب /login', {
      reply_markup: loginKeyboard
    });
    return;
  }

  const userDocs = [...documents.values()].filter(d => d.userId === chatId);
  const completed = userDocs.filter(d => d.status === 'completed').length;
  const pending = userDocs.filter(d => d.status === 'processing').length;
  const totalUsers = users.size;

  const statsMessage = `
📊 **الإحصائيات**

👤 حسابك:
📄 إجمالي المستندات: ${userDocs.length}
✅ المكتملة: ${completed}
⏳ قيد المعالجة: ${pending}

🌐 النظام:
👥 إجمالي المستخدمين: ${totalUsers}
📁 إجمالي الملفات: ${documents.size}

⚡ الحالة: يعمل بالذاكرة المؤقتة
  `;

  bot.sendMessage(chatId, statsMessage, {
    parse_mode: 'Markdown',
    reply_markup: mainKeyboard
  });
});

// ══════════════════════════════════════════
// 📥 معالجة الملفات
// ══════════════════════════════════════════

bot.on('document', (msg) => {
  const chatId = msg.chat.id;

  if (!isLoggedIn(chatId)) {
    bot.sendMessage(chatId, '❌ يجب تسجيل الدخول أولاً\n\nاكتب /login', {
      reply_markup: loginKeyboard
    });
    return;
  }

  const fileName = msg.document.file_name || 'ملف غير معروف';
  const fileSize = msg.document.file_size
    ? `${(msg.document.file_size / 1024).toFixed(1)} KB`
    : 'غير معروف';

  const docId = docCounter++;
  documents.set(docId, {
    id: docId,
    userId: chatId,
    fileName,
    fileSize,
    status: 'completed',
    date: new Date().toLocaleDateString('ar-EG')
  });

  bot.sendMessage(chatId, `
✅ **تم استلام الملف!**

📄 الاسم: ${fileName}
💾 الحجم: ${fileSize}
🆔 رقم المستند: ${docId}
📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}

✔️ تم الحفظ بنجاح في النظام.
  `, {
    parse_mode: 'Markdown',
    reply_markup: mainKeyboard
  });
});

bot.on('photo', (msg) => {
  const chatId = msg.chat.id;

  if (!isLoggedIn(chatId)) {
    bot.sendMessage(chatId, '❌ يجب تسجيل الدخول أولاً\n\nاكتب /login', {
      reply_markup: loginKeyboard
    });
    return;
  }

  const docId = docCounter++;
  const photoName = `صورة_${docId}.jpg`;

  documents.set(docId, {
    id: docId,
    userId: chatId,
    fileName: photoName,
    fileSize: 'صورة',
    status: 'completed',
    date: new Date().toLocaleDateString('ar-EG')
  });

  bot.sendMessage(chatId, `
✅ **تم استلام الصورة!**

🖼️ الاسم: ${photoName}
🆔 رقم المستند: ${docId}

✔️ تم الحفظ في النظام.
  `, {
    parse_mode: 'Markdown',
    reply_markup: mainKeyboard
  });
});

// ══════════════════════════════════════════
// 💬 معالجة الرسائل النصية (خطوات التسجيل/الدخول)
// ══════════════════════════════════════════

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // تجاهل الرسائل بدون نص أو الأوامر
  if (!text || text.startsWith('/')) return;
  // تجاهل أزرار القائمة التي لها معالجات خاصة
  if (['📋 مستنداتي', '📊 الإحصائيات', '❓ مساعدة', '🔒 تسجيل خروج',
       '🔑 تسجيل دخول', '📝 حساب جديد'].includes(text)) return;

  const session = getSession(chatId);

  // ── خطوات التسجيل ──
  if (session.action === 'register') {
    if (session.step === 'username') {
      if (text.length < 3) {
        bot.sendMessage(chatId, '❌ اسم المستخدم قصير جداً (3 أحرف على الأقل)');
        return;
      }
      session.newUsername = text;
      session.step = 'email';
      bot.sendMessage(chatId, '📧 اكتب بريدك الإلكتروني:');
      return;
    }

    if (session.step === 'email') {
      if (!text.includes('@')) {
        bot.sendMessage(chatId, '❌ صيغة البريد غير صحيحة. مثال: name@email.com');
        return;
      }
      session.newEmail = text;
      session.step = 'password';
      bot.sendMessage(chatId, '🔐 اكتب كلمة المرور (6 أحرف على الأقل):');
      return;
    }

    if (session.step === 'password') {
      if (text.length < 6) {
        bot.sendMessage(chatId, '❌ كلمة المرور قصيرة جداً (6 أحرف على الأقل)');
        return;
      }

      // حفظ المستخدم
      const userId = `user_${chatId}`;
      users.set(userId, {
        chatId,
        username: session.newUsername,
        email: session.newEmail,
        password: text
      });

      // تسجيل دخول تلقائي
      session.username = session.newUsername;
      session.email = session.newEmail;
      session.userId = userId;
      delete session.action;
      delete session.step;
      delete session.newUsername;
      delete session.newEmail;

      bot.sendMessage(chatId, `
✅ **تم التسجيل بنجاح!**

👤 اسم المستخدم: ${session.username}
📧 البريد: ${session.email}

🎉 أهلاً بك! يمكنك الآن استخدام البوت.
      `, {
        parse_mode: 'Markdown',
        reply_markup: mainKeyboard
      });
      return;
    }
  }

  // ── خطوات تسجيل الدخول ──
  if (session.action === 'login') {
    if (session.step === 'email') {
      session.loginId = text;
      session.step = 'password';
      bot.sendMessage(chatId, '🔐 اكتب كلمة المرور:');
      return;
    }

    if (session.step === 'password') {
      // البحث عن المستخدم
      const found = [...users.values()].find(
        u => (u.username === session.loginId || u.email === session.loginId) &&
             u.password === text
      );

      if (found) {
        session.username = found.username;
        session.email = found.email;
        session.userId = `user_${found.chatId}`;
        delete session.action;
        delete session.step;
        delete session.loginId;

        bot.sendMessage(chatId, `
✅ **تم تسجيل الدخول بنجاح!**

👋 أهلاً بك، ${found.username}!
        `, {
          parse_mode: 'Markdown',
          reply_markup: mainKeyboard
        });
      } else {
        delete session.action;
        delete session.step;
        delete session.loginId;

        bot.sendMessage(chatId, '❌ اسم المستخدم أو كلمة المرور غير صحيحة.\n\nحاول مرة أخرى: /login', {
          reply_markup: loginKeyboard
        });
      }
      return;
    }
  }

  // رسالة افتراضية
  if (!isLoggedIn(chatId)) {
    bot.sendMessage(chatId, '👋 مرحباً! اختر من القائمة أدناه للبدء.', {
      reply_markup: loginKeyboard
    });
  } else {
    bot.sendMessage(chatId, '💡 استخدم الأزرار أدناه أو أرسل ملفاً لرفعه.', {
      reply_markup: mainKeyboard
    });
  }
});

// ══════════════════════════════════════════
// ❌ معالجة الأخطاء
// ══════════════════════════════════════════

bot.on('polling_error', (error) => {
  if (error.code === 'ETELEGRAM') {
    console.error('\n❌ خطأ في التوكن: تأكد من صحة TELEGRAM_BOT_TOKEN في ملف .env');
    console.error('   تفاصيل الخطأ:', error.message);
  } else {
    console.error('❌ خطأ في الاتصال:', error.message);
  }
});

process.on('unhandledRejection', (error) => {
  console.error('❌ خطأ غير متوقع:', error.message);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 تم إيقاف البوت. إلى اللقاء!');
  bot.stopPolling();
  process.exit(0);
});

// ══════════════════════════════════════════
// 🚀 رسالة البداية
// ══════════════════════════════════════════

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║       🚀 بوت Telegram MMHR - Quick Start               ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║  ✅ البوت يعمل بدون قاعدة بيانات (ذاكرة مؤقتة)        ║');
console.log('║  📱 التوكن: ' + TELEGRAM_TOKEN.substring(0, 15) + '...              ║');
console.log('║  ⏰ جاري الاستماع للرسائل...                           ║');
console.log('╠══════════════════════════════════════════════════════════╣');
console.log('║  📌 الأوامر: /start  /help  /register  /login          ║');
console.log('║  🛑 للإيقاف: اضغط Ctrl+C                              ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('\n');
