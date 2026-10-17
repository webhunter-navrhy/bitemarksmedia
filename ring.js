/* „The mark“ – čárkovaná elipsa z loga jako lesklá vínová lakovaná stuha (WebGL, three.js) */
import * as THREE from "three";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function studio(renderer) {
  // vlastní studio: tmavý prostor, powder blue podlaha a dlouhé softboxy → protáhlé odlesky laku
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(.05, .065, .085), side: THREE.BackSide })));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: new THREE.Color(.36, .48, .6) }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -6; s.add(floor);
  const box = (w, h, x, y, z, rx, ry, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * .98), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m);
  };
  box(16, 1.1, 0, 7, 2, Math.PI / 2, 0, 6);
  box(1.2, 10, -8, 1, 4, 0, Math.PI / 2.4, 3.2);
  box(1.0, 8, 9, 0, -2, 0, -Math.PI / 2.2, 2.2);
  box(6, 4, 0, 1, 12, 0, Math.PI, 1.4);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, .015).texture;
  pm.dispose();
  return tex;
}

export function mountRing(canvas, o = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { canvas.dataset.fail = "1"; return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.environment = studio(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50);
  camera.position.set(0, 0, o.dist || 7.2);

  const U = { uTime: { value: o.phase || 0 }, uTwist: { value: 1 }, uFlat: { value: .28 }, uWide: { value: 1.15 } };
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x6a0c18, roughness: .1, metalness: .05, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.35 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = `uniform float uTime; uniform float uTwist; uniform float uFlat; uniform float uWide;
      vec2 rot2(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c*p.x - s*p.y, s*p.x + c*p.y); }
      ` + sh.vertexShader
      .replace("#include <beginnormal_vertex>", `
        float uA = atan(position.y, position.x);
        vec3 nR = vec3(cos(uA), sin(uA), 0.0);
        float th = uTwist * uA + uTime * .35 + .5 * sin(2.0 * uA + uTime * .45);
        vec2 nn = vec2(dot(normal, nR), normal.z);
        nn = normalize(vec2(nn.x * uFlat, nn.y * uWide));
        nn = rot2(nn, th);
        vec3 objectNormal = nR * nn.x + vec3(0., 0., 1.) * nn.y;`)
      .replace("#include <begin_vertex>", `
        float Rr = 1.35 + .06 * sin(3.0 * uA + uTime * .6);
        vec3 d = position - nR * 1.35;
        vec2 ab = vec2(dot(d, nR) * uWide, d.z * uFlat);
        ab = rot2(ab, th);
        vec3 transformed = nR * (Rr + ab.x) + vec3(0., 0., 1.) * ab.y;`);
  };
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(1.35, .34, 96, 560), mat);
  const base = o.rot || [-1.05, .35, .2];
  mesh.rotation.set(...base);
  scene.add(mesh);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas); resize();

  let mx = 0, my = 0, tx = 0, ty = 0, scrollK = 0, visible = false, raf = 0, last = performance.now(), t = U.uTime.value;
  addEventListener("pointermove", e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  const frame = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    t += dt; U.uTime.value = t;
    tx += (mx - tx) * .045; ty += (my - ty) * .045;
    if (o.scroll) { const r = canvas.getBoundingClientRect(); scrollK = Math.max(-1, Math.min(1, -r.top / innerHeight)); }
    mesh.rotation.x = base[0] + ty * .35 + scrollK * .5;
    mesh.rotation.y = base[1] + tx * .55;
    mesh.rotation.z = base[2] + t * .05 + scrollK * .35;
    renderer.render(scene, camera);
  };
  const loop = now => { frame(now); raf = visible ? requestAnimationFrame(loop) : 0; };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && !reduce;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }).observe(canvas);
  frame(performance.now());
  canvas.classList.add("is-ready");
  return { mesh };
}

document.querySelectorAll("canvas[data-ring]").forEach(c => {
  const cfg = JSON.parse(c.dataset.ring || "{}");
  mountRing(c, cfg);
});
