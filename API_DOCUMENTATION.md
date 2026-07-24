# 📡 توثيق APIs نظام MMHR الكاملة

---

## 🎯 مقدمة

هذا الملف يشرح جميع APIs المتاحة في نظام MMHR مع أمثلة عملية لكل واحدة.

---

## 🔐 المصادقة (Authentication)

### 1️⃣ تسجيل حساب جديد

**Endpoint:**
```
POST /api/auth/register
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "username": "أحمد",
  "email": "ahmed@example.com",
  "password": "secure123"
}
```

**Response (Success):**
```json
{
  "status": "✅ تم التسجيل بنجاح",
  "message": "يمكنك الآن تسجيل الدخول",
  "user": {
    "id": 1,
    "username": "أحمد",
    "email": "ahmed@example.com"
  }
}
```

**Response (Error):**
```json
{
  "error": "❌ البريد أو اسم المستخدم موجود بالفعل",
  "code": "DUPLICATE_USER"
}
```

---

### 2️⃣ تسجيل الدخول

**Endpoint:**
```
POST /api/auth/login
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "ahmed@example.com",
  "password": "secure123"
}
```

**Response (Success):**
```json
{
  "status": "✅ تم تسجيل الدخول",
  "message": "مرحباً بك في النظام",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "أحمد",
    "email": "ahmed@example.com"
  }
}
```

**⚠️ مهم:** احفظ الـ token - بتحتاجه في جميع الطلبات القادمة!

---

## 📄 المستندات (Documents)

### 3️⃣ رفع ملف

**Endpoint:**
```
POST /api/documents/upload
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: multipart/form-data
```

**Body (Form Data):**
```
file: <binary file data>
```

**Curl Example:**
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

**Response (Success):**
```json
{
  "status": "✅ تم رفع الملف",
  "documentId": 1,
  "fileName": "document.pdf",
  "fileSize": "150.50 KB",
  "message": "الملف جاري المعالجة... انتظر دقيقة"
}
```

**Response (Error):**
```json
{
  "error": "❌ نوع ملف غير مدعوم. استخدم: PDF, Word, صور",
  "code": "INVALID_FILE_TYPE"
}
```

---

### 4️⃣ جلب جميع المستندات

**Endpoint:**
```
GET /api/documents
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Curl Example:**
```bash
curl -X GET http://localhost:5000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "status": "✅ تم جلب المستندات",
  "count": 3,
  "documents": [
    {
      "id": 1,
      "user_id": 1,
      "file_name": "document.pdf",
      "file_type": "application/pdf",
      "file_size": 153600,
      "status": "completed",
      "processed_text": "النص المعالج هنا...",
      "created_at": "2026-07-19T09:45:00.000Z"
    },
    {
      "id": 2,
      "user_id": 1,
      "file_name": "form.docx",
      "file_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "file_size": 25600,
      "status": "processing",
      "created_at": "2026-07-19T10:00:00.000Z"
    }
  ]
}
```

---

### 5️⃣ جلب مستند واحد

**Endpoint:**
```
GET /api/documents/:id
```

**Parameters:**
- `:id` - معرف المستند

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Curl Example:**
```bash
curl -X GET http://localhost:5000/api/documents/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "status": "✅ تم جلب الملف",
  "document": {
    "id": 1,
    "user_id": 1,
    "file_name": "document.pdf",
    "file_type": "application/pdf",
    "file_size": 153600,
    "status": "completed",
    "processed_text": "النص المعالج هنا...",
    "created_at": "2026-07-19T09:45:00.000Z"
  }
}
```

---

### 6️⃣ تحميل الملف المعالج

**Endpoint:**
```
GET /api/documents/:id/download
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Curl Example:**
```bash
curl -X GET http://localhost:5000/api/documents/1/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o result.txt
```

**Response:**
- تحميل ملف نصي مباشر (application/octet-stream)

**Response (Error):**
```json
{
  "error": "❌ الملف لم تتم معالجته بعد (الحالة: processing)",
  "code": "NOT_PROCESSED"
}
```

---

### 7️⃣ حذف ملف

**Endpoint:**
```
DELETE /api/documents/:id
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Curl Example:**
```bash
curl -X DELETE http://localhost:5000/api/documents/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (Success):**
```json
{
  "status": "✅ تم حذف الملف بنجاح",
  "documentId": 1
}
```

**Response (Error):**
```json
{
  "error": "❌ الملف غير موجود",
  "code": "NOT_FOUND"
}
```

---

## 📊 الإحصائيات (Dashboard)

### 8️⃣ جلب الإحصائيات

**Endpoint:**
```
GET /api/dashboard/stats
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Curl Example:**
```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "status": "✅ إحصائيات المستخدم",
  "stats": {
    "total_documents": 5,
    "by_status": [
      {
        "status": "completed",
        "count": "3"
      },
      {
        "status": "processing",
        "count": "1"
      },
      {
        "status": "pending",
        "count": "1"
      }
    ],
    "total_size": "2.50 MB"
  }
}
```

---

### 9️⃣ فحص صحة النظام

**Endpoint:**
```
GET /api/health
```

**Headers:**
```
None (لا تحتاج token)
```

**Curl Example:**
```bash
curl -X GET http://localhost:5000/api/health
```

**Response (Success):**
```json
{
  "status": "✅ النظام يعمل بشكل طبيعي",
  "timestamp": "2026-07-19T09:45:00.000Z",
  "uptime": 3600.5
}
```

**Response (Error):**
```json
{
  "status": "❌ النظام غير متصل بقاعدة البيانات",
  "error": "Connection refused"
}
```

---

## 🔥 أمثلة عملية متكاملة

### سيناريو 1: تسجيل وعملية كاملة

```bash
#!/bin/bash

# 1. التسجيل
REGISTER=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "أحمد",
    "email": "ahmed@test.com",
    "password": "secure123"
  }')

echo "التسجيل: $REGISTER"

# 2. تسجيل الدخول
LOGIN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmed@test.com",
    "password": "secure123"
  }')

TOKEN=$(echo $LOGIN | jq -r '.token')
echo "Token: $TOKEN"

# 3. رفع ملف
UPLOAD=$(curl -s -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf")

DOC_ID=$(echo $UPLOAD | jq -r '.documentId')
echo "Document ID: $DOC_ID"

# 4. انتظر المعالجة (دقيقة معدودة)
sleep 5

# 5. جلب المستندات
DOCS=$(curl -s -X GET http://localhost:5000/api/documents \
  -H "Authorization: Bearer $TOKEN")

echo "المستندات: $DOCS"

# 6. تحميل النتيجة
curl -X GET http://localhost:5000/api/documents/$DOC_ID/download \
  -H "Authorization: Bearer $TOKEN" \
  -o result.txt

echo "تم تحميل النتيجة في result.txt"
```

---

### سيناريو 2: معالجة عقد توظيف

```bash
TOKEN="your_token_here"

# رفع العقد
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@employment_contract.pdf"

# الانتظار والتحميل
sleep 10

curl -X GET http://localhost:5000/api/documents/2/download \
  -H "Authorization: Bearer $TOKEN" \
  -o contract_processed.txt

# عرض النتيجة
cat contract_processed.txt
```

---

### سيناريو 3: معالجة صور

```bash
TOKEN="your_token_here"

# رفع صورة الهوية
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@id_photo.jpg"

# سيقرأ النصوص من الصورة تلقائياً
```

---

## 📋 جدول ملخص APIs

| الطريقة | الرابط | الوصف | Token مطلوب |
|--------|--------|-------|-----------|
| `POST` | `/api/auth/register` | تسجيل حساب | ❌ لا |
| `POST` | `/api/auth/login` | تسجيل دخول | ❌ لا |
| `POST` | `/api/documents/upload` | رفع ملف | ✅ نعم |
| `GET` | `/api/documents` | جلب المستندات | ✅ نعم |
| `GET` | `/api/documents/:id` | جلب مستند | ✅ نعم |
| `GET` | `/api/documents/:id/download` | تحميل | ✅ نعم |
| `DELETE` | `/api/documents/:id` | حذف ملف | ✅ نعم |
| `GET` | `/api/dashboard/stats` | الإحصائيات | ✅ نعم |
| `GET` | `/api/health` | فحص النظام | ❌ لا |

---

## 🔑 رموز الأخطاء

| Code | المعنى |
|------|--------|
| `MISSING_FIELDS` | بيانات ناقصة |
| `INVALID_EMAIL` | بريد غير صحيح |
| `DUPLICATE_USER` | مستخدم موجود |
| `INVALID_CREDENTIALS` | بريد أو كلمة سر خاطئة |
| `NO_TOKEN` | لا يوجد token |
| `INVALID_TOKEN` | token غير صحيح |
| `NO_FILE` | لم يتم رفع ملف |
| `INVALID_FILE_TYPE` | نوع ملف غير مدعوم |
| `NOT_FOUND` | الملف غير موجود |
| `NOT_PROCESSED` | لم تتم المعالجة |

---

## 💡 نصائح مهمة

1. **احفظ Token:** احفظ الـ token من تسجيل الدخول واستخدمه في كل الطلبات
2. **المعالجة تستغرق وقتاً:** انتظر بعض الثواني قبل تحميل النتيجة
3. **أنواع الملفات المدعومة:** PDF, Word, صور (JPG, PNG, TIFF)
4. **الحجم الأقصى:** 50 MB لكل ملف
5. **Token ينتهي بعد 24 ساعة:** سجل دخول جديد إذا انتهى

---

**مبروك! أنت الآن جاهز لاستخدام جميع APIs النظام!** ✅
