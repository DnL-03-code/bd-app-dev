(function () {
  const RECOGNIZE_API_URL = '/api/recognize-gesture';

  let overlay = null;
  let overlayText = null;
  let overlayClose = null;
  let canvas = null;
  let ctx = null;

  let confirmModal = null;
  let confirmTitle = null;
  let confirmMessage = null;
  let confirmYesBtn = null;
  let confirmNoBtn = null;

  let isDrawing = false;
  let isRecognizing = false;
  let points = [];
  let overlayHistoryOpen = false;

  let defaultText = 'Noo... machnij...';

  let onRecognize = null;
  let onFail = null;
  let onConfirmSpell = null;
  let onCancelSpell = null;

  let pendingSpell = null;

  function init(options) {
    overlay = options.overlay;
    overlayText = options.overlayText;
    overlayClose = options.overlayClose;
    canvas = options.canvas;

    defaultText = options.defaultText || defaultText;

    onRecognize = options.onRecognize || null;
    onFail = options.onFail || null;
    onConfirmSpell = options.onConfirmSpell || null;
    onCancelSpell = options.onCancelSpell || null;

    if (!overlay || !overlayText || !overlayClose || !canvas) {
      console.error('Czary.init: brakuje overlay, overlayText, overlayClose albo canvas.');

      return {
        open,
        close
      };
    }

    ctx = canvas.getContext('2d');

    createConfirmModal();
    resizeCanvas();
    bindEvents();

    console.log('Czary: tryb rozpoznawania przez backend zaladowany.');
    console.log('Czary: endpoint:', RECOGNIZE_API_URL);

    return {
      open,
      close,
      recognizeCurrentGesture
    };
  }

  function createConfirmModal() {
    const existing = document.getElementById('spellConfirmModal');

    if (existing) {
      existing.remove();
    }

    const existingStyle = document.getElementById('spellConfirmModalStyle');

    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'spellConfirmModalStyle';

    style.textContent = `
      .spell-confirm-modal {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at center, rgba(75, 36, 24, .38), rgba(0, 0, 0, .88) 62%),
          rgba(0, 0, 0, .86);
        opacity: 0;
        pointer-events: none;
        transition: opacity 260ms ease;
      }

      .spell-confirm-modal.visible {
        opacity: 1;
        pointer-events: auto;
      }

      .spell-confirm-box {
        width: min(92vw, 430px);
        border-radius: 24px;
        padding: 28px 24px 22px;
        background:
          radial-gradient(circle at top, rgba(255, 244, 215, .20), transparent 48%),
          linear-gradient(180deg, rgba(245, 232, 210, .96), rgba(218, 188, 145, .96));
        border: 1px solid rgba(85, 48, 26, .36);
        box-shadow:
          0 22px 60px rgba(0, 0, 0, .48),
          inset 0 1px 0 rgba(255, 255, 255, .45);
        color: #4a2c1a;
        font-family: Georgia, "Times New Roman", serif;
        text-align: center;
        transform: translateY(10px) scale(.96);
        transition: transform 260ms cubic-bezier(.22,.8,.18,1);
      }

      .spell-confirm-modal.visible .spell-confirm-box {
        transform: translateY(0) scale(1);
      }

      .spell-confirm-mark {
        width: 54px;
        height: 54px;
        margin: 0 auto 14px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: rgba(74, 44, 26, .12);
        border: 1px solid rgba(74, 44, 26, .25);
        font-size: 1.8rem;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .35);
      }

      .spell-confirm-title {
        margin: 0;
        font-size: clamp(1.35rem, 5vw, 2rem);
        line-height: 1.15;
        color: #3a2114;
      }

      .spell-confirm-message {
        margin: 12px 0 22px;
        font-size: 1rem;
        line-height: 1.45;
        color: #67412a;
      }

      .spell-confirm-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .spell-confirm-actions button {
        position: static;
        max-width: none;
        width: 100%;
        padding: .85rem 1rem;
        border-radius: 999px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: .98rem;
        letter-spacing: .03em;
        cursor: pointer;
        transition:
          transform 180ms ease,
          background 180ms ease,
          opacity 180ms ease;
      }

      .spell-confirm-actions button:hover {
        transform: translateY(-2px);
      }

      .spell-confirm-yes {
        border: 1px solid rgba(74, 44, 26, .55);
        background: rgba(74, 44, 26, .92);
        color: #f6ecdb;
        box-shadow: 0 8px 18px rgba(0, 0, 0, .22);
      }

      .spell-confirm-yes:hover {
        background: rgba(58, 33, 20, .96);
      }

      .spell-confirm-no {
        border: 1px solid rgba(74, 44, 26, .30);
        background: rgba(255, 248, 232, .58);
        color: #4a2c1a;
      }

      .spell-confirm-no:hover {
        background: rgba(255, 248, 232, .82);
      }

      @media (max-width: 420px) {
        .spell-confirm-box {
          padding: 24px 18px 18px;
        }

        .spell-confirm-actions {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);

    confirmModal = document.createElement('div');
    confirmModal.id = 'spellConfirmModal';
    confirmModal.className = 'spell-confirm-modal';

    confirmModal.innerHTML = `
      <div class="spell-confirm-box" role="dialog" aria-modal="true">
        <div class="spell-confirm-mark">✦</div>

        <h2 class="spell-confirm-title"></h2>

        <p class="spell-confirm-message"></p>

        <div class="spell-confirm-actions">
          <button class="spell-confirm-no" type="button">Anuluj</button>
          <button class="spell-confirm-yes" type="button">Uzyj zaklecia</button>
        </div>
      </div>
    `;

    document.body.appendChild(confirmModal);

    confirmTitle = confirmModal.querySelector('.spell-confirm-title');
    confirmMessage = confirmModal.querySelector('.spell-confirm-message');
    confirmYesBtn = confirmModal.querySelector('.spell-confirm-yes');
    confirmNoBtn = confirmModal.querySelector('.spell-confirm-no');

    confirmYesBtn.addEventListener('click', confirmSpell);
    confirmNoBtn.addEventListener('click', cancelSpell);

    confirmModal.addEventListener('click', function (event) {
      if (event.target === confirmModal) {
        cancelSpell();
      }
    });
  }

  function showConfirmModal(spellName, result) {
    pendingSpell = {
      name: spellName,
      result: result
    };

    confirmTitle.textContent = 'Udalo Ci sie uzyc zaklecia ' + spellName;
    confirmMessage.textContent = 'Czy chcesz na pewno go uzyc?';

    confirmModal.classList.add('visible');
  }

  function hideConfirmModal() {
    if (!confirmModal) return;

    confirmModal.classList.remove('visible');
  }

  function confirmSpell() {
    if (!pendingSpell) return;

    const spellName = pendingSpell.name;
    const result = pendingSpell.result;

    hideConfirmModal();

    overlayText.textContent = 'Uzyto zaklecia: ' + spellName;

    if (typeof onConfirmSpell === 'function') {
      onConfirmSpell(spellName, result.score, result);
    }

    pendingSpell = null;

    resetToDefaultText(1200);
  }

  function cancelSpell() {
    if (!pendingSpell) {
      hideConfirmModal();
      return;
    }

    const spellName = pendingSpell.name;
    const result = pendingSpell.result;

    hideConfirmModal();

    overlayText.textContent = defaultText;
    clearCanvas();

    points = [];
    pendingSpell = null;

    if (typeof onCancelSpell === 'function') {
      onCancelSpell(spellName, result.score, result);
    }
  }

  function bindEvents() {
    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', draw);
    canvas.addEventListener('pointerup', finishDrawing);
    canvas.addEventListener('pointercancel', finishDrawing);
    canvas.addEventListener('pointerleave', finishDrawing);

    overlayClose.addEventListener('click', function (event) {
      event.stopPropagation();

      hideConfirmModal();
      close();
    });

    window.addEventListener('resize', function () {
      resizeCanvas();
      clearCanvas();
    });

    window.addEventListener('popstate', function () {
      if (confirmModal && confirmModal.classList.contains('visible')) {
        cancelSpell();
        return;
      }

      if (overlay && overlay.classList.contains('visible')) {
        close({ fromBackButton: true });
      }
    });
  }

  function open() {
    if (!overlay) return;

    overlay.classList.add('visible');

    resizeCanvas();
    clearCanvas();

    isDrawing = false;
    isRecognizing = false;
    points = [];

    overlayText.textContent = defaultText;

    if (!overlayHistoryOpen) {
      history.pushState({ czaryOverlay: true }, '');
      overlayHistoryOpen = true;
    }
  }

  function close(options = {}) {
    if (!overlay) return;

    const fromBackButton = options.fromBackButton || false;

    hideConfirmModal();

    overlay.classList.remove('visible');
    clearCanvas();

    isDrawing = false;
    isRecognizing = false;
    points = [];
    pendingSpell = null;

    if (overlayHistoryOpen) {
      overlayHistoryOpen = false;

      if (!fromBackButton) {
        history.back();
      }
    }
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(246, 236, 219, .95)';
  }

  function clearCanvas() {
    if (!ctx) return;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function resetToDefaultText(delay = 1000) {
    setTimeout(function () {
      if (!overlay || !overlay.classList.contains('visible')) {
        return;
      }

      overlayText.textContent = defaultText;

      clearCanvas();

      points = [];
      isDrawing = false;
      isRecognizing = false;
    }, delay);
  }

  function getPointerPosition(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function startDrawing(event) {
    if (!overlay || !overlay.classList.contains('visible')) return;
    if (isRecognizing) return;
    if (confirmModal && confirmModal.classList.contains('visible')) return;

    event.preventDefault();

    isDrawing = true;
    points = [];

    clearCanvas();

    if (canvas.setPointerCapture && event.pointerId !== undefined) {
      canvas.setPointerCapture(event.pointerId);
    }

    const point = getPointerPosition(event);
    points.push(point);

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(event) {
    if (!isDrawing) return;

    event.preventDefault();

    const point = getPointerPosition(event);
    points.push(point);

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  async function finishDrawing(event) {
    if (!isDrawing) return;

    isDrawing = false;

    if (canvas.releasePointerCapture && event && event.pointerId !== undefined) {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch (error) {}
    }

    if (points.length < 18) {
      overlayText.textContent = 'Nie znaleziono zaklecia';
      resetToDefaultText(1000);
      return;
    }

    isRecognizing = true;
    overlayText.textContent = 'Sprawdzam zaklecie...';

    try {
      const result = await recognizeGestureOnServer(points);

      isRecognizing = false;

      if (result && result.recognized) {
        const spellName = result.name;

        overlayText.textContent = 'Udalo Ci sie uzyc zaklecia: ' + spellName;

        if (typeof onRecognize === 'function') {
          onRecognize(spellName, result.score, result);
        }

        clearCanvas();

        setTimeout(function () {
          showConfirmModal(spellName, result);
        }, 250);

        return;
      }

      overlayText.textContent = 'Nie znaleziono zaklecia';

      if (typeof onFail === 'function') {
        onFail(result ? result.score : 0, result);
      }

      resetToDefaultText(1000);
    } catch (error) {
      console.error('Czary: blad sprawdzania zaklecia:', error);

      isRecognizing = false;

      overlayText.textContent = 'Blad sprawdzania zaklecia';

      resetToDefaultText(1200);
    }
  }

  async function recognizeGestureOnServer(rawPoints) {
    const response = await fetch(RECOGNIZE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        points: rawPoints
      })
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    return await response.json();
  }

  function recognizeCurrentGesture() {
    return recognizeGestureOnServer(points);
  }

  window.Czary = {
    init
  };
})();