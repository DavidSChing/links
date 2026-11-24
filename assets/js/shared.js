/* Código compartido entre la página pública y el panel de administración */
(function (global) {
  'use strict';

  // Redes sociales soportadas (iconos de Font Awesome 6)
  const SOCIALS = {
    instagram: { label: 'Instagram', icon: 'fa-brands fa-instagram', placeholder: 'https://instagram.com/usuario' },
    whatsapp:  { label: 'WhatsApp',  icon: 'fa-brands fa-whatsapp',  placeholder: 'https://api.whatsapp.com/send?phone=51999999999' },
    linkedin:  { label: 'LinkedIn',  icon: 'fa-brands fa-linkedin-in', placeholder: 'https://www.linkedin.com/in/usuario' },
    github:    { label: 'GitHub',    icon: 'fa-brands fa-github',    placeholder: 'https://github.com/usuario' },
    x:         { label: 'X (Twitter)', icon: 'fa-brands fa-x-twitter', placeholder: 'https://x.com/usuario' },
    tiktok:    { label: 'TikTok',    icon: 'fa-brands fa-tiktok',    placeholder: 'https://tiktok.com/@usuario' },
    youtube:   { label: 'YouTube',   icon: 'fa-brands fa-youtube',   placeholder: 'https://youtube.com/@canal' },
    facebook:  { label: 'Facebook',  icon: 'fa-brands fa-facebook',  placeholder: 'https://facebook.com/usuario' },
    threads:   { label: 'Threads',   icon: 'fa-brands fa-threads',   placeholder: 'https://threads.net/@usuario' },
    telegram:  { label: 'Telegram',  icon: 'fa-brands fa-telegram',  placeholder: 'https://t.me/usuario' },
    discord:   { label: 'Discord',   icon: 'fa-brands fa-discord',   placeholder: 'https://discord.gg/codigo' },
    twitch:    { label: 'Twitch',    icon: 'fa-brands fa-twitch',    placeholder: 'https://twitch.tv/usuario' },
    spotify:   { label: 'Spotify',   icon: 'fa-brands fa-spotify',   placeholder: 'https://open.spotify.com/artist/...' },
    behance:   { label: 'Behance',   icon: 'fa-brands fa-behance',   placeholder: 'https://behance.net/usuario' },
    medium:    { label: 'Medium',    icon: 'fa-brands fa-medium',    placeholder: 'https://medium.com/@usuario' },
    email:     { label: 'Email',     icon: 'fa-solid fa-envelope',   placeholder: 'mailto:tu@correo.com' },
    phone:     { label: 'Teléfono',  icon: 'fa-solid fa-phone',      placeholder: 'tel:+51999999999' },
    website:   { label: 'Sitio web', icon: 'fa-solid fa-globe',      placeholder: 'https://tusitio.com' }
  };

  // Iconos disponibles para miniaturas de links
  const THUMB_ICONS = Object.keys(SOCIALS).map(k => ({ key: k, icon: SOCIALS[k].icon, label: SOCIALS[k].label }));

  const FONTS = [
    'Inter', 'DM Sans', 'Manrope', 'Poppins', 'Outfit', 'Plus Jakarta Sans', 'Space Grotesk',
    'Montserrat', 'Roboto', 'Lato', 'Nunito', 'Rubik', 'Work Sans', 'Sora', 'Playfair Display',
    'Lora', 'Bebas Neue', 'IBM Plex Mono', 'Space Mono'
  ];

  // Temas predefinidos (el primero replica el tema "Air" del Linktree original)
  const THEMES = {
    aire:      { name: 'Aire',      background: { type: 'flat', color: '#eceef1' }, button: { style: 'fill', radius: 'sm', color: '#ffffff', textColor: '#000000', shadowColor: '#000000' }, font: 'Inter', textColor: '#000000' },
    blanco:    { name: 'Blanco',    background: { type: 'flat', color: '#ffffff' }, button: { style: 'outline', radius: 'full', color: '#111111', textColor: '#111111', shadowColor: '#000000' }, font: 'DM Sans', textColor: '#111111' },
    noche:     { name: 'Noche',     background: { type: 'flat', color: '#0f1115' }, button: { style: 'fill', radius: 'md', color: '#1d2129', textColor: '#ffffff', shadowColor: '#000000' }, font: 'Inter', textColor: '#ffffff' },
    carbon:    { name: 'Carbón',    background: { type: 'flat', color: '#181818' }, button: { style: 'outline', radius: 'sm', color: '#ffffff', textColor: '#ffffff', shadowColor: '#000000' }, font: 'Space Grotesk', textColor: '#ffffff' },
    arena:     { name: 'Arena',     background: { type: 'flat', color: '#f3ead8' }, button: { style: 'hard', radius: 'sm', color: '#fffaf0', textColor: '#2b2118', shadowColor: '#2b2118' }, font: 'Lora', textColor: '#2b2118' },
    oceano:    { name: 'Océano',    background: { type: 'gradient', color: '#0b3d91', color2: '#1fb5c9', direction: '160deg' }, button: { style: 'fill', radius: 'full', color: '#ffffff', textColor: '#0b3d91', shadowColor: '#000000' }, font: 'Poppins', textColor: '#ffffff' },
    atardecer: { name: 'Atardecer', background: { type: 'gradient', color: '#ff7a59', color2: '#a23b9f', direction: '180deg' }, button: { style: 'soft', radius: 'md', color: '#ffffff', textColor: '#2d1240', shadowColor: '#2d1240' }, font: 'Outfit', textColor: '#ffffff' },
    bosque:    { name: 'Bosque',    background: { type: 'flat', color: '#1f3b2d' }, button: { style: 'fill', radius: 'sm', color: '#e7f0d8', textColor: '#1f3b2d', shadowColor: '#000000' }, font: 'Manrope', textColor: '#e7f0d8' },
    neon:      { name: 'Neón',      background: { type: 'flat', color: '#0a0a0a' }, button: { style: 'hard', radius: 'square', color: '#d8ff3e', textColor: '#0a0a0a', shadowColor: '#ff3ec8' }, font: 'Space Mono', textColor: '#d8ff3e' },
    lavanda:   { name: 'Lavanda',   background: { type: 'gradient', color: '#efe7ff', color2: '#d9e7ff', direction: '135deg' }, button: { style: 'soft', radius: 'full', color: '#ffffff', textColor: '#3b2a6b', shadowColor: '#3b2a6b' }, font: 'Plus Jakarta Sans', textColor: '#3b2a6b' }
  };

  const RADIUS = { square: '0px', sm: '8px', md: '16px', full: '999px' };
  const CARD_RADIUS = { square: '0px', sm: '8px', md: '16px', full: '28px' };

  const ANIMATIONS = {
    none: 'Ninguna', buzz: 'Vibrar', wobble: 'Tambalear', pop: 'Pulso', swipe: 'Deslizar', shimmer: 'Brillo'
  };

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function hexToRgba(hex, alpha) {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function isLight(hex) {
    let h = String(hex || '#fff').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16) || 0;
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
  }

  function uid(prefix) {
    return (prefix || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function isScheduledVisible(link, now) {
    const s = link.schedule || {};
    now = now || new Date();
    if (s.start && new Date(s.start) > now) return false;
    if (s.end && new Date(s.end) < now) return false;
    return true;
  }

  function loadFont(name) {
    if (!name) return;
    const id = 'gf-' + name.replace(/\s+/g, '-');
    if (document.getElementById(id)) return;
    const l = document.createElement('link');
    l.id = id;
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(name).replace(/%20/g, '+') + ':wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }

  /** Aplica el tema como variables CSS sobre un elemento (normalmente <html>) */
  function applyTheme(theme, el) {
    el = el || document.documentElement;
    const t = theme || {};
    const bg = t.background || {};
    const btn = t.button || {};
    let bgCss = bg.color || '#eceef1';
    if (bg.type === 'gradient') bgCss = `linear-gradient(${bg.direction || '180deg'}, ${bg.color || '#fff'}, ${bg.color2 || '#ddd'})`;
    if (bg.type === 'image' && bg.image) bgCss = `linear-gradient(rgba(0,0,0,.15), rgba(0,0,0,.15)), url("${bg.image}") center / cover no-repeat`;
    const set = (k, v) => el.style.setProperty(k, v);
    set('--bg', bgCss);
    set('--bg-solid', bg.color || '#eceef1');
    set('--text', t.textColor || '#000');
    set('--btn-bg', btn.color || '#fff');
    set('--btn-text', btn.textColor || '#000');
    set('--btn-shadow', btn.shadowColor || '#000');
    set('--btn-shadow-soft', hexToRgba(btn.shadowColor || '#000', 0.16));
    set('--btn-radius', RADIUS[btn.radius] || RADIUS.sm);
    set('--card-radius', CARD_RADIUS[btn.radius] || CARD_RADIUS.sm);
    set('--font', `'${t.font || 'Inter'}', system-ui, -apple-system, 'Segoe UI', sans-serif`);
    set('--chip-bg', isLight(bg.color || '#eceef1') ? '#ffffff' : 'rgba(255,255,255,.12)');
    set('--chip-text', isLight(bg.color || '#eceef1') ? '#000000' : '#ffffff');
    el.dataset.btnStyle = btn.style || 'fill';
    loadFont(t.font || 'Inter');
  }

  global.LT = { SOCIALS, THUMB_ICONS, FONTS, THEMES, RADIUS, ANIMATIONS, esc, hexToRgba, isLight, uid, isScheduledVisible, applyTheme, loadFont };
})(window);
