import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/800.css';
import './style.css';
import { createSocial } from './social.js';
import { blocked, bounds } from '../shared/world.js';
import { party, raceStart, checkpoints, near } from '../shared/activities.js';
import { createActivityUI } from './activities.js';

const host = document.querySelector('#world');
const loading = document.querySelector('#loading');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  loading.classList.add('hidden');
  document.querySelector('#error').classList.remove('hidden');
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c1dedb');
scene.fog = new THREE.Fog('#c1dedb', 60, 180);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 300);
scene.add(new THREE.HemisphereLight('#d7f2ff', '#bca07c', 2.1));
const sun = new THREE.DirectionalLight('#ffdfb0', 3);
sun.position.set(30, 45, -35);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 55, bottom: -55, near: 1, far: 140 });
sun.shadow.bias = -.0004;
scene.add(sun);

const mats = new Map();
function material(color, roughness = .85) {
  const key = color + roughness;
  if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness }));
  return mats.get(key);
}
function box(w, h, d, color, x = 0, y = 0, z = 0, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? material(color) : color);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(rt, rb, h, color, x, y, z, parent = scene, sides = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material(color));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function sphere(r, color, x, y, z, parent = scene, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), material(color));
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; parent.add(mesh); return mesh;
}
// All scenery is generated locally: no third-party models or model downloads.
box(220, .2, 250, '#e3c796', 25, -.15, -35);
const ocean = box(160, .12, 250, '#399fa4', 98, -.06, -35);
ocean.material = new THREE.MeshStandardMaterial({ color: '#3caaa9', roughness: .3, metalness: .15 });
box(7, .22, 250, '#efe6d0', -4.5, -.08, -35);
box(10, .16, 250, '#727b79', -13, -.07, -35);
box(.18, .22, 250, '#e0ddc7', -8.1, .04, -35);
box(5, .19, 250, '#d1c9ae', -20.5, -.04, -35);

function waveTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e6e4d4'; ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#485658'; ctx.lineWidth = 27;
  for (let row = -2; row < 8; row++) {
    ctx.beginPath();
    for (let x = -10; x <= 522; x += 3) {
      const y = row * 86 + 36 * Math.sin(x / 512 * Math.PI * 4);
      x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Tiny paving joints keep the pattern from looking like a flat graphic.
  ctx.strokeStyle = '#6c746321'; ctx.lineWidth = 1;
  for (let x = 0; x < 512; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke(); }
  for (let y = 0; y < 512; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1, 35); texture.anisotropy = 8;
  return texture;
}
const paving = new THREE.Mesh(new THREE.PlaneGeometry(7, 250), new THREE.MeshStandardMaterial({ map: waveTexture(), roughness: .95 }));
paving.rotation.x = -Math.PI / 2; paving.position.set(-4.5, .04, -35); paving.receiveShadow = true; scene.add(paving);
for (let z = -150; z < 95; z += 9) box(.12, .01, 4, '#e5dfc9', -13, .025, z);
const foam = [];
for (let i = 0; i < 5; i++) {
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(.3 + i * .08, 250), new THREE.MeshBasicMaterial({ color: '#e7f5e6', transparent: true, opacity: .45 - i * .06 }));
  strip.rotation.x = -Math.PI / 2; strip.position.set(18 + i * 2.4, .025, -35); scene.add(strip); foam.push(strip);
}
for (let i = 0; i < 70; i++) {
  const x = 25 + (i * 13.71 % 110), z = (i * 17.31 % 220) - 145;
  const glint = box(2 + i % 4, .006, .035, '#92cdca', x, .011, z); glint.castShadow = false;
}

// A seeded generator makes the city reproducible.
let seed = 55;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const buildingColors = ['#e9dbbe', '#c6d6d1', '#c7c6ba', '#e5c5a3', '#dde3d8', '#c2c9c5'];
for (let row = 0; row < 2; row++) {
  for (let i = 0; i < 22; i++) {
    const z = -135 + i * 10, h = 10 + random() * 17, x = -29 - row * 13;
    const color = buildingColors[Math.floor(random() * buildingColors.length)];
    box(9, h, 8.8, color, x, h / 2, z);
    box(9.5, .28, 9.1, '#eee5cf', x, h + .15, z);
    const floors = Math.floor(h / 2.4);
    for (let f = 0; f < floors; f++) {
      for (let n = 0; n < 3; n++) {
        box(.07, 1.3, 1.65, random() > .3 ? '#537477' : '#7c9390', x + 4.53, 1.5 + f * 2.4, z - 2.7 + n * 2.7);
      }
      if (i % 3 === 0) box(.5, .13, 8.7, '#e7e1cb', x + 4.6, 2.35 + f * 2.4, z);
    }
    if (row === 0) { box(.12, 2.1, 5.8, '#465f58', x + 4.56, 1.1, z); box(1.6, .2, 6.5, i % 2 ? '#b3664c' : '#698b78', x + 4.8, 2.3, z); }
  }
}
// Distant headlands suggest the geography without copying a real landmark mesh.
for (let i = 0; i < 6; i++) sphere(12 + i * 2, '#719b90', 6 + i * 14, 4, -160 - i * 8, scene, 1, 1.1 + i * .07, 1.4);

function palm(x, z, height = 7) {
  const group = new THREE.Group(); group.position.set(x, 0, z); scene.add(group);
  const trunk = cylinder(.15, .25, height, '#968062', .2, height / 2, 0, group); trunk.rotation.z = -.045;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4 + .15;
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(.4, height, 0), new THREE.Vector3(Math.cos(angle) * 1.6, height + .9, Math.sin(angle) * 1.6), new THREE.Vector3(Math.cos(angle) * 3, height - 1.1, Math.sin(angle) * 3));
    const points = curve.getPoints(9), vertices = [], indices = [];
    points.forEach((p, j) => {
      const width = Math.sin(j / 9 * Math.PI) * .45 + .02;
      vertices.push(p.x - Math.sin(angle) * width, p.y, p.z + Math.cos(angle) * width, p.x + Math.sin(angle) * width, p.y, p.z - Math.cos(angle) * width);
      if (j < 9) { const n = j * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
    });
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const leaf = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: i % 2 ? '#4e7d54' : '#668b54', side: THREE.DoubleSide })); leaf.castShadow = true; group.add(leaf);
  }
  sphere(.22, '#79744a', .5, height - .2, .1, group);
}
for (let z = -110; z < 90; z += 15) { palm(-1.3, z, 6.7 + random()); palm(-19.5, z + 5, 7 + random()); }

function umbrella(x, z, color) {
  cylinder(.035, .035, 2.2, '#e9e0c7', x, 1.1, z);
  const top = cylinder(.01, 1.35, .65, color, x, 2.35, z, scene, 10); top.rotation.y = .3;
  box(.65, .05, 1.8, '#f0e5cb', x + .5, .12, z + .7);
  box(.65, .05, 1.8, color, x - .55, .13, z + .7);
}
for (let i = 0; i < 24; i++) { const x = 4 + random() * 9, z = -105 + i * 8.5; if (!near({ x, z }, party, 6)) umbrella(x, z, ['#d98c67', '#e0c17f', '#739c94', '#ece2c7'][i % 4]); }

const obstacles = [];
function obstacle(x, z, w, d) { obstacles.push({ x, z, w: w / 2 + .4, d: d / 2 + .4 }); }
function sign(text, x, y, z, width = 3) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#285853'; ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#f7e4b8'; ctx.font = 'bold 43px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 81);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = box(width, width / 4, .05, new THREE.MeshStandardMaterial({ map: texture }), x, y, z); return mesh;
}
function kiosk(x, z) {
  box(4.8, .18, 4.8, '#b79b72', x, .13, z);
  box(3.5, 1.25, 3, '#568779', x, .9, z); obstacle(x, z, 3.5, 3);
  box(3.7, .14, 3.3, '#e9d8b2', x, 1.57, z);
  for (const a of [-1, 1]) for (const b of [-1, 1]) cylinder(.06, .06, 2.5, '#886f51', x + a * 1.8, 1.6, z + b * 1.65);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.15, 4), material('#c79c62')); roof.rotation.y = Math.PI / 4; roof.position.set(x, 3.3, z); roof.castShadow = true; scene.add(roof);
  sign('QUIOSQUE DA ORLA', x, 2.5, z + 1.72, 3.2);
  for (let i = 0; i < 4; i++) {
    cylinder(.3, .3, .12, '#d0ac79', x - 1.4 + i * .9, .85, z + 2.3);
    cylinder(.04, .08, .8, '#485b54', x - 1.4 + i * .9, .4, z + 2.3);
  }
  for (let i = 0; i < 3; i++) box(.13, .32, .13, ['#ffc279', '#93b6b0', '#f3e6c6'][i], x - .6 + i * .5, 1.8, z + .8);
}
kiosk(1.8, -17); kiosk(1.8, -65);
for (let z = -93; z < 80; z += 23) {
  cylinder(.04, .065, 5.2, '#526962', -7.5, 2.6, z);
  sphere(.22, '#fff3ce', -7.5, 5.15, z);
  box(.6, .45, 2, '#b4946b', -6.7, .6, z + 3);
  box(.15, .9, 2, '#b4946b', -7, .95, z + 3);
  obstacle(-6.7, z + 3, .9, 2);
}
// A beach dance floor, speakers and festoon lamps at the first kiosk.
for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) box(1.35, .06, 1.35, (x + z) % 2 ? '#759a8c' : '#e8c59d', party.x - 2.1 + x * 1.4, .02, party.z - 2.1 + z * 1.4);
for (const side of [-1, 1]) {
  box(.75, 1.5, .6, '#344f4c', party.x + side * 2.7, .8, party.z - 2.8);
  for (const y of [.55, 1.15]) { const speaker = cylinder(.22, .22, .08, '#213d3c', party.x + side * 2.7, y, party.z - 2.46); speaker.rotation.x = Math.PI / 2; }
  cylinder(.055, .07, 3.5, '#907653', party.x + side * 3, 1.75, party.z - 3);
}
box(6, .035, .04, '#536957', party.x, 3.5, party.z - 3);
for (let i = 0; i < 9; i++) sphere(.1, i % 2 ? '#ffca96' : '#e8e9bc', party.x - 2.8 + i * .7, 3.35 - Math.sin(i / 8 * Math.PI) * .35, party.z - 3);
sign('PÔR DO SOL NA ORLA', party.x, 2.8, party.z - 3.03, 3.3);
for (const side of [-1, 1]) cylinder(.045, .055, 3.2, '#7c8f79', raceStart.x + side * 1.3, 1.6, raceStart.z - 3.5);
sign('CORRIDA DA ORLA', raceStart.x, 3.1, raceStart.z - 3.5, 2.6);

// A simple stylized avatar, built from articulated meshes.
const avatar = new THREE.Group(); avatar.position.set(-3.5, .08, 2); scene.add(avatar);
const skin = '#b77952', shirt = '#f0eee2', shorts = '#467c79';
box(.56, .67, .3, shirt, 0, 1.12, 0, avatar);
cylinder(.09, .1, .17, skin, 0, 1.53, 0, avatar);
sphere(.24, skin, 0, 1.78, 0, avatar, .83, 1.1, .9);
sphere(.25, '#3e342e', 0, 1.9, -.025, avatar, .86, .58, .92);
box(.32, .08, .13, '#3e342e', 0, 1.96, .17, avatar);
for (const x of [-.085, .085]) sphere(.017, '#332c27', x, 1.8, .193, avatar);
const limbs = [];
for (const side of [-1, 1]) {
  const leg = new THREE.Group(); leg.name = `leg-${side}`; leg.position.set(side * .155, .81, 0); avatar.add(leg);
  box(.24, .3, .29, shorts, 0, -.13, 0, leg);
  box(.15, .43, .16, skin, 0, -.47, 0, leg);
  box(.21, .14, .35, '#eee9d8', 0, -.71, .055, leg);
  const arm = new THREE.Group(); arm.name = `arm-${side}`; arm.position.set(side * .36, 1.37, 0); avatar.add(arm);
  box(.19, .23, .23, shirt, 0, -.08, 0, arm);
  box(.13, .37, .14, skin, 0, -.36, 0, arm);
  sphere(.085, skin, 0, -.57, 0, arm);
  limbs.push({ leg, arm, side });
}
const shadow = new THREE.Mesh(new THREE.CircleGeometry(.45, 24), new THREE.MeshBasicMaterial({ color: '#28483e', transparent: true, opacity: .18 })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = .005; avatar.add(shadow);

// Batch static scenery by material to keep draw calls low on laptops and phones.
scene.updateMatrixWorld(true);
const dynamicMeshes = new Set([ocean, ...foam]);
avatar.traverse(object => dynamicMeshes.add(object));
const batches = new Map();
scene.traverse(object => {
  if (!object.isMesh || dynamicMeshes.has(object)) return;
  const key = object.material.uuid + object.castShadow + object.receiveShadow + Object.keys(object.geometry.attributes).sort().join(',');
  if (!batches.has(key)) batches.set(key, []);
  batches.get(key).push(object);
});
for (const objects of batches.values()) {
  if (objects.length < 2) continue;
  const geometries = objects.map(object => object.geometry.clone().applyMatrix4(object.matrixWorld));
  const geometry = mergeGeometries(geometries);
  if (geometry) {
    const merged = new THREE.Mesh(geometry, objects[0].material);
    merged.castShadow = objects[0].castShadow; merged.receiveShadow = objects[0].receiveShadow;
    scene.add(merged);
    objects.forEach(object => { object.removeFromParent(); object.geometry.dispose(); });
  }
  geometries.forEach(g => g.dispose());
}

const raceRings = checkpoints.map((point, index) => {
  const group = new THREE.Group(); group.position.set(point.x, 0, point.z);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, .09, 6, 32), new THREE.MeshStandardMaterial({ color: '#f6bb82', emissive: '#a65f24', emissiveIntensity: .25, roughness: .65 }));
  ring.position.y = 1.35; group.add(ring);
  if (index % 2) group.rotation.y = Math.PI / 2;
  group.visible = false; scene.add(group); return { group, ring };
});
const partyLight = new THREE.PointLight('#ffae79', 9, 13); partyLight.position.set(party.x, 4, party.z); scene.add(partyLight);
let navigationTarget = null;
const activityUI = createActivityUI({
  getPosition: () => avatar.position,
  send: type => social.activity(type),
  onNavigate(point, title) { navigationTarget = { ...point, title }; keys.clear(); renderer.domElement.focus(); },
});
document.querySelector('#cancel-navigation').onclick = () => navigationTarget = null;

let playing = false, yaw = .4, pitch = .28, distance = 7.8;
const keys = new Set();
const welcome = document.querySelector('#welcome'), session = document.querySelector('#session');
const help = document.querySelector('#help-dialog');
document.querySelector('#help').onclick = () => { keys.clear(); help.showModal(); };
document.querySelector('#close-help').onclick = () => help.close();
document.querySelector('#resume').onclick = () => help.close();
document.querySelector('#enter').onclick = () => {
  const name = document.querySelector('#nickname').value.trim().replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 20);
  if (name.length < 2) { document.querySelector('#nickname').setCustomValidity('Use pelo menos duas letras ou números.'); document.querySelector('#nickname').reportValidity(); return; }
  document.querySelector('#nickname').setCustomValidity('');
  playing = true; document.body.classList.add('exploring'); welcome.classList.add('hidden'); session.classList.remove('hidden');
  if (matchMedia('(pointer: coarse)').matches) document.querySelector('#touch-controls').classList.remove('hidden');
  document.querySelector('#social-panel').classList.remove('hidden');
  document.querySelector('#gestures').classList.remove('hidden');
  activityUI.open();
  selfLabel.textContent = name; social.connect(name);
  renderer.domElement.focus();
};
document.querySelector('#nickname').addEventListener('input', event => event.target.setCustomValidity(''));
renderer.domElement.tabIndex = 0;
const moveCodes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
window.addEventListener('keydown', event => { if (playing && !help.open && !typing() && moveCodes.has(event.code)) { event.preventDefault(); keys.add(event.code); } });
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
help.addEventListener('close', () => keys.clear());
help.addEventListener('keydown', () => keys.clear());
let dragging = false, lastX = 0, lastY = 0;
renderer.domElement.addEventListener('pointerdown', event => { if (!playing || help.open) return; dragging = true; lastX = event.clientX; lastY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId); });
renderer.domElement.addEventListener('pointermove', event => { if (!dragging) return; yaw -= (event.clientX - lastX) * .005; pitch = THREE.MathUtils.clamp(pitch + (event.clientY - lastY) * .004, .12, .85); lastX = event.clientX; lastY = event.clientY; });
renderer.domElement.addEventListener('pointerup', () => dragging = false);
renderer.domElement.addEventListener('pointercancel', () => dragging = false);
renderer.domElement.addEventListener('wheel', event => { if (playing) { event.preventDefault(); distance = THREE.MathUtils.clamp(distance + event.deltaY * .008, 3.5, 12); } }, { passive: false });
for (const button of document.querySelectorAll('[data-move]')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); keys.add(button.dataset.move); button.setPointerCapture(event.pointerId); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => keys.delete(button.dataset.move));
}
function typing() { return ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName); }
document.querySelector('#chat-input').addEventListener('focus', () => keys.clear());
const peers = new Map();
let localMoving = false, localRunning = false, localGesture = null, gestureUntil = 0;
function label(name, self = false) {
  const element = document.createElement('div'); element.className = 'name-label' + (self ? ' self' : ''); element.textContent = name;
  document.querySelector('#name-labels').append(element); return element;
}
const selfLabel = label('Você', true);
const social = createSocial({
  onActivities(state, id) { activityUI.receive(state, id); },
  onActivityError(text) { activityUI.error(text); },
  onJoined(player) { avatar.position.set(player.x, .08, player.z); keys.clear(); },
  onPlayers(players, id) {
    const present = new Set();
    for (const state of players) {
      if (state.id === id) { localGesture = state.gesture; gestureUntil = state.gestureUntil; continue; }
      present.add(state.id);
      if (!peers.has(state.id)) {
        const model = avatar.clone(true); model.position.set(state.x, .08, state.z); scene.add(model);
        const peerLimbs = [-1, 1].map(side => ({ side, leg: model.getObjectByName(`leg-${side}`), arm: model.getObjectByName(`arm-${side}`) }));
        peers.set(state.id, { model, limbs: peerLimbs, label: label(state.name), state });
      }
      peers.get(state.id).state = state;
    }
    for (const [id, peer] of peers) if (!present.has(id)) { scene.remove(peer.model); peer.label.remove(); peers.delete(id); }
  },
  onDisconnected() { activityUI.disconnect(); keys.clear(); localGesture = null; for (const peer of peers.values()) { scene.remove(peer.model); peer.label.remove(); } peers.clear(); },
  onCorrection(position) { avatar.position.x = position.x; avatar.position.z = position.z; },
});
for (const button of document.querySelectorAll('[data-gesture]')) button.onclick = () => {
  keys.clear(); localGesture = button.dataset.gesture; gestureUntil = Date.now() + 3500; social.gesture(localGesture); renderer.domElement.focus();
};
setInterval(() => { if (playing) social.move({ x: avatar.position.x, z: avatar.position.z, rotation: avatar.rotation.y, moving: localMoving, running: localRunning }); }, 100);
function applyGesture(model, joints, gesture, time) {
  for (const { arm, side } of joints) {
    arm.rotation.z = 0;
    if (gesture === 'wave' && side === 1) { arm.rotation.z = -2.4; arm.rotation.x = Math.sin(time * 8) * .35; }
    if (gesture === 'dance') { arm.rotation.z = side * (-.8 + Math.sin(time * 5) * .3); arm.rotation.x = Math.sin(time * 5 + side) * .7; }
    if (gesture === 'clap') { arm.rotation.x = -1.2; arm.rotation.z = side * (.35 + Math.sin(time * 12) * .15); }
  }
  if (gesture === 'dance') model.position.y += Math.abs(Math.sin(time * 6)) * .12;
}
const labelPoint = new THREE.Vector3();
function placeLabel(element, model) {
  labelPoint.copy(model.position).add(new THREE.Vector3(0, 2.35, 0)).project(camera);
  const visible = playing && labelPoint.z > -1 && labelPoint.z < 1 && Math.abs(labelPoint.x) < 1.05 && Math.abs(labelPoint.y) < 1.05;
  element.style.display = visible ? 'block' : 'none';
  if (visible) element.style.transform = `translate(${(labelPoint.x * .5 + .5) * innerWidth}px, ${(-labelPoint.y * .5 + .5) * innerHeight}px) translate(-50%, -100%)`;
}
function updatePeers(dt) {
  if (Date.now() > gestureUntil) localGesture = null;
  for (const button of document.querySelectorAll('[data-gesture]')) button.classList.toggle('active', button.dataset.gesture === localGesture);
  for (const peer of peers.values()) {
    const { model, state, limbs } = peer;
    model.position.x = THREE.MathUtils.lerp(model.position.x, state.x, 1 - Math.exp(-dt * 12));
    model.position.z = THREE.MathUtils.lerp(model.position.z, state.z, 1 - Math.exp(-dt * 12));
    model.rotation.y += Math.atan2(Math.sin(state.rotation - model.rotation.y), Math.cos(state.rotation - model.rotation.y)) * Math.min(dt * 12, 1);
    model.position.y = .08;
    for (const { leg, arm, side } of limbs) {
      const swing = state.moving ? Math.sin(elapsed * (state.running ? 13 : 9)) * .45 * side : 0;
      leg.rotation.x = swing; arm.rotation.x = -swing;
    }
    applyGesture(model, limbs, state.gestureUntil > Date.now() ? state.gesture : null, elapsed);
    placeLabel(peer.label, model);
  }
  placeLabel(selfLabel, avatar);
}

const timer = new THREE.Timer(), target = new THREE.Vector3(), desired = new THREE.Vector3();
let elapsed = 0, frames = 0;
camera.position.set(20, 10, 25); camera.lookAt(-6, 2, -17);
function animate() {
  timer.update(); const dt = Math.min(timer.getDelta(), .05); elapsed += dt;
  if (playing) {
    const inputX = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    const inputZ = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
    const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const moving = !help.open && !typing() && Boolean(inputX || inputZ);
    localMoving = moving; localRunning = running;
    if (moving) {
      const norm = Math.hypot(inputX, inputZ), speed = running ? 5.8 : 3;
      const dx = (inputX * Math.cos(yaw) - inputZ * Math.sin(yaw)) / norm * speed * dt;
      const dz = (-inputX * Math.sin(yaw) - inputZ * Math.cos(yaw)) / norm * speed * dt;
      const nx = THREE.MathUtils.clamp(avatar.position.x + dx, bounds.minX, bounds.maxX);
      const nz = THREE.MathUtils.clamp(avatar.position.z + dz, bounds.minZ, bounds.maxZ);
      if (!blocked(nx, avatar.position.z)) avatar.position.x = nx;
      if (!blocked(avatar.position.x, nz)) avatar.position.z = nz;
      const angle = Math.atan2(dx, dz);
      avatar.rotation.y += Math.atan2(Math.sin(angle - avatar.rotation.y), Math.cos(angle - avatar.rotation.y)) * Math.min(dt * 15, 1);
    }
    for (const { leg, arm, side } of limbs) {
      const swing = moving ? Math.sin(elapsed * (running ? 13 : 9)) * (running ? .7 : .45) * side : 0;
      leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, swing, .3);
      arm.rotation.x = THREE.MathUtils.lerp(arm.rotation.x, -swing, .3);
    }
    avatar.position.y = .08 + (moving ? Math.abs(Math.sin(elapsed * 9)) * .035 : Math.sin(elapsed * 2) * .008);
    applyGesture(avatar, limbs, localGesture, elapsed);
    target.copy(avatar.position).add(new THREE.Vector3(0, 1.2, 0));
    desired.set(target.x + Math.sin(yaw) * distance * Math.cos(pitch), target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * distance * Math.cos(pitch));
    camera.position.lerp(desired, 1 - Math.exp(-dt * 6)); camera.lookAt(target);
    document.querySelector('#zone').textContent = near(avatar.position, party) ? 'Pista do quiosque · bora dançar!' : avatar.position.x > .2 ? 'Areia, brisa e pé descalço' : 'Calçadão de Copacabana';
    document.querySelector('#map-dot').setAttribute('cy', String(THREE.MathUtils.clamp(65 + avatar.position.z * .32, 8, 111)));
  }
  foam.forEach((strip, i) => { strip.position.x = 18 + i * 2.4 + Math.sin(elapsed * .5 + i) * .5; strip.material.opacity = .22 + Math.sin(elapsed * .65 + i) * .1; });
  updatePeers(dt);
  const activity = activityUI.state();
  const racer = activity.world?.race.racers.find(p => p.id === activity.playerId);
  raceRings.forEach(({ group, ring }, index) => {
    group.visible = playing && ['countdown', 'running'].includes(activity.world?.race.phase);
    const next = racer?.checkpoint === index;
    ring.material.color.set(next ? '#ffe8a8' : '#749e93');
    ring.material.emissiveIntensity = next ? .5 + Math.sin(elapsed * 4) * .2 : .05;
  });
  partyLight.intensity = 7 + Math.sin(elapsed * 5) * 2;
  const raceTarget = activityUI.target();
  const waypoint = raceTarget ? { ...raceTarget, title: `Arco ${(racer?.checkpoint ?? 0) + 1}/4 · ${raceTarget.label}` } : navigationTarget;
  const navigation = document.querySelector('#navigation');
  navigation.classList.toggle('hidden', !playing || !waypoint);
  if (waypoint && playing) {
    const dx = waypoint.x - avatar.position.x, dz = waypoint.z - avatar.position.z;
    document.querySelector('#navigation-text').textContent = `${waypoint.title} · ${Math.round(Math.hypot(dx, dz))} m`;
    document.querySelector('#navigation-arrow').style.transform = `rotate(${Math.atan2(dx, -dz) + yaw}rad)`;
    document.querySelector('#cancel-navigation').classList.toggle('hidden', Boolean(raceTarget));
  }
  renderer.render(scene, camera); frames++;
  if (frames === 2) { loading.classList.add('hidden'); host.dataset.ready = 'true'; }
}
renderer.setAnimationLoop(animate);
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
// Read-only state for a browser smoke test; no credentials or gameplay commands.
window.orlaState = () => ({ playing, position: avatar.position.toArray(), camera: camera.position.toArray(), frames, connected: social.connected(), activities: activityUI.state(), peers: [...peers.values()].map(p => ({ id: p.state.id, name: p.state.name, x: p.model.position.x, z: p.model.position.z, gesture: p.state.gesture })) });
