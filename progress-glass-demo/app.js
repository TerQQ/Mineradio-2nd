const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const progressThumb = document.getElementById('progress-thumb');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const playToggle = document.getElementById('playToggle');
const controlGlassMap = document.getElementById('control-glass-map');
const controlGlassSvg = document.getElementById('control-glass-svg');
const bottomBar = document.getElementById('bottom-bar');

const durationSeconds = 222;
let currentSeconds = 0;
let playing = true;
let dragging = false;
let dragRafId = 0;
const controlGlassState = { key: '' };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function updateUI() {
  const percent = clamp((currentSeconds / durationSeconds) * 100, 0, 100);
  if (progressFill) progressFill.style.width = `${percent}%`;
  if (progressThumb) progressThumb.style.left = `${percent}%`;
  progressBar.setAttribute('aria-valuenow', String(Math.round(percent)));
  currentTimeEl.textContent = formatTime(currentSeconds);
  durationEl.textContent = formatTime(durationSeconds);
}

function renderParticles(x, y, count = 6) {
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('div');
    particle.className = 'progress-drag-particle';
    const angle = (Math.PI * 2 * i) / count;
    const dx = Math.cos(angle) * (20 + Math.random() * 26);
    const dy = Math.sin(angle) * (18 + Math.random() * 22);
    particle.style.setProperty('--px', `${x}px`);
    particle.style.setProperty('--py', `${y}px`);
    particle.style.setProperty('--dx', `${dx}px`);
    particle.style.setProperty('--dy', `${dy}px`);
    particle.style.left = '0';
    particle.style.top = '0';
    particle.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    particle.style.width = `${3 + Math.random() * 2}px`;
    particle.style.height = particle.style.width;
    particle.style.opacity = `${0.5 + Math.random() * 0.45}`;
    document.body.appendChild(particle);
    window.setTimeout(() => particle.remove(), 620);
  }
}

function generateControlGlassDisplacementMap(width, height, radius) {
  width = Math.max(240, Math.round(width || 400));
  height = Math.max(48, Math.round(height || 92));
  radius = Math.max(12, Math.round(radius || 50));
  const borderWidth = 0.07;
  const edge = Math.min(width, height) * (borderWidth * 0.5);
  const innerW = Math.max(1, width - edge * 2);
  const innerH = Math.max(1, height - edge * 2);
  const svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="glass-red" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient><linearGradient id="glass-blue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient></defs><rect x="0" y="0" width="${width}" height="${height}" fill="black"/><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" fill="url(#glass-red)"/><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" fill="url(#glass-blue)" style="mix-blend-mode:difference"/><rect x="${edge.toFixed(2)}" y="${edge.toFixed(2)}" width="${innerW.toFixed(2)}" height="${innerH.toFixed(2)}" rx="${radius}" fill="hsl(0 0% 50% / 1)" style="filter:blur(11px)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function updateGlassDisplacementMapForElement() {
  if (!bottomBar || !controlGlassMap) return;
  const rect = bottomBar.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;
  const radius = parseFloat(getComputedStyle(bottomBar).borderRadius) || 24;
  const key = `${Math.round(rect.width)}x${Math.round(rect.height)}:${Math.round(radius)}`;
  if (key === controlGlassState.key) return;
  controlGlassState.key = key;
  const href = generateControlGlassDisplacementMap(rect.width, rect.height, radius);
  controlGlassMap.setAttribute('href', href);
  try { controlGlassMap.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href); } catch (e) {}
}

function seekFromClientX(clientX, emitParticles = false) {
  const rect = progressBar.getBoundingClientRect();
  const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
  currentSeconds = ratio * durationSeconds;
  updateUI();

  if (emitParticles) {
    const x = rect.left + rect.width * ratio;
    const y = rect.top + rect.height / 2;
    renderParticles(x, y, 5);
  }
}

function setDragging(nextDragging) {
  dragging = nextDragging;
  progressBar.classList.toggle('is-dragging', dragging);
}

function setPlayText() {
  playToggle.textContent = playing ? '暂停' : '播放';
  playToggle.setAttribute('aria-pressed', String(playing));
}

progressBar.addEventListener('pointerdown', (event) => {
  progressBar.setPointerCapture(event.pointerId);
  setDragging(true);
  seekFromClientX(event.clientX, true);
});

progressBar.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  if (dragRafId) cancelAnimationFrame(dragRafId);
  dragRafId = requestAnimationFrame(() => {
    seekFromClientX(event.clientX, true);
  });
});

progressBar.addEventListener('pointerup', (event) => {
  if (dragging) {
    seekFromClientX(event.clientX, true);
  }
  setDragging(false);
});

progressBar.addEventListener('pointercancel', () => setDragging(false));
progressBar.addEventListener('keydown', (event) => {
  const step = event.shiftKey ? 10 : 3;
  if (event.key === 'ArrowLeft') {
    currentSeconds = clamp(currentSeconds - step, 0, durationSeconds);
    updateUI();
  } else if (event.key === 'ArrowRight') {
    currentSeconds = clamp(currentSeconds + step, 0, durationSeconds);
    updateUI();
  } else if (event.key === 'Home') {
    currentSeconds = 0;
    updateUI();
  } else if (event.key === 'End') {
    currentSeconds = durationSeconds;
    updateUI();
  }
});

playToggle.addEventListener('click', () => {
  playing = !playing;
  setPlayText();
});

function tick() {
  if (playing && !dragging) {
    currentSeconds += 0.045;
    if (currentSeconds >= durationSeconds) currentSeconds = 0;
    updateUI();
  }
  requestAnimationFrame(tick);
}

function initControlGlassSurface() {
  updateGlassDisplacementMapForElement();
  if (window.ResizeObserver && bottomBar) {
    const ro = new ResizeObserver(() => requestAnimationFrame(updateGlassDisplacementMapForElement));
    ro.observe(bottomBar);
  }
}

window.addEventListener('resize', () => requestAnimationFrame(updateGlassDisplacementMapForElement));

if (controlGlassSvg) {
  document.documentElement.classList.add('control-glass-svg-ok');
}

updateUI();
setPlayText();
initControlGlassSurface();
tick();
