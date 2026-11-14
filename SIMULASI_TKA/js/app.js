/**
 * APP MODULE - SIMULASI TKA
 * Pengendali halaman konfirmasi, token acak, validasi form, dan inisialisasi paket dari Google Sheets
 */
const App = (function() {
  let currentToken = '';
  let availablePackages = [];

  /**
   * Inisialisasi saat DOM ready
   */
  async function init() {
    setupDateOfBirthDropdowns();
    generateNewToken();
    attachEventListeners();
    await loadExamPackages();
  }

  /**
   * Switch Screen (confirmation, exam, result)
   */
  function switchScreen(screenName) {
    document.querySelectorAll('.screen-view').forEach(screen => {
      screen.classList.remove('active');
    });

    const target = document.getElementById(`screen-${screenName}`);
    if (target) {
      target.classList.add('active');
      window.scrollTo(0, 0);
    }
  }

  /**
   * Generate Token Akses Sesi Latihan
   */
  function generateNewToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 6; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    currentToken = token;

    const tokenEl = document.getElementById('token-display');
    if (tokenEl) tokenEl.textContent = token;

    const inputToken = document.getElementById('input-token');
    if (inputToken) inputToken.value = '';
  }

  /**
   * Setup Dropdown Tanggal Lahir (Hari, Bulan, Tahun)
   */
  function setupDateOfBirthDropdowns() {
    const daySelect = document.getElementById('dob-day');
    const monthSelect = document.getElementById('dob-month');
    const yearSelect = document.getElementById('dob-year');

    if (!daySelect || !monthSelect || !yearSelect) return;

    daySelect.innerHTML = '<option value="">Hari</option>';
    for (let d = 1; d <= 31; d++) {
      const val = String(d).padStart(2, '0');
      daySelect.innerHTML += `<option value="${val}">${val}</option>`;
    }

    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    monthSelect.innerHTML = '<option value="">Bulan</option>';
    months.forEach((mName, idx) => {
      const val = String(idx + 1).padStart(2, '0');
      monthSelect.innerHTML += `<option value="${val}">${mName}</option>`;
    });

    yearSelect.innerHTML = '<option value="">Tahun</option>';
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 5; y >= 1990; y--) {
      yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    }
  }

  /**
   * Mengambil data paket ujian langsung dari tab PAKET Google Sheets
   */
  async function loadExamPackages() {
    const selectEl = document.getElementById('select-mata-ujian');
    const badgeEl = document.getElementById('connection-status-badge');

    if (selectEl) {
      selectEl.innerHTML = '<option value="">-- Menghubungkan ke Google Sheets... --</option>';
      selectEl.disabled = true;
    }

    if (badgeEl) {
      badgeEl.className = 'connection-badge';
      badgeEl.style.background = '#e0f2fe';
      badgeEl.style.color = '#0369a1';
      badgeEl.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i> Menghubungi Google Sheets...';
    }

    try {
      const packages = await API.getPackages();
      availablePackages = packages;

      if (selectEl) {
        selectEl.innerHTML = '<option value="">-- Pilih Mata Ujian & Paket --</option>';
        availablePackages.forEach(pkg => {
          const countInfo = pkg.questionCount ? `${pkg.questionCount} Soal, ` : '';
          const durInfo = `${pkg.durationMinutes || 75} Menit`;
          const subjInfo = pkg.subject ? `${pkg.subject} - ` : '';
          selectEl.innerHTML += `<option value="${pkg.packageId}">${subjInfo}${pkg.name} (${countInfo}${durInfo})</option>`;
        });
        selectEl.disabled = false;
      }

      if (badgeEl) {
        badgeEl.className = 'connection-badge online';
        badgeEl.style.background = '#def7ec';
        badgeEl.style.color = '#03543f';
        badgeEl.innerHTML = '<i class="fa fa-check-circle mr-1"></i> Terhubung ke Google Sheets';
      }
    } catch (err) {
      if (selectEl) {
        selectEl.innerHTML = '<option value="">-- Gagal memuat data dari Google Sheets --</option>';
      }
      if (badgeEl) {
        badgeEl.className = 'connection-badge offline';
        badgeEl.style.background = '#fee2e2';
        badgeEl.style.color = '#b91c1c';
        badgeEl.innerHTML = `<i class="fa fa-exclamation-triangle mr-1"></i> ${err.message}`;
      }
      showError(`KONEKSI DATABASE GAGAL: ${err.message}`);
    }
  }

  function attachEventListeners() {
    const btnRefresh = document.getElementById('btn-refresh-token');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', (e) => {
        e.preventDefault();
        generateNewToken();
      });
    }

    const formKonfirmasi = document.getElementById('form-konfirmasi');
    if (formKonfirmasi) {
      formKonfirmasi.addEventListener('submit', handleFormSubmit);
    }
  }

  /**
   * Validasi Form dan Memulai Ujian
   */
  async function handleFormSubmit(e) {
    e.preventDefault();

    const errorEl = document.getElementById('form-error-msg');
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
    }

    const packageId = document.getElementById('select-mata-ujian').value.trim();
    const namaPeserta = document.getElementById('input-nama-peserta').value.trim();
    const jenisKelamin = document.getElementById('select-jenis-kelamin').value;
    const dobDay = document.getElementById('dob-day').value;
    const dobMonth = document.getElementById('dob-month').value;
    const dobYear = document.getElementById('dob-year').value;
    const inputToken = document.getElementById('input-token').value.trim().toUpperCase();

    // Validasi Mata Ujian
    if (!packageId) {
      showError('Silakan pilih Mata Ujian & Paket terlebih dahulu.');
      return;
    }

    // Validasi Nama Peserta
    if (!namaPeserta || namaPeserta.length < 3) {
      showError('Nama peserta wajib diisi minimal 3 karakter.');
      return;
    }

    // Validasi Jenis Kelamin
    if (!jenisKelamin) {
      showError('Silakan pilih Jenis Kelamin.');
      return;
    }

    // Validasi Tanggal Lahir
    if (!dobDay || !dobMonth || !dobYear) {
      showError('Silakan lengkapi Hari, Bulan, dan Tahun lahir.');
      return;
    }

    const dNum = parseInt(dobDay, 10);
    const mNum = parseInt(dobMonth, 10);
    const yNum = parseInt(dobYear, 10);
    const dateObj = new Date(yNum, mNum - 1, dNum);
    if (
      dateObj.getFullYear() !== yNum ||
      dateObj.getMonth() !== mNum - 1 ||
      dateObj.getDate() !== dNum
    ) {
      showError('Kombinasi Tanggal Lahir tidak valid (misalnya tanggal 31 pada bulan yang hanya memiliki 30 hari).');
      return;
    }

    // Validasi Token
    if (!inputToken) {
      showError('Silakan ketikkan kode token.');
      return;
    }

    if (inputToken !== currentToken) {
      showError('Token yang Anda masukkan tidak sesuai atau sudah diperbarui. Periksa kode token pada kartu sebelah kiri.');
      return;
    }

    // Mencegah submit ganda
    const btnSubmit = document.getElementById('btn-submit-konfirmasi');
    const originalBtnText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> Mengambil Soal dari Google Sheets...';

    const selectedPkg = availablePackages.find(p => p.packageId === packageId) || {
      packageId: packageId,
      name: 'Simulasi TKA',
      subject: '',
      durationMinutes: 75
    };

    const participantInfo = {
      id: 'GUEST',
      name: namaPeserta,
      gender: jenisKelamin,
      birthDate: `${dobYear}-${dobMonth}-${dobDay}`
    };

    try {
      // Mengambil butir soal dari sheet BANK_SOAL melalui Google Apps Script
      const questionsRes = await API.getQuestions(packageId, selectedPkg.subject);

      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnText;

      // Masuk ke Layar Ujian
      Exam.start(selectedPkg, participantInfo, questionsRes.questions);
    } catch (err) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = originalBtnText;
      showError(`GAGAL MEMUAT SOAL DARI GOOGLE SHEETS:\n${err.message}`);
    }
  }

  function showError(msg) {
    const errorEl = document.getElementById('form-error-msg');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
      errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      alert(msg);
    }
  }

  return {
    init,
    switchScreen,
    refreshRandomToken: generateNewToken,
    getAvailablePackages: () => availablePackages
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
