// ============================================================
//  LOTO IMPERIAL — Animación de Reservación Confirmada
//  Fuegos artificiales dorados + overlay imperial
// ============================================================

// ── Fuegos artificiales en canvas ───────────────────────────
const COLORS = [
  '#FFD44E', '#c8972a', '#FFE8A3', '#FF9A3C',
  '#FFFFFF', '#FFD700', '#FFA500', '#FF6B35'
];

class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.decay = 0.012 + Math.random() * 0.015;
    this.radius = 2 + Math.random() * 2.5;
    this.gravity = 0.08;
    this.tail = [];
  }
  update() {
    this.tail.push({ x: this.x, y: this.y, alpha: this.alpha });
    if (this.tail.length > 6) this.tail.shift();
    this.vx *= 0.97;
    this.vy = this.vy * 0.97 + this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }
  draw(ctx) {
    // Estela
    this.tail.forEach((t, i) => {
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * (i / this.tail.length) * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = t.alpha * (i / this.tail.length) * 0.4;
      ctx.fill();
    });
    // Partícula principal
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

class Firework {
  constructor(canvasW, canvasH) {
    this.x = canvasW * (0.2 + Math.random() * 0.6);
    this.y = canvasH * (0.1 + Math.random() * 0.5);
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.particles = [];
    const count = 60 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(this.x, this.y, this.color));
    }
  }
  update() { this.particles.forEach(p => p.update()); }
  draw(ctx) { this.particles.forEach(p => p.draw(ctx)); }
  isDead() { return this.particles.every(p => p.alpha <= 0); }
}

// ── Motor de animación ───────────────────────────────────────
let fireworksRaf = null;
let fireworks = [];

function startFireworks(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  // Disparar ráfagas en momentos distintos
  const intervals = [];
  const shoot = () => fireworks.push(new Firework(canvas.width, canvas.height));

  // Ráfaga inicial intensa
  for (let i = 0; i < 4; i++) {
    intervals.push(setTimeout(shoot, i * 180));
  }
  // Fuegos continuos
  intervals.push(setInterval(() => {
    if (Math.random() < 0.7) shoot();
  }, 400));

  // Guardar referencia para limpiar
  canvas._intervals = intervals;

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fireworks = fireworks.filter(f => !f.isDead());
    fireworks.forEach(f => { f.update(); f.draw(ctx); });
    fireworksRaf = requestAnimationFrame(loop);
  }
  loop();
}

function stopFireworks(canvas) {
  if (fireworksRaf) { cancelAnimationFrame(fireworksRaf); fireworksRaf = null; }
  if (canvas && canvas._intervals) {
    canvas._intervals.forEach(id => { clearTimeout(id); clearInterval(id); });
    canvas._intervals = [];
  }
  fireworks = [];
}

// ── Función principal exportada ──────────────────────────────
export function showReservationSuccess(code, { date, time, guests }) {
  const overlay  = document.getElementById('reservationSuccess');
  const canvas   = document.getElementById('fireworksCanvas');
  const codeEl   = document.getElementById('resSuccessCode');
  const detailEl = document.getElementById('resSuccessDetails');
  const closeBtn = document.getElementById('resSuccessClose');

  if (!overlay) return;

  // Rellenar datos
  codeEl.textContent = code;

  // Chips de detalle
  const fmt = d => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };
  detailEl.innerHTML = `
    <div class="res-detail-chip">
      <i class="fa-solid fa-calendar-day"></i>
      <span>${fmt(date)}</span>
    </div>
    <div class="res-detail-chip">
      <i class="fa-solid fa-clock"></i>
      <span>${time}</span>
    </div>
    <div class="res-detail-chip">
      <i class="fa-solid fa-user-group"></i>
      <span>${guests} ${parseInt(guests) === 1 ? 'persona' : 'personas'}</span>
    </div>
  `;

  // Mostrar overlay
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Iniciar fuegos
  startFireworks(canvas);

  // Auto-cerrar fuegos a los 6s (siguen hasta cerrar)
  const autoStop = setTimeout(() => stopFireworks(canvas), 7000);

  // Cerrar al hacer clic
  const closeHandler = () => {
    clearTimeout(autoStop);
    stopFireworks(canvas);
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    closeBtn.removeEventListener('click', closeHandler);
    overlay.removeEventListener('click', backdropHandler);
  };

  const backdropHandler = (e) => {
    if (e.target === overlay) closeHandler();
  };

  closeBtn.addEventListener('click', closeHandler);
  overlay.addEventListener('click', backdropHandler);
}
