const scenes = [...document.querySelectorAll('.scene')];
const progress = document.querySelector('.scene-progress');
const progressNumber = document.querySelector('.progress-number');
const progressFill = document.querySelector('.progress-track i');
const progressLabel = document.querySelector('[data-progress-label]');
const navCount = document.querySelector('[data-nav-count]');
const navLabel = document.querySelector('[data-nav-label]');
const previousButton = document.querySelector('.presentation-nav [data-prev]');
const nextButton = document.querySelector('.presentation-nav [data-next]');
const fullscreenButton = document.querySelector('[data-fullscreen]');
const announcer = document.querySelector('.announcer');
const planToggle = document.querySelector('.plan-toggle');
const planDialog = document.querySelector('#plan-table');
const planClose = document.querySelector('[data-plan-close]');
const numberFormat = new Intl.NumberFormat('en-US');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let current = 0;
let locked = false;
let budgetAnimation;

function twoDigits(value) {
  return String(value).padStart(2, '0');
}

function sceneFromHash() {
  const requested = Number(location.hash.replace('#scene-', ''));
  return requested >= 1 && requested <= scenes.length ? requested - 1 : 0;
}

function animateBudget(scene) {
  const counter = scene.querySelector('[data-count]');
  if (!counter) return;
  cancelAnimationFrame(budgetAnimation);
  const target = Number(counter.dataset.count);
  if (reducedMotion.matches) {
    counter.textContent = numberFormat.format(target);
    return;
  }
  const start = performance.now();
  const duration = 760;
  counter.textContent = '0';
  const tick = now => {
    const progressValue = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progressValue, 4);
    counter.textContent = numberFormat.format(Math.round(target * eased));
    if (progressValue < 1) budgetAnimation = requestAnimationFrame(tick);
  };
  budgetAnimation = requestAnimationFrame(tick);
}

function syncSceneState({ announce = false, updateHash = false } = {}) {
  scenes.forEach((scene, position) => {
    const active = position === current;
    scene.classList.toggle('is-active', active);
    scene.classList.toggle('is-before', position < current);
    scene.classList.toggle('is-after', position > current);
    scene.setAttribute('aria-hidden', active ? 'false' : 'true');
    scene.toggleAttribute('inert', !active);
  });

  const sceneNumber = current + 1;
  const label = scenes[current].dataset.label;
  const lightChrome = scenes[current].matches('.scene-route, .scene-plan, .scene-language');
  document.body.dataset.chromeTheme = lightChrome ? 'light' : 'dark';
  progressNumber.textContent = twoDigits(sceneNumber);
  progressFill.style.transform = `scaleY(${sceneNumber / scenes.length})`;
  progressLabel.textContent = label;
  progress.setAttribute('aria-valuenow', String(sceneNumber));
  progress.setAttribute('aria-valuetext', `Scene ${sceneNumber} of ${scenes.length}: ${label}`);
  navCount.textContent = `Scene ${twoDigits(sceneNumber)} of ${twoDigits(scenes.length)}`;
  navLabel.textContent = label;
  previousButton.disabled = current === 0;
  nextButton.disabled = current === scenes.length - 1;

  if (current === 7) animateBudget(scenes[current]);
  if (announce) announcer.textContent = `Scene ${sceneNumber} of ${scenes.length}: ${label}`;
  if (updateHash) history.replaceState(null, '', `#scene-${sceneNumber}`);
}

function showScene(index) {
  if (locked || index < 0 || index >= scenes.length || index === current) return;
  locked = true;
  current = index;
  syncSceneState({ announce: true, updateHash: true });
  window.setTimeout(() => { locked = false; }, 440);
}

function next() {
  showScene(current + 1);
}

function previous() {
  showScene(current - 1);
}

document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', next));
previousButton.addEventListener('click', previous);
document.querySelector('[data-restart]').addEventListener('click', () => showScene(0));

function syncFullscreenButton() {
  const active = Boolean(document.fullscreenElement);
  fullscreenButton.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
  fullscreenButton.querySelector('b').textContent = active ? 'Exit full screen' : 'Full screen';
}

fullscreenButton.addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    announcer.textContent = 'Full screen is not available in this browser.';
  }
});
document.addEventListener('fullscreenchange', syncFullscreenButton);

planToggle.addEventListener('click', () => {
  planToggle.setAttribute('aria-expanded', 'true');
  planDialog.showModal();
});
planClose.addEventListener('click', () => planDialog.close());
planDialog.addEventListener('click', event => {
  if (event.target === planDialog) planDialog.close();
});
planDialog.addEventListener('close', () => {
  planToggle.setAttribute('aria-expanded', 'false');
  planToggle.focus();
});

document.addEventListener('keydown', event => {
  if (planDialog.open) return;
  const interactive = event.target.closest('button, a, input, select, textarea, [contenteditable="true"]');
  if (interactive && event.key === ' ') return;
  if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
    event.preventDefault();
    next();
  }
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault();
    previous();
  }
  if (event.key === 'Home') showScene(0);
  if (event.key === 'End') showScene(scenes.length - 1);
});

let wheelTotal = 0;
let wheelTimer;
document.addEventListener('wheel', event => {
  if (planDialog.open) return;
  wheelTotal += event.deltaY;
  clearTimeout(wheelTimer);
  wheelTimer = window.setTimeout(() => {
    if (Math.abs(wheelTotal) > 70) wheelTotal > 0 ? next() : previous();
    wheelTotal = 0;
  }, 90);
}, { passive: true });

let touchStartX = 0;
document.addEventListener('touchstart', event => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });
document.addEventListener('touchend', event => {
  if (planDialog.open || event.target.closest('button, a')) return;
  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) > 55) delta < 0 ? next() : previous();
}, { passive: true });

window.addEventListener('hashchange', () => {
  const requested = sceneFromHash();
  if (requested !== current) showScene(requested);
});

current = sceneFromHash();
syncSceneState();
syncFullscreenButton();

