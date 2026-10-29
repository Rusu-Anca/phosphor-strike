import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import '@fontsource/vt323';
import './style.css';
import { CRTShader } from './crtShader.js';
import { sfx } from './audio.js';
import { GEO, GREEN } from './shapes.js';

const FIELD_W = 60;
const FIELD_H = 80;
const HALF_W = FIELD_W / 2;
const HALF_H = FIELD_H / 2;
const FLASH = 0xeaffee;
const HI_KEY = 'phosphor-strike-hi';
const LINE_WIDTH = 2.2;
const lineResolution = new THREE.Vector2(1, 1);
const FIRST_WAVE = Math.max(1, Number(new URLSearchParams(location.search).get('wave')) || 1);

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (id) => document.getElementById(id);

// ---------- renderer & post-processing ----------
const container = $('game');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.OrthographicCamera(-HALF_W, HALF_W, HALF_H, -HALF_H, -10, 10);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 1.25, 0.55, 0.0));
composer.addPass(new OutputPass());
const crt = new ShaderPass(CRTShader);
composer.addPass(crt);

function resize() {
  const aspect = FIELD_W / FIELD_H;
  let h = window.innerHeight;
  let w = h * aspect;
  if (w > window.innerWidth) {
    w = window.innerWidth;
    h = w / aspect;
  }
  w = Math.floor(w);
  h = Math.floor(h);
  container.style.width = `${w}px`;
  container.style.height = `${h}px`;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  crt.uniforms.resolution.value.set(w, h);
  lineResolution.set(w, h);
}
window.addEventListener('resize', resize);
resize();

// ---------- starfield ----------
const STAR_COUNT = 200;
const STAR_SPEEDS = [5, 12, 26];
const starPos = new Float32Array(STAR_COUNT * 3);
const starCol = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
  const b = [0.12, 0.25, 0.55][i % 3];
  starPos.set([rand(-HALF_W, HALF_W), rand(-HALF_H, HALF_H), -1], i * 3);
  starCol.set([0.3 * b, b, 0.45 * b], i * 3);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true })));

function updateStars(dt, speedMul) {
  for (let i = 0; i < STAR_COUNT; i++) {
    const y = i * 3 + 1;
    starPos[y] -= STAR_SPEEDS[i % 3] * speedMul * dt;
    if (starPos[y] < -HALF_H) {
      starPos[y] += FIELD_H;
      starPos[y - 1] = rand(-HALF_W, HALF_W);
    }
  }
  starGeo.attributes.position.needsUpdate = true;
}

// ---------- particles ----------
const MAX_P = 1600;
const pPos = new Float32Array(MAX_P * 3).fill(9999);
const pCol = new Float32Array(MAX_P * 3);
const pVel = new Float32Array(MAX_P * 2);
const pLife = new Float32Array(MAX_P);
const pMax = new Float32Array(MAX_P);
let pNext = 0;
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
scene.add(
  new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true }),
  ),
);

function burst(x, y, count, speed, life = 0.8) {
  for (let n = 0; n < count; n++) {
    const i = pNext;
    pNext = (pNext + 1) % MAX_P;
    const a = Math.random() * Math.PI * 2;
    const s = speed * rand(0.2, 1);
    pVel[i * 2] = Math.cos(a) * s;
    pVel[i * 2 + 1] = Math.sin(a) * s;
    pLife[i] = pMax[i] = life * rand(0.5, 1);
    pPos[i * 3] = x;
    pPos[i * 3 + 1] = y;
    pPos[i * 3 + 2] = 0.5;
  }
}

function updateParticles(dt) {
  const drag = Math.pow(0.05, dt);
  for (let i = 0; i < MAX_P; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt;
    if (pLife[i] <= 0) {
      pPos[i * 3 + 1] = 9999;
      continue;
    }
    pVel[i * 2] *= drag;
    pVel[i * 2 + 1] *= drag;
    pPos[i * 3] += pVel[i * 2] * dt;
    pPos[i * 3 + 1] += pVel[i * 2 + 1] * dt;
    const t = pLife[i] / pMax[i];
    pCol[i * 3] = 0.35 * t;
    pCol[i * 3 + 1] = t;
    pCol[i * 3 + 2] = 0.5 * t;
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
}

// ---------- entities ----------
const world = new THREE.Group();
scene.add(world);

function makeMesh(geoKey) {
  const material = new LineMaterial({ color: GREEN, linewidth: LINE_WIDTH, transparent: true });
  material.uniforms.resolution.value = lineResolution;
  const mesh = new LineSegments2(GEO[geoKey], material);
  world.add(mesh);
  return mesh;
}

function disposeMesh(mesh) {
  world.remove(mesh);
  mesh.material.dispose();
}

function sweep(list) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].dead) {
      disposeMesh(list[i].mesh);
      list.splice(i, 1);
    }
  }
}

function clearList(list) {
  list.forEach((e) => disposeMesh(e.mesh));
  list.length = 0;
}

const enemies = [];
const playerBullets = [];
const enemyBullets = [];
const powerups = [];
const rings = [];

function ring(x, y, maxScale, life = 0.5) {
  const mesh = makeMesh('circle');
  mesh.position.set(x, y, 0);
  rings.push({ mesh, t: 0, life, maxScale });
}

function updateRings(dt) {
  for (const r of rings) {
    r.t += dt;
    const k = r.t / r.life;
    r.mesh.scale.setScalar(0.5 + k * r.maxScale);
    r.mesh.material.opacity = 1 - k;
    if (k >= 1) r.dead = true;
  }
  sweep(rings);
}

// ---------- player ----------
const player = {
  mesh: makeMesh('player'),
  flame: makeMesh('flame'),
  shieldMesh: makeMesh('circle'),
  x: 0,
  y: -HALF_H + 9,
  r: 1.5,
  cooldown: 0,
  invuln: 0,
  power: 1,
  shield: 0,
  alive: false,
};
player.shieldMesh.scale.setScalar(3.4);

function setPlayerVisible(v) {
  player.mesh.visible = v;
  player.flame.visible = v;
  player.shieldMesh.visible = v && player.shield > 0;
}
setPlayerVisible(false);

// ---------- game state ----------
const state = {
  mode: 'title',
  score: 0,
  hi: Number(localStorage.getItem(HI_KEY)) || 0,
  lives: 3,
  wave: 0,
  queue: [],
  waveTime: 0,
  waveClear: 0,
  shake: 0,
  boss: null,
  gameOverAt: 0,
};

const keys = {};
const touch = { active: false, x: 0, y: 0 };

function difficulty() {
  return 1 + (state.wave - 1) * 0.07;
}

// ---------- waves ----------
function startWave(n) {
  state.wave = n;
  state.waveTime = 0;
  state.queue = [];
  if (n % 5 === 0) {
    state.queue.push({ t: 2.5, type: 'boss' });
    showBanner('WARNING: MOTHERSHIP');
  } else {
    const count = 6 + n * 2;
    const gap = Math.max(0.35, 1.0 - n * 0.06);
    let t = 1.8;
    for (let i = 0; i < count; i++) {
      t += gap * rand(0.5, 1.4);
      const roll = Math.random();
      let type = 'drone';
      if (n >= 2 && roll < 0.25) type = 'fighter';
      else if (n >= 3 && roll < 0.45) type = 'kamikaze';
      else if (roll > 0.85) type = 'squad';
      state.queue.push({ t, type });
    }
    showBanner(`WAVE ${n}`);
  }
  sfx.wave();
}

function updateWave(dt) {
  state.waveTime += dt;
  while (state.queue.length && state.queue[0].t <= state.waveTime) spawnEnemy(state.queue.shift().type);
  if (!state.queue.length && !enemies.length) {
    state.waveClear += dt;
    if (state.waveClear > 1.5) {
      state.waveClear = 0;
      startWave(state.wave + 1);
    }
  }
}

function spawnEnemy(type, opts = {}) {
  const m = difficulty();
  const x = opts.x ?? rand(-HALF_W + 4, HALF_W - 4);
  let e;
  switch (type) {
    case 'squad': {
      const cx = rand(-HALF_W + 12, HALF_W - 12);
      const freq = rand(1.5, 2.5);
      for (let i = -2; i <= 2; i++) spawnEnemy('drone', { x: cx + i * 4, y: HALF_H + 3 + Math.abs(i) * 3, freq, amp: 4 });
      return;
    }
    case 'drone':
      e = { x, y: opts.y ?? HALF_H + 3, baseX: x, amp: opts.amp ?? rand(3, 10), freq: opts.freq ?? rand(1.5, 3), vy: -rand(9, 14) * m, hp: 1, r: 1.8, score: 100 };
      break;
    case 'fighter':
      e = { x, y: HALF_H + 3, targetY: rand(6, HALF_H - 10), vx: rand(8, 14) * m * (Math.random() < 0.5 ? -1 : 1), hp: 3, r: 2.4, score: 250, fireTimer: rand(0.8, 2), life: 0 };
      break;
    case 'kamikaze':
      e = { x, y: HALF_H + 3, vx: 0, vy: -7, hp: 2, r: 1.6, score: 150, lockT: rand(0.7, 1.2), locked: false };
      break;
    case 'boss': {
      const hp = 80 + state.wave * 12;
      e = { x: 0, y: HALF_H + 10, hp, maxHp: hp, r: 8, score: 5000, fireTimer: 1.5, pattern: 0 };
      state.boss = e;
      break;
    }
  }
  e.type = type;
  e.t = 0;
  e.flash = 0;
  e.mesh = makeMesh(type);
  e.mesh.position.set(e.x, e.y, 0);
  enemies.push(e);
}

function fireEnemyBullet(x, y, angle, speed) {
  const mesh = makeMesh('enemyBullet');
  mesh.position.set(x, y, 0);
  enemyBullets.push({ mesh, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 0.6 });
}

function aimAt(e) {
  return Math.atan2(player.y - e.y, player.x - e.x);
}

function updateEnemies(dt) {
  const m = difficulty();
  for (const e of enemies) {
    e.t += dt;
    switch (e.type) {
      case 'drone':
        e.y += e.vy * dt;
        e.x = e.baseX + Math.sin(e.t * e.freq) * e.amp;
        e.mesh.rotation.z += dt * 2;
        break;
      case 'fighter':
        e.life += dt;
        if (e.life > 10) e.y -= 20 * dt;
        else if (e.y > e.targetY) e.y -= 18 * dt;
        e.x += e.vx * dt;
        if (Math.abs(e.x) > HALF_W - 3) {
          e.vx = -e.vx;
          e.x = clamp(e.x, -HALF_W + 3, HALF_W - 3);
        }
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && e.y < HALF_H - 2 && player.alive) {
          fireEnemyBullet(e.x, e.y - 2, aimAt(e), 22 * m);
          sfx.enemyShoot();
          e.fireTimer = rand(1.0, 2.2) / m;
        }
        break;
      case 'kamikaze':
        if (e.t >= e.lockT && !e.locked) {
          const a = player.alive ? aimAt(e) : -Math.PI / 2;
          const speed = 30 * m;
          e.vx = Math.cos(a) * speed;
          e.vy = Math.sin(a) * speed;
          e.locked = true;
          sfx.dive();
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.mesh.rotation.z = Math.atan2(e.vy, e.vx) + Math.PI / 2;
        break;
      case 'boss':
        if (e.y > 24) {
          e.y -= 8 * dt;
          e.t = 0;
        } else {
          e.x = Math.sin(e.t * 0.6) * (HALF_W - 12);
          e.fireTimer -= dt;
          if (e.fireTimer <= 0) {
            bossAttack(e, m);
            e.fireTimer = 1.2 / m;
          }
        }
        break;
    }

    if (e.flash > 0) e.flash -= dt;
    e.mesh.material.color.setHex(e.flash > 0 ? FLASH : GREEN);
    e.mesh.position.set(e.x, e.y, 0);
    if (e.y < -HALF_H - 8 || Math.abs(e.x) > HALF_W + 12) e.dead = true;
  }
}

function bossAttack(e, m) {
  e.pattern = (e.pattern + 1) % 3;
  if (e.pattern === 0) {
    const n = 14;
    const off = Math.random() * Math.PI;
    for (let i = 0; i < n; i++) fireEnemyBullet(e.x, e.y, off + (i / n) * Math.PI * 2, 14 * m);
  } else if (e.pattern === 1) {
    const a = aimAt(e);
    for (let i = -2; i <= 2; i++) fireEnemyBullet(e.x, e.y - 5, a + i * 0.18, 20 * m);
  } else {
    for (const side of [-7, 7]) fireEnemyBullet(e.x + side, e.y - 1, -Math.PI / 2, 24 * m);
    spawnEnemy('kamikaze', { x: e.x });
  }
  sfx.enemyShoot();
}

// ---------- player logic ----------
function firePlayer() {
  const spreads = [[0], [-0.7, 0.7], [-1, 0, 1]][player.power - 1];
  for (const s of spreads) {
    const mesh = makeMesh('bullet');
    const angle = player.power === 3 ? s * 0.12 : 0;
    const x = player.x + (player.power === 3 ? 0 : s);
    mesh.position.set(x, player.y + 2.5, 0);
    mesh.rotation.z = -angle;
    playerBullets.push({ mesh, x, y: player.y + 2.5, vx: Math.sin(angle) * 70, vy: Math.cos(angle) * 70, r: 0.6 });
  }
  sfx.shoot();
}

function updatePlayer(dt) {
  if (!player.alive) return;
  const speed = 36;
  let dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  let dy = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0);
  if (touch.active) {
    const tx = touch.x - player.x;
    const ty = touch.y - player.y;
    const dist = Math.hypot(tx, ty);
    if (dist > 0.3) {
      const k = Math.min(1, dist / 3);
      dx = (tx / dist) * k;
      dy = (ty / dist) * k;
    } else {
      dx = dy = 0;
    }
  } else if (dx && dy) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }
  player.x = clamp(player.x + dx * speed * dt, -HALF_W + 2.5, HALF_W - 2.5);
  player.y = clamp(player.y + dy * speed * dt, -HALF_H + 3.5, HALF_H - 10);

  player.cooldown -= dt;
  if ((keys.Space || touch.active) && player.cooldown <= 0) {
    firePlayer();
    player.cooldown = 0.14;
  }

  player.invuln = Math.max(0, player.invuln - dt);
  player.shield = Math.max(0, player.shield - dt);

  const blink = player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0;
  player.mesh.visible = !blink;
  player.flame.visible = !blink;
  player.mesh.rotation.y = -dx * 0.5;
  player.mesh.position.set(player.x, player.y, 0);
  player.flame.position.set(player.x, player.y, 0);
  player.flame.scale.y = rand(0.6, 1.3) + (dy > 0 ? 0.5 : 0);

  const sm = player.shieldMesh;
  sm.visible = player.shield > 0 && !(player.shield < 2 && Math.floor(player.shield * 8) % 2 === 0);
  sm.position.set(player.x, player.y, 0);
  sm.rotation.z += dt * 3;
}

function hitPlayer() {
  if (player.invuln > 0 || !player.alive) return;
  if (player.shield > 0) {
    player.shield = 0;
    player.invuln = 0.6;
    ring(player.x, player.y, 6, 0.4);
    sfx.shieldHit();
    return;
  }
  state.lives -= 1;
  player.power = Math.max(1, player.power - 1);
  burst(player.x, player.y, 70, 35, 1.2);
  ring(player.x, player.y, 10, 0.6);
  state.shake = 1.4;
  sfx.playerHit();
  if (state.lives <= 0) {
    gameOver();
  } else {
    player.invuln = 2.5;
  }
}

// ---------- power-ups ----------
const POWERUPS = { weapon: 'powerWeapon', shield: 'powerShield', life: 'powerLife' };

function dropPowerup(x, y, kind) {
  if (!kind) {
    const r = Math.random();
    kind = r < 0.5 ? 'weapon' : r < 0.85 ? 'shield' : 'life';
  }
  powerups.push({ kind, mesh: makeMesh(POWERUPS[kind]), x, y, r: 2 });
}

function updatePowerups(dt) {
  for (const p of powerups) {
    p.y -= 8 * dt;
    p.mesh.position.set(p.x, p.y, 0);
    p.mesh.rotation.z = Math.sin(performance.now() / 300) * 0.4;
    p.mesh.material.opacity = 0.6 + 0.4 * Math.sin(performance.now() / 120);
    if (p.y < -HALF_H - 3) p.dead = true;
    if (player.alive && dist2(p, player) < (p.r + player.r) ** 2) {
      p.dead = true;
      applyPowerup(p.kind);
    }
  }
  sweep(powerups);
}

function applyPowerup(kind) {
  if (kind === 'weapon') {
    if (player.power < 3) player.power += 1;
    else addScore(500);
  } else if (kind === 'shield') {
    player.shield = 10;
  } else if (kind === 'life') {
    if (state.lives < 5) state.lives += 1;
    else addScore(1000);
  }
  ring(player.x, player.y, 5, 0.35);
  sfx.powerup();
}

// ---------- bullets & collisions ----------
function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function updateBullets(dt) {
  for (const b of playerBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.mesh.position.set(b.x, b.y, 0);
    if (b.y > HALF_H + 2) b.dead = true;
  }
  for (const b of enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.mesh.position.set(b.x, b.y, 0);
    b.mesh.rotation.z += dt * 8;
    if (b.y < -HALF_H - 2 || b.y > HALF_H + 2 || Math.abs(b.x) > HALF_W + 2) b.dead = true;
  }
}

function collide() {
  for (const b of playerBullets) {
    if (b.dead) continue;
    for (const e of enemies) {
      if (e.dead || e.y > HALF_H + 1) continue;
      if (dist2(b, e) < (b.r + e.r) ** 2) {
        b.dead = true;
        e.hp -= 1;
        e.flash = 0.06;
        burst(b.x, b.y, 4, 15, 0.3);
        if (e.hp <= 0) killEnemy(e);
        else sfx.hit();
        break;
      }
    }
  }

  if (!player.alive) return;
  for (const b of enemyBullets) {
    if (!b.dead && dist2(b, player) < (b.r + player.r) ** 2) {
      b.dead = true;
      hitPlayer();
    }
  }
  for (const e of enemies) {
    if (!e.dead && dist2(e, player) < (e.r + player.r) ** 2) {
      if (e.type !== 'boss') killEnemy(e);
      hitPlayer();
    }
  }
}

function killEnemy(e) {
  e.dead = true;
  addScore(e.score);
  if (e.type === 'boss') {
    state.boss = null;
    for (let i = 0; i < 6; i++) {
      const x = e.x + rand(-7, 7);
      const y = e.y + rand(-4, 4);
      burst(x, y, 40, 40, 1.4);
      ring(x, y, rand(6, 14), rand(0.5, 0.9));
    }
    state.shake = 2;
    sfx.explode(true);
    dropPowerup(e.x - 4, e.y, 'weapon');
    dropPowerup(e.x + 4, e.y, Math.random() < 0.5 ? 'life' : 'shield');
    clearList(enemyBullets);
  } else {
    burst(e.x, e.y, 26, 26, 0.8);
    ring(e.x, e.y, 4, 0.35);
    state.shake = Math.max(state.shake, 0.3);
    sfx.explode(false);
    if (Math.random() < 0.08) dropPowerup(e.x, e.y);
  }
}

function addScore(n) {
  state.score += n;
}

// ---------- HUD ----------
const hud = {
  score: $('score'),
  hi: $('hi'),
  wave: $('wave'),
  lives: $('lives'),
  weapon: $('weapon'),
  bossbar: $('bossbar'),
  bossfill: $('bossfill'),
};
const hudCache = {};

function setText(key, value) {
  if (hudCache[key] !== value) {
    hudCache[key] = value;
    hud[key].textContent = value;
  }
}

function updateHud() {
  $('hud').classList.toggle('title', state.mode === 'title');
  setText('score', String(state.score).padStart(6, '0'));
  setText('hi', String(Math.max(state.hi, state.score)).padStart(6, '0'));
  setText('wave', String(state.wave));
  setText('lives', '\u25B2 '.repeat(Math.max(0, state.lives)).trim());
  setText('weapon', `GUN ${'|'.repeat(player.power)}${player.shield > 0 ? ' SHLD' : ''}`);
  const boss = state.boss;
  hud.bossbar.classList.toggle('hidden', !boss || state.mode !== 'playing');
  if (boss) hud.bossfill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
}

const banner = $('banner');
function showBanner(text) {
  banner.textContent = text;
  banner.classList.remove('show');
  void banner.offsetWidth;
  banner.classList.add('show');
}

function showOverlay(id) {
  for (const o of ['title', 'paused', 'gameover']) $(o).classList.toggle('hidden', o !== id);
}

// ---------- flow ----------
function startGame() {
  sfx.unlock();
  [enemies, playerBullets, enemyBullets, powerups].forEach(clearList);
  Object.assign(state, { mode: 'playing', score: 0, lives: 3, boss: null, waveClear: 0, shake: 0 });
  Object.assign(player, { x: 0, y: -HALF_H + 9, power: 1, shield: 0, invuln: 2, cooldown: 0.3, alive: true });
  setPlayerVisible(true);
  showOverlay(null);
  startWave(FIRST_WAVE);
}

function gameOver() {
  player.alive = false;
  setPlayerVisible(false);
  state.mode = 'gameover';
  state.gameOverAt = performance.now();
  const newHi = state.score > state.hi;
  if (newHi) {
    state.hi = state.score;
    localStorage.setItem(HI_KEY, String(state.hi));
  }
  $('final').textContent = String(state.score);
  $('newhi').classList.toggle('hidden', !newHi);
  sfx.gameOver();
  setTimeout(() => state.mode === 'gameover' && showOverlay('gameover'), 1200);
}

function togglePause() {
  if (state.mode === 'playing') {
    state.mode = 'paused';
    showOverlay('paused');
  } else if (state.mode === 'paused') {
    state.mode = 'playing';
    showOverlay(null);
  }
}

function quitGame() {
  if (state.mode !== 'paused') return;
  if (state.score > state.hi) {
    state.hi = state.score;
    localStorage.setItem(HI_KEY, String(state.hi));
  }
  [enemies, playerBullets, enemyBullets, powerups].forEach(clearList);
  Object.assign(state, { mode: 'title', boss: null, shake: 0 });
  player.alive = false;
  setPlayerVisible(false);
  banner.classList.remove('show');
  showOverlay('title');
}

function canStart() {
  return state.mode === 'title' || (state.mode === 'gameover' && performance.now() - state.gameOverAt > 1200);
}

// ---------- input ----------
const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
window.addEventListener('keydown', (e) => {
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if ((e.code === 'Enter' || e.code === 'Space') && canStart()) startGame();
  else if (e.code === 'KeyP') togglePause();
  else if (e.code === 'Escape') quitGame();
  else if (e.code === 'KeyM') sfx.toggleMute();
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});
window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  touch.active = false;
  if (state.mode === 'playing') togglePause();
});

function pointerToWorld(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  touch.x = ((e.clientX - rect.left) / rect.width - 0.5) * FIELD_W;
  touch.y = (0.5 - (e.clientY - rect.top) / rect.height) * FIELD_H + 6;
}
container.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') {
    if (canStart()) startGame();
    return;
  }
  if (canStart()) startGame();
  else if (state.mode === 'paused') togglePause();
  touch.active = true;
  pointerToWorld(e);
});
container.addEventListener('pointermove', (e) => touch.active && pointerToWorld(e));
for (const ev of ['pointerup', 'pointercancel']) container.addEventListener(ev, () => (touch.active = false));

// ---------- loop ----------
function update(dt) {
  if (state.mode === 'paused') return;
  updateStars(dt, state.mode === 'playing' ? 1 : 0.5);
  updateParticles(dt);
  updateRings(dt);

  if (state.mode === 'playing' || state.mode === 'gameover') {
    if (state.mode === 'playing') updateWave(dt);
    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    collide();
    updatePowerups(dt);
    sweep(enemies);
    sweep(playerBullets);
    sweep(enemyBullets);
  }

  state.shake = Math.max(0, state.shake - dt * 2.5);
  camera.position.x = (Math.random() - 0.5) * state.shake * 1.5;
  camera.position.y = (Math.random() - 0.5) * state.shake * 1.5;
  updateHud();
}

const timer = new THREE.Timer();
timer.connect(document);
function frame(time) {
  requestAnimationFrame(frame);
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 1 / 30);
  update(dt);
  crt.uniforms.time.value += dt;
  composer.render();
}
updateHud();
requestAnimationFrame(frame);
