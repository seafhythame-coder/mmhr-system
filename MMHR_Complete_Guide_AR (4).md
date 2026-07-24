# 📘 دليل نظام MMHR الكامل
## معالج المستندات الذكي - شرح تفصيلي

---

## 🎯 مقدمة عن MMHR

**MMHR** = **Multimodal Human Resource** (نظام معالجة المستندات الذكي)

النظام يقدر:
- ✅ فتح أي ملف (PDF محمي، Word، صور)
- ✅ قراءة أي لغة (عربي، إنجليزي، لغات مختلفة)
- ✅ تنظيف وتحسين النصوص تلقائياً
- ✅ حفظ النتائج بشكل آمن
- ✅ معالجة ملفات كبيرة بسرعة

---

## 📥 التثبيت خطوة بخطوة

### المتطلبات الأساسية

قبل البدء، تحتاج تثبيت:

| البرنامج | الفائدة | الرابط |
|---------|--------|--------|
| **Node.js (v16+)** | تشغيل السيرفر | https://nodejs.org/ |
| **Python (3.9+)** | معالجة الملفات | https://www.python.org/ |
| **PostgreSQL** | قاعدة البيانات | https://www.postgresql.org/download/ |
| **Tesseract OCR** | قراءة الصور | https://github.com/UB-Mannheim/tesseract/wiki |

---

### الخطوة 1: تحضير مجلد المشروع

افتح **Terminal / Command Prompt**:

```bash
# إنشاء مجلد جديد
mkdir mmhr_project
cd mmhr_project

# إنشاء مجلدات مساعدة
mkdir uploads
mkdir processed_files
```

---

### الخطوة 2: إنشاء ملفات المشروع الأساسية

#### **ملف 1: package.json**

أنشئ ملف باسم `package.json` وضع فيه:

```json
{
  "name": "mmhr-system",
  "version": "1.0.0",
  "description": "MMHR - Smart Document Processor",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "setup": "node setup.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.10.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "body-parser": "^1.20.2",
    "axios": "^1.4.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.20"
  }
}
```

#### **ملف 2: .env**

أنشئ ملف باسم `.env` وضع فيه:

```
# قاعدة البيانات
DB_USER=postgres
DB_HOST=localhost
DB_NAME=mmhr_db
DB_PASSWORD=your_secure_password_here
DB_PORT=5432

# الأمان والـ Tokens
JWT_SECRET=mmhr_secret_key_2026_super_secure
PORT=5000

# البيئة
NODE_ENV=development

# API (اختياري)
OPENAI_API_KEY=your_openai_key_here
```

#### **ملف 3: requirements.txt**

أنشئ ملف باسم `requirements.txt`:

```
PyPDF2==3.0.1
pytesseract==0.3.10
Pillow==9.5.0
python-docx==0.8.11
requests==2.31.0
python-dotenv==1.0.0
openpyxl==3.1.2
```

---

### الخطوة 3: تثبيت المكتبات

#### **تثبيت Node.js packages:**

```bash
npm install
```

#### **تثبيت Python packages:**

```bash
pip install -r requirements.txt
```

---

### الخطوة 4: إعداد قاعدة البيانات

#### **فتح PostgreSQL:**

**على Windows:**
```bash
# افتح pgAdmin من Start Menu
# أو اكتب في Terminal:
psql -U postgres
```

**على Mac/Linux:**
```bash
psql -U postgres
```

#### **إنشاء قاعدة البيانات والجداول:**

اكتب هذه الأوامر في PostgreSQL:

```sql
-- إنشاء المستخدم
CREATE USER mmhr_user WITH PASSWORD 'your_secure_password_here';

-- إنشاء قاعدة البيانات
CREATE DATABASE mmhr_db OWNER mmhr_user;

-- الاتصال بالقاعدة الجديدة
\c mmhr_db

-- إنشاء جدول المستخدمين
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول المستندات
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء جدول السجلات
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    document_id INTEGER REFERENCES documents(id),
    action VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- إعطاء الصلاحيات
GRANT ALL PRIVILEGES ON DATABASE mmhr_db TO mmhr_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mmhr_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mmhr_user;
```

---

## 🚀 تشغيل النظام

### الطريقة 1: تشغيل بسيط

```bash
npm start
```

ستشوف:
```
✅ Server running on http://localhost:5000
```

### الطريقة 2: تشغيل مع التطوير (auto-reload)

```bash
npm run dev
```

---

## 💻 استخدام النظام

### 1️⃣ التسجيل (Sign Up)

**الرابط:**
```
http://localhost:5000/api/auth/register
```

**استخدام Postman أو curl:**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "أحمد",
    "email": "ahmed@mmhr.com",
    "password": "secure123"
  }'
```

**النتيجة:**
```json
{
  "status": "✅ تم التسجيل بنجاح",
  "user": {
    "id": 1,
    "username": "أحمد",
    "email": "ahmed@mmhr.com"
  }
}
```

---

### 2️⃣ تسجيل الدخول (Login)

**الرابط:**
```
http://localhost:5000/api/auth/login
```

**الطلب:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmed@mmhr.com",
    "password": "secure123"
  }'
```

**النتيجة:**
```json
{
  "status": "✅ تم تسجيل الدخول",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "أحمد",
    "email": "ahmed@mmhr.com"
  }
}
```

**احفظ الـ token - بتحتاجه في كل الطلبات القادمة!** 🔐

---

### 3️⃣ رفع ملف (Upload)

**الرابط:**
```
http://localhost:5000/api/documents/upload
```

**الطلب (باستخدام Postman):**

1. اختر **POST**
2. أدخل الرابط أعلاه
3. اذهب للـ **Headers** وأضف:
   - **Key:** `Authorization`
   - **Value:** `Bearer YOUR_TOKEN_HERE`

4. اذهب للـ **Body** واختر **form-data**
5. أضف:
   - **Key:** `file`
   - **Value:** اختر ملفك (PDF, Word, صورة)

6. اضغط **Send**

**أو باستخدام curl:**
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@document.pdf"
```

**النتيجة:**
```json
{
  "status": "✅ تم رفع الملف",
  "documentId": 1,
  "fileName": "document.pdf",
  "message": "الملف جاري المعالجة..."
}
```

---

### 4️⃣ جلب قائمة المستندات

**الرابط:**
```
http://localhost:5000/api/documents
```

**الطلب:**
```bash
curl -X GET http://localhost:5000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**النتيجة:**
```json
{
  "status": "✅ تم جلب المستندات",
  "documents": [
    {
      "id": 1,
      "user_id": 1,
      "file_name": "document.pdf",
      "file_type": "application/pdf",
      "status": "completed",
      "processed_text": "النص المعالج هنا...",
      "created_at": "2026-07-19T09:45:00.000Z"
    }
  ]
}
```

---

### 5️⃣ تحميل الملف المعالج

**الرابط:**
```
http://localhost:5000/api/documents/{document_id}/download
```

**الطلب:**
```bash
curl -X GET http://localhost:5000/api/documents/1/download \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -o document_processed.txt
```

سيحمل الملف النظيف والمعالج! ✅

---

### 6️⃣ عرض الإحصائيات

**الرابط:**
```
http://localhost:5000/api/dashboard/stats
```

**الطلب:**
```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**النتيجة:**
```json
{
  "status": "✅ إحصائيات المستخدم",
  "stats": [
    {
      "total": "5",
      "status": "completed"
    },
    {
      "total": "2",
      "status": "pending"
    }
  ]
}
```

---

## 🎯 الميزات التي تقدر تنفذها

### 1️⃣ معالجة أنواع ملفات مختلفة

النظام يدعم:

| النوع | الصيغ | المثال |
|------|------|--------|
| **PDFs** | .pdf | جوازات السفر، العقود |
| **Word** | .docx, .doc | المستندات الرسمية |
| **صور** | .jpg, .png, .tiff | مسح ضوئي للوثائق |
| **Excel** | .xlsx | الجداول والبيانات |

---

### 2️⃣ معالجة الملفات المحمية

إذا كان الملف محمي برقم سر:
```bash
# النظام يحاول فتحه تلقائياً
# إذا لم ينجح، يرجع رسالة خطأ
```

---

### 3️⃣ تنظيف النصوص تلقائياً

النظام يعمل:
- ✅ إزالة الأخطاء الإملائية
- ✅ توحيد التنسيق
- ✅ إزالة الأحرف الغريبة
- ✅ تنسيق الفواصل والمسافات

---

### 4️⃣ قراءة الصور (OCR)

إذا رفعت صورة:
- ✅ يقرأ النصوص العربية
- ✅ يقرأ النصوص الإنجليزية
- ✅ يميز بين اللغات تلقائياً

---

### 5️⃣ حفظ آمن

كل المستندات:
- ✅ تُحفظ في قاعدة بيانات آمنة
- ✅ مرتبطة بحسابك الشخصي فقط
- ✅ لا يراها أحد غيرك

---

### 6️⃣ إحصائيات مفصلة

تقدر تشوف:
- ✅ عدد الملفات المعالجة
- ✅ حالة كل ملف
- ✅ وقت المعالجة
- ✅ الأخطاء (إن وجدت)

---

## 📊 أمثلة عملية

### مثال 1: معالجة عقد توظيف

```bash
# 1. سجل دخول
curl -X POST http://localhost:5000/api/auth/login \
  -d '{"email":"user@example.com","password":"123"}'

# احفظ الـ token

# 2. رفع العقد
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@employment_contract.pdf"

# 3. انتظر المعالجة (ثواني معدودة)

# 4. جلب النتيجة
curl http://localhost:5000/api/documents/1/download \
  -H "Authorization: Bearer TOKEN" \
  -o contract_cleaned.txt
```

### مثال 2: معالجة صور مستندات حكومية

```bash
# نفس الخطوات لكن برفع صورة بدل PDF
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@id_card.jpg"

# النظام بيقرأ النصوص من الصورة تلقائياً
```

### مثال 3: معالجة ملفات Word

```bash
# رفع ملف Word
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@government_form.docx"

# سيستخرج النصوص وينظفها
```

---

## 🛠️ استكشاف الأخطاء

### ❌ خطأ: "Port already in use"

**الحل:**
```bash
# غير الـ port في .env
PORT=3000

# أو أغلق البرنامج اللي يستخدم الـ port
```

---

### ❌ خطأ: "Database connection failed"

**الحل:**
```bash
# تأكد من:
# 1. PostgreSQL مشغل
# 2. اسم الـ database صحيح في .env
# 3. كلمة السر صحيحة
# 4. جداول موجودة في قاعدة البيانات
```

---

### ❌ خطأ: "Python not found"

**الحل:**
```bash
# تأكد من تثبيت Python
python --version

# أو جرب python3
python3 --version
```

---

### ❌ خطأ: "Tesseract not found"

**الحل:**

**Windows:** تحمل من https://github.com/UB-Mannheim/tesseract/wiki

**Mac:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-ara
```

---

## 🎓 خطوات التعلم المقترحة

### المرحلة 1: الأساسيات (يوم واحد)
- ✅ ثبت كل المتطلبات
- ✅ شغل النظام
- ✅ سجل حساب
- ✅ رفع ملف PDF بسيط

### المرحلة 2: الاستكشاف (يومين)
- ✅ جرب أنواع ملفات مختلفة
- ✅ لاحظ الفروقات في المعالجة
- ✅ جرب الملفات المحمية
- ✅ اختبر الصور

### المرحلة 3: التقدم (أسبوع)
- ✅ أضيف ميزات جديدة
- ✅ اربط مع أنظمة أخرى
- ✅ خصص النظام لاحتياجاتك

---

## 📞 تطوير مستقبلي

يمكنك إضافة:

1. **ترجمة تلقائية** - ترجم المستندات لأي لغة
2. **التعرف على الأشكال** - استخراج الجداول والرسومات
3. **التوقيع الرقمي** - توقيع رسمي على الملفات
4. **المشاركة الآمنة** - شارك الملفات مع آخرين
5. **المراجعة التلقائية** - اكتشف الأخطاء تلقائياً
6. **الأرشفة الذكية** - تصنيف الملفات تلقائياً

---

## ✅ ملخص سريع

| الخطوة | الأمر |
|--------|-------|
| تثبيت المكتبات | `npm install` و `pip install -r requirements.txt` |
| إعداد قاعدة البيانات | اكتب الأوامر SQL في PostgreSQL |
| تشغيل النظام | `npm start` |
| تسجيل حساب | `POST /api/auth/register` |
| تسجيل الدخول | `POST /api/auth/login` |
| رفع ملف | `POST /api/documents/upload` |
| جلب المستندات | `GET /api/documents` |
| تحميل النتيجة | `GET /api/documents/:id/download` |

---

**نجاح! أنت الآن جاهز لاستخدام نظام MMHR!** 🎉

هل تحتاج لتوضيح أي حاجة؟
