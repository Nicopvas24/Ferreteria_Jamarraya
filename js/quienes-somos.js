'use strict';

const page = document.getElementById('qs-page');

// ── 1. SCROLL REVEAL ─────────────────────────────────────────────────────────
// Primero marcamos la página como lista (activa las animaciones CSS)
// y luego disparamos el observer.
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


// ── 2. FOTO DE HISTORIA ───────────────────────────────────────────────────────
const uploadHistory = document.getElementById('upload-history');
const historyImg    = document.getElementById('history-img');
const historyPh     = document.getElementById('history-placeholder');

uploadHistory?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  historyImg.src = URL.createObjectURL(file);
  historyImg.style.display = 'block';
  if (historyPh) historyPh.style.display = 'none';
});


// ── 3. FOTOS DE EQUIPO ────────────────────────────────────────────────────────
function bindTeamCard(card) {
  card.querySelector('.jm-team-upload')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const photo = card.querySelector('.jm-team-photo');
    const ph    = card.querySelector('.jm-team-placeholder');
    photo.src = URL.createObjectURL(file);
    photo.style.display = 'block';
    if (ph) ph.style.display = 'none';
  });
}

document.querySelectorAll('.jm-team-card').forEach(bindTeamCard);


// ── 4. GALERÍA ────────────────────────────────────────────────────────────────
function bindGallerySlot(input) {
  input.addEventListener('change', (e) => {
    const file   = e.target.files?.[0];
    if (!file) return;
    const slotId = e.target.dataset.slot;
    const slot   = document.getElementById(slotId);
    if (!slot) return;

    slot.querySelector('.jm-gallery-label')?.remove();
    e.target.remove();

    const img = document.createElement('img');
    img.src   = URL.createObjectURL(file);
    img.alt   = 'Foto de la ferretería';
    slot.appendChild(img);

    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.title       = 'Quitar foto';
    Object.assign(btn.style, {
      position: 'absolute', top: '8px', right: '8px',
      background: 'rgba(0,0,0,0.75)', color: '#fff',
      border: 'none', borderRadius: '50%',
      width: '28px', height: '28px', cursor: 'pointer',
      fontSize: '13px', zIndex: '5',
    });
    btn.addEventListener('click', () => resetGallerySlot(slot, slotId));
    slot.appendChild(btn);
  });
}

function resetGallerySlot(slot, slotId) {
  const n = slotId.replace('jm-slot-', '');
  slot.innerHTML = `
    <label for="upload-gal-${n}" class="jm-gallery-label">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span>Agregar foto</span>
    </label>
    <input type="file" id="upload-gal-${n}" accept="image/*"
           class="jm-file-input jm-gallery-upload" data-slot="${slotId}" />
  `;
  bindGallerySlot(slot.querySelector('.jm-gallery-upload'));
}

document.querySelectorAll('.jm-gallery-upload').forEach(bindGallerySlot);


// ── 5. AGREGAR INTEGRANTE ─────────────────────────────────────────────────────
let memberCount = 4;

document.getElementById('jm-add-member')?.addEventListener('click', () => {
  const grid = document.getElementById('jm-team-grid');
  if (!grid) return;

  const id   = `upload-team-${memberCount}`;
  const card = document.createElement('div');
  card.className = 'jm-team-card jm-reveal jm-visible';
  card.innerHTML = `
    <div class="jm-team-photo-wrap">
      <img src="" alt="" class="jm-team-photo" />
      <div class="jm-team-placeholder">
        <label for="${id}" class="jm-upload-sm">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Foto</span>
        </label>
        <input type="file" id="${id}" accept="image/*" class="jm-file-input jm-team-upload" />
      </div>
    </div>
    <div class="jm-team-info">
      <h4 contenteditable="true" class="jm-editable">Nuevo Integrante</h4>
      <span contenteditable="true" class="jm-editable jm-team-role">Cargo</span>
      <p contenteditable="true" class="jm-editable jm-team-bio">Descripción del integrante.</p>
    </div>
  `;

  bindTeamCard(card);
  grid.appendChild(card);
  memberCount++;
});