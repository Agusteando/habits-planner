import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const TARGET_SELECTOR = ".day-column.sealed, .calendar-day-lane.sealed";
const EFFECTS = new Map();
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seededPhase(el) {
  const key = el.getAttribute("data-drop-day") || el.getAttribute("data-calendar-day") || el.textContent || "seal";
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 6283) / 1000;
}

function makeWrapCurve({ phase = 0, turns = 2, verticalPhase = 0, radiusX = 0.82, radiusZ = 0.42, wobble = 0.12 } = {}) {
  const points = [];
  const steps = 256;
  for (let i = 0; i < steps; i += 1) {
    const u = (i / steps) * TAU;
    const braided = phase + u * turns + Math.sin(u * 3 + phase) * wobble;
    const radiusPulse = 1 + Math.sin(u * 4 + phase * 0.7) * 0.035;
    const y = Math.sin(u + verticalPhase) * 1.33 + Math.sin(u * 2 - phase) * 0.07;
    points.push(new THREE.Vector3(
      Math.cos(braided) * radiusX * radiusPulse,
      y,
      Math.sin(braided) * radiusZ * radiusPulse
    ));
  }
  return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.42);
}

function makeMaterial({ color, opacity, emissive, additive = true, phong = false }) {
  const shared = {
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
  };
  if (!phong) return new THREE.MeshBasicMaterial(shared);
  return new THREE.MeshPhongMaterial({
    ...shared,
    emissive,
    emissiveIntensity: 0.72,
    specular: 0xfff8de,
    shininess: 95
  });
}

function buildHoop(y, radius, color, opacity) {
  const hoop = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.012, 8, 96),
    makeMaterial({ color, opacity })
  );
  hoop.position.y = y;
  hoop.rotation.x = Math.PI * 0.5;
  hoop.scale.z = 0.44;
  return hoop;
}

function buildStrand(effect, options) {
  const curve = makeWrapCurve(options);
  const strand = new THREE.Group();

  const halo = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 256, options.haloRadius || 0.052, 10, true),
    makeMaterial({ color: options.haloColor, opacity: options.haloOpacity || 0.075 })
  );
  halo.renderOrder = 1;
  strand.add(halo);

  const core = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 256, options.coreRadius || 0.016, 8, true),
    makeMaterial({ color: options.coreColor, emissive: options.emissiveColor, opacity: options.coreOpacity || 0.36, phong: true })
  );
  core.renderOrder = 2;
  strand.add(core);

  const sparkCount = options.sparkCount || 18;
  const sparks = [];
  const sparkMaterialBase = makeMaterial({ color: options.sparkColor, opacity: 0.8 });
  for (let i = 0; i < sparkCount; i += 1) {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10), sparkMaterialBase.clone());
    sphere.renderOrder = 3;
    strand.add(sphere);
    sparks.push(sphere);
  }

  effect.group.add(strand);
  effect.strands.push({ curve, strand, halo, core, sparks, ...options });
}

function buildEffect(el) {
  const mount = document.createElement("div");
  mount.className = "seal-threefx";
  mount.setAttribute("aria-hidden", "true");
  el.prepend(mount);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(29, 1, 0.1, 30);
  camera.position.set(0, 0, 6.1);

  const group = new THREE.Group();
  scene.add(group);

  scene.add(new THREE.AmbientLight(0xffffff, 0.54));
  const key = new THREE.DirectionalLight(0xffedbd, 0.84);
  key.position.set(2.8, 3.0, 5.0);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7cf4ff, 0.55);
  rim.position.set(-3.2, -0.7, 3.5);
  scene.add(rim);

  const phase = seededPhase(el);
  const effect = {
    el,
    mount,
    renderer,
    scene,
    camera,
    group,
    phase,
    width: 0,
    height: 0,
    dead: false,
    paused: false,
    strands: [],
    hoops: []
  };

  buildStrand(effect, {
    phase,
    turns: 2,
    verticalPhase: 0,
    radiusX: 0.86,
    radiusZ: 0.44,
    wobble: 0.14,
    speed: 0.055,
    offset: 0.0,
    coreColor: 0xffe08a,
    haloColor: 0x54eaff,
    sparkColor: 0xfff5cd,
    emissiveColor: 0x1bd7d4,
    coreRadius: 0.018,
    haloRadius: 0.064,
    coreOpacity: 0.34,
    haloOpacity: 0.08,
    sparkCount: 22
  });

  buildStrand(effect, {
    phase: phase + 1.8,
    turns: 3,
    verticalPhase: Math.PI * 0.38,
    radiusX: 0.70,
    radiusZ: 0.36,
    wobble: 0.18,
    speed: -0.042,
    offset: 0.34,
    coreColor: 0x85f7ff,
    haloColor: 0xffd66b,
    sparkColor: 0x94fbff,
    emissiveColor: 0xffc65d,
    coreRadius: 0.012,
    haloRadius: 0.046,
    coreOpacity: 0.26,
    haloOpacity: 0.055,
    sparkCount: 16
  });

  buildStrand(effect, {
    phase: phase + 3.3,
    turns: 1,
    verticalPhase: Math.PI * 0.8,
    radiusX: 0.94,
    radiusZ: 0.48,
    wobble: 0.09,
    speed: 0.034,
    offset: 0.58,
    coreColor: 0xffffff,
    haloColor: 0x7adfff,
    sparkColor: 0xffffff,
    emissiveColor: 0x7adfff,
    coreRadius: 0.008,
    haloRadius: 0.032,
    coreOpacity: 0.18,
    haloOpacity: 0.034,
    sparkCount: 10
  });

  const topHoop = buildHoop(1.28, 0.79, 0xffd66b, 0.13);
  const middleHoop = buildHoop(0, 0.93, 0x64f1ff, 0.07);
  const bottomHoop = buildHoop(-1.28, 0.79, 0xffd66b, 0.10);
  group.add(topHoop, middleHoop, bottomHoop);
  effect.hoops.push(topHoop, middleHoop, bottomHoop);

  const aura = new THREE.Mesh(
    new THREE.CylinderGeometry(0.98, 0.98, 2.92, 48, 1, true),
    makeMaterial({ color: 0x64eaff, opacity: 0.025 })
  );
  aura.scale.z = 0.42;
  group.add(aura);
  effect.aura = aura;

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
  effect.camera.position.z = effect.camera.aspect < 0.3 ? 6.9 : 6.1;
  effect.camera.updateProjectionMatrix();

  const aspect = width / Math.max(height, 1);
  const xScale = clamp(aspect * 2.65, 0.42, 1.08);
  const zScale = clamp(xScale * 0.92, 0.34, 1.0);
  effect.group.scale.set(xScale, 1, zScale);
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
    if (!EFFECTS.has(el)) {
      try { buildEffect(el); }
      catch (error) {
        console.warn("Seal Three.js effect could not start.", error);
      }
    } else {
      resizeEffect(EFFECTS.get(el));
    }
  });
  [...EFFECTS.keys()].forEach((el) => {
    if (!next.has(el) || !document.body.contains(el)) destroyEffect(el);
  });
}

function updateComet(strand, time, reduce) {
  const base = reduce ? strand.offset : (time * strand.speed + strand.offset);
  const count = strand.sparks.length;
  for (let i = 0; i < count; i += 1) {
    const spark = strand.sparks[i];
    const fade = 1 - i / count;
    const progress = ((base - i * 0.012) % 1 + 1) % 1;
    const point = strand.curve.getPointAt(progress);
    spark.position.copy(point);

    const frontFactor = point.z > 0 ? 1 : 0.38;
    const pulse = reduce ? 0.75 : 0.78 + Math.sin(time * 3.1 + i * 0.55 + strand.phase) * 0.12;
    const size = (strand.coreRadius * 3.2 + 0.012) * Math.pow(fade, 0.75) * (point.z > 0 ? 1.18 : 0.84);
    spark.scale.setScalar(size);
    spark.material.opacity = clamp(fade * frontFactor * pulse, 0, 0.88);
  }
}

function animate(timeMs) {
  const time = timeMs * 0.001;
  const hidden = document.visibilityState === "hidden";

  EFFECTS.forEach((effect) => {
    if (effect.dead || hidden) return;
    resizeEffect(effect);

    const slow = reduceMotion ? 0 : time;
    effect.group.rotation.y = effect.phase * 0.2 + slow * 0.34;
    effect.group.rotation.x = -0.08 + Math.sin(slow * 0.46 + effect.phase) * 0.045;
    effect.group.rotation.z = Math.sin(slow * 0.31 + effect.phase) * 0.018;

    effect.strands.forEach((strand, index) => {
      const wave = reduceMotion ? 0 : Math.sin(time * (0.8 + index * 0.17) + strand.phase);
      strand.strand.rotation.y = slow * (0.05 + index * 0.035) * (index % 2 ? -1 : 1);
      strand.core.material.opacity = clamp(strand.coreOpacity + wave * 0.035, 0.02, 0.52);
      strand.halo.material.opacity = clamp(strand.haloOpacity + wave * 0.014, 0.01, 0.16);
      if (strand.core.material.emissiveIntensity !== undefined) {
        strand.core.material.emissiveIntensity = reduceMotion ? 0.35 : 0.65 + Math.max(0, wave) * 0.22;
      }
      updateComet(strand, time, reduceMotion);
    });

    effect.hoops.forEach((hoop, index) => {
      hoop.rotation.z = slow * (0.24 + index * 0.08) * (index === 1 ? -1 : 1);
      hoop.material.opacity = reduceMotion ? 0.055 : 0.075 + Math.sin(time * 0.9 + index) * 0.025;
    });

    if (effect.aura) {
      effect.aura.material.opacity = reduceMotion ? 0.012 : 0.018 + Math.sin(time * 0.7 + effect.phase) * 0.006;
      effect.aura.rotation.y = slow * -0.08;
    }

    effect.renderer.render(effect.scene, effect.camera);
  });

  window.requestAnimationFrame(animate);
}

const observer = new MutationObserver(syncEffects);
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-drop-day", "data-calendar-day"] });
window.addEventListener("resize", syncEffects, { passive: true });
window.addEventListener("orientationchange", syncEffects, { passive: true });
document.addEventListener("visibilitychange", syncEffects, { passive: true });

if ("ResizeObserver" in window) {
  const ro = new ResizeObserver(syncEffects);
  ro.observe(document.documentElement);
}

syncEffects();
window.requestAnimationFrame(animate);
