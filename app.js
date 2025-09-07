(() => {
  const { gsap, ScrollTrigger } = window;
  const d = document;
  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)");
  const root = d.documentElement;

  // Update copyright year
  const year = d.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Mobile menu toggle with scroll lock
  const menuBtn = d.getElementById("menuBtn");
  const mobileNav = d.getElementById("mobileNav");
  function setScrollLock(lock) {
    d.body.style.overflow = lock ? "hidden" : "";
  }
  if (menuBtn && mobileNav) {
    const toggleNav = () => {
      const isHidden = mobileNav.getAttribute("aria-hidden") === "true";
      mobileNav.setAttribute("aria-hidden", String(!isHidden));
      menuBtn.setAttribute("aria-expanded", String(isHidden));
      setScrollLock(isHidden);
      if (isHidden) {
        mobileNav.querySelector("a,button")?.focus();
      } else {
        menuBtn.focus();
      }
    };
    menuBtn.addEventListener("click", toggleNav);
    d.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && mobileNav.getAttribute("aria-hidden") === "false") {
        toggleNav();
      }
    });
    mobileNav.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.tagName === "A") toggleNav();
    });
  }

  // Theme setup
  const themeToggle = d.getElementById("themeToggle");
  const themeToggleM = d.getElementById("themeToggleM");
  const darkColors = { bg: 15, fg: 245, muted: 189 };
  const lightColors = { bg: 246, fg: 17, muted: 75 };
  let currentTheme = localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

  function updateButtonIcon(theme) {
    const icon = theme === "light" ? "🌙" : "☀️";
    [themeToggle, themeToggleM].forEach((btn) => {
      if (!btn) return;
      btn.textContent = icon;
      btn.setAttribute("aria-pressed", theme === "light");
    });
  }

  function applyTheme(theme, animate = true) {
    if (prefersReduced.matches || !animate || !gsap) {
      root.setAttribute("data-theme", theme);
      updateButtonIcon(theme);
      localStorage.setItem("theme", theme);
      currentTheme = theme;
      return;
    }
    const from = theme === "light" ? darkColors : lightColors;
    const to = theme === "light" ? lightColors : darkColors;

    gsap.to(from, {
      duration: 0.8,
      bg: to.bg,
      fg: to.fg,
      muted: to.muted,
      ease: "power2.inOut",
      onUpdate: () => {
        root.style.setProperty("--bg", `rgb(${from.bg},${from.bg},${from.bg})`);
        root.style.setProperty("--fg", `rgb(${from.fg},${from.fg},${from.fg})`);
        root.style.setProperty("--muted", `rgb(${from.muted},${from.muted},${from.muted})`);
      },
      onComplete: () => {
        root.setAttribute("data-theme", theme);
        updateButtonIcon(theme);
        localStorage.setItem("theme", theme);
        currentTheme = theme;
        // Clear inline overrides so CSS variables are authoritative per theme
        root.style.removeProperty("--bg");
        root.style.removeProperty("--fg");
        root.style.removeProperty("--muted");
      }
    });
  }

  applyTheme(currentTheme, false);
  [themeToggle, themeToggleM].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      applyTheme(currentTheme === "light" ? "dark" : "light");
    });
  });

  if (gsap && ScrollTrigger) {
    ScrollTrigger.config({ limitCallbacks: true });
    gsap.utils.toArray(".reveal").forEach((el) => {
      gsap.fromTo(
        el,
        { y: 14, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });
  }

  // Canvas animation (respects reduced motion)
  const canvas = d.getElementById("heroCanvas");
  if (canvas && !prefersReduced.matches) {
    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    let width, height;

    function resizeCanvas() {
      width = canvas.clientWidth * DPR;
      height = 400 * DPR;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = canvas.clientWidth + "px";
      canvas.style.height = "400px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    class Dot {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = Math.random() * 1.2 - 0.6;
        this.vy = Math.random() * 1.2 - 0.6;
        this.radius = Math.random() * 2 + 1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        const fg = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim();
        ctx.fillStyle = fg || "#fff";
        ctx.fill();
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }
    }

    const dots = Array.from({ length: 100 }, () => new Dot());

    function drawLines() {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      ctx.strokeStyle = accent || "rgba(0,255,203,0.6)";
      ctx.lineWidth = 0.6;
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx.globalAlpha = 1 - dist / 120;
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      dots.forEach((d) => { d.update(); d.draw(); });
      drawLines();
      requestAnimationFrame(animate);
    }

    animate();
  }
})();
