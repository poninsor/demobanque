/**
 * salesforce.js — Salesforce REST integration hooks
 *
 * Loaded by every page that needs Salesforce access from custom JS:
 *   settings.html (OAuth connect UI), messages.html (client snippet),
 *   advisor.html (advisor snippet).
 *
 * Depends on config.js only (no genesys.js, no shell.js) so it is safe to
 * load on advisor.html, which runs the advisor-side additionalJS snippet.
 *
 * Auth: OAuth 2.0 Authorization Code + PKCE (public client, no secret), the
 * Salesforce-recommended flow for single-page apps. The token-exchange POST and
 * every REST call run in the browser, so the app origin must be added to the
 * org's CORS allowlist (Setup -> CORS) and the Connected App must enable PKCE.
 *
 * All settings are read at call time from DemoConfig.getSalesforce() so they
 * always reflect the latest values saved in Settings without a page reload.
 */
const DemoSalesforce = (() => {
  const SF_TOKEN_KEY = 'demobank_sf_token';
  const DEFAULT_API_VERSION = 'v60.0';

  let _sfToken = null;
  let _sfInstanceUrl = '';
  let _sfTokenExpiry = 0;

  // ── Config helpers ──────────────────────────────────────────────────────────

  function _config() {
    return DemoConfig.getSalesforce() || DemoConfig.DEFAULT_PROFILE.salesforce;
  }

  /** Login host without trailing slash, e.g. 'https://login.salesforce.com'. */
  function _loginUrl(sf) {
    return (sf.loginUrl || 'https://login.salesforce.com').replace(/\/$/, '');
  }

  function _apiVersion(sf) {
    return sf.apiVersion || DEFAULT_API_VERSION;
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

  async function _buildAuthUrl(sf, redirectUri) {
    const verifier = _generateVerifier();
    const challenge = await _generateChallenge(verifier);
    const state = _generateVerifier();
    sessionStorage.setItem('_sf_code_verifier', verifier);
    sessionStorage.setItem('_sf_oauth_state', state);
    return `${_loginUrl(sf)}/services/oauth2/authorize`
      + `?response_type=code`
      + `&client_id=${encodeURIComponent(sf.clientId)}`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&code_challenge=${encodeURIComponent(challenge)}`
      + `&code_challenge_method=S256`
      + `&state=${encodeURIComponent(state)}`;
  }

  // ── Token cache ──────────────────────────────────────────────────────────────

  function _saveToken() {
    try {
      const clientId = _config().clientId || '';
      localStorage.setItem(SF_TOKEN_KEY, JSON.stringify({
        token: _sfToken, instanceUrl: _sfInstanceUrl, expiry: _sfTokenExpiry, clientId
      }));
      console.log('[DemoSalesforce] _saveToken: token persisted to localStorage');
    } catch (e) {
      console.warn('[DemoSalesforce] _saveToken: failed', e);
    }
  }

  function _loadToken() {
    try {
      const stored = JSON.parse(localStorage.getItem(SF_TOKEN_KEY));
      if (!stored || !stored.token || !stored.expiry) return;
      const clientId = _config().clientId || '';
      if (stored.clientId !== clientId) { console.log('[DemoSalesforce] _loadToken: clientId mismatch, skipping'); return; }
      if (Date.now() >= stored.expiry) { console.log('[DemoSalesforce] _loadToken: token expired'); return; }
      _sfToken = stored.token;
      _sfInstanceUrl = stored.instanceUrl || '';
      _sfTokenExpiry = stored.expiry;
      console.log('[DemoSalesforce] _loadToken: valid token loaded from localStorage');
    } catch (e) {
      console.warn('[DemoSalesforce] _loadToken: failed', e);
    }
  }

  // On page load: detect return from PKCE authorization code redirect, else restore from localStorage.
  // Only acts on the callback if Salesforce initiated it (_sf_oauth_state present), so it never
  // consumes or wipes a callback belonging to another provider (e.g. Genesys) on the same page.
  (async function () {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const returnedState = params.get('state');
    const expectedState = sessionStorage.getItem('_sf_oauth_state');

    if (!code || !expectedState) {
      _loadToken();
      return;
    }

    if (returnedState !== expectedState) {
      console.warn('[DemoSalesforce] PKCE callback: state mismatch, ignoring');
      sessionStorage.removeItem('_sf_oauth_state');
      history.replaceState(null, '', window.location.pathname);
      _loadToken();
      return;
    }
    sessionStorage.removeItem('_sf_oauth_state');

    const verifier = sessionStorage.getItem('_sf_code_verifier');
    sessionStorage.removeItem('_sf_code_verifier');

    const sf = _config();
    const redirectUri = window.location.origin + window.location.pathname;

    try {
      const res = await fetch(`${_loginUrl(sf)}/services/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: sf.clientId,
          code,
          redirect_uri: redirectUri,
          code_verifier: verifier
        })
      });
      if (!res.ok) throw new Error(`Token exchange ${res.status}`);
      const data = await res.json();
      _sfToken = data.access_token;
      _sfInstanceUrl = data.instance_url || '';
      // Salesforce does not return expires_in; the token lives as long as the session.
      // Cache it for 2h as a soft hint; a 401 from the API is the real source of truth.
      _sfTokenExpiry = Date.now() + 2 * 3600 * 1000;
      console.log('[DemoSalesforce] PKCE callback: token received, instance', _sfInstanceUrl);
    } catch (e) {
      console.error('[DemoSalesforce] PKCE token exchange failed', e);
      history.replaceState(null, '', window.location.pathname);
      _loadToken();
      _notifyAuthResult(false);
      return;
    }

    history.replaceState(null, '', window.location.pathname);
    _saveToken();
    _notifyAuthResult(true);
  })();

  // Signal the end of the redirect-based OAuth flow so the Settings page can update
  // its status and toast only once the async token exchange has actually resolved.
  function _notifyAuthResult(ok) {
    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('demobank-sf-auth', { detail: { ok } }));
    }
  }

  // ── REST core ────────────────────────────────────────────────────────────────

  /**
   * Low-level fetch against the Salesforce REST API.
   * @param {string} path - Relative to the data API root (e.g. '/sobjects/Task'),
   *   relative to the instance root (starts with '/services/'), or an absolute URL.
   * @param {object} [init] - fetch() init; a plain-object body is JSON-serialised.
   * @returns {Promise<Response>}
   */
  async function sfFetch(path, init) {
    if (!_sfToken) throw new Error('No valid Salesforce token found.');
    if (!_sfInstanceUrl) throw new Error('Salesforce instance URL is unknown.');

    const sf = _config();
    let url;
    if (/^https?:\/\//.test(path)) url = path;
    else if (path.startsWith('/services/')) url = `${_sfInstanceUrl}${path}`;
    else url = `${_sfInstanceUrl}/services/data/${_apiVersion(sf)}${path}`;

    const opts = Object.assign({}, init || {});
    const headers = new Headers(opts.headers || {});
    headers.set('Authorization', `Bearer ${_sfToken}`);

    const body = opts.body;
    const isJsonBody = body
      && typeof body === 'object'
      && !(body instanceof FormData)
      && !(body instanceof Blob)
      && !(body instanceof URLSearchParams)
      && !(body instanceof ArrayBuffer);
    if (isJsonBody) {
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      opts.body = JSON.stringify(body);
    }

    opts.headers = headers;
    return fetch(url, opts);
  }

  /** Same as sfFetch, but throws on non-2xx and parses the JSON response (null on 204). */
  async function sfFetchJSON(path, init) {
    const res = await sfFetch(path, init);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Salesforce API ${res.status}: ${errText}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // ── Generic SObject CRUD ─────────────────────────────────────────────────────

  /** Create a record. Returns { id, success, errors }. */
  function create(sobject, fields) {
    return sfFetchJSON(`/sobjects/${sobject}`, { method: 'POST', body: fields });
  }

  /**
   * Retrieve a record by Id.
   * @param {string} sobject
   * @param {string} id
   * @param {string[]} [fields] - Optional subset of fields to return.
   */
  function get(sobject, id, fields) {
    const qs = fields && fields.length ? `?fields=${encodeURIComponent(fields.join(','))}` : '';
    return sfFetchJSON(`/sobjects/${sobject}/${id}${qs}`);
  }

  /** Update a record (PATCH). Returns true on success (HTTP 204). */
  async function update(sobject, id, fields) {
    await sfFetchJSON(`/sobjects/${sobject}/${id}`, { method: 'PATCH', body: fields });
    return true;
  }

  /** Run a SOQL query. Returns { totalSize, done, records }. */
  function query(soql) {
    return sfFetchJSON(`/query?q=${encodeURIComponent(soql)}`);
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  return {
    // Task
    createTask: (fields) => create('Task', fields),
    getTask: (id, fields) => get('Task', id, fields),
    updateTask: (id, fields) => update('Task', id, fields),

    // Contact
    createContact: (fields) => create('Contact', fields),
    getContact: (id, fields) => get('Contact', id, fields),
    updateContact: (id, fields) => update('Contact', id, fields),

    // Case
    createCase: (fields) => create('Case', fields),
    getCase: (id, fields) => get('Case', id, fields),
    updateCase: (id, fields) => update('Case', id, fields),

    // Generic escape hatches
    create, get, update, query, sfFetch, sfFetchJSON,

    /** True when the integration is enabled and a Consumer Key is configured. */
    isEnabled() {
      const sf = _config();
      return !!(sf.enabled && sf.clientId);
    },

    /** Return the current token status (used by the Settings panel). */
    getTokenStatus() {
      if (_sfToken && Date.now() < _sfTokenExpiry) {
        return { connected: true, expiresAt: new Date(_sfTokenExpiry), instanceUrl: _sfInstanceUrl };
      }
      return { connected: false, expiresAt: null, instanceUrl: '' };
    },

    /** Clear the token from memory and localStorage (e.g. when the Consumer Key changes). */
    clearToken() {
      _sfToken = null;
      _sfInstanceUrl = '';
      _sfTokenExpiry = 0;
      try { localStorage.removeItem(SF_TOKEN_KEY); } catch (e) { }
      console.log('[DemoSalesforce] clearToken: token cleared');
    },

    /**
     * Redirect to Salesforce authorization (Authorization Code + PKCE).
     * @param {{ loginUrl: string, clientId: string }} sf
     * @param {string} redirectUri  Full URL of the page to return to after auth
     */
    async redirectForAuth(sf, redirectUri) {
      const url = await _buildAuthUrl(sf, redirectUri);
      console.log('[DemoSalesforce] redirectForAuth ->', url);
      window.location.href = url;
    },
  };
})();
