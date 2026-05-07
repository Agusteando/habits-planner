import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const TARGET_SELECTOR = ".day-column.sealed";
const EFFECTS = new Map();
let rafId = 0;
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function createHelix(turns, radius, phase = 0, yTop = 1.28, yBottom = -1.28) {
  const points = [];
  const steps = 180;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = phase + t * Math.PI * 2 * turns;
    const y = THREE.MathUtils.lerp(yTop, yBottom, t);
    const wobble = 0.06 * Math.sin((t * Math.PI * 2) + phase * 0.5);
    points.push(new THREE.Vector3(Math.cos(a) * (radius + wobble), y, Math.sin(a) * (radius * 0.42)));
  }
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
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
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
  camera.position.set(0, 0, 5.4);

  const group = new THREE.Group();
  scene.add(group);

  const trails = [];
  const configs = [
    { color: 0x78f2ff, radius: 0.88, turns: 1.45, phase: 0.25, opacity: 0.18, speed: 0.065 },
    { color: 0xffd77a, radius: 0.98, turns: 1.15, phase: 2.25, opacity: 0.16, speed: 0.055 }
  ];

  configs.forEach((cfg, index) => {
    const curve = createHelix(cfg.turns, cfg.radius, cfg.phase);
    const tube = new THREE.TubeGeometry(curve, 160, index === 0 ? 0.016 : 0.013, 10, false);
    const material = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: cfg.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(tube, material);
    group.add(mesh);

    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(index === 0 ? 0.05 : 0.042, 14, 14),
      new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: index === 0 ? 0.62 : 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    group.add(pulse);

    trails.push({ curve, mesh, pulse, speed: cfg.speed, phase: cfg.phase });
  });

  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 3.3),
    new THREE.MeshBasicMaterial({
      color: 0xffd77a,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  halo.position.z = -0.55;
  group.add(halo);

  const effect = { el, mount, renderer, scene, camera, group, trails, halo, width: 0, height: 0, dead: false };
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
  const yScale = Math.max(1.2, (height / width) * 0.92);
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
    if (effect.dead) return;
    resizeEffect(effect);
    effect.group.rotation.y = t * 0.28;
    effect.group.rotation.x = -0.12 + Math.sin(t * 0.4) * 0.012;
    effect.halo.material.opacity = 0.03 + Math.sin(t * 0.7) * 0.008;
    effect.trails.forEach((trail, index) => {
      const p = (t * trail.speed + trail.phase * 0.08) % 1;
      const point = trail.curve.getPointAt(p);
      trail.pulse.position.copy(point);
      const pulseOpacity = (index === 0 ? 0.46 : 0.38) + Math.sin((t * 1.6) + index) * 0.06;
      trail.pulse.material.opacity = reduceMotion ? 0.18 : pulseOpacity;
      trail.mesh.material.opacity = reduceMotion ? 0.08 : (index === 0 ? 0.14 : 0.12) + Math.sin((t * 0.9) + index) * 0.02;
    });
    effect.renderer.render(effect.scene, effect.camera);
  });
  rafId = window.requestAnimationFrame(animate);
}

const observer = new MutationObserver(() => syncEffects());
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
window.addEventListener('resize', syncEffects, { passive: true });
window.addEventListener('orientationchange', syncEffects, { passive: true });

syncEffects();
rafId = window.requestAnimationFrame(animate);
