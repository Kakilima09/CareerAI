# CareerAI Mentor — Gemini-Powered AI Chatbot

CareerAI Mentor adalah asisten pengembangan karier berbasis kecerdasan buatan (*AI Career Development Assistant*) yang didukung oleh **Google Gemini API**. Aplikasi ini dirancang untuk memproses bahasa alami (NLP/LLM), memahami intensi pengguna secara kontekstual, dan memberikan panduan karier yang personal, terstruktur, serta aplikatif.

---

## 🌟 Fitur Utama (Core Features)

1. **AI Career Consultant**:
   - Eksplorasi jalur karier, transisi karier (*career switch*), dan strategi melamar kerja.
   - Rekomendasi sertifikasi dan pengembangan profesional yang realistis.
   - Format respons terstruktur: *1. Jawaban Langsung, 2. Analisis, 3. Rekomendasi Aksi, 4. Langkah Berikutnya*.

2. **CV Assistant**:
   - Tinjauan konten CV terhadap target posisi atau deskripsi lowongan kerja (*Job Description*).
   - Perbaikan *bullet points* pengalaman kerja menggunakan *Action Verbs + Metrik Terukur*.
   - Evaluasi kesesuaian sistem ATS tanpa merekayasa atau mengarang pencapaian palsu.

3. **Skill Gap Analyzer**:
   - Memetakan keahlian saat ini terhadap persyaratan industri target.
   - Mengkategorikan *Essential Skills* (wajib) vs *Optional Skills* (nilai tambah).
   - Matriks prioritas belajar, estimasi tingkat kesulitan, dan latihan praktis untuk menutup kesenjangan keahlian.

4. **Learning Roadmap Generator**:
   - Menghasilkan kurikulum dan rencana belajar mingguan adaptif sesuai jam belajar pengguna.
   - Pembagian tahapan (*Fundamentals -> Applied Skills -> Real-World Portfolio Projects*).
   - Kriteria penyelesaian (*completion checklist*) yang terukur.

5. **Interactive Mock Interview**:
   - Simulasi wawancara kerja teknis dan situasional gilir-demi-gilir (*turn-by-turn*).
   - AI menanyakan **satu pertanyaan** pada setiap giliran.
   - Memberikan evaluasi format STAR (*Situation, Task, Action, Result*), kekuatan, kekurangan, dan contoh perbaikan sebelum memberikan pertanyaan berikutnya.

6. **Conversation & Context Management**:
   - Penyimpanan riwayat obrolan dan sesi wawancara ke database SQLite lokal (*zero-configuration*).
   - *Bounded Context Window* (membatasi riwayat pesan yang dikirim ke LLM) untuk menghemat token dan menjaga relevansi.
   - Pencarian riwayat percakapan dan penghapusan percakapan.

7. **Configurable AI Presets & Parameters**:
   - **Accurate (Temp 0.2)**: Evaluasi CV, analisis gap, dan data terstruktur dengan variabilitas minimal.
   - **Balanced (Temp 0.7)**: Konsultasi karier umum dengan gaya bahasa natural.
   - **Creative (Temp 1.0)**: *Brainstorming* ide proyek, eksplorasi opsi karier baru, dan solusi alternatif.
   - Dukungan model Gemini (`gemini-flash-lite-latest` sebagai default tercepat, `gemini-flash-latest`, `gemini-3.8-flash`, `gemini-2.5-pro`).

8. **User Authentication & Multi-Tenant Data Isolation**:
   - Registrasi pengguna baru dan login aman dengan password hashing `bcryptjs` (salt rounds 10).
   - Otorisasi berbasis JSON Web Token (JWT) dengan expiry 7 hari.
   - Isolasi percakapan antar-pengguna (*multi-tenancy*): pengguna terautentikasi hanya dapat mengakses, melihat, dan menghapus percakapan miliknya sendiri. Akses lintas user diblokir dengan proteksi HTTP 403 / 404.
   - Mode tamu (*guest access*) tetap didukung tanpa memutus alur pengguna baru.

9. **Halaman Login & Dashboard (User + Admin)**:
   - Halaman login/registrasi terpisah (`/login.html`) dengan redirect ke dashboard setelah masuk.
   - Dashboard pengguna: statistik percakapan & pesan, distribusi topik, riwayat terbaru, dan aksi cepat modul karier.
   - Dashboard admin: ringkasan seluruh pengguna/percakapan serta manajemen (daftar pengguna, daftar percakapan, hapus data).
   - Sistem role (`user` / `admin`); akun admin di-*bootstrap* otomatis dari `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## 📂 Struktur Proyek

```
CareerAI/
├── data/                      # Direktori database SQLite lokal (otomatis dibuat)
│   └── careerai.sqlite
├── public/                    # Frontend UI (Bootstrap 5, Indigo/Navy SaaS theme)
│   ├── css/
│   │   └── style.css          # Desain modern SaaS dashboard
│   ├── js/
│   │   ├── app.js             # Logic chat client-side, Markdown & DOMPurify, API handler
│   │   ├── login.js           # Controller halaman login/registrasi
│   │   └── dashboard.js       # Controller dashboard user & admin
│   ├── index.html             # Aplikasi chat utama & modal aksi cepat
│   ├── login.html             # Halaman login/registrasi (full page)
│   └── dashboard.html         # Dashboard user & panel admin
├── src/
│   ├── config/
│   │   ├── auth.js            # Konfigurasi & helper JWT
│   │   ├── database.js        # Inisialisasi SQLite database (Node 24 DatabaseSync)
│   │   └── gemini.js          # Konfigurasi model, limits, presets & System Prompt
│   ├── controllers/
│   │   ├── authController.js  # Register, login, & profil pengguna
│   │   ├── chatController.js  # Controller alur chat, validasi pesan, & riwayat
│   │   ├── dashboardController.js # Statistik dashboard pengguna
│   │   ├── adminController.js # Statistik & manajemen (admin)
│   │   └── specializedController.js # Controller modul CV, Skill Gap, Roadmap, & Mock Interview
│   ├── middleware/
│   │   ├── authMiddleware.js  # requireAuth, optionalAuth, requireAdmin
│   │   ├── errorHandler.js    # Sanitasi pesan error (menjamin API key tidak bocor)
│   │   └── rateLimiter.js     # Rate limiting pencegah abuse
│   ├── models/
│   │   ├── conversationModel.js # Akses database percakapan & interview
│   │   └── userModel.js       # Akses database pengguna & hashing password
│   ├── routes/
│   │   └── api.js             # Definisi endpoint RESTful API
│   ├── services/
│   │   ├── geminiService.js   # HTTP Client resmi Gemini REST, timeout & retry logic
│   │   └── intentClassifier.js# Engine deteksi intensi percakapan (7 kategori)
│   ├── app.js                 # Express Application bootstrapping
│   └── server.js              # Server entry point
├── tests/                     # Pengujian otomatis (Jest & Supertest)
│   ├── auth.test.js           # Test autentikasi & isolasi data antar-user
│   ├── chatApi.test.js        # Test endpoint API & validasi batas karakter
│   ├── conversationModel.test.js # Test persistensi data SQLite
│   ├── dashboardAdmin.test.js # Test dashboard user & endpoint admin
│   ├── geminiService.test.js  # Test mock respon HTTP Gemini, 429 rate limit, 400 key
│   └── intentClassifier.test.js # Test akurasi klasifikasi intensi & prompt augmentations
├── .env.example               # Contoh konfigurasi environment variable
├── .gitignore                 # Filter file rahasia & dependencies
├── package.json               # Konfigurasi dependensi project
└── README.md                  # Dokumentasi lengkap
```

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### 1. Prasyarat
- **Node.js**: Versi 18+ (Rekomendasi Node.js 22 atau 24 yang sudah terinstal di sistem Anda).
- **Koneksi Internet**: Untuk mengakses Google Gemini API.
- **Google Gemini API Key**: Dapatkan secara gratis di [Google AI Studio](https://aistudio.google.com/).

### 2. Instalasi Dependensi
Buka terminal / PowerShell di direktori proyek:
```powershell
cd d:\Project\CareerAI
npm install
```

### 3. Konfigurasi Environment Variable (`.env`)
Salin file `.env.example` menjadi `.env`:
```powershell
cp .env.example .env
```
Buka file `.env` dan masukkan API Key Anda:
```env
PORT=3000
NODE_ENV=development

# Masukkan Gemini API Key Anda dari Google AI Studio:
GEMINI_API_KEY=AIzaSyYourActualGeminiApiKeyHere

# Pilihan model (default: gemini-flash-lite-latest)
GEMINI_MODEL=gemini-flash-lite-latest

# Default AI Parameters
DEFAULT_TEMPERATURE=0.7
DEFAULT_TOP_P=0.9
DEFAULT_TOP_K=40
DEFAULT_MAX_OUTPUT_TOKENS=2048

# Bounded context window
MAX_HISTORY_MESSAGES=10
REQUEST_TIMEOUT_MS=90000
```

### 4. Menjalankan Aplikasi
Jalankan server aplikasi:
```powershell
npm start
```
Atau untuk mode pengembangan dengan auto-reload:
```powershell
npm run dev
```

Buka browser dan akses:
👉 **`http://localhost:3000`** (aplikasi chat) · 👉 **`http://localhost:3000/login.html`** (login) · 👉 **`http://localhost:3000/dashboard.html`** (dashboard)

### 5. Akun Admin & Dashboard
- Saat server pertama kali dijalankan, akun admin di-*bootstrap* otomatis dari `ADMIN_EMAIL` / `ADMIN_PASSWORD` di `.env` (default: `admin@careerai.local` / `admin12345` — **wajib diganti** untuk produksi).
- Setiap email yang terdaftar pada `ADMIN_EMAILS` (dipisah koma) otomatis mendapat role `admin` saat registrasi.
- Masuk melalui `/login.html`; role `admin` akan melihat **Panel Administrator** (statistik seluruh pengguna, daftar pengguna, daftar semua percakapan, serta aksi hapus).

---

## 🧪 Menjalankan Pengujian Otomatis (Automated Tests)

Pengujian mencakup unit test dan integration test dengan HTTP mock (tidak memotong kuota API Gemini asli Anda):
```powershell
npm test
```

### Lingkup Pengujian:
- **`geminiService.test.js`**: Validasi parameter, penanganan HTTP 200, HTTP 400 (kunci salah), HTTP 429 (rate limit habis), AbortController Timeout, dan filter keselamatan konten (*Safety Filters*).
- **`intentClassifier.test.js`**: Klasifikasi pola teks untuk 7 intensi (`career_advice`, `cv_review`, `skill_gap`, `learning_roadmap`, `mock_interview`, `general_question`, `out_of_scope`).
- **`conversationModel.test.js`**: Persistensi pesan, isolasi SQLite, dan pembatasan context window (*bounded history*).
- **`chatApi.test.js`**: Validasi HTTP input (pesan kosong, pesan > 4000 karakter), pencegahan kebocoran secret pada konfigurasi publik, dan endpoint CRUD.

---

## 🧠 Konfigurasi Parameter AI & Presets

Parameter AI dapat disesuaikan langsung melalui antarmuka pengguna (*Modal Konfigurasi AI*) atau via `.env`:

| Preset | Temperature | Top-P | Rekomendasi Use Case |
| :--- | :---: | :---: | :--- |
| **Accurate** | `0.2` | `0.80` | Analisis CV, ekstraksi gap kompetensi, evaluasi format STAR. Menghasilkan jawaban deterministik dan konsisten. |
| **Balanced** | `0.7` | `0.90` | Tanya jawab konsultasi umum karier, panduan wawancara interaktif. |
| **Creative** | `1.0` | `0.95` | Brainstorming ide proyek portofolio, alternatif transisi karier lintas bidang. |

> **Catatan Teknis Mengenai Temperature**:
> Parameter *temperature* mengatur keberagaman distribusi probabilitas pemilihan token (variabilitas respons). Nilai temperature yang lebih tinggi **bukan** tolok ukur kecerdasan model atau tingkat kebenaran faktual, melainkan tingkat variasi respons.

---

## 🔒 Keamanan & Privasi (Security Best Practices)

1. **Server-Side API Key Only**: `GEMINI_API_KEY` hanya dibaca oleh backend Node.js dan tidak pernah dikirim ke frontend browser atau disimpan pada log.
2. **Safe Markdown Rendering**: Respons AI dirender menggunakan `Marked.js` yang disanitasi ketat oleh `DOMPurify` untuk mencegah serangan Cross-Site Scripting (XSS).
3. **Rate Limiting**: Endpoint API dilindungi oleh middleware `express-rate-limit` (100 request per 15 menit per IP).
4. **Input Bounding**: Input pesan dibatasi maksimal 4.000 karakter untuk mencegah eksploitasi token injection dan payload berlebih.
5. **Sanitized Error Logs**: Middleware error secara otomatis menyaring dan menyamarkan (*redact*) string yang menyerupai API key dari keluaran konsol maupun respon HTTP.

---

## 🛠️ Panduan Troubleshooting

| Masalah | Kemungkinan Penyebab | Solusi |
| :--- | :--- | :--- |
| **"GEMINI_API_KEY is not configured"** | File `.env` belum memiliki API key atau masih berisi placeholder. | Buka `.env`, pastikan `GEMINI_API_KEY=AIzaSy...` terisi kunci yang valid dari Google AI Studio, lalu restart server. |
| **"Gemini API rate limit exceeded (429)"** | Kuota per menit untuk tier gratis Gemini tercapai. | Tunggu 30–60 detik sebelum mengirim prompt berikutnya, atau gunakan model `gemini-1.5-flash` yang memiliki batas RPM lebih tinggi. |
| **"The requested Gemini model was not found (404)"** | Nama model di `.env` sudah usang atau salah ketik. | Gunakan salah satu model yang didukung: `gemini-flash-lite-latest`, `gemini-flash-latest`, `gemini-3.8-flash`, atau `gemini-2.5-pro`. |
| **"Request timed out"** | Koneksi internet lambat atau endpoint Google mengalami latensi tinggi. | Periksa koneksi internet Anda atau tingkatkan nilai `REQUEST_TIMEOUT_MS` di file `.env`. |
| **Port 3000 sudah digunakan** | Aplikasi lain sedang berjalan pada port 3000. | Ubah `PORT=3001` atau port lain pada file `.env`. |
