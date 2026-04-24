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

// Cargar carrito global (disponible en todas las páginas con navbar)
if (!document.getElementById('_cart-js-loaded')) {
  const _cartScript = document.createElement('script');
  _cartScript.id  = '_cart-js-loaded';
  _cartScript.src = '../assets/js/cart.js';
  document.head.appendChild(_cartScript);
}

if (document.getElementById('footer')) {
  cargar("footer", "../components/layout/footer.html", "../assets/css/footer.css");
}

// Cargar módulo de recuperación de contraseña PRIMERO
const recuperarScript = document.createElement('script');
recuperarScript.src = '../assets/js/recuperar-contrasena.js';
document.body.appendChild(recuperarScript);

// Cargar módulo de login DESPUÉS (depende de RecuperarContrasena)
const loginScript = document.createElement('script');
loginScript.src = '../assets/js/login.js';
document.body.appendChild(loginScript);

/* ── Modal de checkout compartido ── */
if (!document.getElementById('jm-checkout-modal')) {
  // CSS
  const checkoutCss = document.createElement('link');
  checkoutCss.rel  = 'stylesheet';
  checkoutCss.href = '../assets/css/checkout.css';
  document.head.appendChild(checkoutCss);

  // HTML del modal (fetch + inject en body)
  fetch('../components/modals/checkout-modal.html')
    .then(r => r.text())
    .then(html => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);

      // JS del checkout DESPUÉS de que el HTML ya está en el DOM
      const checkoutScript = document.createElement('script');
      checkoutScript.src = '../assets/js/checkout.js';
      document.body.appendChild(checkoutScript);
    })
    .catch(err => console.warn('[include.js] No se pudo cargar checkout-modal:', err));
}
