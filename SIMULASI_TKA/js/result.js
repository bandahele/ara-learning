/**
 * RESULT MODULE - SIMULASI TKA
 * Menampilkan Laporan Hasil Ujian & Pembahasan
 */
const Result = (function() {
  let lastSession = null;

  function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /**
   * Menampilkan layar hasil pengerjaan
   */
  function show(resultData, sessionData) {
    lastSession = sessionData;

    App.switchScreen('result');

    // Header Identitas
    safeSetText('result-user-name', sessionData.participant.name || 'PESERTA TKA');
    safeSetText('header-user-name', sessionData.participant.name || 'PESERTA TKA');
    safeSetText('result-subject-title', `${sessionData.package.subject || ''} - ${sessionData.package.name}`);
    safeSetText('result-attempt-id', resultData.attemptId || '-');

    // Durasi Pengerjaan
    const durationSec = resultData.durationSeconds || 0;
    const durMin = Math.floor(durationSec / 60);
    const durSec = durationSec % 60;
    safeSetText('result-duration-text', `${durMin} Menit ${durSec} Detik`);

    // Nilai & Metrik
    const scoreVal = resultData.score !== undefined ? resultData.score : 0;
    safeSetText('result-score-val', scoreVal);

    const correctVal = resultData.correct !== undefined ? resultData.correct : 0;
    safeSetText('result-correct-val', correctVal);

    const totalVal = resultData.total !== undefined ? resultData.total : (sessionData.questions.length || 0);
    safeSetText('result-total-val', totalVal);

    const submittedCount = Object.keys(sessionData.answers || {}).length;
    const unansweredVal = Math.max(0, totalVal - submittedCount);
    safeSetText('result-unanswered-val', unansweredVal);

    const wrongVal = Math.max(0, submittedCount - correctVal);
    safeSetText('result-wrong-val', wrongVal);

    // Waktu Penyelesaian
    const dateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    safeSetText('result-date-text', dateStr);

    // Render Tabel Lembar Jawaban & Pembahasan
    renderReviewTable(resultData.evaluations, sessionData);
  }

  /**
   * Render Tabel Lembar Jawaban & Pembahasan
   */
  function renderReviewTable(evaluations, session) {
    const tbody = document.getElementById('result-review-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const questions = session.questions || [];
    const answers = session.answers || {};

    questions.forEach((q, idx) => {
      const qid = q.questionId;
      const num = q.number || (idx + 1);
      const userAns = answers[qid];

      // Format Jawaban Peserta
      let userAnsHtml = '<span class="text-muted"><em>(Tidak dijawab)</em></span>';
      if (userAns !== undefined && userAns !== null) {
        if (q.type === 'SINGLE') {
          userAnsHtml = `<div class="answer-chip user"><b>(${userAns})</b> Pilihan ${userAns}</div>`;
        } else if (q.type === 'MULTIPLE' && Array.isArray(userAns)) {
          userAnsHtml = userAns.map(a => `<div class="answer-chip user"><b>(${a})</b> Pilihan ${a}</div>`).join('');
        } else if (q.type === 'MATRIX' && typeof userAns === 'object') {
          userAnsHtml = Object.keys(userAns).map(k => `<div class="answer-chip user"><b>${k}:</b> ${userAns[k]}</div>`).join('');
        }
      }

      // Format Kunci Jawaban & Status
      let keyHtml = '<span class="text-muted">Tersimpan di Google Sheets</span>';
      let statusBadge = '';
      let explanationHtml = '';

      if (evaluations && Array.isArray(evaluations)) {
        const ev = evaluations.find(item => item.questionId === qid);
        if (ev && ev.key) {
          if (q.type === 'SINGLE' && ev.key.answer) {
            keyHtml = `<div class="answer-chip correct"><b>(${ev.key.answer})</b></div>`;
          } else if (q.type === 'MULTIPLE' && Array.isArray(ev.key.answers)) {
            keyHtml = ev.key.answers.map(a => `<div class="answer-chip correct"><b>(${a})</b></div>`).join('');
          } else if (q.type === 'MATRIX' && typeof ev.key.answers === 'object') {
            keyHtml = Object.keys(ev.key.answers).map(k => `<div class="answer-chip correct"><b>${k}:</b> ${ev.key.answers[k]}</div>`).join('');
          }

          if (ev.isCorrect) {
            statusBadge = '<span class="badge badge-success ml-2"><i class="fa fa-check"></i> Benar</span>';
          } else {
            statusBadge = '<span class="badge badge-danger ml-2"><i class="fa fa-times"></i> Salah</span>';
          }

          if (ev.explanationHtml && ev.explanationHtml.trim()) {
            explanationHtml = `
              <div class="mt-2 p-2 bg-light rounded" style="font-size: 12px; border-left: 3px solid #17a2b8;">
                <b>Pembahasan:</b> ${ev.explanationHtml}
              </div>
            `;
          }
        }
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-num">${num}</td>
        <td>${userAnsHtml} ${statusBadge}</td>
        <td>${keyHtml} ${explanationHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * Mengulang Ujian Paket yang Sama
   */
  async function repeatExam() {
    if (!lastSession || !lastSession.package) {
      App.switchScreen('confirmation');
      return;
    }

    const conf = confirm(`Apakah Anda ingin mengulang pengerjaan ${lastSession.package.name}?\n\nSesi pengerjaan baru akan dimulai dan hasil pengerjaan sebelumnya tetap tercatat di Google Sheets.`);
    if (!conf) return;

    try {
      // Ambil soal baru dari Google Sheets
      const res = await API.getQuestions(lastSession.package.packageId, lastSession.package.subject);
      Exam.start(lastSession.package, lastSession.participant, res.questions);
    } catch (err) {
      alert(`Gagal memuat paket soal untuk pengulangan: ${err.message}`);
    }
  }

  /**
   * Kembali ke Halaman Konfirmasi Awal
   */
  function backToHome() {
    App.switchScreen('confirmation');
    App.refreshRandomToken();
  }

  return {
    show,
    repeatExam,
    backToHome
  };
})();
