/* Panel de administración */
(function () {
  'use strict';
  const { SOCIALS, THUMB_ICONS, FONTS, THEMES, ANIMATIONS, esc, uid } = window.LT;

  const DRAFT_KEY = 'lt-draft-v1';
  const GH_KEY = 'lt-gh-v1';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const state = {
    data: null,
    publishedJson: '',
    tab: 'links',
    panels: {},          // linkId -> panel abierto
    addOpen: false,
    previewReady: false
  };

  /* ================= Utilidades ================= */
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function toast(msg, isErr) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('err', !!isErr);
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), isErr ? 4500 : 2200);
  }

  function src(p) {
    if (!p) return '';
    return /^(https?:|data:|blob:|\/)/.test(p) ? p : '../' + p;
  }

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function setPath(obj, path, val) {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) {
      if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {};
      o = o[ks[i]];
    }
    o[ks[ks.length - 1]] = val;
  }

  function normalize(d) {
    d = d || {};
    d.version = 1;
    d.profile = Object.assign({ title: '', bio: '', avatar: '', avatarShape: 'circle', avatarSize: 'small', brandText: '' }, d.profile);
    d.socials = Array.isArray(d.socials) ? d.socials : [];
    d.socials.forEach(s => { if (!s.id) s.id = uid('s'); if (s.enabled == null) s.enabled = true; });
    d.socialPosition = d.socialPosition || 'top';
    d.links = Array.isArray(d.links) ? d.links : [];
    d.links.forEach(l => {
      if (!l.id) l.id = uid('l');
      l.type = l.type || 'link';
      if (l.enabled == null) l.enabled = true;
      l.layout = l.layout || 'classic';
      l.thumb = l.thumb || { type: '', value: '' };
      l.animation = l.animation || 'none';
      l.schedule = l.schedule || { start: '', end: '' };
    });
    d.theme = d.theme || clone(THEMES.aire);
    d.theme.background = Object.assign({ type: 'flat', color: '#eceef1', color2: '#c9d3e0', direction: '180deg', image: '' }, d.theme.background);
    d.theme.button = Object.assign({ style: 'fill', radius: 'sm', color: '#ffffff', textColor: '#000000', shadowColor: '#000000' }, d.theme.button);
    d.theme.font = d.theme.font || 'Inter';
    d.theme.textColor = d.theme.textColor || '#000000';
    d.settings = Object.assign({ siteUrl: '', metaTitle: '', metaDescription: '', showShare: true, showQr: true, showBrand: true, footerText: '', goatcounter: '' }, d.settings);
    return d;
  }

  function dataJson(d) {
    const c = clone(d);
    delete c.updatedAt;
    return JSON.stringify(c);
  }

  /* ================= Persistencia ================= */
  function save(opts) {
    opts = opts || {};
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state.data));
    } catch (e) {
      toast('No se pudo guardar el borrador (¿imágenes muy grandes?). Publica para no perder cambios.', true);
    }
    updateStatus();
    pushPreview();
    if (opts.rerender) render();
  }

  function isDirty() {
    return dataJson(state.data) !== state.publishedJson;
  }

  function updateStatus() {
    const s = $('#status');
    const d = isDirty();
    s.textContent = d ? 'Cambios sin publicar' : 'Publicado';
    s.classList.toggle('dirty', d);
  }

  /* ================= Vista previa ================= */
  let previewTimer = null;
  function pushPreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const f = $('#previewFrame');
      if (!state.previewReady || !state.data || !f.contentWindow) return;
      f.contentWindow.postMessage({ type: 'lt-preview', data: state.data }, location.origin);
    }, 60);
  }
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin) return;
    if (e.data && e.data.type === 'lt-ready') { state.previewReady = true; pushPreview(); }
  });
  // Por si el iframe terminó de cargar antes de que este script escuchara 'lt-ready'
  $('#previewFrame').addEventListener('load', () => { state.previewReady = true; pushPreview(); });
  if ($('#previewFrame').contentDocument && $('#previewFrame').contentDocument.readyState === 'complete' &&
      $('#previewFrame').contentWindow.LT) state.previewReady = true;

  /* ================= Imágenes ================= */
  function pickImage(maxSize) {
    return new Promise((resolve) => {
      const inp = $('#filePicker');
      inp.value = '';
      inp.onchange = () => {
        const file = inp.files && inp.files[0];
        if (!file) return resolve(null);
        resizeImage(file, maxSize || 1000).then(resolve).catch(err => { toast('Imagen no válida: ' + err.message, true); resolve(null); });
      };
      inp.click();
    });
  }

  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) return reject(new Error('el archivo no es una imagen'));
      if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
        if (file.size > 1.5 * 1024 * 1024) return reject(new Error('máximo 1.5 MB para GIF/SVG'));
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(new Error('no se pudo leer'));
        return r.readAsDataURL(file);
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        const png = file.type === 'image/png';
        if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('formato no soportado')); };
      img.src = url;
    });
  }

  /* ================= Componentes ================= */
  function colorField(path, label) {
    const v = getPath(state.data, path) || '#000000';
    return `<div class="field"><label>${label}</label><div class="color-field">
      <input type="color" data-bind="${path}" value="${esc(v)}" aria-label="${label}">
      <input class="input" type="text" data-bind="${path}" value="${esc(v)}" maxlength="9" aria-label="${label} (hex)">
    </div></div>`;
  }
  function seg(path, options, rerender) {
    const cur = getPath(state.data, path);
    return `<div class="seg">${Object.keys(options).map(k =>
      `<button type="button" class="${cur === k ? 'on' : ''}" data-set="${path}" data-value="${esc(k)}"${rerender === false ? ' data-norender' : ''}>${options[k]}</button>`
    ).join('')}</div>`;
  }
  function toggle(path, title, desc) {
    const v = getPath(state.data, path) !== false;
    return `<div class="toggle-row"><div><strong>${title}</strong>${desc ? `<small>${desc}</small>` : ''}</div>
      <label class="switch"><input type="checkbox" data-bind="${path}" ${v ? 'checked' : ''}><span></span></label></div>`;
  }
  function thumbMini(link) {
    const th = link.thumb || {};
    if (th.type === 'image' && th.value) return `<span class="lc-thumbmini"><img src="${esc(src(th.value))}" alt=""></span>`;
    if (th.type === 'emoji' && th.value) return `<span class="lc-thumbmini">${esc(th.value)}</span>`;
    if (th.type === 'icon' && SOCIALS[th.value]) return `<span class="lc-thumbmini"><i class="${SOCIALS[th.value].icon}"></i></span>`;
    return `<span class="lc-thumbmini"><i class="fa-regular fa-image" style="opacity:.35"></i></span>`;
  }

  /* ================= Pestaña: Links ================= */
  function viewLinks() {
    const d = state.data;
    const cards = d.links.map((l, i) => linkCard(l, i)).join('');
    return `
      <h1 class="title">Links</h1>
      <p class="sub">Agrega, ordena y personaliza los enlaces de tu página. Arrastra con <i class="fa-solid fa-grip-vertical"></i> para reordenar.</p>

      <button class="btn primary big" type="button" data-act="toggle-add"><i class="fa-solid fa-plus"></i> Agregar</button>
      <div class="card add-box ${state.addOpen ? 'open' : ''}" id="addBox">
        <div class="field"><label for="newUrl">URL</label>
          <input class="input" id="newUrl" type="url" placeholder="https://..." autocomplete="off"></div>
        <div class="field"><label for="newTitle">Título (opcional)</label>
          <input class="input" id="newTitle" type="text" placeholder="Se completa con el dominio si lo dejas vacío"></div>
        <div class="add-actions">
          <button class="btn primary" type="button" data-act="add-link"><i class="fa-solid fa-link"></i> Agregar enlace</button>
          <button class="btn" type="button" data-act="add-header"><i class="fa-solid fa-heading"></i> Agregar encabezado</button>
        </div>
      </div>

      <div class="lcards" id="lcards">${cards || '<div class="empty card">Aún no tienes enlaces. Pulsa “Agregar”.</div>'}</div>`;
  }

  function linkCard(l, i) {
    const p = state.panels[l.id];
    const now = new Date();
    const s = l.schedule || {};
    const badges = [];
    if (l.type !== 'header') {
      if (l.layout === 'featured') badges.push('<span class="badge">Destacado</span>');
      if (l.animation && l.animation !== 'none') badges.push(`<span class="badge">${ANIMATIONS[l.animation]}</span>`);
      if (l.sensitive) badges.push('<span class="badge warn">Sensible</span>');
      if (s.start && new Date(s.start) > now) badges.push(`<span class="badge warn">Programado: ${new Date(s.start).toLocaleString()}</span>`);
      if (s.end && new Date(s.end) < now) badges.push('<span class="badge warn">Expirado</span>');
      else if (s.end) badges.push(`<span class="badge">Hasta ${new Date(s.end).toLocaleString()}</span>`);
    }

    if (l.type === 'header') {
      return `
      <div class="lcard header-card ${l.enabled ? '' : 'off'}" data-idx="${i}" data-id="${esc(l.id)}">
        <div class="lc-main">
          <button class="handle" type="button" aria-label="Arrastrar para reordenar" title="Arrastrar"><i class="fa-solid fa-grip-vertical"></i></button>
          <div class="lc-fields"><input class="in-title" data-bind="links.${i}.title" value="${esc(l.title)}" placeholder="Título del encabezado"></div>
          <label class="switch" title="Mostrar/ocultar"><input type="checkbox" data-bind="links.${i}.enabled" ${l.enabled ? 'checked' : ''}><span></span></label>
        </div>
        <div class="lc-tools">
          <button class="tool" type="button" data-act="move" data-dir="-1" data-idx="${i}" title="Subir"><i class="fa-solid fa-arrow-up"></i></button>
          <button class="tool" type="button" data-act="move" data-dir="1" data-idx="${i}" title="Bajar"><i class="fa-solid fa-arrow-down"></i></button>
          <button class="tool del" type="button" data-act="delete" data-idx="${i}" title="Eliminar"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      </div>`;
    }

    const tool = (key, icon, title) =>
      `<button class="tool ${p === key ? 'on' : ''}" type="button" data-act="panel" data-panel="${key}" data-id="${esc(l.id)}" title="${title}" aria-label="${title}"><i class="${icon}"></i></button>`;

    return `
    <div class="lcard ${l.enabled ? '' : 'off'}" data-idx="${i}" data-id="${esc(l.id)}">
      <div class="lc-main">
        <button class="handle" type="button" aria-label="Arrastrar para reordenar" title="Arrastrar"><i class="fa-solid fa-grip-vertical"></i></button>
        ${thumbMini(l)}
        <div class="lc-fields">
          <input class="in-title" data-bind="links.${i}.title" value="${esc(l.title)}" placeholder="Título">
          <input class="in-url" data-bind="links.${i}.url" value="${esc(l.url)}" placeholder="URL" type="url">
        </div>
        <label class="switch" title="Mostrar/ocultar"><input type="checkbox" data-bind="links.${i}.enabled" ${l.enabled ? 'checked' : ''}><span></span></label>
      </div>
      ${badges.length ? `<div class="lc-badges">${badges.join('')}</div>` : ''}
      <div class="lc-tools">
        ${tool('layout', 'fa-solid fa-table-cells-large', 'Diseño')}
        ${tool('thumb', 'fa-regular fa-image', 'Miniatura')}
        ${tool('schedule', 'fa-regular fa-calendar', 'Programar')}
        ${tool('animation', 'fa-solid fa-wand-magic-sparkles', 'Animación')}
        ${tool('lock', 'fa-solid fa-lock', 'Contenido sensible')}
        <button class="tool" type="button" data-act="duplicate" data-idx="${i}" title="Duplicar" aria-label="Duplicar"><i class="fa-regular fa-copy"></i></button>
        <button class="tool" type="button" data-act="move" data-dir="-1" data-idx="${i}" title="Subir" aria-label="Subir"><i class="fa-solid fa-arrow-up"></i></button>
        <button class="tool" type="button" data-act="move" data-dir="1" data-idx="${i}" title="Bajar" aria-label="Bajar"><i class="fa-solid fa-arrow-down"></i></button>
        <button class="tool del" type="button" data-act="panel" data-panel="delete" data-id="${esc(l.id)}" title="Eliminar" aria-label="Eliminar"><i class="fa-regular fa-trash-can"></i></button>
      </div>
      ${p ? `<div class="lc-panel">${linkPanel(l, i, p)}</div>` : ''}
    </div>`;
  }

  const EMOJIS = ['🔗', '🚀', '💼', '📩', '📞', '🎥', '🎧', '📸', '🛒', '📚', '💡', '🤖', '⚙️', '🌐', '🔥', '⭐', '🎁', '📅', '📍', '❤️'];

  function linkPanel(l, i, p) {
    const base = `links.${i}`;
    if (p === 'layout') {
      return `<h4>Diseño</h4>
        <div class="layout-opts">
          <button type="button" class="layout-opt ${l.layout !== 'featured' ? 'on' : ''}" data-set="${base}.layout" data-value="classic">
            <div class="mini-classic"><i></i><b></b></div><strong>Clásico</strong><small>Eficiente, directo y compacto.</small></button>
          <button type="button" class="layout-opt ${l.layout === 'featured' ? 'on' : ''}" data-set="${base}.layout" data-value="featured">
            <div class="mini-featured"><i></i><b></b></div><strong>Destacado</strong><small>Imagen grande que llama la atención.</small></button>
        </div>
        ${l.layout === 'featured' && (l.thumb || {}).type !== 'image' ? '<p class="hint" style="text-align:center;margin-top:12px">Tip: agrega una imagen en “Miniatura” para que el diseño destacado luzca mejor.</p>' : ''}`;
    }
    if (p === 'thumb') {
      const th = l.thumb || {};
      return `<h4>Miniatura</h4>
        <div class="thumb-current">${thumbMini(l)}
          <div class="row">
            <button class="btn sm" type="button" data-act="thumb-upload" data-idx="${i}"><i class="fa-solid fa-upload"></i> Subir imagen</button>
            ${th.type ? `<button class="btn sm danger" type="button" data-act="thumb-clear" data-idx="${i}">Quitar</button>` : ''}
          </div>
        </div>
        <div class="field"><label>…o pega la URL de una imagen</label>
          <input class="input" type="url" placeholder="https://.../imagen.jpg" data-act-input="thumb-url" data-idx="${i}" value="${th.type === 'image' && /^https?:/.test(th.value) ? esc(th.value) : ''}"></div>
        <h3 style="margin-top:6px">Emoji</h3>
        <div class="icon-grid emoji-grid">${EMOJIS.map(e => `<button type="button" class="${th.type === 'emoji' && th.value === e ? 'on' : ''}" data-act="thumb-set" data-type="emoji" data-value="${e}" data-idx="${i}">${e}</button>`).join('')}</div>
        <h3>Icono</h3>
        <div class="icon-grid">${THUMB_ICONS.map(ic => `<button type="button" class="${th.type === 'icon' && th.value === ic.key ? 'on' : ''}" title="${ic.label}" data-act="thumb-set" data-type="icon" data-value="${ic.key}" data-idx="${i}"><i class="${ic.icon}"></i></button>`).join('')}</div>`;
    }
    if (p === 'schedule') {
      const s = l.schedule || {};
      return `<h4>Programar</h4>
        <div class="row">
          <div class="field"><label>Mostrar desde</label><input class="input" type="datetime-local" data-bind="${base}.schedule.start" value="${esc(s.start || '')}"></div>
          <div class="field"><label>Ocultar después de</label><input class="input" type="datetime-local" data-bind="${base}.schedule.end" value="${esc(s.end || '')}"></div>
        </div>
        <p class="hint">El enlace sólo aparecerá en tu página dentro de ese rango (hora local del visitante). Déjalo vacío para mostrarlo siempre.</p>
        ${s.start || s.end ? `<button class="btn sm" type="button" data-act="schedule-clear" data-idx="${i}" style="margin-top:10px">Quitar programación</button>` : ''}`;
    }
    if (p === 'animation') {
      return `<h4>Animación</h4>
        <div class="seg" style="justify-content:center">${Object.keys(ANIMATIONS).map(k =>
          `<button type="button" class="${l.animation === k ? 'on' : ''}" data-set="${base}.animation" data-value="${k}">${ANIMATIONS[k]}</button>`).join('')}</div>
        <p class="hint" style="text-align:center;margin-top:10px">Haz que tu enlace más importante destaque con un movimiento sutil.</p>`;
    }
    if (p === 'lock') {
      return `<h4>Contenido sensible</h4>
        <div class="toggle-row"><div><strong>Mostrar advertencia antes de abrir</strong><small>Los visitantes deberán confirmar que desean continuar (contenido 18+ o sensible).</small></div>
        <label class="switch"><input type="checkbox" data-bind="${base}.sensitive" ${l.sensitive ? 'checked' : ''}><span></span></label></div>`;
    }
    if (p === 'delete') {
      return `<h4>¿Eliminar este enlace?</h4>
        <div class="add-actions">
          <button class="btn" type="button" data-act="panel" data-panel="delete" data-id="${esc(l.id)}">Cancelar</button>
          <button class="btn primary" style="background:var(--danger);border-color:var(--danger)" type="button" data-act="delete" data-idx="${i}">Eliminar</button>
        </div>`;
    }
    return '';
  }

  /* ================= Pestaña: Apariencia ================= */
  function viewAppearance() {
    const t = state.data.theme;
    const themes = Object.keys(THEMES).map(k => {
      const th = THEMES[k];
      const bg = th.background.type === 'gradient' ? `linear-gradient(${th.background.direction}, ${th.background.color}, ${th.background.color2})` : th.background.color;
      const r = { square: '0', sm: '4px', md: '8px', full: '999px' }[th.button.radius];
      const bs = th.button.style;
      const btn = bs === 'outline'
        ? `border:2px solid ${th.button.color};background:transparent`
        : `background:${th.button.color};${bs === 'hard' ? `border:2px solid ${th.button.shadowColor};box-shadow:3px 3px 0 ${th.button.shadowColor}` : bs === 'soft' ? 'box-shadow:0 3px 8px rgba(0,0,0,.15)' : ''}`;
      return `<button type="button" class="theme-tile ${t.preset === k ? 'on' : ''}" data-act="theme" data-key="${k}">
        <div class="tt" style="background:${bg};color:${th.textColor}"><div class="av"></div>
          <span style="${btn};border-radius:${r}"></span><span style="${btn};border-radius:${r}"></span><span style="${btn};border-radius:${r}"></span></div>
        <em>${th.name}</em></button>`;
    }).join('');

    const bgType = t.background.type;
    const styles = { fill: 'Relleno', outline: 'Contorno', soft: 'Sombra suave', hard: 'Sombra marcada' };
    const radii = { square: 'Recto', sm: 'Redondeado', md: 'Más redondeado', full: 'Píldora' };
    const rpx = { square: '0', sm: '6px', md: '12px', full: '999px' };
    const sampleCss = (st) => st === 'outline' ? 'background:transparent;border-color:#222'
      : st === 'soft' ? 'box-shadow:0 4px 10px rgba(0,0,0,.15)'
      : st === 'hard' ? 'border-color:#222;box-shadow:4px 4px 0 #222' : '';

    return `
      <h1 class="title">Apariencia</h1>
      <p class="sub">Personaliza el estilo de tu página. Los cambios se ven al instante en la vista previa.</p>

      <div class="card"><h2>Temas</h2><div class="themes">${themes}</div>
        <p class="hint">Elegir un tema reemplaza fondo, botones y tipografía. Luego puedes ajustarlo abajo.</p></div>

      <div class="card"><h2>Fondo</h2>
        ${seg('theme.background.type', { flat: 'Color plano', gradient: 'Degradado', image: 'Imagen' })}
        <div class="row" style="margin-top:16px">
          ${colorField('theme.background.color', bgType === 'gradient' ? 'Color inicial' : 'Color de fondo')}
          ${bgType === 'gradient' ? colorField('theme.background.color2', 'Color final') : ''}
        </div>
        ${bgType === 'gradient' ? `<div class="field"><label>Dirección</label>${seg('theme.background.direction', { '180deg': '↓ Vertical', '90deg': '→ Horizontal', '135deg': '↘ Diagonal', '45deg': '↗ Diagonal' })}</div>` : ''}
        ${bgType === 'image' ? `<div class="row">
            <button class="btn sm" type="button" data-act="bg-upload"><i class="fa-solid fa-upload"></i> Subir imagen de fondo</button>
            ${t.background.image ? '<button class="btn sm danger" type="button" data-act="bg-clear">Quitar</button>' : ''}
          </div>
          ${t.background.image ? `<img src="${esc(src(t.background.image))}" alt="" style="margin-top:12px;max-height:140px;border-radius:12px">` : '<p class="hint">El color de fondo se usará mientras carga la imagen.</p>'}` : ''}
      </div>

      <div class="card"><h2>Botones</h2>
        <h3 style="margin-top:0">Estilo</h3>
        <div class="btn-styles">${Object.keys(styles).map(k => `
          <button type="button" class="bs ${t.button.style === k ? 'on' : ''}" data-set="theme.button.style" data-value="${k}">
            <div class="sample" style="border-radius:${rpx[t.button.radius]};${sampleCss(k)}"></div><small>${styles[k]}</small></button>`).join('')}</div>
        <h3>Esquinas</h3>
        <div class="btn-styles">${Object.keys(radii).map(k => `
          <button type="button" class="bs ${t.button.radius === k ? 'on' : ''}" data-set="theme.button.radius" data-value="${k}">
            <div class="sample" style="border-radius:${rpx[k]};${sampleCss(t.button.style)}"></div><small>${radii[k]}</small></button>`).join('')}</div>
        <h3>Colores</h3>
        <div class="row">
          ${colorField('theme.button.color', t.button.style === 'outline' ? 'Color del borde' : 'Color del botón')}
          ${colorField('theme.button.textColor', 'Texto del botón')}
          ${t.button.style === 'soft' || t.button.style === 'hard' ? colorField('theme.button.shadowColor', 'Color de sombra') : ''}
        </div>
      </div>

      <div class="card"><h2>Tipografía</h2>
        <div class="row">
          <div class="field"><label for="fontSel">Fuente</label>
            <select class="select input" id="fontSel" data-bind="theme.font">${FONTS.map(f => `<option ${t.font === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
          ${colorField('theme.textColor', 'Color del texto')}
        </div>
        <p class="hint">Fuentes servidas por Google Fonts. El color de texto aplica a nombre, bio, iconos y encabezados.</p>
      </div>`;
  }

  /* ================= Pestaña: Perfil ================= */
  function viewProfile() {
    const p = state.data.profile;
    const socials = state.data.socials.map((s, i) => `
      <div class="social-row" data-sidx="${i}">
        <span class="sico"><i class="${(SOCIALS[s.type] || SOCIALS.website).icon}"></i></span>
        <select class="select input" data-bind="socials.${i}.type" data-rerender aria-label="Red social">
          ${Object.keys(SOCIALS).map(k => `<option value="${k}" ${s.type === k ? 'selected' : ''}>${SOCIALS[k].label}</option>`).join('')}
        </select>
        <input class="input" type="url" data-bind="socials.${i}.url" value="${esc(s.url)}" placeholder="${esc((SOCIALS[s.type] || {}).placeholder || 'https://')}" aria-label="URL">
        <label class="switch" title="Mostrar/ocultar"><input type="checkbox" data-bind="socials.${i}.enabled" ${s.enabled !== false ? 'checked' : ''}><span></span></label>
        <button class="tool" type="button" data-act="smove" data-dir="-1" data-idx="${i}" title="Subir" aria-label="Subir"><i class="fa-solid fa-arrow-up"></i></button>
        <button class="tool" type="button" data-act="smove" data-dir="1" data-idx="${i}" title="Bajar" aria-label="Bajar"><i class="fa-solid fa-arrow-down"></i></button>
        <button class="tool del" type="button" data-act="sdelete" data-idx="${i}" title="Eliminar" aria-label="Eliminar"><i class="fa-regular fa-trash-can"></i></button>
      </div>`).join('');

    return `
      <h1 class="title">Perfil</h1>
      <p class="sub">Tu foto, nombre, biografía e iconos sociales.</p>

      <div class="card"><h2>Foto de perfil</h2>
        <div class="avatar-edit">
          ${p.avatar ? `<img src="${esc(src(p.avatar))}" alt="" style="border-radius:${p.avatarShape === 'square' ? '18px' : '50%'}">` : '<div class="ph"><i class="fa-solid fa-user"></i></div>'}
          <div class="btns">
            <button class="btn sm primary" type="button" data-act="avatar-upload"><i class="fa-solid fa-upload"></i> Subir foto</button>
            ${p.avatar ? '<button class="btn sm danger" type="button" data-act="avatar-clear">Quitar</button>' : ''}
          </div>
        </div>
        <div class="row" style="margin-top:16px">
          <div class="field"><label>Forma</label>${seg('profile.avatarShape', { circle: 'Círculo', square: 'Cuadrado' })}</div>
          <div class="field"><label>Tamaño</label>${seg('profile.avatarSize', { small: 'Pequeño', large: 'Grande', hero: 'Héroe' })}</div>
        </div>
      </div>

      <div class="card"><h2>Información</h2>
        <div class="field"><label for="pTitle">Nombre / título</label>
          <input class="input" id="pTitle" data-bind="profile.title" value="${esc(p.title)}" maxlength="60"></div>
        <div class="field"><label for="pBio">Bio</label>
          <textarea class="input" id="pBio" data-bind="profile.bio" maxlength="160" data-counter="bioCount">${esc(p.bio)}</textarea>
          <span class="counter" id="bioCount">${(p.bio || '').length}/160</span></div>
        <div class="field"><label for="pBrand">Monograma (esquina superior izquierda)</label>
          <input class="input" id="pBrand" data-bind="profile.brandText" value="${esc(p.brandText)}" maxlength="3" style="max-width:120px"></div>
      </div>

      <div class="card"><h2>Iconos sociales</h2>
        <div>${socials || '<p class="empty">Sin iconos todavía.</p>'}</div>
        <div class="row" style="margin-top:14px">
          <select class="select input" id="newSocial" style="max-width:220px" aria-label="Nueva red social">
            ${Object.keys(SOCIALS).map(k => `<option value="${k}">${SOCIALS[k].label}</option>`).join('')}
          </select>
          <button class="btn" type="button" data-act="sadd"><i class="fa-solid fa-plus"></i> Agregar icono</button>
        </div>
        <h3>Posición</h3>
        ${seg('socialPosition', { top: 'Arriba (bajo la bio)', bottom: 'Abajo (al final)' })}
      </div>`;
  }

  /* ================= Pestaña: Analíticas ================= */
  function viewAnalytics() {
    const code = state.data.settings.goatcounter;
    const rows = state.data.links.filter(l => l.type !== 'header').map(l =>
      `<tr><td>${esc(l.title || l.url)}</td><td><code>click-${esc(l.id)}</code></td></tr>`).join('');
    return `
      <h1 class="title">Analíticas</h1>
      <p class="sub">Visitas, clics por enlace, clics en redes y veces que se comparte.</p>

      <div class="callout"><i class="fa-solid fa-circle-info"></i><div>
        GitHub Pages es estático, así que las estadísticas se envían a <strong>GoatCounter</strong>:
        gratuito, sin cookies y respetuoso con la privacidad. Sólo necesitas crear una cuenta y pegar tu código aquí.</div></div>

      <div class="card"><h2>Conexión</h2>
        <div class="field"><label for="gcCode">Código de GoatCounter</label>
          <div class="row"><span style="color:var(--muted)">https://</span>
            <input class="input" id="gcCode" data-bind="settings.goatcounter" value="${esc(code)}" placeholder="tucodigo" style="max-width:220px">
            <span style="color:var(--muted)">.goatcounter.com</span></div></div>
        ${code ? `<a class="btn primary" href="https://${esc(code)}.goatcounter.com" target="_blank" rel="noopener"><i class="fa-solid fa-chart-line"></i> Abrir panel de estadísticas</a>`
               : '<p class="hint">Sin código, la página no registra estadísticas.</p>'}
      </div>

      <div class="card"><h2>Cómo activarlo</h2>
        <ol class="steps">
          <li>Crea una cuenta gratis en <a href="https://www.goatcounter.com/signup" target="_blank" rel="noopener">goatcounter.com/signup</a> y elige un código (p. ej. <code>davidching</code>).</li>
          <li>Escribe ese código arriba y pulsa <strong>Publicar</strong>.</li>
          <li>Las visitas aparecen como la ruta <code>/</code>; cada clic aparece como un evento con el nombre de la tabla.</li>
        </ol>
      </div>

      <div class="card"><h2>Eventos que se registran</h2>
        <table class="map"><thead><tr><th>Enlace</th><th>Evento</th></tr></thead><tbody>
          ${rows}
          <tr><td>Iconos sociales</td><td><code>social-&lt;red&gt;</code></td></tr>
          <tr><td>Compartir perfil / enlace</td><td><code>share-profile</code> · <code>share-&lt;id&gt;</code></td></tr>
        </tbody></table>
      </div>`;
  }

  /* ================= Pestaña: Ajustes ================= */
  function getGh() {
    try { return JSON.parse(localStorage.getItem(GH_KEY)) || {}; } catch (_) { return {}; }
  }
  function setGh(v) { localStorage.setItem(GH_KEY, JSON.stringify(v)); }

  function viewSettings() {
    const st = state.data.settings;
    const gh = getGh();
    return `
      <h1 class="title">Ajustes</h1>
      <p class="sub">SEO, visibilidad de elementos, publicación y copias de seguridad.</p>

      <div class="card"><h2>Publicación en GitHub</h2>
        <div class="callout warn"><i class="fa-solid fa-key"></i><div>
          El token se guarda <strong>sólo en este navegador</strong> (localStorage) y nunca se publica. Usa un
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">token fine-grained</a>
          limitado a este repositorio con permiso <em>Contents: Read and write</em>.</div></div>
        <div class="row">
          <div class="field"><label for="ghOwner">Usuario / organización</label><input class="input" id="ghOwner" value="${esc(gh.owner || '')}" placeholder="DavidSChing"></div>
          <div class="field"><label for="ghRepo">Repositorio</label><input class="input" id="ghRepo" value="${esc(gh.repo || '')}" placeholder="links"></div>
          <div class="field" style="flex-basis:120px"><label for="ghBranch">Rama</label><input class="input" id="ghBranch" value="${esc(gh.branch || 'main')}"></div>
        </div>
        <div class="field"><label for="ghToken">Token de acceso</label><input class="input" id="ghToken" type="password" value="${esc(gh.token || '')}" placeholder="github_pat_..." autocomplete="off"></div>
        <div class="row">
          <button class="btn primary" type="button" data-act="gh-save"><i class="fa-solid fa-floppy-disk"></i> Guardar y probar conexión</button>
          ${gh.token ? '<button class="btn danger" type="button" data-act="gh-forget">Olvidar token</button>' : ''}
        </div>
      </div>

      <div class="card"><h2>SEO y compartir</h2>
        <div class="field"><label for="sUrl">URL pública del sitio</label>
          <input class="input" id="sUrl" type="url" data-bind="settings.siteUrl" value="${esc(st.siteUrl)}" placeholder="https://usuario.github.io/links/"></div>
        <div class="field"><label for="sTitle">Título de la página (pestaña y buscadores)</label>
          <input class="input" id="sTitle" data-bind="settings.metaTitle" value="${esc(st.metaTitle)}" maxlength="70"></div>
        <div class="field"><label for="sDesc">Descripción</label>
          <textarea class="input" id="sDesc" data-bind="settings.metaDescription" maxlength="160">${esc(st.metaDescription)}</textarea></div>
        <p class="hint">Al publicar se regeneran las etiquetas meta/Open Graph de <code>index.html</code> para que las vistas previas en WhatsApp, LinkedIn, etc. salgan bien.</p>
      </div>

      <div class="card"><h2>Elementos visibles</h2>
        ${toggle('settings.showShare', 'Botón de compartir', 'Arriba a la derecha.')}
        ${toggle('settings.showBrand', 'Monograma', 'Arriba a la izquierda.')}
        ${toggle('settings.showQr', 'Código QR “Ver en el móvil”', 'Sólo en pantallas de escritorio.')}
        <div class="field" style="margin-top:12px"><label for="sFooter">Texto del pie de página</label>
          <input class="input" id="sFooter" data-bind="settings.footerText" value="${esc(st.footerText)}" placeholder="© 2026 David Ching"></div>
      </div>

      <div class="card"><h2>Copia de seguridad</h2>
        <div class="row">
          <button class="btn" type="button" data-act="export"><i class="fa-solid fa-download"></i> Exportar JSON</button>
          <button class="btn" type="button" data-act="import"><i class="fa-solid fa-file-import"></i> Importar JSON</button>
          <button class="btn danger" type="button" data-act="discard"><i class="fa-solid fa-rotate-left"></i> Descartar cambios sin publicar</button>
        </div>
      </div>`;
  }

  /* ================= Render ================= */
  const VIEWS = { links: viewLinks, appearance: viewAppearance, profile: viewProfile, analytics: viewAnalytics, settings: viewSettings };

  function render() {
    const ed = $('#editor');
    const active = document.activeElement;
    const keepId = active && active.id;
    ed.innerHTML = VIEWS[state.tab]();
    $$('#sidenav button').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
    if (keepId && document.getElementById(keepId)) document.getElementById(keepId).focus();
    updateStatus();
  }

  /* ================= Eventos: inputs ================= */
  document.addEventListener('input', (e) => {
    const el = e.target;
    const path = el.dataset && el.dataset.bind;
    if (path) {
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (el.type === 'text' && el.closest('.color-field')) {
        if (!/^#[0-9a-fA-F]{6}$/.test(v)) return; // espera a que el hex sea válido
      }
      setPath(state.data, path, v);
      // sincroniza otros inputs ligados al mismo valor (selector de color + hex)
      $$(`[data-bind="${path}"]`).forEach(o => { if (o !== el && o.type !== 'checkbox') o.value = v; });
      if (el.dataset.counter) $('#' + el.dataset.counter).textContent = v.length + '/' + el.maxLength;
      if (path.startsWith('theme.')) state.data.theme.preset = 'custom';
      const card = el.closest('.lcard');
      if (card && el.type === 'checkbox') card.classList.toggle('off', !el.checked);
      save();
      return;
    }
    if (el.dataset && el.dataset.actInput === 'thumb-url') {
      const i = +el.dataset.idx;
      const v = el.value.trim();
      if (/^https?:\/\/.+/.test(v)) {
        state.data.links[i].thumb = { type: 'image', value: v };
        save();
      }
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset && (el.dataset.rerender !== undefined || (el.dataset.bind || '').includes('schedule') || el.id === 'fontSel' || el.dataset.actInput)) {
      render();
    }
  });

  /* ================= Eventos: clicks ================= */
  document.addEventListener('click', async (e) => {
    const tabBtn = e.target.closest('#sidenav [data-tab]');
    if (tabBtn) {
      state.tab = tabBtn.dataset.tab;
      history.replaceState(null, '', '#' + state.tab);
      render(); window.scrollTo(0, 0); return;
    }

    const setBtn = e.target.closest('[data-set]');
    if (setBtn) {
      const path = setBtn.dataset.set;
      setPath(state.data, path, setBtn.dataset.value);
      if (path.startsWith('theme.')) state.data.theme.preset = 'custom';
      save({ rerender: true });
      return;
    }

    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const d = state.data;
    const idx = b.dataset.idx != null ? +b.dataset.idx : null;

    switch (act) {
      case 'toggle-add':
        state.addOpen = !state.addOpen;
        $('#addBox').classList.toggle('open', state.addOpen);
        if (state.addOpen) $('#newUrl').focus();
        break;

      case 'add-link': {
        let url = $('#newUrl').value.trim();
        if (!url) { toast('Escribe una URL', true); $('#newUrl').focus(); return; }
        if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url;
        let title = $('#newTitle').value.trim();
        if (!title) { try { title = new URL(url).hostname.replace(/^www\./, ''); } catch (_) { title = url; } }
        const l = { id: uid('l'), type: 'link', title, url, enabled: true, layout: 'classic', thumb: { type: '', value: '' }, animation: 'none', sensitive: false, schedule: { start: '', end: '' } };
        d.links.unshift(l);
        state.addOpen = false;
        save({ rerender: true });
        toast('Enlace agregado');
        break;
      }
      case 'add-header': {
        const title = $('#newTitle').value.trim() || 'Nuevo encabezado';
        d.links.unshift({ id: uid('h'), type: 'header', title, enabled: true });
        state.addOpen = false;
        save({ rerender: true });
        break;
      }
      case 'panel': {
        const id = b.dataset.id, p = b.dataset.panel;
        state.panels[id] = state.panels[id] === p ? null : p;
        render();
        break;
      }
      case 'move': case 'smove': {
        const arr = act === 'move' ? d.links : d.socials;
        const j = idx + (+b.dataset.dir);
        if (j < 0 || j >= arr.length) return;
        [arr[idx], arr[j]] = [arr[j], arr[idx]];
        save({ rerender: true });
        break;
      }
      case 'duplicate': {
        const c = clone(d.links[idx]);
        c.id = uid('l');
        c.title = c.title + ' (copia)';
        d.links.splice(idx + 1, 0, c);
        save({ rerender: true });
        break;
      }
      case 'delete':
        d.links.splice(idx, 1);
        save({ rerender: true });
        toast('Enlace eliminado');
        break;

      case 'thumb-upload': {
        const img = await pickImage(1200);
        if (!img) return;
        d.links[idx].thumb = { type: 'image', value: img };
        save({ rerender: true });
        break;
      }
      case 'thumb-set':
        d.links[idx].thumb = { type: b.dataset.type, value: b.dataset.value };
        save({ rerender: true });
        break;
      case 'thumb-clear':
        d.links[idx].thumb = { type: '', value: '' };
        save({ rerender: true });
        break;
      case 'schedule-clear':
        d.links[idx].schedule = { start: '', end: '' };
        save({ rerender: true });
        break;

      case 'theme': {
        const th = clone(THEMES[b.dataset.key]);
        delete th.name;
        const keepImg = d.theme.background.image;
        d.theme = Object.assign({ preset: b.dataset.key }, th);
        d.theme.background = Object.assign({ color2: '#c9d3e0', direction: '180deg', image: keepImg || '' }, th.background);
        save({ rerender: true });
        break;
      }
      case 'bg-upload': {
        const img = await pickImage(1600);
        if (!img) return;
        d.theme.background.image = img;
        d.theme.preset = 'custom';
        save({ rerender: true });
        break;
      }
      case 'bg-clear':
        d.theme.background.image = '';
        save({ rerender: true });
        break;

      case 'avatar-upload': {
        const img = await pickImage(600);
        if (!img) return;
        d.profile.avatar = img;
        save({ rerender: true });
        break;
      }
      case 'avatar-clear':
        d.profile.avatar = '';
        save({ rerender: true });
        break;

      case 'sadd': {
        const type = $('#newSocial').value;
        d.socials.push({ id: uid('s'), type, url: '', enabled: true });
        save({ rerender: true });
        const rows = $$('.social-row');
        const last = rows[rows.length - 1];
        if (last) $('input[type=url]', last).focus();
        break;
      }
      case 'sdelete':
        d.socials.splice(idx, 1);
        save({ rerender: true });
        break;

      case 'gh-save': {
        const gh = {
          owner: $('#ghOwner').value.trim(),
          repo: $('#ghRepo').value.trim(),
          branch: $('#ghBranch').value.trim() || 'main',
          token: $('#ghToken').value.trim()
        };
        setGh(gh);
        await testConnection(gh);
        render();
        break;
      }
      case 'gh-forget': {
        const gh = getGh(); delete gh.token; setGh(gh);
        toast('Token eliminado de este navegador');
        render();
        break;
      }
      case 'export': {
        const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'profile-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        break;
      }
      case 'import': {
        const inp = $('#jsonPicker');
        inp.value = '';
        inp.onchange = async () => {
          const f = inp.files && inp.files[0];
          if (!f) return;
          try {
            state.data = normalize(JSON.parse(await f.text()));
            save({ rerender: true });
            toast('Datos importados (recuerda publicar)');
          } catch (err) { toast('JSON no válido: ' + err.message, true); }
        };
        inp.click();
        break;
      }
      case 'discard':
        if (!confirm('¿Descartar todos los cambios sin publicar?')) return;
        localStorage.removeItem(DRAFT_KEY);
        state.data = normalize(JSON.parse(state.publishedSource));
        save({ rerender: true });
        localStorage.removeItem(DRAFT_KEY);
        updateStatus();
        toast('Cambios descartados');
        break;
    }
  });

  /* ================= Arrastrar y soltar ================= */
  let dragEl = null;
  document.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.handle');
    if (h) h.closest('.lcard').setAttribute('draggable', 'true');
  });
  document.addEventListener('pointerup', () => {
    $$('.lcard[draggable]').forEach(c => { if (c !== dragEl) c.removeAttribute('draggable'); });
  });
  document.addEventListener('dragstart', (e) => {
    const c = e.target.closest && e.target.closest('.lcard');
    if (!c) return;
    dragEl = c;
    c.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', c.dataset.id); } catch (_) {}
  });
  document.addEventListener('dragover', (e) => {
    if (!dragEl) return;
    const list = $('#lcards');
    if (!list || !list.contains(e.target)) return;
    e.preventDefault();
    const after = $$('.lcard:not(.dragging)', list).find(c => {
      const r = c.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    if (after) list.insertBefore(dragEl, after); else list.appendChild(dragEl);
  });
  document.addEventListener('drop', (e) => { if (dragEl) e.preventDefault(); });
  document.addEventListener('dragend', () => {
    if (!dragEl) return;
    dragEl.classList.remove('dragging');
    dragEl.removeAttribute('draggable');
    const order = $$('#lcards .lcard').map(c => c.dataset.id);
    const byId = Object.fromEntries(state.data.links.map(l => [l.id, l]));
    const next = order.map(id => byId[id]).filter(Boolean);
    const changed = next.map(l => l.id).join() !== state.data.links.map(l => l.id).join();
    dragEl = null;
    if (changed) { state.data.links = next; save({ rerender: true }); } else render();
  });

  /* ================= GitHub ================= */
  async function gh(cfg, path, opts) {
    opts = opts || {};
    const res = await fetch('https://api.github.com' + path, {
      method: opts.method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + cfg.token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {})
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store'
    });
    const txt = await res.text();
    let json = null;
    try { json = txt ? JSON.parse(txt) : null; } catch (_) {}
    if (!res.ok) {
      const msg = (json && json.message) || res.statusText;
      const err = new Error(`GitHub ${res.status}: ${msg}`);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  async function testConnection(cfg) {
    if (!cfg.owner || !cfg.repo || !cfg.token) { toast('Completa usuario, repositorio y token', true); return false; }
    try {
      const r = await gh(cfg, `/repos/${cfg.owner}/${cfg.repo}`);
      if (r.permissions && r.permissions.push === false) { toast('El token no tiene permiso de escritura en el repositorio', true); return false; }
      await gh(cfg, `/repos/${cfg.owner}/${cfg.repo}/git/ref/heads/${encodeURIComponent(cfg.branch)}`);
      toast('Conexión correcta con ' + r.full_name);
      return true;
    } catch (err) {
      toast('No se pudo conectar: ' + err.message, true);
      return false;
    }
  }

  function b64ToUtf8(b64) {
    const bin = atob(b64.replace(/\n/g, ''));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function metaBlock(d) {
    const p = d.profile, st = d.settings;
    const base = (st.siteUrl || '').replace(/\/?$/, '/');
    const abs = (u) => !u ? '' : /^https?:/.test(u) ? u : (st.siteUrl ? base + u : u);
    const title = st.metaTitle || p.title || 'Links';
    const desc = st.metaDescription || p.bio || '';
    const img = abs(p.avatar);
    return [
      '<!-- META:START (lo regenera el panel al publicar) -->',
      `  <title>${esc(title)}</title>`,
      `  <meta name="description" content="${esc(desc)}">`,
      '  <meta property="og:type" content="profile">',
      `  <meta property="og:title" content="${esc(title)}">`,
      `  <meta property="og:description" content="${esc(desc)}">`,
      img ? `  <meta property="og:image" content="${esc(img)}">` : '',
      st.siteUrl ? `  <meta property="og:url" content="${esc(st.siteUrl)}">` : '',
      '  <meta name="twitter:card" content="summary">',
      `  <meta name="theme-color" content="${esc(d.theme.background.color || '#eceef1')}">`,
      p.avatar ? `  <link rel="icon" href="${esc(p.avatar)}">` : '',
      '  <!-- META:END -->'
    ].filter(Boolean).join('\n');
  }

  async function publish() {
    const cfg = getGh();
    if (!cfg.owner || !cfg.repo || !cfg.token) {
      toast('Configura primero la publicación en Ajustes', true);
      state.tab = 'settings';
      render();
      return;
    }
    const btn = $('#publishBtn');
    btn.disabled = true;
    const label = $('span', btn);
    label.textContent = 'Publicando…';
    try {
      const repo = `/repos/${cfg.owner}/${cfg.repo}`;
      const data = clone(state.data);
      const files = [];

      // 1) Imágenes nuevas (data URL) -> archivos en assets/uploads/
      const stamp = Date.now().toString(36);
      let n = 0;
      const extract = (val) => {
        const m = /^data:image\/([a-z0-9.+-]+);base64,(.*)$/i.exec(val || '');
        if (!m) return val;
        const ext = { jpeg: 'jpg', 'svg+xml': 'svg' }[m[1]] || m[1];
        const path = `assets/uploads/${stamp}-${++n}.${ext}`;
        files.push({ path, content: m[2], encoding: 'base64' });
        return path;
      };
      data.profile.avatar = extract(data.profile.avatar);
      data.theme.background.image = extract(data.theme.background.image);
      data.links.forEach(l => { if (l.thumb && l.thumb.type === 'image') l.thumb.value = extract(l.thumb.value); });
      data.updatedAt = new Date().toISOString();

      // 2) profile.json
      const json = JSON.stringify(data, null, 2) + '\n';
      files.push({ path: 'data/profile.json', content: json, encoding: 'utf-8' });

      // 3) index.html con meta actualizadas
      try {
        const idx = await gh(cfg, `${repo}/contents/index.html?ref=${encodeURIComponent(cfg.branch)}`);
        const html = b64ToUtf8(idx.content);
        const re = /<!-- META:START[\s\S]*?<!-- META:END -->/;
        if (re.test(html)) {
          const next = html.replace(re, metaBlock(data).trimStart());
          if (next !== html) files.push({ path: 'index.html', content: next, encoding: 'utf-8' });
        }
      } catch (err) { console.warn('No se pudo actualizar index.html', err); }

      // 4) Un único commit con todo
      const ref = await gh(cfg, `${repo}/git/ref/heads/${encodeURIComponent(cfg.branch)}`);
      const parentSha = ref.object.sha;
      const parent = await gh(cfg, `${repo}/git/commits/${parentSha}`);
      const tree = [];
      for (const f of files) {
        const blob = await gh(cfg, `${repo}/git/blobs`, { method: 'POST', body: { content: f.content, encoding: f.encoding } });
        tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const newTree = await gh(cfg, `${repo}/git/trees`, { method: 'POST', body: { base_tree: parent.tree.sha, tree } });
      const commit = await gh(cfg, `${repo}/git/commits`, {
        method: 'POST',
        body: { message: 'Actualizar links desde el panel (' + new Date().toLocaleString() + ')', tree: newTree.sha, parents: [parentSha] }
      });
      await gh(cfg, `${repo}/git/refs/heads/${encodeURIComponent(cfg.branch)}`, { method: 'PATCH', body: { sha: commit.sha } });

      // 5) Estado local = publicado
      state.data = normalize(data);
      state.publishedSource = json;
      state.publishedJson = dataJson(state.data);
      localStorage.removeItem(DRAFT_KEY);
      render();
      pushPreview();
      toast('¡Publicado! GitHub Pages lo actualizará en ~1 minuto.');
    } catch (err) {
      console.error(err);
      const hint = err.status === 409 ? ' (el repositorio cambió, recarga e intenta otra vez)' : err.status === 401 ? ' (token inválido o expirado)' : '';
      toast('Error al publicar: ' + err.message + hint, true);
    } finally {
      btn.disabled = false;
      label.textContent = 'Publicar';
    }
  }

  $('#publishBtn').addEventListener('click', publish);
  $('#togglePreview').addEventListener('click', () => {
    const on = document.body.classList.toggle('show-preview');
    $('#togglePreview').innerHTML = on ? '<i class="fa-solid fa-pen"></i> Editar' : '<i class="fa-solid fa-eye"></i> Vista previa';
  });
  window.addEventListener('beforeunload', (e) => {
    // El borrador se guarda en localStorage, así que sólo avisamos si no se pudo guardar
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state.data)); } catch (_) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ================= Inicio ================= */
  async function init() {
    let published;
    try {
      const r = await fetch('../data/profile.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      state.publishedSource = await r.text();
      published = normalize(JSON.parse(state.publishedSource));
    } catch (err) {
      $('#editor').innerHTML = `<div class="card"><h2>No se pudo cargar data/profile.json</h2>
        <p class="hint">Abre el panel desde un servidor (GitHub Pages o <code>python -m http.server</code>), no como archivo local.<br>${esc(err.message)}</p></div>`;
      return;
    }
    state.publishedJson = dataJson(published);

    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (_) {}
    state.data = draft ? normalize(draft) : published;
    if (draft && isDirty()) toast('Se cargó tu borrador con cambios sin publicar');

    if (state.data.settings.siteUrl) $('#viewSite').href = state.data.settings.siteUrl;
    const h = location.hash.slice(1);
    if (VIEWS[h]) state.tab = h;
    render();
    pushPreview();
  }
  init();
})();
