// ═══════════════════════════════════════════════════════════════════
// 🤖 BOT WhatsApp للنظام MMHR
// ═══════════════════════════════════════════════════════════════════
// استخدام: Twilio API لـ WhatsApp

import express from 'express';
import twilio from 'twilio';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ✅ إعدادات Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilio_phone = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// ✅ رابط API السيرفر الرئيسي
const API_URL = 'http://localhost:5000/api';

// ═══════════════════════════════════════════════════════════════════
// 🔐 نظام المستخدمين البسيط
// ═══════════════════════════════════════════════════════════════════

const users = {}; // تخزين مؤقت للمستخدمين والـ tokens

// ✅ إنشاء حساب تلقائي أو تسجيل دخول
async function getOrCreateUser(phoneNumber) {
  if (users[phoneNumber]) {
    return users[phoneNumber];
  }

  try {
    // محاولة تسجيل مستخدم جديد
    const response = await axios.post(`${API_URL}/auth/register`, {
      username: `user_${phoneNumber.slice(-10)}`,
      email: `${phoneNumber}@whatsapp.mmhr.com`,
      password: `mmhr_${phoneNumber}`,
    });

    const token = await loginUser(phoneNumber);
    users[phoneNumber] = { phone: phoneNumber, token };
    return users[phoneNumber];
  } catch (err) {
    // إذا كان المستخدم موجود، سجل دخول
    return await loginUser(phoneNumber);
  }
}

// ✅ تسجيل الدخول
async function loginUser(phoneNumber) {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: `${phoneNumber}@whatsapp.mmhr.com`,
      password: `mmhr_${phoneNumber}`,
    });

    const token = response.data.token;
    users[phoneNumber] = { phone: phoneNumber, token };
    return users[phoneNumber];
  } catch (err) {
    console.error(`❌ خطأ في تسجيل دخول ${phoneNumber}:`, err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// 📤 إرسال رسائل WhatsApp
// ═══════════════════════════════════════════════════════════════════

async function sendWhatsAppMessage(toPhone, message) {
  try {
    await client.messages.create({
      from: `whatsapp:${twilio_phone}`,
      to: `whatsapp:${toPhone}`,
      body: message,
    });

    console.log(`✅ رسالة مرسلة إلى ${toPhone}`);
  } catch (err) {
    console.error(`❌ خطأ في إرسال الرسالة:`, err.message);
  }
}

async function sendWhatsAppFile(toPhone, fileUrl, caption) {
  try {
    await client.messages.create({
      from: `whatsapp:${twilio_phone}`,
      to: `whatsapp:${toPhone}`,
      mediaUrl: [fileUrl],
      body: caption,
    });

    console.log(`✅ ملف مرسل إلى ${toPhone}`);
  } catch (err) {
    console.error(`❌ خطأ في إرسال الملف:`, err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 📨 استقبال الرسائل والملفات
// ═══════════════════════════════════════════════════════════════════

app.post('/whatsapp/webhook', async (req, res) => {
  const incomingMessage = req.body.Body;
  const senderPhone = req.body.From.replace('whatsapp:', '');
  const numMedia = req.body.NumMedia;

  console.log(`\n📱 رسالة جديدة من ${senderPhone}: ${incomingMessage}`);

  try {
    // الحصول على أو إنشاء حساب المستخدم
    const user = await getOrCreateUser(senderPhone);

    if (!user || !user.token) {
      await sendWhatsAppMessage(
        senderPhone,
        '❌ عذراً، حدث خطأ في الاتصال. الرجاء المحاولة لاحقاً.'
      );
      return res.sendStatus(200);
    }

    // ✅ معالجة الملفات المرسلة
    if (numMedia > 0) {
      const mediaUrl = req.body.MediaUrl0;
      const mediaType = req.body.MediaContentType0;

      console.log(`📁 ملف جديد: ${mediaType}`);

      await sendWhatsAppMessage(
        senderPhone,
        '⏳ جاري تحميل ومعالجة الملف... الرجاء الانتظار'
      );

      // تحميل الملف
      const fileResponse = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
      });

      const fileName = `document_${Date.now()}.${mediaType.split('/')[1]}`;
      const filePath = path.join('uploads', fileName);

      fs.writeFileSync(filePath, fileResponse.data);

      // رفع الملف للمعالجة
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      const uploadResponse = await axios.post(
        `${API_URL}/documents/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      const documentId = uploadResponse.data.documentId;

      await sendWhatsAppMessage(
        senderPhone,
        `✅ تم استقبال الملف بنجاح!\n\n📄 الاسم: ${uploadResponse.data.fileName}\n⏳ جاري المعالجة...\n\nسيتم إرسال النتيجة خلال دقائق`
      );

      // انتظر المعالجة ثم أرسل النتيجة
      setTimeout(async () => {
        try {
          const docResponse = await axios.get(
            `${API_URL}/documents/${documentId}`,
            {
              headers: { Authorization: `Bearer ${user.token}` },
            }
          );

          const doc = docResponse.data.document;

          if (doc.status === 'completed') {
            const processedText = doc.processed_text.substring(0, 1000);

            await sendWhatsAppMessage(
              senderPhone,
              `✅ تمت معالجة الملف بنجاح!\n\n📝 النص المعالج:\n\n${processedText}\n\n...`
            );

            // إرسال الملف الكامل النظيف
            await sendWhatsAppMessage(
              senderPhone,
              `📥 الملف النظيف جاهز للتحميل\n\nاستخدم الأمر: download ${documentId}`
            );
          } else if (doc.status === 'processing') {
            await sendWhatsAppMessage(
              senderPhone,
              '⏳ الملف لا يزال قيد المعالجة، حاول لاحقاً'
            );
          } else if (doc.status === 'error') {
            await sendWhatsAppMessage(
              senderPhone,
              `❌ حدث خطأ في المعالجة:\n${doc.error_message}`
            );
          }
        } catch (err) {
          await sendWhatsAppMessage(
            senderPhone,
            '❌ خطأ في جلب النتيجة'
          );
        }

        // حذف الملف المؤقت
        fs.unlinkSync(filePath);
      }, 5000);
    }
    // ✅ معالجة الأوامر النصية
    else {
      const command = incomingMessage.toLowerCase().trim();

      if (command === 'مرحبا' || command === 'hello') {
        await sendWhatsAppMessage(
          senderPhone,
          `👋 مرحباً بك في بوت MMHR!\n\n📄 معالج المستندات الذكي\n\n🎯 الخدمات:\n• 📤 أرسل ملف PDF أو Word أو صورة\n• 🔄 سيتم معالجته تلقائياً\n• 📥 استقبل النتيجة النظيفة\n\n💡 نصيحة: أرسل أي ملف لبدء المعالجة`
        );
      } else if (command === 'المستندات' || command === 'documents') {
        const docsResponse = await axios.get(`${API_URL}/documents`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        const docs = docsResponse.data.documents;
        if (docs.length === 0) {
          await sendWhatsAppMessage(
            senderPhone,
            '📭 لا توجد مستندات بعد\n\n📤 أرسل ملف لبدء المعالجة'
          );
        } else {
          let message = '📁 المستندات:\n\n';
          docs.forEach((doc, idx) => {
            message += `${idx + 1}. ${doc.file_name}\n   الحالة: ${doc.status}\n\n`;
          });

          await sendWhatsAppMessage(senderPhone, message);
        }
      } else if (command === 'إحصائيات' || command === 'stats') {
        const statsResponse = await axios.get(
          `${API_URL}/dashboard/stats`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
          }
        );

        const stats = statsResponse.data.stats;
        let message = '📊 الإحصائيات:\n\n';
        message += `📈 إجمالي المستندات: ${stats.total_documents}\n`;
        stats.by_status.forEach((s) => {
          message += `${s.status}: ${s.count}\n`;
        });
        message += `\n💾 الحجم الإجمالي: ${stats.total_size}`;

        await sendWhatsAppMessage(senderPhone, message);
      } else if (command.startsWith('download')) {
        const docId = command.split(' ')[1];

        if (!docId) {
          await sendWhatsAppMessage(
            senderPhone,
            '❌ استخدام: download <معرف الملف>'
          );
          return;
        }

        // تحميل الملف ليس مدعوماً مباشرة عبر WhatsApp
        await sendWhatsAppMessage(
          senderPhone,
          `📥 الملف المعالج متاح على: http://localhost:5000/api/documents/${docId}/download\n\nاستخدم رابط المتصفح لتحميله`
        );
      } else {
        await sendWhatsAppMessage(
          senderPhone,
          `❓ أمر غير معروف: "${incomingMessage}"\n\n📋 الأوامر المتاحة:\n• مرحبا\n• المستندات\n• إحصائيات\n\n📤 أو أرسل ملف مباشرة`
        );
      }
    }
  } catch (err) {
    console.error('❌ خطأ:', err.message);
    await sendWhatsAppMessage(
      senderPhone,
      '❌ حدث خطأ في المعالجة. الرجاء المحاولة لاحقاً.'
    );
  }

  res.sendStatus(200);
});

// ═══════════════════════════════════════════════════════════════════
// 🚀 تشغيل البوت
// ═══════════════════════════════════════════════════════════════════

const WHATSAPP_PORT = process.env.WHATSAPP_PORT || 3001;

app.listen(WHATSAPP_PORT, () => {
  console.log('\n╔════════════════════════════════════╗');
  console.log('║    ✅ بوت WhatsApp يعمل بنجاح     ║');
  console.log('╚════════════════════════════════════╝\n');
  console.log(`📱 WhatsApp Bot على المنفذ ${WHATSAPP_PORT}`);
  console.log(`📞 الرقم: ${twilio_phone}\n`);
});

export default app;
