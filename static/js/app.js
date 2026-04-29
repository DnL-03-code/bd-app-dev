if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js")
    .then(() => console.log("Service Worker zarejestrowany"));
}

const stage = document.getElementById('stage');
const openBtn = document.getElementById('openBtn');
const closeBtn = document.getElementById('closeBtn');

const daysEl = document.getElementById('days');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');

const helloIcon = document.getElementById('helloIcon');

const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlayText');
const overlayClose = document.getElementById('overlayClose');
const gestureCanvas = document.getElementById('gestureCanvas');

const animationDuration = 1800;
const targetDate = new Date('2026-05-14T00:00:00');

let timerInterval = null;

const czary = Czary.init({
  overlay: overlay,
  overlayText: overlayText,
  overlayClose: overlayClose,
  canvas: gestureCanvas,
  defaultText: 'Noo... machnij...',

  onRecognize: function (gestureName, score, result) {
    console.log('Rozpoznano gest:', gestureName, 'score:', score, result);
  },

  onFail: function (score, result) {
    console.log('Nie rozpoznano gestu. Score:', score, result);
  }
});

function showButton(btn) {
  btn.classList.remove('btn-hidden');
  btn.classList.add('btn-visible');
}

function hideButton(btn) {
  btn.classList.remove('btn-visible');
  btn.classList.add('btn-hidden');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function updateTimer() {
  const now = new Date();
  const diff = targetDate - now;

  if (diff <= 0) {
    daysEl.textContent = '00';
    hoursEl.textContent = '00';
    minutesEl.textContent = '00';
    secondsEl.textContent = '00';

    clearInterval(timerInterval);
    timerInterval = null;

    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  daysEl.textContent = pad(days);
  hoursEl.textContent = pad(hours);
  minutesEl.textContent = pad(minutes);
  secondsEl.textContent = pad(seconds);
}

function startTimer() {
  updateTimer();

  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

openBtn.addEventListener('click', () => {
  hideButton(openBtn);
  stage.classList.add('open');

  setTimeout(() => {
    showButton(closeBtn);
    startTimer();
  }, animationDuration);
});

closeBtn.addEventListener('click', () => {
  hideButton(closeBtn);
  stage.classList.remove('open');
  stopTimer();

  czary.close();

  setTimeout(() => {
    showButton(openBtn);
  }, animationDuration - 200);
});

helloIcon.addEventListener('click', () => {
  czary.open();
});

updateTimer();