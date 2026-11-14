# APLIKASI SIMULASI TKA (TES KEMAMPUAN AKADEMIK) SMP
### Berbasis HTML, CSS, JavaScript, Google Sheets, dan Google Apps Script
**Standar Desain Pusmendik Kemendikdasmen (Aplikasi ANBK / TKA)**

---

## 1. PENDAHULUAN

Aplikasi **Simulasi TKA SMP** dirancang untuk memberikan pengalaman pengerjaan tes mandiri bagi peserta didik melalui perangkat HP, tablet, maupun komputer desktop. Desain visual, tipografi, warna, kartu token, tata letak soal, navigasi butir soal, dan lembar laporan hasil dibuat menyerupai antarmuka resmi simulasi TKA Pusmendik Kemendikdasmen.

---

## 2. STRUKTUR PROYEK

```
SIMULASI_TKA/
├── index.html                  # Halaman utama terintegrasi (Konfirmasi -> Ujian -> Hasil)
├── css/
│   └── style.css               # Styling tema Pusmendik ANBK & optimasi responsif HP
├── js/
│   ├── config.js               # Konfigurasi terpusat URL backend & konstanta
│   ├── api.js                  # Service fetch API (getPackages, getQuestions, submitAttempt)
│   ├── app.js                  # Inisialisasi, generator token, validasi form konfirmasi
│   ├── exam.js                 # Engine ujian, timer JJ:MM:DD, navigasi, state jawaban
│   └── result.js               # Dashboard laporan hasil simulasi & fitur ulangi ujian
├── assets/
│   ├── logo/
│   │   ├── logo-kemdikbud-71x72.png
│   │   └── logo-w.png
│   └── images/
│       └── bg-top.png
├── data/                       # Dataset paket soal terstruktur
│   ├── packages.json           # Indeks paket soal aktif
│   ├── BI_SMP_P1.json          # Bahasa Indonesia SMP Paket 1 (30 soal)
│   ├── BI_SMP_P2.json          # Bahasa Indonesia SMP Paket 2 (30 soal)
│   ├── MAT_SMP_P1.json         # Matematika SMP Paket 1 (30 soal)
│   └── MAT_SMP_P2.json         # Matematika SMP Paket 2 (30 soal)
├── Code.gs                     # Kode backend Google Apps Script Web App
├── Template_Database_TKA.xlsx  # Spreadsheet database soal, hasil, & konfigurasi
└── README.md                   # Petunjuk setup dan dokumentasi lengkap
```

---

## 3. FITUR UTAMA APLIKASI

1. **Halaman Konfirmasi Peserta (Halaman Awal)**:
   - Header biru Pusmendik proporsional dengan logo Kemdikbud dan identitas peserta.
   - Kartu Token dengan kode akses acak 6 karakter dan tombol **Refresh**.
   - Dropdown **Mata Ujian** dinamis dari Google Sheets (sheet `PAKET`).
   - Form input Nama Peserta, Jenis Kelamin (L/P), dan dropdown Tanggal Lahir terpisah (Hari, Bulan, Tahun) dengan validasi kalender sah.
   - Validasi ketat sebelum ujian dimulai untuk mencegah input kosong atau token tidak cocok.

2. **Halaman Pengerjaan Soal (Exam Screen)**:
   - Sisa Waktu hitung mundur dengan format `JJ:MM:DD`, dengan peringatan visual saat sisa waktu <= 5 menit.
   - Papan soal dua kolom di desktop (Stimulus di kiri, Pertanyaan & opsi di kanan), otomatis menjadi satu kolom tumpuk yang nyaman pada layar HP.
   - Kontrol ukuran teks soal: `A (12px)`, `A (16px)`, `A (20px)`.
   - Mendukung 3 jenis soal standar Pusmendik:
     - **SINGLE**: Pilihan ganda satu jawaban dengan radio button custom `.icheck-primary`.
     - **MULTIPLE**: Pilihan ganda kompleks beberapa jawaban dengan checkbox custom `.icheck-primary`.
     - **MATRIX**: Tabel kesesuaian pernyataan dan kategori (e.g. Benar/Salah, Setuju/Tidak Setuju) yang responsif tanpa merusak lebar layar.
   - Navigasi bawah: Tombol *Soal sebelumnya*, Checkbox *Ragu-ragu* (warna kuning), dan Tombol *Soal berikutnya / Selesai*.
   - Modal **Daftar Soal**: Menampilkan nomor 1 sampai N dengan indikator warna (Belum dijawab, Sudah dijawab, Ragu-ragu, dan Soal aktif).
   - Dialog konfirmasi penyelesaian dengan rekapitulasi jumlah soal yang dijawab, belum dijawab, dan ragu-ragu.

3. **Halaman Laporan Hasil (Result Screen)**:
   - Dashboard laporan formal bergaya modern.
   - Ringkasan metrik: Nilai Akhir (0 - 100), Jumlah Benar, Jumlah Salah, Tidak Dijawab, Total Soal, dan Durasi Pengerjaan.
   - Rincian lembar jawaban: tabel komparasi nomor soal antara jawaban peserta dan kunci jawaban.
   - Tombol **Ulangi Mata Ujian**: Mengambil soal baru dari backend dan mereset sesi tanpa menghapus riwayat sebelumnya.
   - Tombol **Kembali ke Halaman Awal**: Kembali ke halaman konfirmasi untuk memilih mata ujian lain.

4. **Keamanan & Integritas**:
   - Kunci jawaban (`KUNCI_JSON`) **tidak pernah dikirim** oleh endpoint `getQuestions` ke browser.
   - Evaluasi nilai dihitung di backend server Google Apps Script.
   - State jawaban di browser tersimpan selama ujian berlangsung dan tidak hilang saat berpindah nomor.
   - Pencegahan double submission saat tombol diklik.

5. **Optimasi Layar HP**:
   - Tidak ada horizontal scrolling (lebar 360px - 430px).
   - Gambar stimulus memiliki rasio responsif `max-width: 100%`.
   - Ukuran touch target tombol minimal 44px ramah jari sentuh.

---

## 4. PANDUAN INTEGRASI BACKEND GOOGLE SHEETS & APPS SCRIPT

### A. Persiapan Google Spreadsheet
1. Buka [Google Drive](https://drive.google.com).
2. Unggah file `Template_Database_TKA.xlsx` lalu buka dengan **Google Spreadsheet**.
3. Struktur sheet di dalam spreadsheet:
   - `PAKET`: Berisi ID paket, nama mata ujian, durasi menit, jumlah soal, dan status AKTIF.
   - `BANK_SOAL`: Berisi butir soal (`STIMULUS_HTML`, `PERTANYAAN_HTML`, `OPSI_JSON`, `KUNCI_JSON`, `BOBOT`, `JENIS_SOAL`).
   - `PESERTA`: Data peserta terdaftar (jika fitur ALLOW_GUEST diaktifkan, peserta tamu dapat mengerjakan).
   - `HASIL_UJIAN`: Log riwayat pengerjaan (`ID_ATTEMPT`, `WAKTU_MULAI`, `WAKTU_SELESAI`, `NAMA_PESERTA`, `SKOR`, `BENAR`).
   - `JAWABAN_SISWA`: Rincian per butir jawaban yang dikirimkan siswa.
   - `CONFIG`: Parameter `ADMIN_PIN`, `APP_NAME`, `ALLOW_GUEST`, `TIMEZONE`.
4. Salin ID Spreadsheet dari URL (karakter antara `/d/` dan `/edit`).

### B. Konfigurasi Google Apps Script
1. Di Google Sheets, klik menu **Ekstensi (Extensions) > Apps Script**.
2. Hapus kode default di file `Code.gs`, lalu salin seluruh isi file `Code.gs` dari proyek ini.
3. Jalankan fungsi `setupDatabase()` sekali melalui tombol **Run** pada editor Apps Script dan berikan izin otorisasi Google jika diminta.

### C. Deployment Web App (PENTING)
Agar aplikasi frontend di browser dapat berkomunikasi dengan backend tanpa terkena galat `403 Forbidden`, ikuti langkah berikut:
1. Klik tombol biru **Deploy > New deployment** (Terapkan > Penerapan baru).
2. Klik ikon gerigi (Select type) > pilih **Web app**.
3. Isi konfigurasi deployment:
   - **Description**: `TKA Backend API v1`
   - **Execute as**: **Me** (akun Google Anda)
   - **Who has access**: **Anyone** (Siapa saja)  
     *(PENTING: Jangan pilih "Only myself" atau batasan domain sekolah agar browser dapat melakukan fetch GET dan POST)*.
4. Klik **Deploy**.
5. Salin **Web App URL** yang dihasilkan (berakhiran `/exec`).
6. Buka file `js/config.js` di proyek ini, perbarui konstanta `SCRIPT_URL` dengan URL tersebut:
   ```javascript
   const CONFIG = {
     SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwSLG9EwzZzbHIDWsaCuysPYqAV1Q1g60xFp7CxICK40WSuobFYU5UUq4YsXLh0BWHb/exec',
     ...
   };
   ```

---

## 5. CARA MENJALANKAN APLIKASI

### A. Menjalankan di Komputer Lokal
Karena browser membatasi pembacaan modul dan JSON secara lokal (`file://`) akibat kebijakan CORS, jalankan aplikasi menggunakan web server lokal:

1. **Menggunakan Python** (sudah terpasang di sebagian besar komputer):
   Buka terminal/PowerShell di folder proyek, lalu jalankan:
   ```bash
   python -m http.server 8080
   ```
   Buka peramban di: `http://localhost:8080`

2. **Menggunakan Node.js / npx**:
   ```bash
   npx serve .
   ```

3. **Menggunakan VS Code**:
   Pasang ekstensi **Live Server**, klik kanan pada `index.html` lalu pilih **Open with Live Server**.

### B. Mempublikasikan ke Hosting Online (Gratis)
Aplikasi ini murni frontend statis (HTML5/CSS3/JS) sehingga dapat langsung di-hosting secara gratis di:
- **GitHub Pages**: Buat repositori baru, unggah berkas, dan aktifkan GitHub Pages pada pengaturan repositori.
- **Vercel**: Hubungkan ke repositori GitHub atau gunakan Vercel CLI (`vercel`).
- **Netlify**: Cukup *drag and drop* folder `SIMULASI_TKA` ke dashboard Netlify.

---

## 6. HASIL PENGUJIAN

| No | Komponen Uji | Hasil |
|---|---|---|
| 1 | Pemuatan Halaman Awal & Identitas Pusmendik | **BERHASIL** |
| 2 | Generator Token Acak & Tombol Refresh | **BERHASIL** |
| 3 | Validasi Formulir Peserta (Mata Ujian, Nama, Gender, Tanggal Lahir, Token) | **BERHASIL** |
| 4 | Pemuatan Soal Dinamis (30 butir per paket) | **BERHASIL** |
| 5 | Tipe Soal SINGLE (Pilihan Ganda Biasa) | **BERHASIL** |
| 6 | Tipe Soal MULTIPLE (Pilihan Ganda Kompleks) | **BERHASIL** |
| 7 | Tipe Soal MATRIX (Tabel Kesesuaian Pernyataan) | **BERHASIL** |
| 8 | Sisa Waktu Ujian (JJ:MM:DD) & Peringatan Waktu | **BERHASIL** |
| 9 | State Jawaban Tersimpan saat Pindah Nomor | **BERHASIL** |
| 10 | Modal Drawer Nomor Soal & Indikator Warna Status | **BERHASIL** |
| 11 | Konfirmasi Penyelesaian & Rekapitulasi Status | **BERHASIL** |
| 12 | Pengiriman Jawaban ke Backend & Evaluasi Nilai | **BERHASIL** |
| 13 | Halaman Dashboard Laporan Hasil | **BERHASIL** |
| 14 | Fitur Ulangi Ujian & Kembali ke Halaman Awal | **BERHASIL** |
| 15 | Responsivitas Mobile (360px, 390px, 430px) tanpa horizontal scroll | **BERHASIL** |
