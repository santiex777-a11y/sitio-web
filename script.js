const scenes = [...document.querySelectorAll('.scene')];
const progressNumber = document.querySelector('.progress-number');
const progressFill = document.querySelector('.progress-track i');
const announcer = document.querySelector('.announcer');
let current = 0;
let locked = false;

function twoDigits(value) { return String(value).padStart(2, '0'); }

function animateBudget(scene) {
  const counter = scene.querySelector('[data-count]');
  if (!counter || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (counter) counter.textContent = Number(counter.dataset.count).toLocaleString('en-US');
    return;
  }
  const target = Number(counter.dataset.count);
  const start = performance.now();
  const duration = 900;
  const tick = now => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 4);
    counter.textContent = Math.round(target * eased).toLocaleString('en-US');
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function showScene(index, direction = 1) {
  if (locked || index < 0 || index >= scenes.length || index === current) return;
  locked = true;
  current = index;
  scenes.forEach((scene, position) => {
    scene.classList.toggle('is-active', position === current);
    scene.classList.toggle('is-before', position < current);
    scene.classList.toggle('is-after', position > current);
    scene.setAttribute('aria-hidden', position === current ? 'false' : 'true');
  });
  progressNumber.textContent = twoDigits(current + 1);
  progressFill.style.transform = `scaleY(${(current + 1) / scenes.length})`;
  announcer.textContent = `Scene ${current + 1} of ${scenes.length}: ${scenes[current].dataset.label}`;
  if (current === 7) animateBudget(scenes[current]);
  history.replaceState(null, '', `#scene-${current + 1}`);
  setTimeout(() => { locked = false; }, 480);
}

function next() { if (current < scenes.length - 1) showScene(current + 1, 1); }
function previous() { if (current > 0) showScene(current - 1, -1); }

document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', next));
document.querySelector('[data-prev]').addEventListener('click', previous);
document.querySelector('[data-restart]').addEventListener('click', () => showScene(0, -1));
document.querySelector('[data-fullscreen]').addEventListener('click', async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  else await document.exitFullscreen();
});

document.querySelector('.plan-toggle').addEventListener('click', event => {
  const table = document.querySelector('#plan-table');
  const open = event.currentTarget.getAttribute('aria-expanded') === 'true';
  event.currentTarget.setAttribute('aria-expanded', String(!open));
  event.currentTarget.textContent = open ? 'View complete table' : 'Close complete table';
  table.hidden = open;
});

document.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') { event.preventDefault(); next(); }
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); previous(); }
  if (event.key === 'Home') showScene(0, -1);
  if (event.key === 'End') showScene(scenes.length - 1, 1);
  if (event.key === 'Escape') {
    const table = document.querySelector('#plan-table');
    if (!table.hidden) document.querySelector('.plan-toggle').click();
  }
});

let wheelTotal = 0;
let wheelTimer;
document.addEventListener('wheel', event => {
  wheelTotal += event.deltaY;
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => {
    if (Math.abs(wheelTotal) > 70) wheelTotal > 0 ? next() : previous();
    wheelTotal = 0;
  }, 90);
}, { passive: true });

let touchStartX = 0;
document.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
document.addEventListener('touchend', event => {
  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) > 55) delta < 0 ? next() : previous();
}, { passive: true });

const requested = Number(location.hash.replace('#scene-', ''));
if (requested >= 1 && requested <= scenes.length) {
  current = requested - 1;
  scenes.forEach((scene, index) => {
    scene.classList.toggle('is-active', index === current);
    scene.classList.toggle('is-before', index < current);
    scene.classList.toggle('is-after', index > current);
  });
  progressNumber.textContent = twoDigits(current + 1);
  progressFill.style.transform = `scaleY(${(current + 1) / scenes.length})`;
}

