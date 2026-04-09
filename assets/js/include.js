/* ════════════════════════════════════════════════════════════
   include.js — Carga componentes globales (navbar, footer, login)
════════════════════════════════════════════════════════════ */

function cargar(id, archivo, css = null) {
  // Inyectar CSS con ID único para evitar duplicados
  if (css) {
    const cssId = css.replace(/[^a-z0-9]/gi, '-');
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = css;
      link.id = cssId;
      document.head.prepend(link);
    }
  }

  // Cargar HTML del componente
  fetch(archivo)
    .then(res => {
      if (!res.ok) throw new Error(`No se encontró: ${archivo}`);
      return res.text();
    })
    .then(data => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = data;

        // Ejecutar scripts dentro del HTML inyectado (ej: el año del footer)
        el.querySelectorAll('script').forEach(oldScript => {
          const newScript = document.createElement('script');
          newScript.textContent = oldScript.textContent;
          document.body.appendChild(newScript);
          oldScript.remove();
        });

      } else {
        console.error(`❌ No existe elemento con id: "${id}"`);
      }
    })
    .catch(err => console.error(`❌ Error cargando "${archivo}":`, err));
}

// Cargar componentes globales (rutas relativas funcionan desde cualquier página)
if (document.getElementById('navbar')) {
  cargar("navbar", "../components/layout/navbar.html", "../assets/css/header.css");
}

if (document.getElementById('footer')) {
  cargar("footer", "../components/layout/footer.html", "../assets/css/footer.css");
}

// Cargar módulo de login
const loginScript = document.createElement('script');
loginScript.src = '../assets/js/login.js';
document.body.appendChild(loginScript);
