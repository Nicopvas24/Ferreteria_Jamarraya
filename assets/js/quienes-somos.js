'use strict';

const page = document.getElementById('qs-page');

// ── 1. SCROLL REVEAL ─────────────────────────────────────────────────────────
// Anima los elementos al entrar en viewport
if (page) {
  page.classList.add('jm-ready');

  const reveals = page.querySelectorAll('.jm-reveal');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('jm-visible');
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  reveals.forEach((el) => observer.observe(el));

  // Fallback: si después de 1.5s aún hay elementos ocultos, los mostramos
  setTimeout(() => {
    page.querySelectorAll('.jm-reveal:not(.jm-visible)').forEach((el) => {
      el.classList.add('jm-visible');
    });
  }, 1500);
}