// ═══════════════════════════════════════════════════════════════════
// 🌐 Dashboard ويب احترافي لنظام MMHR
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// الملفات الثابتة
app.use(express.static('public'));

// ✅ صفحة Dashboard الرئيسية
app.get('/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard - MMHR</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        header {
          background: rgba(255, 255, 255, 0.95);
          padding: 30px;
          border-radius: 15px;
          margin-bottom: 30px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        header h1 {
          color: #667eea;
          font-size: 2em;
        }
        
        header p {
          color: #999;
          margin-top: 5px;
        }
        
        .logout-btn {
          background: #e74c3c;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.3s;
        }
        
        .logout-btn:hover {
          background: #c0392b;
        }
        
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .card {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 50px rgba(0,0,0,0.15);
        }
        
        .card h2 {
          color: #667eea;
          margin-bottom: 15px;
          font-size: 1.5em;
        }
        
        .stat {
          font-size: 2.5em;
          font-weight: bold;
          color: #333;
          margin: 20px 0;
        }
        
        .upload-area {
          border: 2px dashed #667eea;
          border-radius: 10px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          background: #f8f9fa;
        }
        
        .upload-area:hover {
          border-color: #764ba2;
          background: #f0f0f5;
        }
        
        .upload-area.dragover {
          border-color: #764ba2;
          background: #e8e8f5;
          transform: scale(1.02);
        }
        
        .upload-area p {
          color: #667eea;
          font-size: 1.2em;
          margin-bottom: 10px;
        }
        
        .upload-area small {
          color: #999;
        }
        
        #fileInput {
          display: none;
        }
        
        .progress-bar {
          width: 100%;
          height: 10px;
          background: #eee;
          border-radius: 5px;
          overflow: hidden;
          margin: 20px 0;
        }
        
        .progress {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          width: 0%;
          transition: width 0.3s;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        
        th, td {
          padding: 15px;
          text-align: right;
          border-bottom: 1px solid #eee;
        }
        
        th {
          background: #f8f9fa;
          color: #667eea;
          font-weight: bold;
        }
        
        tr:hover {
          background: #f8f9fa;
        }
        
        .status {
          padding: 5px 10px;
          border-radius: 5px;
          font-size: 0.9em;
          font-weight: bold;
        }
        
        .status.completed {
          background: #d4edda;
          color: #155724;
        }
        
        .status.processing {
          background: #fff3cd;
          color: #856404;
        }
        
        .status.pending {
          background: #cfe2ff;
          color: #084298;
        }
        
        .status.error {
          background: #f8d7da;
          color: #721c24;
        }
        
        .btn {
          background: #667eea;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.3s;
        }
        
        .btn:hover {
          background: #764ba2;
        }
        
        .btn-small {
          padding: 5px 10px;
          font-size: 0.9em;
        }
        
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }
        
        .modal.show {
          display: flex;
        }
        
        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 15px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #eee;
          padding-bottom: 20px;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 1.5em;
          cursor: pointer;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <header>
          <div>
            <h1>📄 Dashboard MMHR</h1>
            <p>معالج المستندات الذكي</p>
          </div>
          <button class="logout-btn" onclick="logout()">🚪 تسجيل الخروج</button>
        </header>
        
        <!-- Stats Cards -->
        <div class="grid">
          <div class="card">
            <h2>📊 الإحصائيات</h2>
            <div class="stat" id="totalDocs">0</div>
            <p>إجمالي المستندات</p>
          </div>
          
          <div class="card">
            <h2>✅ مكتملة</h2>
            <div class="stat" id="completedDocs">0</div>
            <p>تمت معالجتها</p>
          </div>
          
          <div class="card">
            <h2>⏳ جاري المعالجة</h2>
            <div class="stat" id="processingDocs">0</div>
            <p>قيد المعالجة</p>
          </div>
        </div>
        
        <!-- Upload Card -->
        <div class="card">
          <h2>📤 رفع ملف جديد</h2>
          <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
            <p>📁 اسحب الملف هنا أو اضغط للاختيار</p>
            <small>PDF, Word, الصور - حتى 50 MB</small>
            <div class="progress-bar" id="progressBar" style="display:none;">
              <div class="progress" id="progress"></div>
            </div>
          </div>
          <input type="file" id="fileInput" accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.tiff">
        </div>
        
        <!-- Documents List -->
        <div class="card">
          <h2>📁 المستندات</h2>
          <table id="documentsTable">
            <thead>
              <tr>
                <th>اسم الملف</th>
                <th>الحالة</th>
                <th>الحجم</th>
                <th>التاريخ</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody id="docsList">
              <tr>
                <td colspan="5" style="text-align: center; color: #999;">جاري التحميل...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Modal for viewing document -->
      <div class="modal" id="docModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="docTitle">تفاصيل الملف</h2>
            <button class="close-btn" onclick="closeModal()">✕</button>
          </div>
          <div id="docDetails"></div>
        </div>
      </div>
      
      <script>
        const API_URL = 'http://localhost:5000/api';
        let token = localStorage.getItem('mmhr_token');
        
        // التحقق من الدخول
        if (!token) {
          window.location.href = '/login';
        }
        
        // تحميل البيانات
        function loadStats() {
          fetch(\`\${API_URL}/dashboard/stats\`, {
            headers: { 'Authorization': \`Bearer \${token}\` }
          })
          .then(r => r.json())
          .then(data => {
            document.getElementById('totalDocs').textContent = data.stats.total_documents;
            const byStatus = {};
            data.stats.by_status.forEach(s => {
              byStatus[s.status] = s.count;
            });
            document.getElementById('completedDocs').textContent = byStatus.completed || 0;
            document.getElementById('processingDocs').textContent = byStatus.processing || 0;
          });
        }
        
        function loadDocuments() {
          fetch(\`\${API_URL}/documents\`, {
            headers: { 'Authorization': \`Bearer \${token}\` }
          })
          .then(r => r.json())
          .then(data => {
            const tbody = document.getElementById('docsList');
            tbody.innerHTML = '';
            
            if (data.documents.length === 0) {
              tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">لا توجد مستندات بعد</td></tr>';
              return;
            }
            
            data.documents.forEach(doc => {
              const date = new Date(doc.created_at).toLocaleDateString('ar-SA');
              const size = (doc.file_size / 1024).toFixed(2);
              const statusClass = doc.status;
              const statusText = {
                'completed': '✅ مكتمل',
                'processing': '⏳ جاري',
                'pending': '⏸️ انتظار',
                'error': '❌ خطأ'
              }[doc.status] || doc.status;
              
              tbody.innerHTML += \`
                <tr>
                  <td>\${doc.file_name}</td>
                  <td><span class="status \${statusClass}">\${statusText}</span></td>
                  <td>\${size} KB</td>
                  <td>\${date}</td>
                  <td>
                    \${doc.status === 'completed' ? \`<button class="btn btn-small" onclick="downloadDocument(\${doc.id})">⬇️ تحميل</button>\` : '-'}
                  </td>
                </tr>
              \`;
            });
          });
        }
        
        // رفع ملف
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
          uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
          e.preventDefault();
          uploadArea.classList.remove('dragover');
          uploadFile(e.dataTransfer.files[0]);
        });
        
        fileInput.addEventListener('change', (e) => {
          uploadFile(e.target.files[0]);
        });
        
        function uploadFile(file) {
          const formData = new FormData();
          formData.append('file', file);
          
          const progressBar = document.getElementById('progressBar');
          progressBar.style.display = 'block';
          
          fetch(\`\${API_URL}/documents/upload\`, {
            method: 'POST',
            headers: { 'Authorization': \`Bearer \${token}\` },
            body: formData
          })
          .then(r => r.json())
          .then(data => {
            if (data.status) {
              alert('✅ تم رفع الملف بنجاح!');
              loadDocuments();
              loadStats();
            }
          })
          .catch(err => alert('❌ خطأ: ' + err.message))
          .finally(() => {
            progressBar.style.display = 'none';
          });
        }
        
        function downloadDocument(docId) {
          window.location.href = \`\${API_URL}/documents/\${docId}/download?token=\${token}\`;
        }
        
        function logout() {
          localStorage.removeItem('mmhr_token');
          window.location.href = '/';
        }
        
        // تحميل البيانات عند الفتح
        loadStats();
        loadDocuments();
        setInterval(loadStats, 30000);
        setInterval(loadDocuments, 30000);
      </script>
    </body>
    </html>
  `);
});

// ═══════════════════════════════════════════════════════════════════
// 🚀 تشغيل Dashboard
// ═══════════════════════════════════════════════════════════════════

const DASHBOARD_PORT = process.env.DASHBOARD_PORT || 3003;

app.listen(DASHBOARD_PORT, () => {
  console.log('\n╔════════════════════════════════════╗');
  console.log('║    ✅ Dashboard يعمل بنجاح        ║');
  console.log('╚════════════════════════════════════╝\n');
  console.log(`🌐 Dashboard: http://localhost:${DASHBOARD_PORT}/dashboard\n`);
});

export default app;
