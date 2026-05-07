import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const TARGET_SELECTOR = ".day-column.sealed, .calendar-day-lane.sealed";
const EFFECTS = new Map();
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function createSerpentPath(turns = 1.35, radius = 0.86, phase = 0) {
  const points = [];
  const steps = 220;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = phase + t * Math.PI * 2 * turns;
    const sway = 0.035 * Math.sin((t * Math.PI * 10) + phase);
    const y = THREE.MathUtils.lerp(1.28, -1.28, t);
    points.push(new THREE.Vector3(
      Math.cos(angle) * (radius + sway),
      y,
      Math.sin(angle) * (radius * 0.34) + 0.04 * Math.sin(angle * 2.4)
    ));
  }
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

function createHeadMaterial(color, emissive) {
  return new THREE.MeshPhongMaterial({
    color,
    emissive,
    emissiveIntensity: 0.22,
    specular: 0xfff4d0,
    shininess: 90,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });
}

function buildSerpent(effect) {
  const serpent = new THREE.Group();
  effect.group.add(serpent);

  const curve = createSerpentPath();
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0xd9bd67,
    emissive: 0x22463d,
    emissiveIntensity: 0.18,
    specular: 0xfff4d0,
    shininess: 100,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  });
  const body = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.06, 16, false), bodyMaterial);
  serpent.add(body);

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x7cf0ff,
    transparent: true,
    opacity: 0.10,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 0.022, 10, false), glowMaterial);
  serpent.add(glow);

  const head = new THREE.Group();
  const headMaterial = createHeadMaterial(0xf1d585, 0x275247);
  const headGlowMaterial = new THREE.MeshBasicMaterial({ color: 0x9cf8ff, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending });

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 18), headMaterial);
  skull.scale.set(1.12, 1.0, 1.28);
  head.add(skull);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 14), headMaterial);
  snout.rotation.x = Math.PI * 0.5;
  snout.position.z = 0.12;
  head.add(snout);

  const crest = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.01, 10, 24), headGlowMaterial);
  crest.rotation.y = Math.PI * 0.5;
  head.add(crest);

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xeffbff, transparent: true, opacity: 0.9, depthWrite: false });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), eyeMaterial);
  eyeL.position.set(-0.035, 0.02, 0.085);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.035;
  head.add(eyeL, eyeR);
  serpent.add(head);

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 12), headMaterial.clone());
  tail.material.opacity = 0.34;
  serpent.add(tail);

  const aura = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 0.92, 2.95, 28, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x8befff,
      transparent: true,
      opacity: 0.03,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
  );
  aura.rotation.z = Math.PI * 0.5;
  effect.group.add(aura);

  effect.serpent = { curve, serpent, body, glow, head, tail, aura };
}

function buildEffect(el) {
  const mount = document.createElement('div');
  mount.className = 'seal-threefx';
  el.prepend(mount);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
  camera.position.set(0, 0, 5.7);

  const group = new THREE.Group();
  scene.add(group);

  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const key = new THREE.DirectionalLight(0xffefc8, 0.76);
  key.position.set(2.4, 2.6, 5.2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x74f3ff, 0.48);
  rim.position.set(-3.4, -1.2, 3.1);
  scene.add(rim);

  const effect = { el, mount, renderer, scene, camera, group, width: 0, height: 0, dead: false, serpent: null };
  buildSerpent(effect);
  resizeEffect(effect);
  EFFECTS.set(el, effect);
}

function resizeEffect(effect) {
  const rect = effect.el.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  if (width === effect.width && height === effect.height) return;
  effect.width = width;
  effect.height = height;
  effect.renderer.setSize(width, height, false);
  effect.camera.aspect = width / height;
  effect.camera.updateProjectionMatrix();
  const yScale = Math.max(1.05, (height / Math.max(width, 1)) * 0.9);
  effect.group.scale.set(1, yScale, 1);
}

function destroyEffect(el) {
  const effect = EFFECTS.get(el);
  if (!effect) return;
  effect.dead = true;
  effect.renderer.dispose();
  effect.scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose?.();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
      else obj.material.dispose?.();
    }
  });
  effect.mount.remove();
  EFFECTS.delete(el);
}

function syncEffects() {
  const next = new Set(document.querySelectorAll(TARGET_SELECTOR));
  next.forEach((el) => {
    if (!EFFECTS.has(el)) buildEffect(el);
    else resizeEffect(EFFECTS.get(el));
  });
  [...EFFECTS.keys()].forEach((el) => {
    if (!next.has(el) || !document.body.contains(el)) destroyEffect(el);
  });
}

function animate(time) {
  const t = time * 0.001;
  EFFECTS.forEach((effect) => {
    if (effect.dead || !effect.serpent) return;
    resizeEffect(effect);
    const { curve, body, glow, head, tail, aura } = effect.serpent;
    const headP = reduceMotion ? 0.12 : (0.14 + (t * 0.045)) % 0.96;
    const headPoint = curve.getPointAt(headP);
    const headTangent = curve.getTangentAt(headP).normalize();
    const headUp = new THREE.Vector3(0, 1, 0);
    head.position.copy(headPoint);
    head.quaternion.setFromUnitVectors(headUp, headTangent);
    head.rotation.z += Math.PI * 0.5;

    const tailPoint = curve.getPointAt(Math.max(0.02, headP - 0.18));
    tail.position.copy(tailPoint);

    effect.group.rotation.y = -0.18 + Math.sin(t * 0.24) * 0.08;
    effect.group.rotation.x = -0.08 + Math.sin(t * 0.33) * 0.012;

    body.material.opacity = reduceMotion ? 0.28 : 0.38 + Math.sin(t * 0.9) * 0.03;
    body.material.emissiveIntensity = reduceMotion ? 0.11 : 0.16 + Math.sin(t * 0.85) * 0.04;
    glow.material.opacity = reduceMotion ? 0.05 : 0.09 + Math.sin(t * 1.25) * 0.02;
    aura.material.opacity = reduceMotion ? 0.015 : 0.025 + Math.sin(t * 0.8) * 0.006;

    effect.renderer.render(effect.scene, effect.camera);
  });
  window.requestAnimationFrame(animate);
}

const observer = new MutationObserver(() => syncEffects());
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
window.addEventListener('resize', syncEffects, { passive: true });
window.addEventListener('orientationchange', syncEffects, { passive: true });

syncEffects();
window.requestAnimationFrame(animate);
