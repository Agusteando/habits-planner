import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const TARGET_SELECTOR = ".day-column.sealed, .calendar-day-lane.sealed";
const EFFECTS = new Map();
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seededPhase(el) {
  const key = el.getAttribute("data-drop-day") || el.getAttribute("data-calendar-day") || el.textContent || "seal";
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 6283) / 1000;
}

function makeWrapCurve({
  phase = 0,
  turns = 2.4,
  verticalPhase = 0,
  radiusX = 0.84,
  radiusZ = 0.46,
  height = 2.92,
  wobble = 0.1,
  drift = 0.12
} = {}) {
  const points = [];
  const steps = 280;
  for (let i = 0; i < steps; i += 1) {
    const u = i / (steps - 1);
    const theta = phase + u * turns * TAU + Math.sin(u * TAU * 1.6 + phase) * wobble;
    const wrapPulse = 1 + Math.sin(u * TAU * 2.4 + phase * 0.8) * 0.06;
    const radiusXPulse = radiusX * wrapPulse * (1 + Math.cos(u * TAU * 0.9 + verticalPhase) * 0.03);
    const radiusZPulse = radiusZ * wrapPulse * (1 + Math.sin(u * TAU * 1.2 + phase) * 0.04);
    const yBase = (0.5 - u) * height;
    const y = yBase + Math.sin(u * TAU * 2 + verticalPhase) * drift + Math.sin(u * TAU * 0.5 + phase) * 0.08;
    points.push(new THREE.Vector3(
      Math.cos(theta) * radiusXPulse,
      y,
      Math.sin(theta) * radiusZPulse
    ));
  }
  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.36);
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
    emissiveIntensity: 0.78,
    specular: 0xfff8de,
    shininess: 110
  });
}

function buildHoop(y, radius, color, opacity, tilt = 0) {
  const hoop = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.01, 8, 120),
    makeMaterial({ color, opacity })
  );
  hoop.position.y = y;
  hoop.rotation.x = Math.PI * 0.5 + tilt;
  hoop.scale.set(1, 1, 0.52);
  return hoop;
}

function buildStrand(effect, options) {
  const curve = makeWrapCurve(options);
  const strand = new THREE.Group();

  const halo = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 240, options.haloRadius || 0.042, 12, false),
    makeMaterial({ color: options.haloColor, opacity: options.haloOpacity || 0.06 })
  );
  halo.renderOrder = 1;
  strand.add(halo);

  const core = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 240, options.coreRadius || 0.012, 10, false),
    makeMaterial({ color: options.coreColor, emissive: options.emissiveColor, opacity: options.coreOpacity || 0.3, phong: true })
  );
  core.renderOrder = 2;
  strand.add(core);

  const sparkCount = options.sparkCount || 20;
  const sparks = [];
  const sparkGeometry = new THREE.SphereGeometry(1, 10, 10);
  for (let i = 0; i < sparkCount; i += 1) {
    const spark = new THREE.Mesh(
      sparkGeometry,
      makeMaterial({ color: options.sparkColor, opacity: 0.78 })
    );
    spark.renderOrder = 3;
    strand.add(spark);
    sparks.push(spark);
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  camera.position.set(0.12, 0.0, 7.4);

  const group = new THREE.Group();
  group.rotation.set(-0.18, 0, 0.05);
  scene.add(group);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xfff0cb, 0.92);
  key.position.set(3.2, 3.4, 4.8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6eeeff, 0.72);
  rim.position.set(-3.6, 1.0, 5.6);
  scene.add(rim);
  const back = new THREE.PointLight(0x63dfff, 0.75, 14);
  back.position.set(0, -0.6, -3.2);
  scene.add(back);

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
    strands: [],
    hoops: []
  };

  buildStrand(effect, {
    phase,
    turns: 2.55,
    verticalPhase: phase * 0.45,
    radiusX: 0.94,
    radiusZ: 0.56,
    height: 3.12,
    wobble: 0.12,
    drift: 0.14,
    speed: 0.052,
    offset: 0.03,
    coreColor: 0xfff2ba,
    haloColor: 0x67eaff,
    sparkColor: 0xfffbdb,
    emissiveColor: 0x2ce3e8,
    coreRadius: 0.017,
    haloRadius: 0.058,
    coreOpacity: 0.34,
    haloOpacity: 0.078,
    sparkCount: 26
  });

  buildStrand(effect, {
    phase: phase + 1.85,
    turns: 3.15,
    verticalPhase: Math.PI * 0.35,
    radiusX: 0.76,
    radiusZ: 0.42,
    height: 2.88,
    wobble: 0.16,
    drift: 0.11,
    speed: -0.043,
    offset: 0.34,
    coreColor: 0x7ff4ff,
    haloColor: 0xffd46a,
    sparkColor: 0x92f9ff,
    emissiveColor: 0xffd06b,
    coreRadius: 0.011,
    haloRadius: 0.038,
    coreOpacity: 0.25,
    haloOpacity: 0.05,
    sparkCount: 18
  });

  buildStrand(effect, {
    phase: phase + 3.35,
    turns: 2.05,
    verticalPhase: Math.PI * 0.82,
    radiusX: 1.04,
    radiusZ: 0.62,
    height: 3.0,
    wobble: 0.08,
    drift: 0.09,
    speed: 0.028,
    offset: 0.58,
    coreColor: 0xffffff,
    haloColor: 0x8adfff,
    sparkColor: 0xffffff,
    emissiveColor: 0x95ebff,
    coreRadius: 0.007,
    haloRadius: 0.026,
    coreOpacity: 0.16,
    haloOpacity: 0.028,
    sparkCount: 12
  });

  const topHoop = buildHoop(1.3, 0.82, 0xffd871, 0.11, 0.06);
  const midHoop = buildHoop(0.0, 1.02, 0x68efff, 0.06, -0.04);
  const lowHoop = buildHoop(-1.3, 0.82, 0xffd871, 0.095, -0.07);
  group.add(topHoop, midHoop, lowHoop);
  effect.hoops.push(topHoop, midHoop, lowHoop);

  const aura = new THREE.Mesh(
    new THREE.CylinderGeometry(1.02, 1.02, 3.0, 48, 1, true),
    makeMaterial({ color: 0x69e7ff, opacity: 0.02 })
  );
  aura.scale.z = 0.55;
  group.add(aura);
  effect.aura = aura;

  const innerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.84, 24, 20),
    makeMaterial({ color: 0xffefb2, opacity: 0.028 })
  );
  innerGlow.scale.set(1.04, 1.55, 0.62);
  group.add(innerGlow);
  effect.innerGlow = innerGlow;

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
  effect.camera.position.z = effect.camera.aspect < 0.34 ? 8.25 : effect.camera.aspect < 0.52 ? 7.85 : 7.35;
  effect.camera.updateProjectionMatrix();

  const aspect = width / Math.max(height, 1);
  const xScale = clamp(aspect * 3.1, 0.54, 1.14);
  const zScale = clamp(1.08 - aspect * 0.14, 0.78, 1.08);
  effect.group.scale.set(xScale, 1.02, zScale);
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
    const progress = ((base - i * 0.016) % 1 + 1) % 1;
    const point = strand.curve.getPointAt(progress);
    const tangent = strand.curve.getTangentAt(progress).normalize();
    spark.position.copy(point);
    spark.quaternion.setFromUnitVectors(UP, tangent);

    const frontFactor = point.z > 0 ? 1 : 0.42;
    const pulse = reduce ? 0.74 : 0.78 + Math.sin(time * 3.2 + i * 0.52 + strand.phase) * 0.12;
    const size = (strand.coreRadius * 3.5 + 0.011) * Math.pow(fade, 0.7) * (point.z > 0 ? 1.18 : 0.86);
    const stretch = i === 0 ? 2.7 : 1.5 + fade * 0.8;
    spark.scale.set(size * 0.9, size * stretch, size * 0.9);
    spark.material.opacity = clamp(fade * frontFactor * pulse * (i === 0 ? 1.15 : 1), 0, 0.9);
  }
}

function animate(timeMs) {
  const time = timeMs * 0.001;
  const hidden = document.visibilityState === "hidden";

  EFFECTS.forEach((effect) => {
    if (effect.dead || hidden) return;
    resizeEffect(effect);

    const slow = reduceMotion ? 0 : time;
    effect.group.rotation.y = effect.phase * 0.18 + slow * 0.44;
    effect.group.rotation.x = -0.16 + Math.sin(slow * 0.42 + effect.phase) * 0.052;
    effect.group.rotation.z = 0.05 + Math.sin(slow * 0.28 + effect.phase) * 0.025;

    effect.strands.forEach((strand, index) => {
      const wave = reduceMotion ? 0 : Math.sin(time * (0.82 + index * 0.18) + strand.phase);
      strand.strand.rotation.y = slow * (0.06 + index * 0.028) * (index % 2 ? -1 : 1);
      strand.strand.rotation.z = Math.sin(slow * 0.44 + index + effect.phase) * 0.03;
      strand.core.material.opacity = clamp(strand.coreOpacity + wave * 0.034, 0.02, 0.5);
      strand.halo.material.opacity = clamp(strand.haloOpacity + wave * 0.014, 0.01, 0.15);
      if (strand.core.material.emissiveIntensity !== undefined) {
        strand.core.material.emissiveIntensity = reduceMotion ? 0.42 : 0.68 + Math.max(0, wave) * 0.24;
      }
      updateComet(strand, time, reduceMotion);
    });

    effect.hoops.forEach((hoop, index) => {
      hoop.rotation.z = slow * (0.23 + index * 0.07) * (index === 1 ? -1 : 1);
      hoop.rotation.x = Math.PI * 0.5 + Math.sin(slow * 0.32 + index) * 0.06;
      hoop.material.opacity = reduceMotion ? 0.05 : clamp((index === 1 ? 0.05 : 0.085) + Math.sin(time * 0.9 + index) * 0.018, 0.025, 0.11);
    });

    if (effect.aura) {
      effect.aura.material.opacity = reduceMotion ? 0.012 : 0.02 + Math.sin(time * 0.62 + effect.phase) * 0.007;
      effect.aura.rotation.y = slow * -0.11;
    }

    if (effect.innerGlow) {
      effect.innerGlow.material.opacity = reduceMotion ? 0.02 : 0.022 + Math.sin(time * 0.74 + effect.phase) * 0.006;
      effect.innerGlow.rotation.y = slow * 0.06;
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
