(function () {
  'use strict';
  const R = window.__multaiRuntime;
  if (!R) { console.error('[multai-chatgpt] runtime missing'); return; }

  const PROVIDER = 'chatgpt';

  const S = {
    promptInput: [
      '#prompt-textarea[contenteditable="true"]',
      'div#prompt-textarea',
      'textarea#prompt-textarea',
      'div[contenteditable="true"].ProseMirror'
    ],
    sendButton: [
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label*="Send"]',
      'form button[type="submit"]'
    ],
    stopButton: [
      'button[data-testid="stop-button"]',
      'button[aria-label*="Stop"]'
    ],
    fileInput: [
      'input[type="file"][multiple]',
      'input[type="file"]'
    ],
    dropTarget: [
      'form',
      'main',
      'body'
    ],
    modelPickerButton: [
      'button[data-testid="model-switcher-dropdown-button"]',
      'button[aria-haspopup="menu"][aria-label*="Model"]',
      'button[aria-haspopup="menu"][aria-label*="model"]'
    ],
    modelMenuItems: [
      '[role="menu"] [role="menuitem"]',
      '[role="menuitem"]'
    ],
    newChatLink: [
      'a[data-testid="create-new-chat-button"]',
      'a[aria-label="New chat"]',
      'a[href="/"]'
    ],
    threadLinks: [
      'nav a[href^="/c/"]',
      'a[href^="/c/"]'
    ],
    lastResponse: [
      'div[data-message-author-role="assistant"]',
      'article[data-testid*="conversation-turn"]'
    ],
    copyButton: [
      'button[data-testid="copy-turn-action-button"]',
      'button[aria-label*="Copy" i]'
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
      await R.waitFor(() => {
        const b = R.findFirst(S.sendButton);
        return b && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
      }, 60000);
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

  async function setChat(chatId) {
    if (!chatId || chatId === 'new') { await newChat(); return; }
    const link = document.querySelector(`a[href="/c/${chatId}"]`);
    if (link) { link.click(); return; }
    location.assign(`/c/${chatId}`);
  }

  R.register({ provider: PROVIDER, probe, broadcast, newChat, setChat, copyButtonSelectors: S.copyButton, lastResponseSelectors: S.lastResponse });
})();
