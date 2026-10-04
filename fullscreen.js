// Full screen for the whole app (Blake, 2026-10-04: "Need full screen button for
// Amazon silk browser for whole app"). Any button with data-fs toggles it: the
// main page's top bar, the arcade games, Title of Liberty's bar and Amigo's home.
// It shows only where the browser offers full screen (Silk on a Fire tablet,
// Chrome, Edge, Firefox; not an iPhone). Full screen holds while games open over
// the main page, but leaving a page ends it (the browser's rule), so Title of
// Liberty and Amigo, pages of their own, have their own button.
(function () {
  const d = document;
  const can = () => !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
  const on = () => !!(d.fullscreenElement || d.webkitFullscreenElement);
  function toggle() {
    try {
      if (on()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else {
        const el = d.documentElement, r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
        if (r && r.catch) r.catch(() => {});
      }
    } catch (e) { /* not allowed here */ }
  }
  // Drawn, not ⛶ or 🗗, which some tablets' fonts don't have.
  const svg = p => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;margin:auto"><path d="${p}"/></svg>`;
  const icon = () => svg(on() ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5');
  const label = () => on() ? 'Leave full screen' : 'Full screen';
  // A button for a page drawn from a template ('' where there's no full screen).
  const html = cls => can() ? `<button type="button" class="${cls || ''}" data-fs aria-label="${label()}" title="${label()}">${icon()}</button>` : '';
  // Bring every button up to date: shown or hidden, and its icon.
  function mark() {
    d.querySelectorAll('[data-fs]').forEach(b => {
      b.hidden = !can();
      if (b._fs !== on()) { b._fs = on(); b.innerHTML = icon(); }
      b.setAttribute('aria-label', label()); b.title = label();
    });
  }
  const st = d.createElement('style');
  st.textContent = '[data-fs][hidden]{display:none!important}';
  (d.head || d.documentElement).appendChild(st);
  d.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-fs]');
    if (b) { e.preventDefault(); toggle(); }
  });
  d.addEventListener('fullscreenchange', mark);
  d.addEventListener('webkitfullscreenchange', mark);
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', mark); else mark();
  window.TUFull = { can, on, toggle, icon, label, html, mark };
})();
