(function () {
  'use strict';
  const R = window.__multaiRuntime;
  if (!R) { console.error('[multai-meta] runtime missing'); return; }

  const PROVIDER = 'meta';

  const S = {
    promptInput: [
      'textarea[placeholder*="Ask" i]',
      'textarea[placeholder*="message" i]',
      'div[contenteditable="true"]',
      'textarea'
    ],
    sendButton: [
      'button[aria-label*="Send" i]',
      'button[type="submit"]'
    ],
    stopButton: [
      'button[aria-label*="Stop" i]'
    ],
    fileInput: [
      'input[type="file"]'
    ],
    dropTarget: [
      'form',
      'main',
      'body'
    ],
    modelPickerButton: [
      'button[aria-haspopup="menu"]:not([aria-label*="attachment" i])',
      'main button[aria-haspopup="menu"]'
    ],
    modelMenuItems: [
      '[role="dialog"] button',
      'div[role="dialog"] button',
      '[role="menuitem"]',
      '[role="menu"] button',
      'button[role="menuitem"]'
    ],
    newChatLink: [
      'a[href="/"]',
      'button[aria-label*="New" i]'
    ],
    lastResponse: [
      '[data-testid*="assistant"]',
      '[data-testid*="message"]',
      '[role="article"]',
      'main [dir="auto"]',
      'div[class*="message"][class*="assistant"]',
      'div[class*="bot-message"]',
      'div[class*="ai-message"]',
      'div[class*="markdown"]'
    ],
    copyButton: [
      'button[aria-label*="Copy" i]',
      'div[role="button"][aria-label*="Copy" i]',
      'button[data-testid*="copy" i]'
    ]
  };

  async function probe() {
    return {
      ready: !!R.findFirst(S.promptInput),
      generating: !!R.findFirst(S.stopButton)
    };
  }

  async function broadcast({ prompt, files, skipSubmit }) {
    const input = await R.waitFor(() => R.findFirstVisible(S.promptInput), 15000);
    if (!input) throw new Error('prompt input not found');
    if (files?.length) {
      await R.attachFiles(files, S.fileInput, S.dropTarget);
      await R.wait(600);
    }
    await R.setPrompt(input, prompt);
    if (skipSubmit) return;
    await R.wait(80);
    await R.submit(input, S.sendButton);
  }

  async function newChat() {
    const link = R.findFirst(S.newChatLink);
    if (link) { link.click(); return; }
    location.assign('/');
  }

  function textOf(el) {
    return (el?.innerText || el?.textContent || '').trim().toLowerCase();
  }

  function modelItems() {
    return R.findAll(S.modelMenuItems).filter(el => {
      if (!R.isUsable(el)) return false;
      const text = textOf(el);
      return text.includes('instant') || text.includes('thinking') || text.includes('shopping') || text.includes('contemplating');
    });
  }

  async function setModel(modelId) {
    const btn = R.findAll(S.modelPickerButton).find(el => {
      const text = textOf(el);
      return text.includes('instant') || text.includes('thinking') || text.includes('shopping') || text.includes('contemplating');
    }) || R.findFirst(S.modelPickerButton);
    if (!btn) throw new Error('model picker not found');

    const currentText = textOf(btn);
    if (modelId === '__best__' && currentText.includes('contemplating')) return;
    if (modelId === '__cheap__' && currentText.includes('instant')) return;

    btn.click();
    await R.wait(100);
    const item = await R.waitFor(() => {
      const items = modelItems();
      if (!items.length) return null;
      return modelId === '__cheap__' ? items[0] : items[items.length - 1];
    }, 3000);

    if (item) {
      item.click();
    } else {
      btn.click();
      throw new Error(`model ${modelId} not found or menu empty`);
    }
  }

  async function readLast() {
    const viaCopy = await R.readLastViaCopy(S.copyButton, S.lastResponse);
    if (viaCopy.text && viaCopy.text.length > 0) return viaCopy;

    const root = document.querySelector('main') || document.body;
    const composer = R.findFirst(S.promptInput);
    const candidates = root.querySelectorAll('div, p, article, section');
    let best = null;
    let bestScore = 0;
    for (const el of candidates) {
      if (composer && (el === composer || el.contains(composer) || composer.contains(el))) continue;
      const text = (el.innerText || '').trim();
      if (text.length < 40) continue;
      // Prefer leaf-ish containers that are mostly text, not wrappers of
      // many nested divs. `orderFromTop` nudges us toward later (more
      // recent) messages when scores tie.
      const childBlocks = el.querySelectorAll('div, article, section').length;
      const rect = el.getBoundingClientRect();
      const orderFromTop = rect.top || 0;
      const score = text.length / (1 + childBlocks) + orderFromTop * 0.01;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }

    if (!best) return { text: '', html: '' };
    return {
      text: (best.innerText || best.textContent || '').trim(),
      html: best.outerHTML || ''
    };
  }

  R.register({ provider: PROVIDER, probe, broadcast, newChat, setModel, readLast, lastResponseSelectors: S.lastResponse });
})();
