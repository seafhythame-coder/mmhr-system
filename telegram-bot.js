// ═══════════════════════════════════════════════════════════════════
// 🤖 BOT Telegram للنظام MMHR
// ═══════════════════════════════════════════════════════════════════

import { Telegraf } from 'telegraf';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

// ✅ إعدادات Telegram
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = 'http://localhost:5000/api';

const bot = new Telegraf(TELEGRAM_TOKEN);

// ═══════════════════════════════════════════════════════════════════
// 🔐 نظام المستخدمين
// ═══════════════════════════════════════════════════════════════════

const userTokens = {}; // تخزين tokens المستخدمين

async function getOrCreateUser(userId, firstName) {
  if (userTokens[userId]) {
    return userTokens[userId];
  }

  try {
    // تسجيل مستخدم جديد
    const response = await axios.post(`${API_URL}/auth/register`, {
      username: `tg_user_${userId}`,
      email: `${userId}@telegram.mmhr.com`,
      password: `mmhr_tg_${userId}`,
    });

    // تسجيل الدخول
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: `${userId}@telegram.mmhr.com`,
      password: `mmhr_tg_${userId}`,
    });

    userTokens[userId] = loginResponse.data.token;
    return userTokens[userId];
  } catch (err) {
    console.error(`❌ خطأ في إنشاء المستخدم ${userId}:`, err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 📨 معالجات الأوامر
// ═══════════════════════════════════════════════════════════════════

// ✅ الأمر: /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name;

  // إنشاء/تسجيل المستخدم
  const token = await getOrCreateUser(userId, firstName);

  if (token) {
    await ctx.reply(
      `👋 مرحباً بك يا ${firstName}!\n\n` +
        `📄 بوت معالجة المستندات الذكي MMHR\n\n` +
        `🎯 الخدمات:\n` +
        `📤 أرسل ملف PDF أو Word أو صورة\n` +
        `🔄 سيتم معالجته تلقائياً\n` +
        `📥 استقبل النتيجة النظيفة\n\n` +
        `💡 استخدم الأوامر:\n` +
        `/documents - عرض مستنداتك\n` +
        `/stats - الإحصائيات\n` +
        `/help - المساعدة`,
      {
        reply_markup: {
          keyboard: [
            [{ text: '📁 المستندات' }, { text: '📊 الإحصائيات' }],
            [{ text: '📤 رفع ملف' }],
          ],
          resize_keyboard: true,
        },
      }
    );
  } else {
    await ctx.reply(
      '❌ حدث خطأ في الاتصال. الرجاء المحاولة لاحقاً.'
    );
  }
});

// ✅ الأمر: /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📖 دليل الاستخدام:\n\n` +
      `📤 **رفع ملف:**\n` +
      `أرسل أي ملف PDF أو Word أو صورة\n\n` +
      `📁 **عرض المستندات:**\n` +
      `/documents\n\n` +
      `📊 **الإحصائيات:**\n` +
      `/stats\n\n` +
      `💡 **نصائح:**\n` +
      `• الملفات تُعالج تلقائياً\n` +
      `• النتيجة تُرسل مباشرة\n` +
      `• الحد الأقصى 50 MB`
  );
});

// ✅ الأمر: /documents
bot.command('documents', async (ctx) => {
  const userId = ctx.from.id;
  const token = userTokens[userId];

  if (!token) {
    await ctx.reply('❌ الرجاء بدء المحادثة بـ /start');
    return;
  }

  try {
    const response = await axios.get(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const docs = response.data.documents;

    if (docs.length === 0) {
      await ctx.reply(
        '📭 لا توجد مستندات بعد\n\n📤 أرسل ملف لبدء المعالجة'
      );
      return;
    }

    let message = '📁 **مستنداتك:**\n\n';
    docs.forEach((doc, idx) => {
      const status = {
        completed: '✅ مكتمل',
        processing: '⏳ جاري المعالجة',
        pending: '⏸️ قيد الانتظار',
        error: '❌ خطأ',
      }[doc.status] || doc.status;

      message += `${idx + 1}. ${doc.file_name}\n`;
      message += `   الحالة: ${status}\n`;
      message += `   الحجم: ${(doc.file_size / 1024).toFixed(2)} KB\n\n`;
    });

    await ctx.reply(message);
  } catch (err) {
    await ctx.reply('❌ خطأ في جلب المستندات');
  }
});

// ✅ الأمر: /stats
bot.command('stats', async (ctx) => {
  const userId = ctx.from.id;
  const token = userTokens[userId];

  if (!token) {
    await ctx.reply('❌ الرجاء بدء المحادثة بـ /start');
    return;
  }

  try {
    const response = await axios.get(`${API_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const stats = response.data.stats;

    let message = '📊 **إحصائياتك:**\n\n';
    message += `📈 إجمالي المستندات: ${stats.total_documents}\n`;
    stats.by_status.forEach((s) => {
      const statusEmoji = {
        completed: '✅',
        processing: '⏳',
        pending: '⏸️',
        error: '❌',
      };
      message += `${statusEmoji[s.status] || '•'} ${s.status}: ${s.count}\n`;
    });
    message += `\n💾 الحجم الإجمالي: ${stats.total_size}`;

    await ctx.reply(message);
  } catch (err) {
    await ctx.reply('❌ خطأ في جلب الإحصائيات');
  }
});

// ═══════════════════════════════════════════════════════════════════
// 📎 معالجة الملفات
// ═══════════════════════════════════════════════════════════════════

// ✅ استقبال الملفات
bot.on('document', async (ctx) => {
  const userId = ctx.from.id;
  const token = userTokens[userId];

  if (!token) {
    await ctx.reply('❌ الرجاء بدء المحادثة بـ /start');
    return;
  }

  const fileId = ctx.message.document.file_id;
  const fileName = ctx.message.document.file_name;
  const fileSize = ctx.message.document.file_size;

  // التحقق من الحجم
  if (fileSize > 52428800) { // 50 MB
    await ctx.reply('❌ الملف كبير جداً (الحد الأقصى 50 MB)');
    return;
  }

  try {
    await ctx.reply(
      `📥 استقبال الملف...\n` +
        `📄 ${fileName}\n` +
        `💾 ${(fileSize / 1024 / 1024).toFixed(2)} MB`
    );

    // تحميل الملف من Telegram
    const file = await ctx.telegram.getFile(fileId);
    const filePath = path.join('uploads', `${Date.now()}_${fileName}`);

    const fileStream = fs.createWriteStream(filePath);

    const url = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;
    const response = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        res.pipe(fileStream);
        fileStream.on('finish', () => fileStream.close(() => resolve(filePath)));
      });
    });

    // رفع الملف للمعالجة
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(`${API_URL}/documents/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });

    const documentId = uploadResponse.data.documentId;

    await ctx.reply(
      `✅ تم استقبال الملف بنجاح!\n\n` +
        `⏳ جاري المعالجة...\n` +
        `💡 سيتم إرسال النتيجة خلال دقائق`
    );

    // انتظر المعالجة
    setTimeout(async () => {
      try {
        const docResponse = await axios.get(
          `${API_URL}/documents/${documentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const doc = docResponse.data.document;

        if (doc.status === 'completed') {
          const processedText = doc.processed_text.substring(0, 1000);

          await ctx.reply(
            `✅ **تمت المعالجة بنجاح!**\n\n` +
              `📝 النص المعالج:\n\n` +
              `\`\`\`\n${processedText}\n\`\`\`\n\n` +
              `... (النص كامل متاح للتحميل)`
          );

          // إرسال ملف نصي
          const textPath = filePath.replace(/\.[^/.]+$/, '_processed.txt');
          if (fs.existsSync(textPath)) {
            await ctx.sendDocument({
              source: textPath,
              filename: `${fileName}_processed.txt`,
            });
          }
        } else if (doc.status === 'processing') {
          await ctx.reply('⏳ الملف لا يزال قيد المعالجة، حاول لاحقاً');
        } else if (doc.status === 'error') {
          await ctx.reply(`❌ حدث خطأ: ${doc.error_message}`);
        }
      } catch (err) {
        await ctx.reply('❌ خطأ في جلب النتيجة');
      }

      // حذف الملف المؤقت
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  } catch (err) {
    console.error('❌ خطأ:', err.message);
    await ctx.reply('❌ حدث خطأ في معالجة الملف');
  }
});

// ✅ استقبال الصور
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const token = userTokens[userId];

  if (!token) {
    await ctx.reply('❌ الرجاء بدء المحادثة بـ /start');
    return;
  }

  try {
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const file = await ctx.telegram.getFile(fileId);
    const fileName = `image_${Date.now()}.jpg`;
    const filePath = path.join('uploads', fileName);

    // تحميل الصورة
    const fileStream = fs.createWriteStream(filePath);
    const url = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;

    await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        res.pipe(fileStream);
        fileStream.on('finish', () => fileStream.close(() => resolve(filePath)));
      });
    });

    await ctx.reply('📸 جاري معالجة الصورة...');

    // رفع الملف
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    const uploadResponse = await axios.post(`${API_URL}/documents/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });

    const documentId = uploadResponse.data.documentId;

    // انتظر المعالجة
    setTimeout(async () => {
      try {
        const docResponse = await axios.get(
          `${API_URL}/documents/${documentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const doc = docResponse.data.document;

        if (doc.status === 'completed') {
          const text = doc.processed_text.substring(0, 1000);
          await ctx.reply(
            `✅ **تم قراءة النصوص من الصورة:**\n\n\`\`\`\n${text}\n\`\`\``
          );
        }
      } catch (err) {
        await ctx.reply('❌ خطأ في المعالجة');
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 5000);
  } catch (err) {
    await ctx.reply('❌ خطأ في معالجة الصورة');
  }
});

// ═══════════════════════════════════════════════════════════════════
// 🚀 تشغيل البوت
// ═══════════════════════════════════════════════════════════════════

const TELEGRAM_PORT = process.env.TELEGRAM_PORT || 3002;

bot.launch({
  webhook: {
    domain: process.env.WEBHOOK_URL || `http://localhost:${TELEGRAM_PORT}`,
    port: TELEGRAM_PORT,
  },
});

console.log('\n╔════════════════════════════════════╗');
console.log('║    ✅ بوت Telegram يعمل بنجاح    ║');
console.log('╚════════════════════════════════════╝\n');
console.log(`🤖 Telegram Bot: @${process.env.TELEGRAM_BOT_NAME}`);
console.log(`📡 على المنفذ ${TELEGRAM_PORT}\n`);

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export default bot;
