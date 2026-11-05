/**
 * Ooting CRM - WhatsApp Web Auto-Sender Content Script
 * 
 * Automatically detects when WhatsApp Web is opened with a message payload,
 * waits for the chat to render, and automatically clicks the Send button
 * without any manual intervention from the user.
 */

(function () {
  'use strict';

  console.log('[Ooting CRM] WhatsApp Web Auto-Sender extension initialized.');

  let isSending = false;
  let lastDispatchedPhone = null;
  let pollInterval = null;
  let pollAttempts = 0;
  const MAX_POLL_ATTEMPTS = 50; // 25 seconds max wait time

  // Create or update modern floating status HUD on WhatsApp Web
  function showStatusHUD(message, status = 'info') {
    let hud = document.getElementById('ooting-crm-auto-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'ooting-crm-auto-hud';
      hud.style.position = 'fixed';
      hud.style.top = '16px';
      hud.style.right = '20px';
      hud.style.zIndex = '9999999';
      hud.style.display = 'flex';
      hud.style.alignItems = 'center';
      hud.style.gap = '10px';
      hud.style.padding = '10px 18px';
      hud.style.borderRadius = '12px';
      hud.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      hud.style.fontSize = '12px';
      hud.style.fontWeight = '600';
      hud.style.color = '#ffffff';
      hud.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.35)';
      hud.style.backdropFilter = 'blur(8px)';
      hud.style.transition = 'all 0.3s ease';
      document.body.appendChild(hud);
    }

    if (status === 'success') {
      hud.style.backgroundColor = '#00a884';
      hud.innerHTML = `<span>✅</span> <span>${message}</span>`;
    } else if (status === 'warning') {
      hud.style.backgroundColor = '#d97706';
      hud.innerHTML = `<span>⏳</span> <span>${message}</span>`;
    } else if (status === 'error') {
      hud.style.backgroundColor = '#dc2626';
      hud.innerHTML = `<span>⚠️</span> <span>${message}</span>`;
    } else {
      hud.style.backgroundColor = '#0b141a';
      hud.style.border = '1px solid rgba(255, 255, 255, 0.15)';
      hud.innerHTML = `<span>⚡</span> <span>${message}</span>`;
    }

    if (status === 'success') {
      setTimeout(() => {
        if (hud && hud.parentNode) {
          hud.style.opacity = '0';
          setTimeout(() => hud.remove(), 400);
        }
      }, 4000);
    }
  }

  // Detect whether current URL or hash contains a target phone & message
  function getUrlParams() {
    try {
      const search = window.location.search;
      if (!search) return null;
      const params = new URLSearchParams(search);
      const phone = params.get('phone');
      const text = params.get('text');
      if (phone || text) {
        return { phone: phone ? phone.replace(/\D/g, '') : '', text: text || '' };
      }
    } catch (_) {}
    return null;
  }

  // Find the WhatsApp Web Send button across various WhatsApp versions
  function findSendButton() {
    // 1. span[data-testid="send"] inside button or standalone
    const testIdSend = document.querySelector('span[data-testid="send"]');
    if (testIdSend) {
      const btn = testIdSend.closest('button') || testIdSend;
      return btn;
    }

    // 2. span[data-icon="send"] inside button or standalone
    const iconSend = document.querySelector('span[data-icon="send"]');
    if (iconSend) {
      const btn = iconSend.closest('button') || iconSend;
      return btn;
    }

    // 3. Aria-label matching 'Send' in English or regional variants
    const ariaSend =
      document.querySelector('button[aria-label="Send"]') ||
      document.querySelector('button[aria-label*="Send"]') ||
      document.querySelector('button[data-testid="compose-btn-send"]');
    if (ariaSend) return ariaSend;

    // 4. Footer right-most icon button containing an SVG path
    const footerButtons = document.querySelectorAll('footer button');
    for (let i = footerButtons.length - 1; i >= 0; i--) {
      const b = footerButtons[i];
      if (b.querySelector('span[data-icon="send"]') || b.querySelector('svg path[d*="1.101"]')) {
        return b;
      }
    }

    return null;
  }

  // Find message composer element
  function findMessageComposer() {
    return (
      document.querySelector('footer div[contenteditable="true"]') ||
      document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
      document.querySelector('div[contenteditable="true"]')
    );
  }

  // Check for WhatsApp error popup (e.g. invalid phone number)
  function checkInvalidNumberModal() {
    const modal = document.querySelector('div[data-animate-modal-popup="true"]');
    if (modal) {
      const text = modal.innerText || '';
      if (text.toLowerCase().includes('invalid') || text.toLowerCase().includes('phone number')) {
        const okBtn = modal.querySelector('button');
        if (okBtn) okBtn.click();
        return true;
      }
    }
    return false;
  }

  // Execute the automated click and send action
  function executeAutoSend(targetPhone) {
    if (isSending) return;
    isSending = true;

    showStatusHUD('Chat loaded! Clicking Send automatically in 1.5s...', 'warning');

    setTimeout(() => {
      try {
        const sendBtn = findSendButton();
        const composer = findMessageComposer();

        if (sendBtn) {
          // Trigger mouse click sequence
          const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
          const mouseup = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
          const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });

          sendBtn.dispatchEvent(mousedown);
          sendBtn.dispatchEvent(mouseup);
          sendBtn.dispatchEvent(click);
          if (typeof sendBtn.click === 'function') {
            sendBtn.click();
          }

          // Also dispatch Enter key on the composer element for redundancy
          if (composer) {
            const enterDown = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
            });
            composer.dispatchEvent(enterDown);
          }

          lastDispatchedPhone = targetPhone;
          showStatusHUD(`Message sent automatically to +${targetPhone || 'Client'}!`, 'success');
          console.log(`[Ooting CRM] Message dispatched automatically to +${targetPhone}`);
        } else if (composer) {
          // Fallback to Enter key directly on composer
          const enterDown = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
          });
          composer.dispatchEvent(enterDown);
          showStatusHUD(`Dispatched via Enter key to +${targetPhone}!`, 'success');
        } else {
          showStatusHUD('Could not locate Send button. Please click Send manually.', 'error');
        }
      } catch (err) {
        console.error('[Ooting CRM] Error in executeAutoSend:', err);
        showStatusHUD('Error auto-sending. Please click Send.', 'error');
      } finally {
        setTimeout(() => {
          isSending = false;
        }, 3000);
      }
    }, 1500); // Wait 1.5 seconds for WhatsApp React state to register drafted text
  }

  // Poll for the chat interface to finish loading
  function startPollingForChat(targetPhone) {
    if (pollInterval) clearInterval(pollInterval);
    pollAttempts = 0;

    showStatusHUD(`Connecting to +${targetPhone || 'Client'}...`, 'info');

    pollInterval = setInterval(() => {
      pollAttempts++;

      // Check if WhatsApp says phone number is invalid
      if (checkInvalidNumberModal()) {
        clearInterval(pollInterval);
        showStatusHUD(`Invalid phone number (+${targetPhone}). Skipping.`, 'error');
        return;
      }

      const sendBtn = findSendButton();
      const composer = findMessageComposer();

      // Check if send button is visible or composer has text
      if (sendBtn || (composer && composer.innerText && composer.innerText.trim().length > 0)) {
        clearInterval(pollInterval);
        executeAutoSend(targetPhone);
        return;
      }

      if (pollAttempts >= MAX_POLL_ATTEMPTS) {
        clearInterval(pollInterval);
        showStatusHUD('Timeout waiting for WhatsApp chat. Please check connection.', 'error');
      }
    }, 500);
  }

  // Check URL state on initial load and navigation
  function checkAndTrigger() {
    const params = getUrlParams();
    if (!params) return;

    if (params.phone && params.phone === lastDispatchedPhone) {
      // Already handled this phone dispatch
      return;
    }

    startPollingForChat(params.phone);
  }

  // Monitor URL changes in SPA (Single Page Application)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      checkAndTrigger();
    }
  });

  observer.observe(document, { subtree: true, childList: true });

  // Initial trigger after DOM loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndTrigger);
  } else {
    setTimeout(checkAndTrigger, 1200);
  }
})();
