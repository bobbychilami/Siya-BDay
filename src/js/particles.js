/**
 * Canvas 2D flower petals.
 * - max 32 particles, DPR capped at 2
 * - paused when the cover is offscreen or the tab is hidden
 * - disabled for reduced motion
 */

const MAX_PARTICLES = 32;

const PETAL_COLOURS = [
  [242, 216, 216], // soft blush
  [255, 249, 240], // warm ivory
  [217, 208, 231], // dusty lavender
  [242, 212, 123], // lemon
  [184, 217, 229], // powder blue
];

export function createDust(canvas, { reduceMotion = false } = {}) {
  if (!canvas) return { start() {}, stop() {}, burst() {}, destroy() {} };
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return { start() {}, stop() {}, burst() {}, destroy() {} };

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let width = 0;
  let height = 0;
  let particles = [];
  let running = false;
  let raf = 0;
  let offscreen = false;
  let hidden = false;
  let lastTime = 0;
  let boost = 0;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function makeParticle(seed = false) {
    return {
      x: rand(0, width),
      y: seed ? rand(0, height) : rand(-height * 0.2, -10),
      r: rand(2.2, 5.6),
      vy: rand(0.16, 0.52),
      vx: rand(-0.16, 0.16),
      spin: rand(-0.014, 0.014),
      angle: rand(0, Math.PI * 2),
      sway: rand(0.5, 1.5),
      phase: rand(0, Math.PI * 2),
      colour: PETAL_COLOURS[Math.floor(rand(0, PETAL_COLOURS.length))],
      alpha: rand(0.32, 0.62),
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: MAX_PARTICLES }, () => makeParticle(true));
  }

  function petalPath(r) {
    const w = r * 1.55;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(w * 0.9, -r * 0.6, w * 0.85, r * 0.6, 0, r);
    ctx.bezierCurveTo(-w * 0.85, r * 0.6, -w * 0.9, -r * 0.6, 0, -r);
    ctx.closePath();
  }

  function draw(time) {
    if (!running) return;
    raf = requestAnimationFrame(draw);
    if (offscreen || hidden) return;

    const dt = Math.min(48, time - (lastTime || time));
    lastTime = time;
    const step = dt / 16.67;

    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.phase += 0.012 * p.sway * step;
      p.angle += p.spin * step;
      p.y += (p.vy - boost * 0.9) * step;
      p.x += (p.vx + Math.sin(p.phase) * 0.22) * step + boost * Math.sin(p.phase) * 0.7 * step;

      if (p.y > height + 22) {
        p.y = -18;
        p.x = rand(0, width);
        p.r = rand(2.2, 5.6);
      }
      if (p.x < -24) p.x = width + 20;
      if (p.x > width + 24) p.x = -20;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      petalPath(p.r);
      const [r, g, b] = p.colour;
      const grad = ctx.createLinearGradient(0, -p.r, 0, p.r);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${Math.min(0.95, p.alpha + 0.16)})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${p.alpha * 0.6})`);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = `rgba(169, 107, 88, 0.16)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }

    boost *= 0.982;
  }

  function start() {
    if (running || reduceMotion) return;
    resize();
    running = true;
    lastTime = 0;
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // a soft puff of petals as the ribbon comes undone
  function burst() {
    if (reduceMotion || !running) return;
    boost = 1.8;
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: width / 2 + rand(-70, 70),
        y: height * 0.48 + rand(-40, 40),
        r: rand(2.4, 5.2),
        vy: rand(-1.4, -0.4),
        vx: rand(-0.7, 0.7),
        spin: rand(-0.02, 0.02),
        angle: rand(0, Math.PI * 2),
        sway: rand(0.6, 1.4),
        phase: rand(0, Math.PI),
        colour: PETAL_COLOURS[Math.floor(rand(0, PETAL_COLOURS.length))],
        alpha: rand(0.4, 0.7),
      });
    }
    if (particles.length > MAX_PARTICLES + 12) {
      particles.splice(0, particles.length - (MAX_PARTICLES + 12));
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      offscreen = !entries[0].isIntersecting;
    },
    { threshold: 0 }
  );
  io.observe(canvas);

  const onVisibility = () => {
    hidden = document.hidden;
  };
  document.addEventListener("visibilitychange", onVisibility);

  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 180);
  };
  window.addEventListener("resize", onResize, { passive: true });

  return {
    start,
    stop,
    burst,
    destroy() {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    },
  };
}
