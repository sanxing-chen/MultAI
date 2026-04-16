// Runs in MAIN world at document_start on every provider domain.
// Goal: silence runtime anti-iframe checks (framebusters) so sites that
// refuse to render inside <iframe> via JS (not just headers) still load.
// Strictly read-only — no behavioural changes to the page beyond top/parent.

(function () {
  'use strict';

  try {
    Object.defineProperty(window, 'top', {
      get: function () { return window.self; },
      configurable: true
    });
  } catch (_) { /* already non-configurable */ }

  try {
    Object.defineProperty(window, 'parent', {
      get: function () { return window.self; },
      configurable: true
    });
  } catch (_) { /* already non-configurable */ }

  // Some framebusters compare frameElement to null to detect iframing.
  try {
    Object.defineProperty(window, 'frameElement', {
      get: function () { return null; },
      configurable: true
    });
  } catch (_) { /* already non-configurable */ }

  // Intercept Clipboard API so content scripts can retrieve copied text
  // via a DOM attribute even when the real API is blocked in iframes.
  // Patch at the prototype level and cover both writeText() and write().
  try {
    var CP = Clipboard.prototype;
    var ATTR = 'data-multai-clip';
    var root = document.documentElement;

    var origWriteText = CP.writeText;
    CP.writeText = function (text) {
      root.setAttribute(ATTR, text);
      return origWriteText.apply(this, arguments).catch(function () {});
    };

    var origWrite = CP.write;
    CP.write = function (data) {
      try {
        var item = data && data[0];
        if (item && typeof item.getType === 'function') {
          item.getType('text/plain').then(function (blob) {
            blob.text().then(function (t) { root.setAttribute(ATTR, t); });
          }).catch(function () {});
        }
      } catch (_) {}
      return origWrite.apply(this, arguments).catch(function () {});
    };
  } catch (_) { /* clipboard not available */ }
})();
