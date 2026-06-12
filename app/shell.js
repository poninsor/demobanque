/**
 * shell.js — global app shell behaviours
 * Loaded on every page before config.js
 */

// Run the Genesys Messenger snippet as early as possible so the widget
// bootstrapper starts loading in parallel with the rest of the page.
// Reading localStorage directly avoids waiting for DemoConfig (config.js).
(function () {
  try {
    const store = JSON.parse(localStorage.getItem('demobank_v1') || '{}');
    const current = store.current;
    const snippet = current
      && ((store.accounts || {})[current] || {}).genesys
      && store.accounts[current].genesys.messengerSnippet;
    if (snippet) (new Function(snippet))();
  } catch (e) {
    console.warn('[DemoShell] messengerSnippet error:', e);
  }
})();

(function () {
  const SHEET_PAGES = ['cards', 'beneficiaries', 'credits', 'contact', 'settings'];

  function currentPage() {
    return location.pathname.split('/').pop().replace('.html', '') || 'index';
  }

  function isSheetPage() {
    return SHEET_PAGES.includes(currentPage());
  }

  window.closeMobileSheet = function () {
    document.getElementById('mobile-sheet')?.classList.remove('open');
    document.getElementById('mobile-sheet-overlay')?.classList.remove('open');
    if (!isSheetPage()) {
      document.getElementById('more-nav-btn')?.classList.remove('active');
    }
  };

  window.toggleMobileSheet = function () {
    const sheet = document.getElementById('mobile-sheet');
    if (!sheet) return;
    if (sheet.classList.contains('open')) {
      window.closeMobileSheet();
    } else {
      sheet.classList.add('open');
      document.getElementById('mobile-sheet-overlay')?.classList.add('open');
      document.getElementById('more-nav-btn')?.classList.add('active');
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const page = currentPage();

    // Highlight the "More" button when on a sheet page
    if (isSheetPage()) {
      document.getElementById('more-nav-btn')?.classList.add('active');
    }

    // Highlight the sheet item matching the current page
    document.querySelectorAll('.sheet-item').forEach(el => {
      const href = (el.getAttribute('href') || '').replace('.html', '');
      if (href && href === page) el.classList.add('active');
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') window.closeMobileSheet();
    });

  });
})();
