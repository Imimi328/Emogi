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

  // Three.js 3D Background
  const canvas = d.getElementById("bg-canvas");
  if (canvas && window.THREE && !prefersReduced.matches) {
    const scene = new THREE.Scene();
    
    // Read theme colors
    const getColors = () => {
      const style = getComputedStyle(document.documentElement);
      return {
        bg: new THREE.Color(style.getPropertyValue("--bg").trim() || "#050505"),
        fg: new THREE.Color(style.getPropertyValue("--fg").trim() || "#E2E8F0"),
        accent: new THREE.Color(style.getPropertyValue("--accent").trim() || "#00FFCB")
      };
    };
    
    let colors = getColors();
    scene.background = colors.bg;
    scene.fog = new THREE.FogExp2(colors.bg, 0.002);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Start camera further back
    camera.position.z = 50;
    camera.position.y = 10;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize for high DPI but cap at 2
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Highly optimized InstancedMesh for thousands of floating objects
    const count = 1500;
    const geometry = new THREE.IcosahedronGeometry(1, 0); // Low poly
    const material = new THREE.MeshBasicMaterial({ 
      color: colors.accent, 
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });

    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();

    // Distribute objects in a massive tunnel/field
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 500;
      
      dummy.position.set(x, y, z);
      
      // Random rotation
      dummy.rotation.x = Math.random() * Math.PI;
      dummy.rotation.y = Math.random() * Math.PI;
      
      // Random scale
      const scale = Math.random() * 2 + 0.5;
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    
    scene.add(instancedMesh);

    // Handle Resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Handle Theme Toggle Update
    const observer = new MutationObserver(() => {
      colors = getColors();
      scene.background = colors.bg;
      scene.fog.color = colors.bg;
      material.color = colors.accent;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Scroll Interaction: Fly through the 3D space
    let scrollY = window.scrollY;
    let targetZ = 50;
    
    window.addEventListener('scroll', () => {
      scrollY = window.scrollY;
      // Map scroll to Z depth (scrolling down moves camera forward negatively into the Z axis)
      targetZ = 50 - (scrollY * 0.05); 
    });

    // Animation Loop
    const clock = new THREE.Clock();
    
    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      
      // Slowly rotate the entire field
      instancedMesh.rotation.x += 0.05 * delta;
      instancedMesh.rotation.y += 0.03 * delta;
      
      // Smoothly interpolate camera position for that premium buttery feel
      camera.position.z += (targetZ - camera.position.z) * 0.05;
      
      // Add subtle floating to camera
      const elapsedTime = clock.getElapsedTime();
      camera.position.y = 10 + Math.sin(elapsedTime * 0.5) * 2;
      camera.position.x = Math.cos(elapsedTime * 0.3) * 2;

      renderer.render(scene, camera);
    }
    
    animate();
  }
})();
