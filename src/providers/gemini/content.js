(function () {
  'use strict';
  const R = window.__multaiRuntime;
  if (!R) { console.error('[multai-gemini] runtime missing'); return; }

  const PROVIDER = 'gemini';

  const S = {
    promptInput: [
      'rich-textarea div[contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      'div[contenteditable="true"][aria-label*="Enter a prompt" i]',
      'div[contenteditable="true"]'
    ],
    sendButton: [
      'button[aria-label*="Send message" i]',
      'button[aria-label="Send"]',
      'button[mattooltip*="Send" i]',
      'button.send-button'
    ],
    stopButton: [
      'button[aria-label*="Stop"]'
    ],
    fileInput: [
      'input[type="file"]'
    ],
    dropTarget: [
      'input-area-v2',
      'main',
      'body'
    ],
    newChatLink: [
      'button[aria-label*="New chat" i]',
      'expandable-button[aria-label*="New chat" i] button',
      'a[href="/app"]'
    ],
    tempChatButton: [
      '[data-test-id="temp-chat-button"]',
      'button[aria-label*="Temporary chat" i]',
      'button[mattooltip*="Temporary chat" i]'
    ],
    lastResponse: [
      'message-content.model-response-text',
      'model-response',
      'div[class*="model-response-text"]',
      'div[class*="model-response"]'
    ]
  };

  async function probe() {
    // If the URL has #temporary-chat, try to activate it if not already in that mode.
    if (location.hash === '#temporary-chat') {
      const btn = R.findFirst(S.tempChatButton);
      if (btn && R.isUsable(btn)) {
        const input = R.findFirst(S.promptInput);
        const isTemp = !!document.querySelector('[data-test-id="temporary-chat-header"]') ||
                       document.body.innerText.includes('Temporary Chat') ||
                       input?.getAttribute('data-placeholder')?.toLowerCase().includes('temporary');
        
        if (isTemp) {
          // Already in temp mode, clear the hash
          history.replaceState(null, null, ' ');
        } else {
          console.log('[multai-gemini] triggering temporary chat mode');
          btn.click();
          // Force click event if button.click() is insufficient in Angular
          btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        }
      }
    }

    return {
      ready: !!R.findFirst(S.promptInput),
      generating: !!R.findFirst(S.stopButton)
    };
  }

  async function setGeminiPrompt(el, text) {
    try { el.click(); } catch (_) {}
    el.focus();
    document.execCommand('selectAll', false);
    document.execCommand('delete', false);
    const html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    document.execCommand('insertHTML', false, html);
  }

  async function broadcast({ prompt, files, skipSubmit }) {
    const input = await R.waitFor(() => R.findFirstVisible(S.promptInput), 15000);
    if (!input) throw new Error('prompt input not found');
    if (files?.length) {
      await R.attachFiles(files, S.fileInput, S.dropTarget);
      await R.waitFor(() => {
        const b = R.findFirst(S.sendButton);
        return b && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
      }, 60000);
    }
    if (skipSubmit) {
      await setGeminiPrompt(input, prompt);
      return;
    }
    await R.setPrompt(input, prompt);
    await R.wait(80);
    await R.submit(input, S.sendButton);
  }

  async function newChat() {
    const link = R.findFirst(S.newChatLink);
    if (link) { link.click(); return; }
    location.assign('/app');
  }

  R.register({ provider: PROVIDER, probe, broadcast, newChat, lastResponseSelectors: S.lastResponse });
})();
