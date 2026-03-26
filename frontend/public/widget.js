/**
 * FlowAI Widget Loader — Embed Script
 *
 * Uso:
 *   <script src="https://tudominio.com/widget.js"
 *           data-token="TU_TOKEN"
 *           data-position="bottom-right">
 *   </script>
 */
(function () {
  'use strict';
  if (window.__flowai_widget_loaded) return;
  window.__flowai_widget_loaded = true;

  var script = document.currentScript;
  var token = script && script.getAttribute('data-token');
  if (!token) {
    console.error('[FlowAI] data-token es requerido');
    return;
  }

  var position = (script.getAttribute('data-position') || 'bottom-right').trim();
  var origin = script.src.replace(/\/widget\.js.*$/, '');

  // ── Estilos ──
  var style = document.createElement('style');
  style.textContent = [
    '#flowai-bubble{',
    '  position:fixed;width:60px;height:60px;border-radius:50%;',
    '  background:#4F46E5;color:#fff;display:flex;align-items:center;',
    '  justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);',
    '  z-index:2147483646;transition:transform .2s;border:none;',
    '  ' + (position.includes('right') ? 'right:20px;' : 'left:20px;'),
    '  ' + (position.includes('top') ? 'top:20px;' : 'bottom:20px;'),
    '}',
    '#flowai-bubble:hover{transform:scale(1.1);}',
    '#flowai-bubble svg{width:28px;height:28px;fill:currentColor;}',
    '#flowai-frame-container{',
    '  position:fixed;width:380px;height:560px;max-height:80vh;',
    '  border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.3);',
    '  z-index:2147483647;display:none;',
    '  ' + (position.includes('right') ? 'right:20px;' : 'left:20px;'),
    '  ' + (position.includes('top') ? 'top:90px;' : 'bottom:90px;'),
    '}',
    '#flowai-frame-container.open{display:block;}',
    '#flowai-frame{width:100%;height:100%;border:none;}',
    '@media(max-width:480px){',
    '  #flowai-frame-container{width:100%;height:100%;max-height:100vh;',
    '    top:0;left:0;right:0;bottom:0;border-radius:0;}',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  // ── Burbuja ──
  var bubble = document.createElement('button');
  bubble.id = 'flowai-bubble';
  bubble.setAttribute('aria-label', 'Abrir chat');
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>';
  document.body.appendChild(bubble);

  // ── iframe container ──
  var container = document.createElement('div');
  container.id = 'flowai-frame-container';

  var iframe = document.createElement('iframe');
  iframe.id = 'flowai-frame';
  iframe.src = origin + '/widget/embed?token=' + encodeURIComponent(token);
  iframe.setAttribute('allow', 'clipboard-write');
  iframe.setAttribute('loading', 'lazy');
  iframe.title = 'FlowAI Chat';
  container.appendChild(iframe);
  document.body.appendChild(container);

  // ── Toggle ──
  var isOpen = false;
  bubble.addEventListener('click', function () {
    isOpen = !isOpen;
    container.classList.toggle('open', isOpen);
    bubble.innerHTML = isOpen
      ? '<svg viewBox="0 0 24 24"><path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4L12 13.4l4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>';
    bubble.setAttribute('aria-label', isOpen ? 'Cerrar chat' : 'Abrir chat');
  });

  // ── PostMessage listener ──
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'flowai-widget') return;
    // Extensible: manejar eventos del iframe
  });
})();
