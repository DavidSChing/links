/* Página pública: renderiza data/profile.json */
(function () {
  'use strict';
  const { SOCIALS, esc, applyTheme, isScheduledVisible } = window.LT;
  const PREVIEW = new URLSearchParams(location.search).has('preview');
  const $ = (id) => document.getElementById(id);

  let DATA = null;
  let gcLoaded = false;

  const KEBAB_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>';

  /* ---------- Utilidades ---------- */
  function pageUrl() {
    const s = DATA && DATA.settings && DATA.settings.siteUrl;
    if (s) return s;
    return location.href.split('?')[0].split('#')[0];
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 1800);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove();
    }
    toast('Enlace copiado');
  }

  function makeQr(el, text, size) {
    el.innerHTML = '';
    if (typeof QRCode === 'undefined') { el.textContent = text; return; }
    new QRCode(el, { text, width: size, height: size, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
  }

  /* ---------- Analíticas (GoatCounter, opcional) ---------- */
  function initAnalytics() {
    const code = DATA.settings && DATA.settings.goatcounter;
    if (!code || PREVIEW || gcLoaded) return;
    gcLoaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.dataset.goatcounter = 'https://' + code + '.goatcounter.com/count';
    document.head.appendChild(s);
  }
  function track(name, title) {
    if (PREVIEW) return;
    try {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: name, title: title || name, event: true });
      }
    } catch (_) {}
  }

  /* ---------- Render ---------- */
  function renderThumb(link, featured) {
    const th = link.thumb || {};
    if (!th.type || !th.value) return '';
    if (featured) {
      if (th.type === 'image') return `<span class="feat-img"><img src="${esc(th.value)}" alt="" loading="lazy"></span>`;
      if (th.type === 'emoji') return `<span class="feat-img emoji">${esc(th.value)}</span>`;
      if (th.type === 'icon' && SOCIALS[th.value]) return `<span class="feat-img emoji"><i class="${SOCIALS[th.value].icon}"></i></span>`;
      return '';
    }
    if (th.type === 'image') return `<span class="thumb"><img src="${esc(th.value)}" alt="" loading="lazy"></span>`;
    if (th.type === 'emoji') return `<span class="thumb">${esc(th.value)}</span>`;
    if (th.type === 'icon' && SOCIALS[th.value]) return `<span class="thumb"><i class="${SOCIALS[th.value].icon}"></i></span>`;
    return '';
  }

  function renderSocials(list) {
    return (list || [])
      .filter(s => s.enabled !== false && s.url && SOCIALS[s.type])
      .map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(SOCIALS[s.type].label)}" data-social="${esc(s.type)}"><i class="${SOCIALS[s.type].icon}"></i></a></li>`)
      .join('');
  }

  function render(data) {
    DATA = data;
    const p = data.profile || {};
    const st = data.settings || {};
    applyTheme(data.theme);

    // Perfil
    const av = $('avatar');
    if (p.avatar) { av.src = p.avatar; av.classList.remove('is-empty'); }
    else { av.removeAttribute('src'); av.classList.add('is-empty'); }
    av.alt = p.title || '';
    av.dataset.shape = p.avatarShape || 'circle';
    av.dataset.size = p.avatarSize || 'small';
    $('name').textContent = p.title || '';
    $('bio').textContent = p.bio || '';

    // Barra superior
    const brand = $('brand');
    brand.textContent = st.showBrand === false ? '' : (p.brandText || '');
    $('shareProfile').hidden = st.showShare === false;

    // Redes
    const socialsHtml = renderSocials(data.socials);
    const bottom = data.socialPosition === 'bottom';
    $('socialsTop').innerHTML = bottom ? '' : socialsHtml;
    $('socialsBottom').innerHTML = bottom ? socialsHtml : '';

    // Links
    const now = new Date();
    const html = (data.links || []).map(link => {
      if (link.enabled === false) return '';
      const scheduled = isScheduledVisible(link, now);
      if (!scheduled && !PREVIEW) return '';
      const extra = scheduled ? '' : ' preview-hidden';
      if (link.type === 'header') {
        return `<h2 class="link-header${extra}">${esc(link.title)}</h2>`;
      }
      if (!link.url) return '';
      const featured = link.layout === 'featured';
      const anim = link.animation && link.animation !== 'none' ? ' anim-' + link.animation : '';
      return `
        <div class="link-item ${featured ? 'featured' : 'classic'}${anim}${extra}" data-id="${esc(link.id)}">
          <a class="link-btn" href="${esc(link.url)}" target="_blank" rel="noopener" data-link="${esc(link.id)}">
            ${renderThumb(link, featured)}
            <span class="label">${esc(link.title || link.url)}</span>
          </a>
          <button class="kebab" type="button" data-share="${esc(link.id)}" aria-label="Compartir ${esc(link.title)}">${KEBAB_SVG}</button>
        </div>`;
    }).join('');
    $('links').innerHTML = html;

    // Footer
    $('footer').textContent = st.footerText || '';

    // Meta
    if (!PREVIEW) {
      document.title = st.metaTitle || p.title || 'Links';
      const tc = document.querySelector('meta[name="theme-color"]');
      if (tc && data.theme && data.theme.background) tc.content = data.theme.background.color || '#eceef1';
    }

    // QR de esquina
    const qc = $('qrCorner');
    qc.hidden = st.showQr === false || PREVIEW;
    if (!qc.hidden) makeQr($('qrCornerCode'), pageUrl(), 108);

    initAnalytics();
    $('page').classList.add('ready');
    $('page').setAttribute('aria-busy', 'false');
  }

  /* ---------- Modal de compartir ---------- */
  function openModal(id) {
    const m = $(id);
    m.hidden = false;
    const focusable = m.querySelector('.modal-x');
    if (focusable) focusable.focus();
  }
  function closeModals() {
    document.querySelectorAll('.modal').forEach(m => { m.hidden = true; });
  }

  function openShare(link) {
    const p = DATA.profile || {};
    const url = link ? link.url : pageUrl();
    const title = link ? link.title : (p.title || '');
    $('shareTitle').textContent = link ? 'Compartir enlace' : 'Compartir perfil';
    $('shareQr').hidden = true;

    let previewHtml;
    if (link) {
      const th = link.thumb || {};
      const img = th.type === 'image' && th.value ? `<img class="sp-thumb" src="${esc(th.value)}" alt="">` : '';
      previewHtml = `${img}<strong>${esc(title)}</strong><small>${esc(url)}</small>`;
    } else {
      const img = p.avatar ? `<img src="${esc(p.avatar)}" alt="">` : '';
      previewHtml = `${img}<strong>${esc(title)}</strong><small>${esc(url.replace(/^https?:\/\//, ''))}</small>`;
    }
    $('sharePreview').innerHTML = previewHtml;

    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);
    const opts = [
      { k: 'copy', label: 'Copiar enlace', icon: 'fa-solid fa-link' },
      { k: 'qr', label: 'Código QR', icon: 'fa-solid fa-qrcode' },
      { label: 'WhatsApp', icon: 'fa-brands fa-whatsapp', href: `https://wa.me/?text=${t}%20${u}` },
      { label: 'X', icon: 'fa-brands fa-x-twitter', href: `https://x.com/intent/tweet?text=${t}&url=${u}` },
      { label: 'Facebook', icon: 'fa-brands fa-facebook-f', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
      { label: 'LinkedIn', icon: 'fa-brands fa-linkedin-in', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
      { label: 'Telegram', icon: 'fa-brands fa-telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
      { label: 'Email', icon: 'fa-solid fa-envelope', href: `mailto:?subject=${t}&body=${u}` }
    ];
    if (navigator.share) opts.push({ k: 'native', label: 'Más', icon: 'fa-solid fa-ellipsis' });

    $('shareOptions').innerHTML = opts.map(o => o.href
      ? `<a class="share-opt" href="${o.href}" target="_blank" rel="noopener"><i class="${o.icon}"></i>${o.label}</a>`
      : `<button class="share-opt" type="button" data-act="${o.k}"><i class="${o.icon}"></i>${o.label}</button>`
    ).join('');

    $('shareOptions').onclick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'copy') copy(url);
      if (act === 'qr') { const q = $('shareQr'); q.hidden = !q.hidden; if (!q.hidden) makeQr(q, url, 200); }
      if (act === 'native') navigator.share({ title, url }).catch(() => {});
    };
    openModal('shareModal');
    track(link ? 'share-' + link.id : 'share-profile', 'Compartir: ' + title);
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closeModals(); return; }

    if (e.target.closest('#shareProfile')) { openShare(null); return; }

    const kb = e.target.closest('[data-share]');
    if (kb) {
      e.preventDefault();
      const link = (DATA.links || []).find(l => l.id === kb.dataset.share);
      if (link) openShare(link);
      return;
    }

    const a = e.target.closest('[data-link]');
    if (a) {
      const link = (DATA.links || []).find(l => l.id === a.dataset.link);
      if (!link) return;
      if (PREVIEW) { e.preventDefault(); return; }
      if (link.sensitive) {
        e.preventDefault();
        $('sensContinue').href = link.url;
        openModal('sensitiveModal');
        return;
      }
      track('click-' + link.id, link.title);
      return;
    }
    if (e.target.closest('#sensContinue')) { closeModals(); return; }

    const so = e.target.closest('[data-social]');
    if (so) {
      if (PREVIEW) { e.preventDefault(); return; }
      track('social-' + so.dataset.social, so.getAttribute('aria-label'));
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });

  /* ---------- Carga ---------- */
  if (PREVIEW) {
    // Vista previa embebida en el panel: recibe los datos por postMessage
    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin) return;
      if (e.data && e.data.type === 'lt-preview' && e.data.data) render(e.data.data);
    });
    if (window.parent !== window) window.parent.postMessage({ type: 'lt-ready' }, location.origin);
  } else {
    fetch('data/profile.json', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(err => {
        console.error(err);
        document.getElementById('links').innerHTML = '<p style="text-align:center">No se pudo cargar el perfil.</p>';
        $('page').classList.add('ready');
      });
  }
})();
