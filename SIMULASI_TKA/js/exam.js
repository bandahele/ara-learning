/**
 * EXAM MODULE - SIMULASI TKA
 * Mengelola pengerjaan soal, navigasi, timer, state jawaban, dan submit
 */
const Exam = (function() {
  let examData = {
    package: null,
    participant: null,
    questions: [],
    currentIndex: 0,
    answers: {},       // { [questionId]: answerValue }
    doubtful: {},      // { [questionId]: true/false }
    startedAt: null,
    timerSeconds: 0,
    timerId: null,
    fontSize: 'md',
    isSubmitting: false
  };

  /**
   * Helper aman untuk mengisi textContent tanpa melempar TypeError jika elemen tidak ditemukan
   */
  function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /**
   * Memulai sesi ujian
   */
  function start(packageInfo, participantInfo, questionsList) {
    if (!questionsList || questionsList.length === 0) {
      alert('Tidak ada butir soal yang dapat dimuat untuk paket ini dari Google Sheets.');
      return;
    }

    examData.package = packageInfo;
    examData.participant = participantInfo;
    examData.questions = questionsList;
    examData.currentIndex = 0;
    examData.answers = {};
    examData.doubtful = {};
    examData.startedAt = new Date().toISOString();
    examData.isSubmitting = false;

    // Durasi dari sheet PAKET (DURASI_MENIT)
    const durationMinutes = Number(packageInfo.durationMinutes) || 75;
    examData.timerSeconds = durationMinutes * 60;

    // Update Header Identitas
    safeSetText('header-user-name', participantInfo.name || 'PESERTA TKA');
    safeSetText('exam-user-name', participantInfo.name || 'PESERTA TKA');
    safeSetText('exam-subject-name', `${packageInfo.subject || ''} - ${packageInfo.name}`);

    // Mulai timer
    startTimer();

    // Switch ke layar ujian
    App.switchScreen('exam');

    // Render soal pertama
    renderCurrentQuestion();
    renderQuestionGrid();
  }

  /**
   * Timer Hitung Mundur Format JJ:MM:DD
   */
  function startTimer() {
    clearInterval(examData.timerId);
    updateTimerDisplay();

    examData.timerId = setInterval(() => {
      examData.timerSeconds--;

      if (examData.timerSeconds <= 0) {
        clearInterval(examData.timerId);
        examData.timerSeconds = 0;
        updateTimerDisplay();
        alert('Waktu pengerjaan ujian telah habis! Sistem secara otomatis mengumpulkan jawaban yang tersimpan.');
        submitExam();
        return;
      }

      updateTimerDisplay();
    }, 1000);
  }

  function updateTimerDisplay() {
    const el = document.getElementById('exam-timer');
    if (!el) return;

    const h = Math.floor(examData.timerSeconds / 3600);
    const m = Math.floor((examData.timerSeconds % 3600) / 60);
    const s = examData.timerSeconds % 60;

    const pad = n => String(n).padStart(2, '0');
    el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

    // Peringatan saat sisa waktu <= 5 menit
    const box = document.getElementById('exam-timer-box');
    if (box) {
      if (examData.timerSeconds <= 300) {
        box.classList.add('timer-warning');
      } else {
        box.classList.remove('timer-warning');
      }
    }
  }

  /**
   * Render Soal Berdasarkan Index Aktif
   */
  function renderCurrentQuestion() {
    const q = examData.questions[examData.currentIndex];
    if (!q) return;

    // Nomor Soal
    const numDisplay = document.getElementById('soal-number-display');
    if (numDisplay) numDisplay.textContent = q.number || (examData.currentIndex + 1);

    // Stimulus (kiri)
    const stimulusEl = document.getElementById('soal-stimulus-content');
    if (stimulusEl) {
      if (q.stimulusHtml && q.stimulusHtml.trim()) {
        stimulusEl.innerHTML = q.stimulusHtml;
        stimulusEl.parentElement.style.display = 'block';
      } else {
        stimulusEl.innerHTML = '<p class="text-muted"><em>(Soal ini tidak memiliki bacaan atau stimulus pengantar)</em></p>';
      }
    }

    // Pertanyaan (kanan)
    const qTextEl = document.getElementById('soal-question-text');
    if (qTextEl) {
      qTextEl.innerHTML = q.questionHtml || '';
    }

    // Render Pilihan Jawaban
    const optionsContainer = document.getElementById('soal-options-container');
    if (optionsContainer) {
      optionsContainer.innerHTML = '';
      const savedAnswer = examData.answers[q.questionId];

      const type = String(q.type || 'SINGLE').toUpperCase();
      if (type === 'SINGLE') {
        renderSingle(optionsContainer, q, savedAnswer);
      } else if (type === 'MULTIPLE') {
        renderMultiple(optionsContainer, q, savedAnswer);
      } else if (type === 'MATRIX') {
        renderMatrix(optionsContainer, q, savedAnswer);
      }
    }

    // Ragu-ragu
    const raguCheckbox = document.getElementById('checkbox-ragu');
    if (raguCheckbox) {
      raguCheckbox.checked = !!examData.doubtful[q.questionId];
    }

    // Tombol Sebelumnya
    const btnPrev = document.getElementById('btn-prev-soal');
    if (btnPrev) {
      btnPrev.disabled = (examData.currentIndex === 0);
    }

    // Tombol Berikutnya / Selesai
    const btnNext = document.getElementById('btn-next-soal');
    const isLast = (examData.currentIndex === examData.questions.length - 1);
    if (btnNext) {
      if (isLast) {
        btnNext.innerHTML = '<span>Selesai</span> <i class="fa fa-check-circle ml-1"></i>';
        btnNext.className = 'btn btn-success btn-nav';
      } else {
        btnNext.innerHTML = '<span>Soal berikutnya</span> <i class="fa fa-chevron-circle-right ml-1"></i>';
        btnNext.className = 'btn btn-tka-primary btn-nav';
      }
    }

    renderQuestionGrid();
  }

  /**
   * Render Pilihan SINGLE
   */
  function renderSingle(container, q, savedAnswer) {
    const table = document.createElement('table');
    table.className = 'options-table';
    const tbody = document.createElement('tbody');

    const options = Array.isArray(q.options) ? q.options : [];
    options.forEach((opt, idx) => {
      const optId = opt.id || String.fromCharCode(65 + idx);
      const isChecked = (String(savedAnswer) === String(optId));
      const inputId = `opt_${q.questionId}_${optId}`;

      const tr = document.createElement('tr');
      tr.className = 'option-row';
      tr.onclick = function(e) {
        if (e.target.tagName !== 'INPUT') {
          const radio = tr.querySelector('input[type="radio"]');
          if (radio) {
            radio.checked = true;
            onAnswerChanged(q.questionId, optId);
          }
        }
      };

      tr.innerHTML = `
        <td class="option-radio-cell">
          <div class="icheck-primary">
            <input type="radio" id="${inputId}" name="jawaban_${q.questionId}" value="${optId}" ${isChecked ? 'checked' : ''}>
            <label for="${inputId}"></label>
          </div>
        </td>
        <td class="option-text-cell">
          <b>${optId}.</b> ${opt.html || opt.text || ''}
        </td>
      `;

      const input = tr.querySelector('input[type="radio"]');
      input.addEventListener('change', () => {
        onAnswerChanged(q.questionId, optId);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  /**
   * Render Pilihan MULTIPLE
   */
  function renderMultiple(container, q, savedAnswer) {
    const currentList = Array.isArray(savedAnswer) ? savedAnswer : [];
    const table = document.createElement('table');
    table.className = 'options-table';
    const tbody = document.createElement('tbody');

    const options = Array.isArray(q.options) ? q.options : [];
    options.forEach((opt, idx) => {
      const optId = opt.id || String.fromCharCode(65 + idx);
      const isChecked = currentList.includes(optId);
      const inputId = `opt_chk_${q.questionId}_${optId}`;

      const tr = document.createElement('tr');
      tr.className = 'option-row';
      tr.onclick = function(e) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
          const chk = tr.querySelector('input[type="checkbox"]');
          if (chk) {
            chk.checked = !chk.checked;
            chk.dispatchEvent(new Event('change'));
          }
        }
      };

      tr.innerHTML = `
        <td class="option-radio-cell">
          <div class="icheck-primary">
            <input type="checkbox" id="${inputId}" name="jawaban_${q.questionId}" value="${optId}" ${isChecked ? 'checked' : ''}>
            <label for="${inputId}"></label>
          </div>
        </td>
        <td class="option-text-cell">
          <b>${optId}.</b> ${opt.html || opt.text || ''}
        </td>
      `;

      const input = tr.querySelector('input[type="checkbox"]');
      input.addEventListener('change', () => {
        let selected = Array.isArray(examData.answers[q.questionId]) ? [...examData.answers[q.questionId]] : [];
        if (input.checked) {
          if (!selected.includes(optId)) selected.push(optId);
        } else {
          selected = selected.filter(x => x !== optId);
        }
        onAnswerChanged(q.questionId, selected);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  /**
   * Render Pilihan MATRIX
   */
  function renderMatrix(container, q, savedAnswer) {
    const matrixState = (savedAnswer && typeof savedAnswer === 'object') ? savedAnswer : {};
    const cols = (q.options && Array.isArray(q.options.columns)) ? q.options.columns : ['Benar', 'Salah'];
    const rows = (q.options && Array.isArray(q.options.rows)) ? q.options.rows : [];

    const wrapper = document.createElement('div');
    wrapper.className = 'matrix-container';

    const table = document.createElement('table');
    table.className = 'matrix-table';

    let theadHtml = `<thead><tr><th class="statement-header">Pernyataan</th>`;
    cols.forEach(col => {
      theadHtml += `<th>${col}</th>`;
    });
    theadHtml += `</tr></thead>`;

    let tbodyHtml = `<tbody>`;
    rows.forEach((row, rIdx) => {
      const rowId = row.id || `R${rIdx + 1}`;
      const selectedCol = matrixState[rowId] || '';

      tbodyHtml += `<tr><td>${row.html || row.text || ''}</td>`;
      cols.forEach(col => {
        const inputId = `mat_${q.questionId}_${rowId}_${col}`;
        const isChecked = (selectedCol === col);
        tbodyHtml += `
          <td class="choice-cell">
            <div class="icheck-primary">
              <input type="radio" id="${inputId}" name="matrix_${q.questionId}_${rowId}" value="${col}" ${isChecked ? 'checked' : ''} data-row="${rowId}" data-col="${col}">
              <label for="${inputId}"></label>
            </div>
          </td>
        `;
      });
      tbodyHtml += `</tr>`;
    });
    tbodyHtml += `</tbody>`;

    table.innerHTML = theadHtml + tbodyHtml;

    table.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const rowId = radio.getAttribute('data-row');
        const colVal = radio.getAttribute('data-col');
        const currentMatrix = (examData.answers[q.questionId] && typeof examData.answers[q.questionId] === 'object')
          ? { ...examData.answers[q.questionId] }
          : {};
        currentMatrix[rowId] = colVal;
        onAnswerChanged(q.questionId, currentMatrix);
      });
    });

    wrapper.appendChild(table);
    container.appendChild(wrapper);
  }

  function onAnswerChanged(questionId, value) {
    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.keys(value).length === 0)) {
      delete examData.answers[questionId];
    } else {
      examData.answers[questionId] = value;
    }
    renderQuestionGrid();
  }

  function prev() {
    if (examData.currentIndex > 0) {
      examData.currentIndex--;
      renderCurrentQuestion();
    }
  }

  function next() {
    if (examData.currentIndex < examData.questions.length - 1) {
      examData.currentIndex++;
      renderCurrentQuestion();
    } else {
      openFinishConfirmModal();
    }
  }

  function goTo(index) {
    if (index >= 0 && index < examData.questions.length) {
      examData.currentIndex = index;
      renderCurrentQuestion();
      closeQuestionNavModal();
    }
  }

  function toggleDoubtful() {
    const q = examData.questions[examData.currentIndex];
    if (!q) return;

    const chk = document.getElementById('checkbox-ragu');
    const isDoubtful = chk ? chk.checked : !examData.doubtful[q.questionId];

    if (isDoubtful) {
      examData.doubtful[q.questionId] = true;
    } else {
      delete examData.doubtful[q.questionId];
    }

    renderQuestionGrid();
  }

  function renderQuestionGrid() {
    const grid = document.getElementById('question-nav-grid');
    if (!grid) return;

    grid.innerHTML = '';
    let answeredCount = 0;

    examData.questions.forEach((q, idx) => {
      const qid = q.questionId;
      const ans = examData.answers[qid];
      const isAnswered = ans !== undefined && ans !== null && (!Array.isArray(ans) || ans.length > 0) && (typeof ans !== 'object' || Object.keys(ans).length > 0);
      if (isAnswered) answeredCount++;

      const isDoubtful = !!examData.doubtful[qid];
      const isCurrent = (idx === examData.currentIndex);

      const btn = document.createElement('div');
      btn.className = `q-grid-btn ${isAnswered ? 'answered' : ''} ${isDoubtful ? 'doubtful' : ''} ${isCurrent ? 'current' : ''}`;
      
      let badgeText = '';
      if (q.type === 'SINGLE' && ans) {
        badgeText = `<span class="q-grid-badge">${ans}</span>`;
      } else if (q.type === 'MULTIPLE' && Array.isArray(ans) && ans.length > 0) {
        badgeText = `<span class="q-grid-badge">${ans.join(',')}</span>`;
      }

      btn.innerHTML = `<span>${q.number || (idx + 1)}</span>${badgeText}`;
      btn.onclick = () => goTo(idx);
      grid.appendChild(btn);
    });

    const counterEl = document.getElementById('answered-counter-badge');
    if (counterEl) {
      counterEl.textContent = `${answeredCount} / ${examData.questions.length}`;
    }
  }

  function openQuestionNavModal() {
    renderQuestionGrid();
    const modal = document.getElementById('question-nav-modal');
    if (modal) modal.classList.add('active');
  }

  function closeQuestionNavModal() {
    const modal = document.getElementById('question-nav-modal');
    if (modal) modal.classList.remove('active');
  }

  function setFontSize(size) {
    examData.fontSize = size;
    const box = document.getElementById('soal-card-wrapper');
    if (box) {
      box.classList.remove('font-sm', 'font-md', 'font-lg');
      box.classList.add(`font-${size}`);
    }

    document.querySelectorAll('.font-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-size') === size);
    });
  }

  function openFinishConfirmModal() {
    let answered = 0;
    let doubtful = 0;

    examData.questions.forEach(q => {
      const a = examData.answers[q.questionId];
      if (a !== undefined && a !== null && (!Array.isArray(a) || a.length > 0) && (typeof a !== 'object' || Object.keys(a).length > 0)) {
        answered++;
      }
      if (examData.doubtful[q.questionId]) {
        doubtful++;
      }
    });

    const unanswered = examData.questions.length - answered;

    safeSetText('modal-stat-answered', answered);
    safeSetText('modal-stat-unanswered', unanswered);
    safeSetText('modal-stat-doubtful', doubtful);

    const modal = document.getElementById('finish-confirm-modal');
    if (modal) modal.classList.add('active');
  }

  function closeFinishConfirmModal() {
    const modal = document.getElementById('finish-confirm-modal');
    if (modal) modal.classList.remove('active');
  }

  /**
   * Submit Jawaban ke Apps Script
   */
  async function submitExam() {
    if (examData.isSubmitting) return;
    examData.isSubmitting = true;
    closeFinishConfirmModal();
    clearInterval(examData.timerId);

    const loadingDialog = document.getElementById('submitting-dialog-modal');
    if (loadingDialog) loadingDialog.classList.add('active');

    // Format Jawaban sesuai kebutuhan Code.gs submitAttempt
    const formattedAnswers = [];
    examData.questions.forEach(q => {
      const qid = q.questionId;
      if (Object.prototype.hasOwnProperty.call(examData.answers, qid)) {
        formattedAnswers.push({
          questionId: qid,
          answer: examData.answers[qid]
        });
      }
    });

    const payload = {
      packageId: examData.package.packageId,
      participantId: examData.participant.id || 'GUEST',
      participantName: examData.participant.name || 'Peserta',
      startedAt: examData.startedAt,
      answers: formattedAnswers
    };

    try {
      const result = await API.submitAttempt(payload);
      if (loadingDialog) loadingDialog.classList.remove('active');

      // Tampilkan Hasil Ujian
      Result.show(result, {
        package: examData.package,
        participant: examData.participant,
        startedAt: examData.startedAt,
        questions: examData.questions,
        answers: examData.answers
      });
    } catch (err) {
      if (loadingDialog) loadingDialog.classList.remove('active');
      examData.isSubmitting = false;

      // Jawaban TIDAK dihapus. Berikan kesempatan kirim ulang.
      alert(`PENGIRIMAN GAGAL: ${err.message}\n\nJawaban Anda tetap aman tersimpan. Silakan periksa jaringan internet dan coba kirim kembali.`);
      openFinishConfirmModal();
    }
  }

  return {
    start,
    prev,
    next,
    goTo,
    toggleDoubtful,
    openQuestionNavModal,
    closeQuestionNavModal,
    setFontSize,
    openFinishConfirmModal,
    closeFinishConfirmModal,
    submitExam,
    getData: () => examData
  };
})();
