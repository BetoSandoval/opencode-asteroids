'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
class EstrellaFugaz {
  constructor() {
    // Aparece en posición aleatoria, lejos de la nave
    const SAFE_DIST = 150;
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
    this.x = x;
    this.y = y;
    this.radius = 18;
    this.isStar = true;
    this.points = 500;
    this.ttl = 8;   // desaparece a los 8s
    this.dead = false;

    // Trayectoria rápida y recta, mucho más veloz que un asteroide normal
    const angle = rand(0, Math.PI * 2);
    const speed = rand(230, 280);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rot = rand(0, Math.PI * 2);
  }

  // No se fragmenta al ser destruida
  split() { return []; }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += 4 * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Se desvanece (en vez de parpadear) al final de su vida: sigue siendo letal
    const alpha = this.ttl < 3 ? Math.max(this.ttl / 3, 0.2) : 1;

    // Estela en dirección contraria al movimiento
    ctx.strokeStyle = `rgba(168, 216, 255, ${(alpha * 0.45).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x - this.vx * 0.14, this.y - this.vy * 0.14);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#a8d8ff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.shadowColor = '#a8d8ff';
    ctx.shadowBlur  = 10;
    // Estrella de 4 puntas
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? this.radius : this.radius * 0.38;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else         ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Skins de la nave ──────────────────────────────────────────────────────────
// Cada skin define su propia silueta (verts, orientada a +x), colores y punto
// de origen del disparo (nose). Opcionales: glow (brillo), fill (relleno tenue)
// y flameX (ancla de la llama del propulsor).
const SKINS = [
  {
    id: 'clasica', nombre: 'CLÁSICA',
    stroke: '#fff', flame: 'rgba(255, 130, 0, 0.85)',
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    nose: 21,
  },
  {
    id: 'caza', nombre: 'CAZA',
    stroke: '#ff5a5a', flame: 'rgba(255, 90, 40, 0.85)',
    verts: [[22, 0], [2, -4], [-6, -12], [-12, -5], [-7, 0], [-12, 5], [-6, 12], [2, 4]],
    nose: 23,
  },
  {
    id: 'espectro', nombre: 'ESPECTRO',
    stroke: '#7dffb0', flame: 'rgba(125, 255, 176, 0.85)',
    glow: '#7dffb0',
    verts: [[21, 0], [-14, -6], [-7, 0], [-14, 6]],
    nose: 22,
  },
  {
    id: 'pionera', nombre: 'PIONERA',
    stroke: '#ffc94d', flame: 'rgba(255, 201, 77, 0.85)',
    fill: 'rgba(255, 201, 77, 0.12)',
    verts: [[16, 0], [-4, -11], [-10, -8], [-12, 0], [-10, 8], [-4, 11]],
    nose: 17, flameX: -11,
  },
  {
    id: 'titan', nombre: 'TITÁN',
    stroke: '#b967ff', flame: 'rgba(185, 103, 255, 0.85)',
    glow: '#b967ff',
    scale: 2,
    multiplier: 2,
    verts: [[40, 0], [-24, -18], [-14, 0], [-24, 18]],
    nose: 42, flameX: -16,
  },
];

let skinIndex = 0;   // skin activa
let skinToast = 0;   // segundos restantes del aviso "NAVE: ..." en el HUD

function loadSkin() {
  try {
    const i = SKINS.findIndex(s => s.id === localStorage.getItem('asteroids.skin'));
    if (i >= 0) skinIndex = i;
  } catch { /* sin localStorage (p. ej. file:// restringido) */ }
}

function saveSkin() {
  try { localStorage.setItem('asteroids.skin', SKINS[skinIndex].id); } catch {}
}

function cycleSkin() {
  skinIndex = (skinIndex + 1) % SKINS.length;
  skinToast = 1.5;
  saveSkin();
  if (ship) {
    const scale = SKINS[skinIndex].scale ?? 1;
    ship.radius = 12 * scale;
    ship.shieldR = SHIELD_R * scale;
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
const SHIELD_R = 22;        // radio del anillo del escudo (la bala nace a 21: queda dentro)
const SHIELD_MAX_HITS = 3;  // impactos que aguanta el escudo

class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    const scale = SKINS[skinIndex].scale ?? 1;
    this.radius = 12 * scale;
    this.shieldR = SHIELD_R * scale;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.shieldHits    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    // Power-up "Velocidad": propulsión x2 mientras dura el efecto
    const thrust = this.speedBoost > 0 ? THRUST * 2 : THRUST;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * thrust * dt;
      this.vy += Math.sin(this.angle) * thrust * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = SKINS[skinIndex].nose;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    // Power-up "Triple disparo": 3 balas paralelas en línea recta
    if (this.tripleShot > 0) {
      const SPREAD = 7;
      const px = Math.cos(this.angle + Math.PI / 2) * SPREAD;
      const py = Math.sin(this.angle + Math.PI / 2) * SPREAD;
      return [
        new Bullet(ox,          oy,          this.angle),
        new Bullet(ox + px,     oy + py,     this.angle),
        new Bullet(ox - px,     oy - py,     this.angle),
      ];
    }

    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.stroke;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    if (skin.glow) {
      ctx.shadowColor = skin.glow;
      ctx.shadowBlur  = 9;
    }

    // Silueta de la skin activa
    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    if (skin.fill) { ctx.fillStyle = skin.fill; ctx.fill(); }
    ctx.stroke();

    // Llama del propulsor (anclada a la cola de la silueta)
    if (this.thrusting && Math.random() > 0.35) {
      const fx = skin.flameX ?? -8;
      ctx.beginPath();
      ctx.moveTo(fx, -4);
      ctx.lineTo(fx - rand(6, 14), 0);
      ctx.lineTo(fx,  4);
      ctx.strokeStyle = skin.flame;
      ctx.stroke();
    }

    // Anillo del escudo: pulso suave; parpadea cuando queda 1 impacto
    if (this.shieldHits > 0 && (this.shieldHits > 1 || Math.floor(time * 8) % 2 === 0)) {
      const pulse = 1 + Math.sin(time * 6) * 0.05;
      ctx.strokeStyle = '#7fd4ff';
      ctx.lineWidth   = 1.5;
      ctx.shadowColor = '#7fd4ff';
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.arc(0, 0, this.shieldR * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-ups (Velocidad / Triple disparo / Escudo) ───────────────────────────
const POWERUP_COLORS = { speed: '#ffd642', triple: '#4ec9ff', shield: '#7fd4ff' };

class PowerUp {
  constructor(x, y, type = 'speed') {
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = 14;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 35);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.ttl = 10;   // desaparece a los 10s
    this.rot = 0;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += 2 * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo de aviso antes de expirar
    if (this.ttl < 3 && Math.floor(this.ttl * 8) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = POWERUP_COLORS[this.type];

    if (this.type === 'shield') {
      // Hexágono cian con cúpula de escudo
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * this.radius;
        const py = Math.sin(a) * this.radius;
        if (i === 0) ctx.moveTo(px, py);
        else         ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 3, 6, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.stroke();
    } else {
      // Rombo con símbolo según el tipo
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(this.radius, 0);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius, 0);
      ctx.closePath();
      ctx.stroke();
      if (this.type === 'speed') {
        // Rayo (Velocidad)
        ctx.beginPath();
        ctx.moveTo(2, -6);
        ctx.lineTo(-3, 1);
        ctx.lineTo(1, 1);
        ctx.lineTo(-2, 6);
        ctx.stroke();
      } else {
        // Tres barras paralelas (Triple disparo)
        ctx.beginPath();
        for (const dx of [-5, 0, 5]) {
          ctx.moveTo(dx, -6);
          ctx.lineTo(dx, 6);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;   // cuenta atrás para la aparición de la estrella fugaz
let time = 0;    // reloj global para animaciones (pulso/parpadeo del escudo)

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  starTimer = rand(8, 15);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  time += dt;

  // Cambio de skin con C (disponible en cualquier estado)
  if (pressed('KeyC')) cycleSkin();
  if (skinToast > 0) skinToast -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    asteroids = asteroids.filter(a => !a.dead);
    powerUps.forEach(u => u.update(dt));
    powerUps  = powerUps.filter(u => !u.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(u => u.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(u => !u.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        const basePoints = a.points ?? POINTS[a.size];
        const mult = SKINS[skinIndex].multiplier ?? 1;
        score += basePoints * mult;
        explode(a.x, a.y, a.size ? a.size * 5 : 14);
        // Drop de power-up (12% de probabilidad, máx. 3 en pantalla): el tipo
        // se sortea a partes iguales entre Velocidad, Triple disparo y Escudo
        if (Math.random() < 0.12 && powerUps.length < 3)
          powerUps.push(new PowerUp(a.x, a.y, ['speed', 'triple', 'shield'][Math.floor(Math.random() * 3)]));
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (!ship.dead) {
    const splits = [];
    for (const a of asteroids) {
      // El escudo destruye el peligro al contacto (sin puntos) y gasta 1 impacto
      if (ship.shieldHits > 0 && dist(ship, a) < ship.shieldR + a.radius) {
        a.dead = true;
        ship.shieldHits--;
        explode(a.x, a.y, a.size ? a.size * 5 : 14);
        splits.push(...a.split());
        continue;
      }
      if (ship.invincible <= 0 && dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
    asteroids = asteroids.filter(a => !a.dead).concat(splits);
  }

  // Nave vs power-up
  if (!ship.dead) {
    for (const u of powerUps) {
      if (dist(ship, u) < ship.radius + u.radius) {
        u.dead = true;
        // Reinicia el efecto (no acumula); los tres efectos son independientes
        if (u.type === 'triple')      ship.tripleShot = 5;
        else if (u.type === 'shield') ship.shieldHits = SHIELD_MAX_HITS;
        else                          ship.speedBoost = 5;
        explode(u.x, u.y, 6);
      }
    }
  }

  // Estrella fugaz: aparición periódica (máx. 1 en pantalla)
  starTimer -= dt;
  if (starTimer <= 0) {
    if (!asteroids.some(a => a.isStar))
      asteroids.push(new EstrellaFugaz());
    starTimer = rand(10, 20);
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  // Miniatura de la silueta de la skin activa (escala 0.45)
  const skin = SKINS[skinIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0] * 0.45, skin.verts[0][1] * 0.45);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0] * 0.45, skin.verts[i][1] * 0.45);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  // Efectos activos: se apilan en una línea por efecto (pueden coexistir)
  const effects = [];
  if (ship.speedBoost > 0 && !ship.dead)
    effects.push([`VELOCIDAD ${ship.speedBoost.toFixed(1)}s`, POWERUP_COLORS.speed]);
  if (ship.tripleShot > 0 && !ship.dead)
    effects.push([`TRIPLE ${ship.tripleShot.toFixed(1)}s`, POWERUP_COLORS.triple]);
  if (ship.shieldHits > 0 && !ship.dead)
    effects.push([`ESCUDO x${ship.shieldHits}`, POWERUP_COLORS.shield]);
  effects.forEach(([label, color], i) => {
    ctx.fillStyle = color;
    ctx.fillText(label, 14, 48 + i * 22);
  });
  ctx.fillStyle = '#fff';

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  // Aviso temporal al cambiar de skin
  if (skinToast > 0) {
    ctx.fillStyle = SKINS[skinIndex].stroke;
    ctx.fillText(`NAVE: ${SKINS[skinIndex].nombre}`, W / 2, 48);
    ctx.fillStyle = '#fff';
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerUps.forEach(u => u.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

loadSkin();
initGame();
requestAnimationFrame(loop);
