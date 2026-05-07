const api = window.electronAPI;

// ─── Elements ──────────────────────────────────────────────────────────────────
const loadingDot   = document.getElementById('loadingDot');
const answerPanel  = document.getElementById('answerPanel');
const answerLines  = document.getElementById('answerLines');
const savedToast   = document.getElementById('savedToast');
const errorDot     = document.getElementById('errorDot');

// ─── State ─────────────────────────────────────────────────────────────────────
let isHidden = false;
let savedToastTimer = null;

// ─── Helpers ───────────────────────────────────────────────────────────────────
function showLoading() {
  loadingDot.classList.add('visible');
  errorDot.classList.remove('visible');
}

function showError() {
  loadingDot.classList.remove('visible');
  errorDot.classList.add('visible');
  setTimeout(() => errorDot.classList.remove('visible'), 4000);
}

function hideAll() {
  loadingDot.classList.remove('visible');
  errorDot.classList.remove('visible');
  answerPanel.classList.remove('visible');
  savedToast.classList.remove('visible');
}

function flashSavedToast(folderName) {
  if (savedToastTimer) clearTimeout(savedToastTimer);
  savedToast.textContent = `✓ Saved → ${folderName}`;
  savedToast.classList.add('visible');
  savedToastTimer = setTimeout(() => {
    savedToast.classList.remove('visible');
  }, 4000);
}

function showAnswerPanel() {
  if (!isHidden) {
    answerPanel.classList.add('visible');
  }
}

// ─── Render Answer ──────────────────────────────────────────────────────────────
function renderAnswer(data) {
  loadingDot.classList.remove('visible');
  answerLines.innerHTML = '';

  const type = data.type || '';

  if (type === 'web') {
    // MERN/Web: just show a saved toast, files are on Desktop
    const name = data.questionName || 'WebProject';
    flashSavedToast(name);

  } else if (type === 'dsa') {
    // DSA: render code on screen in faint style
    renderDSACode(data);

  } else if (type === 'mcq') {
    // MCQ: render answers list
    renderMCQAnswers(data.answers || []);

  } else if (type === 'mixed') {
    // Mixed: could have both MCQ answers and code
    if (data.files && data.files.length > 0) {
      renderDSACode(data);
    }
    if (data.answers && data.answers.length > 0) {
      renderMCQAnswers(data.answers);
    }
  }
}

// ─── DSA Code Renderer ─────────────────────────────────────────────────────────
function renderDSACode(data) {
  answerLines.innerHTML = '';

  // Render each file (usually just one for DSA)
  (data.files || []).forEach((file) => {
    if (!file.content) return;

    const block = document.createElement('div');
    block.className = 'code-block';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(file.content);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1000);
    };
    block.appendChild(copyBtn);

    const pre = document.createElement('pre');
    pre.className = 'code-pre';
    
    // Ensure content is a string joined by newlines, not commas
    let content = file.content;
    if (Array.isArray(content)) {
      content = content.join('\n');
    }
    pre.textContent = content;
    block.appendChild(pre);

    answerLines.appendChild(block);
  });

  showAnswerPanel();
}

// ─── MCQ Renderer ──────────────────────────────────────────────────────────────
function renderMCQAnswers(answers) {
  if (answers.length === 0) return;

  answers.forEach((item, i) => {
    const line = document.createElement('div');
    line.className = 'answer-line';
    // Only show the answer itself (e.g., "A" or "Heap")
    line.textContent = item.answer || '?';
    answerLines.appendChild(line);
  });

  showAnswerPanel();
}

// ─── IPC Listeners ─────────────────────────────────────────────────────────────
api.onStatus(({ type }) => {
  if (type === 'loading') {
    showLoading();
  } else if (type === 'idle') {
    hideAll();
  } else if (type === 'error') {
    showError();
  } else if (type === 'info') {
    // Optional: show a tiny brief indicator for mouse mode
  }
});

api.onAnswer((data) => renderAnswer(data));

api.onClear(() => {
  hideAll();
  answerLines.innerHTML = '';
});

// ─── Mouse Interaction logic handled by Ctrl+Shift+M ───────────────────────────


// ─── Panic (` key) ─────────────────────────────────────────────────────────────
api.onPanic((state) => {
  if (state === 'hide') {
    isHidden = true;
    answerPanel.classList.remove('visible');
    savedToast.classList.remove('visible');
  } else if (state === 'show') {
    isHidden = false;
    if (answerLines.children.length > 0) {
      answerPanel.classList.add('visible');
    }
  }
});

// ─── Toggle Text (Ctrl+Shift+H) ────────────────────────────────────────────────
api.onToggleText(() => {
  if (answerPanel.classList.contains('visible')) {
    answerPanel.classList.remove('visible');
    isHidden = true;
  } else {
    isHidden = false;
    if (answerLines.children.length > 0) {
      answerPanel.classList.add('visible');
    }
  }
});
