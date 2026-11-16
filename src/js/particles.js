/**
 * Canvas 2D dust motes.
 * - max 40 particles, DPR capped at 2
 * - paused when the cover is offscreen or the tab is hidden
 * - disabled for reduced motion
 */

const MAX_PARTICLES = 40;

export function createDust(canvas, { reduceMotion = false } = {}) {
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
      y: seed ? rand(0, height) : rand(height * 0.45, height * 0.92),
      r: rand(0.7, 2.6),
      vy: rand(-0.22, -0.06),
      vx: rand(-0.1, 0.1),
      life: rand(0.35, 1),
      twinkle: rand(0.004, 0.014),
      phase: rand(0, Math.PI * 2),
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

  function draw(time) {
    if (!running) return;
    raf = requestAnimationFrame(draw);
    if (offscreen || hidden) return;

    const dt = Math.min(48, time - (lastTime || time));
    lastTime = time;
    const step = dt / 16.67;

    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.phase += p.twinkle * step;
      p.y += (p.vy - boost * 0.55) * step;
      p.x += (p.vx + Math.sin(p.phase) * 0.06) * step;
      if (p.y < -12) {
        p.y = height + 10;
        p.x = rand(0, width);
        p.r = rand(0.7, 2.6);
      }
      if (p.x < -12) p.x = width + 10;
      if (p.x > width + 12) p.x = -10;

      const alpha = p.life * (0.28 + Math.abs(Math.sin(p.phase)) * 0.5);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.4);
      glow.addColorStop(0, `rgba(255, 236, 196, ${Math.min(0.9, alpha)})`);
      glow.addColorStop(0.4, `rgba(226, 185, 122, ${alpha * 0.5})`);
      glow.addColorStop(1, "rgba(226, 185, 122, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3.4, 0, Math.PI * 2);
      ctx.fill();
    }

    boost *= 0.985;
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

  // brief acceleration + sparkle surge for the seal ignition
  function burst() {
    if (reduceMotion) return;
    boost = 1.6;
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: width / 2 + rand(-60, 60),
        y: height * 0.5 + rand(-30, 40),
        r: rand(0.8, 2.2),
        vy: rand(-1.6, -0.7),
        vx: rand(-0.5, 0.5),
        life: rand(0.5, 1),
        twinkle: rand(0.01, 0.03),
        phase: rand(0, Math.PI),
      });
    }
    if (particles.length > MAX_PARTICLES + 14) particles.splice(0, particles.length - (MAX_PARTICLES + 14));
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
