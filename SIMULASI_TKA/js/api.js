/**
 * API SERVICE SIMULASI TKA
 * Terhubung langsung secara real-time ke Google Apps Script & Google Sheets
 * Tanpa database tiruan atau hardcoded questions di JavaScript.
 */
const API = (function() {
  /**
   * Helper request fetch dengan timeout
   */
  async function fetchWithTimeout(url, options = {}, timeoutMs = CONFIG.TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Koneksi ke server Google Apps Script melebihi batas waktu (timeout). Periksa jaringan internet Anda.');
      }
      throw err;
    }
  }

  /**
   * Mengambil daftar paket ujian yang aktif langsung dari sheet PAKET Google Sheets
   * Action: getPackages
   */
  async function getPackages() {
    const url = `${CONFIG.SCRIPT_URL}?action=getPackages&_t=${Date.now()}`;
    const response = await fetchWithTimeout(url, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Server Google Apps Script merespons HTTP ${response.status} (${response.statusText})`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (text.includes('Anda memerlukan akses') || text.includes('accounts.google.com')) {
        throw new Error('Google Apps Script memerlukan izin akses publik ("Who has access: Anyone").');
      }
      throw new Error('Format data yang diterima dari Google Sheets tidak valid.');
    }

    if (data && data.ok && Array.isArray(data.packages)) {
      if (data.packages.length === 0) {
        throw new Error('Tidak ada paket ujian berstatus AKTIF pada sheet PAKET di Google Sheets.');
      }
      return data.packages;
    } else {
      throw new Error((data && data.message) || 'Gagal memuat paket ujian dari Google Sheets.');
    }
  }

  /**
   * Mengambil butir soal dari sheet BANK_SOAL berdasarkan ID_PAKET dan MAPEL
   * Action: getQuestions
   * Keamanan: KUNCI_JSON TIDAK PERNAH dikirim ke browser!
   */
  async function getQuestions(packageId, mapel = '') {
    if (!packageId) throw new Error('ID Paket soal wajib ditentukan.');

    let url = `${CONFIG.SCRIPT_URL}?action=getQuestions&packageId=${encodeURIComponent(packageId)}`;
    if (mapel) {
      url += `&mapel=${encodeURIComponent(mapel)}`;
    }
    url += `&_t=${Date.now()}`;

    const response = await fetchWithTimeout(url, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Server Google Apps Script merespons HTTP ${response.status}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (text.includes('Anda memerlukan akses')) {
        throw new Error('Google Apps Script memerlukan izin publik ("Who has access: Anyone").');
      }
      throw new Error('Format data soal dari Google Sheets tidak valid.');
    }

    if (data && data.ok && Array.isArray(data.questions)) {
      if (data.questions.length === 0) {
        throw new Error(`Paket "${packageId}" belum memiliki butir soal berstatus AKTIF di tab BANK_SOAL Google Sheets.`);
      }

      // Pastikan integritas keamanan: tidak ada properti kunci jawaban pada browser
      const safeQuestions = data.questions.map(q => {
        const clean = { ...q };
        delete clean.keyJson;
        delete clean.KUNCI_JSON;
        delete clean.kunci;
        return clean;
      });

      return {
        packageId: packageId,
        questions: safeQuestions
      };
    } else {
      throw new Error((data && data.message) || `Gagal memuat soal untuk paket ${packageId} dari Google Sheets.`);
    }
  }

  /**
   * Mengirim jawaban peserta untuk dinilai oleh Apps Script
   * Action: submitAttempt
   * Menggunakan Content-Type: text/plain agar bebas CORS Preflight OPTIONS
   */
  async function submitAttempt(payload) {
    const requestBody = {
      action: 'submitAttempt',
      packageId: payload.packageId,
      participantId: payload.participantId || 'GUEST',
      participantName: payload.participantName || 'Peserta',
      attemptId: payload.attemptId || ('ATT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
      startedAt: payload.startedAt || new Date().toISOString(),
      answers: payload.answers || []
    };

    const response = await fetchWithTimeout(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(requestBody)
    }, 30000);

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      if (text.includes('Anda memerlukan akses')) {
        throw new Error('Google Apps Script memerlukan izin publik ("Who has access: Anyone").');
      }
      throw new Error('Respons backend Apps Script bukan JSON yang valid.');
    }

    if (result && result.ok) {
      return {
        attemptId: result.attemptId || requestBody.attemptId,
        score: result.score !== undefined ? result.score : 0,
        correct: result.correct !== undefined ? result.correct : 0,
        total: result.total !== undefined ? result.total : payload.answers.length,
        durationSeconds: result.durationSeconds || 0,
        evaluations: result.evaluations || null
      };
    } else {
      throw new Error((result && result.message) || 'Backend Google Apps Script menolak penyimpanan ujian.');
    }
  }

  return {
    getPackages,
    getQuestions,
    submitAttempt
  };
})();
