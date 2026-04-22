/* ═══════════════════════════════════════════
   FERROMAX — MAIN.JS
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Año dinámico en footer ─────────────────────
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ── Header scroll effect ───────────────────────
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // ── Hamburger Menu ─────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('nav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      nav.classList.toggle('open');
    });

    // Cerrar nav al hacer clic en un enlace (móvil)
    nav.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', (e) => {
        // Toggle dropdown en móvil
        const parent = link.parentElement;
        if (parent.classList.contains('nav__item--dropdown') && window.innerWidth <= 768) {
          e.preventDefault();
          parent.classList.toggle('open');
          return;
        }
        hamburger.classList.remove('open');
        nav.classList.remove('open');
      });
    });

    // Cerrar nav al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target)) {
        hamburger.classList.remove('open');
        nav.classList.remove('open');
      }
    });
  }

  // ── Modales ────────────────────────────────────
  // NOTA: El login es manejado completamente por login.js que inyecta su propio modal
  // No hay modales residuales que manejar aquí

  // ── Botón cotizar (toast) ──────────────────────
  const btnCotizar = document.getElementById('btnCotizar');
  btnCotizar?.addEventListener('click', () => {
    const inputs  = document.querySelectorAll('.cotizar input, .cotizar select, .cotizar textarea');
    let valid = true;
    inputs.forEach(inp => {
      if (!inp.value.trim()) { valid = false; inp.style.borderColor = '#EF4444'; }
      else inp.style.borderColor = '';
    });
    if (!valid) { showToast('Por favor, completa todos los campos.', false); return; }
    showToast('✅ ¡Cotización enviada! Te contactaremos pronto.');
    inputs.forEach(inp => inp.value = '');
  });

  // ── Toast helper ──────────────────────────────
  function showToast(message, success = true) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.style.borderLeftColor = success ? 'var(--orange)' : '#EF4444';
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  }

  // ── Active nav link on scroll ──────────────────
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav__link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(sec => observer.observe(sec));

  // ── Scroll reveal (IntersectionObserver) ──────
  const revealEls = document.querySelectorAll('.cat-card, .equipo-card, .contacto-card, .valor');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = `${i * 60}ms`;
        entry.target.classList.add('revealed');
        revealObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  // Agregar clase base para animación
  revealEls.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    revealObs.observe(el);
  });

  // Aplicar cuando se revela
  document.addEventListener('animationend', () => {}, { passive: true });
  revealEls.forEach(el => {
    const obs = new MutationObserver(() => {
      if (el.classList.contains('revealed')) {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }
    });
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
  });

  // ── Parallax effect mejorado para hero ─────────
  const heroBg = document.querySelector('.hero__bg');
  const heroContent = document.querySelector('.hero__content');
  const hero = document.querySelector('.hero');
  
  if (heroBg && hero) {
    let ticking = false;
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const heroBottom = hero.offsetTop + hero.offsetHeight;
          
          // Solo aplicar parallax mientras el hero es visible
          if (scrollY < heroBottom) {
            // Parallax para el background (se mueve a 40% de la velocidad del scroll)
            const bgOffset = scrollY * 0.4;
            heroBg.style.transform = `translateY(${bgOffset}px)`;
            
            // Parallax suave para el contenido (se mueve a 20% de la velocidad del scroll)
            if (heroContent) {
              const contentOffset = scrollY * 0.15;
              heroContent.style.transform = `translateY(${contentOffset}px)`;
              heroContent.style.opacity = Math.max(0.5, 1 - scrollY / (hero.offsetHeight * 1.5));
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

});