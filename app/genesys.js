/**
 * genesys.js — Genesys Cloud integration hooks
 *
 * Loaded by every page that needs a Genesys interaction:
 *   contact.html, messages.html, credits.html
 *
 * All settings are read at call time from DemoConfig.getProfile() so they
 * always reflect the latest values saved in Settings without a page reload.
 */
const DemoGenesys = (() => {
  const t = (fr, en) => document.documentElement.lang === 'en' ? en : fr;

  // ── Toast notification ──────────────────────────────────────────────────────

  function ensureNotifStyles() {
    if (document.getElementById('_gc-notif-style')) return;
    const s = document.createElement('style');
    s.id = '_gc-notif-style';
    s.textContent = `
      #_gc-notif {
        position: fixed;
        bottom: 24px;
        right: 24px;
        max-width: 380px;
        background: var(--neutral-900, #0d0e12);
        color: #fff;
        padding: 14px 18px;
        border-radius: 14px;
        font-size: 14px;
        font-weight: 500;
        font-family: inherit;
        display: flex;
        gap: 10px;
        align-items: flex-start;
        line-height: 1.5;
        box-shadow: 0 12px 32px rgba(0,0,0,.28);
        z-index: 9999;
        transform: translateY(80px) scale(.96);
        opacity: 0;
        pointer-events: none;
        transition: transform 380ms cubic-bezier(.34,1.1,.64,1), opacity 220ms ease;
      }
      #_gc-notif.gc-visible {
        transform: translateY(0) scale(1);
        opacity: 1;
        pointer-events: auto;
      }
      #_gc-notif.gc-error { background: var(--danger-700, #9f1239); }
      #_gc-notif .gc-icon { flex-shrink: 0; margin-top: 1px; }
      #_gc-notif .gc-close {
        margin-left: auto;
        padding-left: 10px;
        background: none;
        border: none;
        color: rgba(255,255,255,.55);
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        flex-shrink: 0;
        align-self: center;
        transition: color 150ms;
      }
      #_gc-notif .gc-close:hover { color: #fff; }
      @keyframes _gc-spin { to { transform: rotate(360deg); } }
      ._gc-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: _gc-spin .65s linear infinite;
        vertical-align: middle;
        margin-right: 6px;
      }
      @media (max-width: 768px) {
        #_gc-notif {
          right: 12px;
          left: 12px;
          max-width: none;
          bottom: calc(80px + env(safe-area-inset-bottom) + 10px);
        }
      }
    `;
    document.head.appendChild(s);
  }

  let _dismissTimer;

  function showNotif(message, isError) {
    ensureNotifStyles();

    let el = document.getElementById('_gc-notif');
    if (!el) {
      el = document.createElement('div');
      el.id = '_gc-notif';
      document.body.appendChild(el);
    }

    const successSvg = `<svg class="gc-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success,#00a35a)" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    const errorSvg = `<svg class="gc-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

    el.className = isError ? 'gc-error' : '';

    // Build content via DOM to avoid XSS (err.message may contain HTML)
    const iconWrap = document.createElement('span');
    iconWrap.innerHTML = isError ? errorSvg : successSvg;
    const textEl = document.createElement('span');
    textEl.style.flex = '1';
    message.split('\n').forEach((line, i) => {
      if (i > 0) textEl.appendChild(document.createElement('br'));
      textEl.appendChild(document.createTextNode(line));
    });
    const closeBtn = document.createElement('button');
    closeBtn.className = 'gc-close';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => el.classList.remove('gc-visible'));
    el.replaceChildren(iconWrap, textEl, closeBtn);

    // Force reflow before adding class so transition plays
    el.getBoundingClientRect();
    el.classList.add('gc-visible');

    clearTimeout(_dismissTimer);
    _dismissTimer = setTimeout(() => el.classList.remove('gc-visible'), isError ? 6000 : 4000);
  }

  // ── Button loading state ────────────────────────────────────────────────────

  function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn._origHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="_gc-spinner"></span>${t('En cours…', 'Please wait…')}`;
    } else {
      btn.disabled = false;
      if (btn._origHTML) btn.innerHTML = btn._origHTML;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  // Normalize the region field: accepts 'mypurecloud.ie' or 'https://login.mypurecloud.ie'
  function regionDomain(raw) {
    return (raw || 'mypurecloud.ie')
      .replace(/^https?:\/\/(login\.|api\.)?/, '')
      .replace(/\/$/, '');
  }

  // ── PKCE helpers ─────────────────────────────────────────────────────────────

  function _generateVerifier() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  async function _generateChallenge(verifier) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  async function _buildAuthUrl(gc, redirectUri) {
    const domain = regionDomain(gc.region);
    const verifier = _generateVerifier();
    const challenge = await _generateChallenge(verifier);
    const state = _generateVerifier();
    sessionStorage.setItem('_gc_code_verifier', verifier);
    sessionStorage.setItem('_gc_oauth_state', state);
    return `https://login.${domain}/oauth/authorize`
      + `?response_type=code`
      + `&client_id=${encodeURIComponent(gc.clientId)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&code_challenge=${encodeURIComponent(challenge)}`
      + `&code_challenge_method=S256`
      + `&state=${encodeURIComponent(state)}`;
  }

  // ── Authorization Code / PKCE token cache ────────────────────────────────────

  const GC_TOKEN_KEY = 'demobank_gc_token';
  let _gcToken = null;
  let _gcTokenExpiry = 0;

  function _saveToken() {
    try {
      const clientId = ((DemoConfig.getProfile() || {}).genesys || {}).clientId || '';
      localStorage.setItem(GC_TOKEN_KEY, JSON.stringify({ token: _gcToken, expiry: _gcTokenExpiry, clientId }));
      console.log('[DemoGenesys] _saveToken: token persisted to localStorage');
    } catch (e) {
      console.warn('[DemoGenesys] _saveToken: failed', e);
    }
  }

  function _loadToken() {
    try {
      const stored = JSON.parse(localStorage.getItem(GC_TOKEN_KEY));
      if (!stored || !stored.token || !stored.expiry) return;
      const clientId = ((DemoConfig.getProfile() || {}).genesys || {}).clientId || '';
      if (stored.clientId !== clientId) { console.log('[DemoGenesys] _loadToken: clientId mismatch, skipping'); return; }
      if (Date.now() >= stored.expiry) { console.log('[DemoGenesys] _loadToken: token expired'); return; }
      _gcToken = stored.token;
      _gcTokenExpiry = stored.expiry;
      console.log('[DemoGenesys] _loadToken: valid token loaded from localStorage');
    } catch (e) {
      console.warn('[DemoGenesys] _loadToken: failed', e);
    }
  }

  // On page load: detect return from PKCE authorization code redirect, else restore from localStorage
  (async function () {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');

    if (code) {
      // Validate state to prevent CSRF
      const expectedState = sessionStorage.getItem('_gc_oauth_state');
      if (returnedState !== expectedState) {
        console.warn('[DemoGenesys] PKCE callback: state mismatch, ignoring');
        history.replaceState(null, '', window.location.pathname);
        _loadToken();
        return;
      }
      sessionStorage.removeItem('_gc_oauth_state');

      const verifier = sessionStorage.getItem('_gc_code_verifier');
      sessionStorage.removeItem('_gc_code_verifier');

      const gc = ((DemoConfig.getProfile() || {}).genesys) || {};
      const domain = regionDomain(gc.region);
      // redirect_uri must exactly match what was sent in the authorization request
      const redirectUri = window.location.origin + window.location.pathname;

      try {
        const res = await fetch(`https://login.${domain}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: gc.clientId,
            code,
            redirect_uri: redirectUri,
            code_verifier: verifier
          })
        });
        if (!res.ok) throw new Error(`Token exchange ${res.status}`);
        const data = await res.json();
        _gcToken = data.access_token;
        const expiresIn = parseInt(data.expires_in || '3600', 10);
        _gcTokenExpiry = Date.now() + expiresIn * 1000 - 60000;
        console.log('[DemoGenesys] PKCE callback: token received, expires in', expiresIn, 's');
      } catch (e) {
        console.error('[DemoGenesys] PKCE token exchange failed', e);
        history.replaceState(null, '', window.location.pathname);
        _loadToken();
        sessionStorage.removeItem('_gc_pending');
        setTimeout(() => showNotif(
          t('Échec de l\'échange OAuth PKCE.\n' + e.message,
            'PKCE token exchange failed.\n' + e.message),
          true
        ), 200);
        return;
      }

      // Clean ?code=&state= from the URL
      history.replaceState(null, '', window.location.pathname);
      _saveToken();

      // Post-login redirect set by index.html before triggering auth
      const postLogin = sessionStorage.getItem('_gc_post_login_redirect');
      if (postLogin) {
        sessionStorage.removeItem('_gc_post_login_redirect');
        window.location.href = postLogin;
        return;
      }
      // testConnection pending action set by settings.html
      const pending = sessionStorage.getItem('_gc_pending');
      if (pending === 'testConnection') {
        sessionStorage.removeItem('_gc_pending');
        setTimeout(() => showNotif(
          t('Connexion Genesys Cloud réussie ✓\nLe token OAuth a été obtenu avec succès.',
            'Genesys Cloud connection successful ✓\nOAuth token obtained successfully.'),
          false
        ), 200);
      }
      return;
    }

    _loadToken();
  })();

  // OAuth Authorization Code + PKCE → Bearer token (no client secret required)
  // If no valid cached token and noRedirect is false, redirects to Genesys login
  // and returns a never-resolving promise (page navigates away).
  async function fetchToken(gc, opts) {
    if (_gcToken && Date.now() < _gcTokenExpiry) {
      console.log('[DemoGenesys] fetchToken: using cached token');
      return _gcToken;
    }
    if (!gc.clientId) {
      throw new Error('clientId not configured');
    }
    if (opts && opts.noRedirect) {
      console.warn('[DemoGenesys] fetchToken: no valid token, noRedirect=true → skip');
      throw new Error('no_token');
    }
    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = await _buildAuthUrl(gc, redirectUri);
    console.log('[DemoGenesys] fetchToken: redirect → PKCE authorization code', authUrl);
    window.location.href = authUrl;
    return new Promise(() => { }); // never resolves — page is navigating away
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  return {
    /** Open a Genesys Cloud web messaging widget */
    webMessaging() {
      Genesys("command", "Messenger.open");
    },

    /** Initiate a phone call using the configured call number (tel: link) */
    call() {
      const gc = (DemoConfig.getProfile() || DemoConfig.DEFAULT_PROFILE).genesys || {};
      const raw = gc.callNumber || '';
      const digits = raw.replace(/\D/g, '');
      if (digits) {
        console.log('[DemoGenesys] call → tel:', digits);
        window.location.href = `tel:${digits}`;
      } else {
        console.warn('[DemoGenesys] call: callNumber not configured in settings');
        showNotif(t(
          'Aucun numéro configuré.\nAjoute un numéro d\'appel dans Paramètres → Genesys Cloud.',
          'No number configured.\nAdd a call number in Settings → Genesys Cloud.'
        ), true);
      }
    },

    /** Start a video session via Genesys Cloud */
    video() {
      alert(t('Démarrage session vidéo', 'Starting video session'));
    },

    /**
     * Create a Genesys Cloud workitem.
     * Also the default body of Settings → Genesys Cloud → additionalJS.
     */
    createWorkitem() {
      alert(t("Création d'un workitem", 'Creating a workitem'));
    },

    /** Send a contact form message to the advisor */
    messageSent() {
      alert(t('Message envoyé à ton conseiller.', 'Message sent to your advisor.'));
    },

    /**
     * Confirm a calendar appointment with the advisor.
     *
     * @param {string} scheduledTime  ISO-8601 datetime, e.g. "2026-05-14T14:00:00.000+02:00"
     *
     * Flow:
     *   1. OAuth Authorization Code + PKCE → access token
     *   2. POST /api/v2/conversations/callbacks
     *      callbackUserName     : persona.firstName + lastName
     *      callbackNumbers      : [persona.phone] (digits only)
     *      callbackScheduledTime: scheduledTime
     *      data                 : { advisor, profileType, email }
     *      queueId / scriptId   from Settings → Genesys Cloud
     */
    async appointmentConfirm(scheduledTime) {
      const profile = DemoConfig.getProfile() || DemoConfig.DEFAULT_PROFILE;
      const gc = profile.genesys || {};
      const persona = profile.persona || {};
      const btn = document.getElementById('confirm-rdv');

      if (!gc.clientId || !gc.queueId) {
        console.warn('[DemoGenesys] appointmentConfirm: incomplete config', {
          region: gc.region, clientId: gc.clientId, queueId: gc.queueId
        });
        showNotif(t(
          'Configuration Genesys incomplète.\nVérifie Client ID et Queue ID dans Paramètres → Genesys Cloud.',
          'Incomplete Genesys configuration.\nCheck Client ID and Queue ID in Settings → Genesys Cloud.'
        ), true);
        return;
      }

      const domain = regionDomain(gc.region);
      const callbackUserName = `${persona.firstName || ''} ${persona.lastName || ''}`.trim();
      const callbackNumbers = [(persona.phone || '').replace(/\D/g, '')].filter(Boolean);

      setButtonLoading(btn, true);
      console.group('[DemoGenesys] appointmentConfirm');
      console.log('region:', gc.region, '→', domain);
      console.log('scheduledTime:', scheduledTime);

      try {
        const token = await fetchToken(gc);

        const body = {
          queueId: gc.queueId,
          callbackUserName: callbackUserName,
          callbackNumbers: callbackNumbers,
          callbackScheduledTime: scheduledTime,
          data: {
            advisor: persona.advisor || '',
            profileType: persona.profileType || '',
            email: persona.email || ''
          }
        };
        if (gc.scriptId) body.scriptId = gc.scriptId;

        console.log('POST /api/v2/conversations/callbacks', body);
        const res = await fetch(`https://api.${domain}/api/v2/conversations/callbacks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`API ${res.status}: ${err}`);
        }

        const responseJson = await res.json();
        console.log('✓ response:', responseJson);
        showNotif(t(
          'Rendez-vous confirmé ✓\nVotre conseiller vous rappellera au numéro enregistré.',
          'Appointment confirmed ✓\nYour advisor will call you back on the registered number.'
        ), false);

      } catch (err) {
        console.error('[DemoGenesys] appointmentConfirm ✗', err);
        showNotif(t(
          `Erreur lors de la prise de rendez-vous :\n${err.message}`,
          `Error booking appointment:\n${err.message}`
        ), true);
      } finally {
        setButtonLoading(btn, false);
        console.groupEnd();
      }
    },

    /**
     * Submit a loan simulation request.
     * @param {{
     *   offerType: string,   'auto' | 'travaux' | 'projet'
     *   amount:    number,   Requested amount (€)
     *   months:    number,   Duration in months
     *   rate:      number,   Annual rate % (TAEG)
     *   monthly:   number,   Computed monthly payment (€)
     *   totalCost: number    Total repayment amount (€)
     * }} data
     */
    loanSimulation(_data) {
      alert(t('Demande de devis soumise', 'Loan simulation submitted'));
    },

    /**
     * Fetch the estimated wait time for a given media type from Genesys Cloud.
     * Requires queueId and clientId to be configured in settings.
     *
     * @param {'call'|'message'} mediaType
     * @returns {Promise<number|null>} estimatedWaitTimeSeconds, or null if not configured / on error
     */
    async fetchWaitTime(mediaType) {
      const gc = (DemoConfig.getProfile() || DemoConfig.DEFAULT_PROFILE).genesys || {};
      if (!gc.queueId || !gc.clientId) {
        console.warn('[DemoGenesys] fetchWaitTime: queueId or clientId not configured, skipping');
        return null;
      }
      const domain = regionDomain(gc.region);
      const url = `https://api.${domain}/api/v2/routing/queues/${gc.queueId}/mediatypes/${mediaType}/estimatedwaittime`;
      console.log('[DemoGenesys] fetchWaitTime →', mediaType, url);
      let token;
      try {
        token = await fetchToken(gc, { noRedirect: true });
      } catch (e) {
        if (e.message === 'no_token') {
          console.warn('[DemoGenesys] fetchWaitTime: not authenticated yet, skipping');
          return null;
        }
        throw e;
      }
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[DemoGenesys] fetchWaitTime ✗', res.status, errText);
        throw new Error(`API ${res.status}: ${errText}`);
      }
      const data = await res.json();
      const seconds = data.results?.[0]?.estimatedWaitTimeSeconds ?? null;
      console.log('[DemoGenesys] fetchWaitTime ✓', mediaType, '→', seconds, 's | raw:', data);
      return seconds;
    },

    /**
     * Test the OAuth PKCE connection from the Settings panel.
     * Redirects to Genesys login if no token is cached; shows success toast on return.
     * @param {{ region: string, clientId: string }} gc
     * @param {HTMLButtonElement} [btn]
     */
    async testConnection(gc, btn) {
      if (!gc.clientId) {
        console.warn('[DemoGenesys] testConnection: clientId missing');
        showNotif(t(
          'Client ID requis pour tester la connexion.',
          'Client ID is required to test the connection.'
        ), true);
        return;
      }
      console.log('[DemoGenesys] testConnection → region:', gc.region, '| clientId:', gc.clientId);
      // If token already cached, show success immediately; otherwise redirect to login.
      // On return from redirect, the IIFE above will show the success toast automatically.
      sessionStorage.setItem('_gc_pending', 'testConnection');
      setButtonLoading(btn, true);
      try {
        await fetchToken(gc); // may redirect (never resolves); if cached, resolves immediately
        sessionStorage.removeItem('_gc_pending');
        console.log('[DemoGenesys] testConnection ✓ (cached token)');
        showNotif(t(
          'Connexion Genesys Cloud réussie ✓\nLe token OAuth en cache est toujours valide.',
          'Genesys Cloud connection successful ✓\nCached OAuth token is still valid.'
        ), false);
      } catch (err) {
        sessionStorage.removeItem('_gc_pending');
        console.error('[DemoGenesys] testConnection ✗', err);
        showNotif(t(
          `Erreur de connexion OAuth :\n${err.message}`,
          `OAuth connection error:\n${err.message}`
        ), true);
      } finally {
        setButtonLoading(btn, false);
      }
    },

    /** Return the current token status. */
    getTokenStatus() {
      if (_gcToken && Date.now() < _gcTokenExpiry) {
        return { connected: true, expiresAt: new Date(_gcTokenExpiry) };
      }
      return { connected: false, expiresAt: null };
    },

    /** Clear the token from memory and localStorage (e.g. when clientId changes). */
    clearToken() {
      _gcToken = null;
      _gcTokenExpiry = 0;
      try { localStorage.removeItem(GC_TOKEN_KEY); } catch (e) { }
      console.log('[DemoGenesys] clearToken: token cleared');
    },

    /**
     * Redirect to Genesys Cloud authorization (Authorization Code + PKCE).
     * @param {{ region: string, clientId: string }} gc
     * @param {string} redirectUri  Full URL of the page to return to after auth
     */
    async redirectForAuth(gc, redirectUri) {
      const url = await _buildAuthUrl(gc, redirectUri);
      console.log('[DemoGenesys] redirectForAuth →', url);
      window.location.href = url;
    },
  };
})();
