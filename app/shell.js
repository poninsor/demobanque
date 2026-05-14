/**
 * shell.js — comportements globaux de l'app shell
 * Chargé sur toutes les pages avant config.js
 */
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

    // Marquer le bouton Plus actif si on est sur une page du sheet
    if (isSheetPage()) {
      document.getElementById('more-nav-btn')?.classList.add('active');
    }

    // Marquer l'item du sheet correspondant à la page courante
    document.querySelectorAll('.sheet-item').forEach(el => {
      const href = (el.getAttribute('href') || '').replace('.html', '');
      if (href && href === page) el.classList.add('active');
    });

    // Fermer sur Echap
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') window.closeMobileSheet();
    });

    // Exécuter le Messenger snippet Genesys configuré dans Paramètres
    try {
      const snippet = ((DemoConfig.getProfile() || {}).genesys || {}).messengerSnippet || '';
      if (snippet) new Function(snippet)();
    } catch (e) {
      console.warn('[DemoShell] messengerSnippet error:', e);
    }
  });
})();
