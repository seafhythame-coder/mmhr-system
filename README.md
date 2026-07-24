# 📄 نظام MMHR - معالج المستندات الذكي

**MMHR** = نظام ذكي لمعالجة جميع أنواع المستندات (PDFs, Word, صور) بسرعة واحترافية.

---

## 🎯 الميزات الرئيسية

✅ **فتح أي ملف** - PDF محمي، Word، صور مسح ضوئي
✅ **قراءة عربي وإنجليزي** - OCR متقدم
✅ **تنظيف تلقائي** - إزالة أخطاء وفوضى
✅ **حفظ آمن** - قاعدة بيانات PostgreSQL
✅ **واجهة ويب** - سهلة الاستخدام
✅ **معالجة سريعة** - دقائق معدودة

---

## 📥 متطلبات التثبيت

قبل البدء، تأكد من تثبيت:

| البرنامج | الإصدار | الرابط |
|---------|---------|--------|
| **Node.js** | 16+ | https://nodejs.org/ |
| **Python** | 3.9+ | https://www.python.org/ |
| **PostgreSQL** | 12+ | https://www.postgresql.org/ |
| **Tesseract OCR** | - | https://github.com/UB-Mannheim/tesseract/wiki |

---

## 🚀 خطوات التثبيت السريع

### 1️⃣ إنشاء مجلد المشروع

```bash
mkdir mmhr_project
cd mmhr_project
mkdir uploads processed_files
```

### 2️⃣ تحضير الملفات

انسخ هذه الملفات إلى مجلد المشروع:
- `server.js`
- `processor.py`
- `package.json`
- `requirements.txt`
- `.env`

### 3️⃣ تثبيت المكتبات

```bash
# Node.js
npm install

# Python
pip install -r requirements.txt
```

### 4️⃣ إعداد قاعدة البيانات

افتح **PostgreSQL**:

```sql
-- إنشاء قاعدة البيانات
CREATE DATABASE mmhr_db;

-- الاتصال بها
\c mmhr_db

-- إنشاء الجداول
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    processed_text TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إعطاء الصلاحيات
GRANT ALL PRIVILEGES ON DATABASE mmhr_db TO postgres;
```

### 5️⃣ تشغيل النظام

```bash
npm start
```

ستشوف:
```
✅ نظام MMHR يعمل بنجاح
🌐 الرابط: http://localhost:5000
```

---

## 💻 استخدام النظام

### تسجيل حساب جديد

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "أحمد",
    "email": "ahmed@example.com",
    "password": "secure123"
  }'
```

### تسجيل الدخول

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmed@example.com",
    "password": "secure123"
  }'
```

**احفظ الـ token من النتيجة!**

### رفع ملف

```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

### جلب المستندات

```bash
curl -X GET http://localhost:5000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### تحميل النتيجة

```bash
curl -X GET http://localhost:5000/api/documents/1/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o result.txt
```

---

## 🎯 أمثلة عملية

### مثال 1: معالجة عقد توظيف

```bash
# 1. سجل دخول
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123"}' \
  | jq -r '.token')

# 2. رفع العقد
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@contract.pdf"

# 3. انتظر ثواني معدودة

# 4. جلب النتيجة
curl -X GET http://localhost:5000/api/documents/1/download \
  -H "Authorization: Bearer $TOKEN" \
  -o contract_cleaned.txt
```

### مثال 2: معالجة صور وثائق

```bash
# رفع صورة الهوية
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@id_card.jpg"

# النظام يقرأ النصوص من الصورة تلقائياً ✅
```

### مثال 3: معالجة ملفات Word

```bash
# رفع نموذج حكومي
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@form.docx"
```

---

## 🛠️ استكشاف الأخطاء

### ❌ خطأ: "Cannot find module 'express'"

**الحل:**
```bash
npm install
```

### ❌ خطأ: "Connection refused" (PostgreSQL)

**الحل:**
1. تأكد من تشغيل PostgreSQL
2. تحقق من كلمة السر في `.env`
3. تأكد من إنشاء قاعدة البيانات

### ❌ خطأ: "pytesseract not found"

**الحل:**
```bash
pip install -r requirements.txt
```

**على Windows:** حمل Tesseract من https://github.com/UB-Mannheim/tesseract/wiki

### ❌ خطأ: "Port 5000 already in use"

**الحل:**
```bash
# غير الـ port في .env
PORT=3000
npm start
```

---

## 📊 API الكاملة

| الطريقة | الرابط | الوصف |
|--------|--------|-------|
| `POST` | `/api/auth/register` | تسجيل حساب جديد |
| `POST` | `/api/auth/login` | تسجيل الدخول |
| `POST` | `/api/documents/upload` | رفع ملف |
| `GET` | `/api/documents` | جلب المستندات |
| `GET` | `/api/documents/:id` | جلب مستند واحد |
| `GET` | `/api/documents/:id/download` | تحميل النتيجة |
| `DELETE` | `/api/documents/:id` | حذف ملف |
| `GET` | `/api/dashboard/stats` | الإحصائيات |

---

## 🔐 الأمان

- ✅ تشفير كلمات السر بـ bcrypt
- ✅ JWT tokens للمصادقة
- ✅ CORS للتحكم في الوصول
- ✅ التحقق من نوع الملف
- ✅ قاعدة بيانات آمنة

**تحذير:** غير كلمات السر والـ Secrets قبل النشر على الإنتاج!

---

## 📚 أنواع الملفات المدعومة

| النوع | الصيغ | الوصف |
|------|------|--------|
| **PDF** | .pdf | جوازات، عقود، فواتير |
| **Word** | .docx, .doc | مستندات، نماذج |
| **صور** | .jpg, .png, .tiff | صور مسح، هويات |
| **Excel** | .xlsx | جداول، بيانات |

---

## 🚀 التطوير المستقبلي

- [ ] ترجمة تلقائية
- [ ] استخراج الجداول
- [ ] التوقيع الرقمي
- [ ] المشاركة الآمنة
- [ ] التعرف على الأشكال
- [ ] الأرشفة الذكية

---

## 📞 الدعم

للمساعدة أو الأسئلة:
- 📧 البريد: support@mmhr.com
- 🐛 البلاغ عن أخطاء: GitHub Issues
- 💬 المحادثة: Discord Community

---

## 📄 الترخيص

هذا المشروع مرخص تحت MIT License

---

**مبروك! أنت الآن جاهز لاستخدام MMHR!** 🎉

---

## 📋 خطوات سريعة

```bash
# 1. تثبيت المتطلبات
npm install && pip install -r requirements.txt

# 2. إعداد قاعدة البيانات (PostgreSQL)
# اكتب الأوامر SQL أعلاه

# 3. تشغيل النظام
npm start

# 4. اختبر على http://localhost:5000
```

**النظام جاهز للعمل!** ✅
