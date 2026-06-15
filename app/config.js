/* =============================================================================
   DemoConfig — localStorage manager for Démo banque
   ============================================================================= */
const DemoConfig = (() => {
  const STORAGE_KEY = 'demobank_v1';
  const LANG_KEY = 'demobank_lang';
  const GC_TOKEN_KEY = 'demobank_gc_token';
  const DEFAULT_CLIENT_ADDITIONAL_JS = [
    '// Create a Case to notify a new message from the customer when the advisor is offline.',
    'if (Salesforce) {',
    '  await Salesforce.createCase({',
    '    Subject: `Message securise - ${persona.firstName} ${persona.lastName}`,',
    '    Description: messageText,',
    '    Origin: "Web",',
    '    Status: "New",',
    '    Priority: "Medium",',
    '    ExternalID__c: `${location.origin}/app/advisor.html?account=${accountId}&thread=${threadId}`,',
    '    Routed__c: true,',
    '    RecordTypeId: "012ao000005PUMbAAO",',
    '    ...(salesforce.contactId ? { ContactId: salesforce.contactId } : {})',
    '  });',
    '}'
  ].join('\n');
  const DEFAULT_CREDIT_SIMULATION_JS = [
    '// Create a Salesforce Opportunity when a loan simulation is submitted.',
    'if (Salesforce) {',
    '  const closeDate = new Date();',
    '  closeDate.setDate(closeDate.getDate() + 7);',
    '  await Salesforce.create("Opportunity", {',
    '    Name: `${loanLabel} - ${projectNature || "Simulation"}`,',
    '    AccountId: "001ao00002DPuD2AAL",',
    '    ...(salesforce.contactId ? { ContactId: salesforce.contactId } : {}),',
    '    Description: [',
    '      `Type : ${loanLabel}`,',
    '      `Nature : ${projectNature || "-"}`,',
    '      `Montant : ${amount} €`,',
    '      `Duree : ${months} mois`,',
    '      `Taux indicatif : ${rate} % TAEG`,',
    '      `Mensualite estimee : ${monthly} €`',
    '    ].join("\\n"),',
    '    Amount: amount,',
    '    CloseDate: closeDate.toISOString().split("T")[0],',
    '    StageName: "Qualification",',
    '    NextStep: "Demande de devis"',
    '  });',
    '}'
  ].join('\n');

  const DEFAULT_ADVISOR_ADDITIONAL_JS = [
    '// Execute a Workflow: notify the customer by SMS when the advisor replies while the customer is offline.',
    '// Note: the agentless API (/api/v2/conversations/messages/agentless) requires a Client Credentials grant',
    '// and is rejected with the Authorization Code + PKCE token used here. Use a Workflow instead.',
    ' await fetchGenesysJSON("/api/v2/flows/executions", {',
    '   method: "POST",',
    '   body: {',
    '     flowId: "YOUR_WORKFLOW_ID",',
    '     inputData: {',
    '       "Flow.from": "+33644603451",',
    '       "Flow.to": persona.phone,',
    '       "Flow.message": `Bonjour ${persona.firstName}, votre conseiller vous a repondu dans la messagerie securisee.`',
    '     }',
    '   }',
    ' });'
  ].join('\n');

  const DEFAULT_MESSAGES = {
    fr: [
      { id: 'd1', from: 'them', initials: 'CL', text: "Bonjour Sophie 👋 J'ai bien reçu ta demande pour l'attestation de domiciliation, je m'en occupe ce matin.", time: '10:42' },
      { id: 'd2', from: 'me', text: "Super merci ! Tu peux me la signer électroniquement ?", time: '11:14' },
      { id: 'd3', from: 'them', initials: 'CL', text: "Bien sûr. Tu la recevras dans la messagerie sécurisée — pas besoin de te déplacer.", time: '11:16' },
      { id: 'd4', from: 'them', initials: 'CL', type: 'file', fileName: 'Attestation domiciliation.pdf', fileSize: 'PDF · 124 ko · signé', time: '14:18' },
      { id: 'd5', from: 'them', initials: 'CL', text: "Voilà, c'est prêt. Tu me dis si tu as besoin d'autre chose pour ton dossier travaux.", time: '14:21' }
    ],
    en: [
      { id: 'd1', from: 'them', initials: 'CL', text: "Hi Sophie 👋 I received your request for the proof of address — I'll take care of it this morning.", time: '10:42' },
      { id: 'd2', from: 'me', text: "Great, thank you! Can you sign it electronically?", time: '11:14' },
      { id: 'd3', from: 'them', initials: 'CL', text: "Of course. You'll receive it in your secure inbox — no need to come in.", time: '11:16' },
      { id: 'd4', from: 'them', initials: 'CL', type: 'file', fileName: 'Proof of address.pdf', fileSize: 'PDF · 124 KB · signed', time: '14:18' },
      { id: 'd5', from: 'them', initials: 'CL', text: "There you go, all done. Let me know if you need anything else for your home improvement project.", time: '14:21' }
    ]
  };

  const DEFAULT_PROFILE = {
    pin: '123456',
    brandName: 'Démo banque',
    slogan: 'Ta banque, en plus simple.',
    primaryColor: '#FF4515',
    logoData: null,
    persona: {
      firstName: 'Sophie',
      lastName: 'Martin',
      email: 'sophie.martin@example.fr',
      phone: '+33612345678',
      profileType: 'Particulier — salariée cadre',
      advisor: 'Camille Lefebvre — Paris 11'
    },
    balances: { checking: '12 480,57', savings: '22 950,00', pel: '0,00' },
    products: { visaPremier: true, visaClassic: true, autoLoan: true, assuranceVie: false },
    genesys: {
      region: 'mypurecloud.ie',
      messengerSnippet: '',
      clientId: '',
      queueId: '',
      scriptId: '',
      callNumber: '3262',
      internalCallNumber: ''
    },
    audiocodes: {
      enabled: false,
      domain: '',
      wssAddress: '',
      caller: '',
      password: '',
      extraHeaders: ''
    },
    salesforce: {
      enabled: false,
      loginUrl: 'https://login.salesforce.com',
      clientId: '',
      apiVersion: 'v60.0',
      contactId: ''
    },
    additionalJS: DEFAULT_CLIENT_ADDITIONAL_JS,
    advisorAdditionalJS: DEFAULT_ADVISOR_ADDITIONAL_JS,
    creditSimulationJS: DEFAULT_CREDIT_SIMULATION_JS,
    language: null,
    tutoiement: true,
    messages: null
  };

  // ── Palette generation ──────────────────────────────────────────────────────

  /** Converts a 6-digit hex colour to [h, s, l] (degrees / percent / percent). */
  function hexToHsl(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        default: h = ((r - g) / d + 4) / 6;
      }
    }
    return [h * 360, s * 100, l * 100];
  }

  /** Converts HSL (degrees / percent / percent) to a 6-digit hex colour string. */
  function hslToHex(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
    }
    return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generates a 10-stop colour palette (50–900) from a single brand hex colour.
   * Falls back to Genesys Orange (#FF4515) if the input is invalid.
   * @param {string} hex - Base brand colour, e.g. "#FF4515".
   * @returns {{ 50: string, 100: string, 200: string, 300: string, 400: string,
   *             500: string, 600: string, 700: string, 800: string, 900: string }}
   */
  function generatePalette(hex) {
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) hex = '#FF4515';
    const [h, s, l] = hexToHsl(hex);
    const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
    return {
      50: hslToHex(h, clamp(s * 0.25, 5, 30), 97),
      100: hslToHex(h, clamp(s * 0.45, 8, 55), 93),
      200: hslToHex(h, clamp(s * 0.65, 12, 75), 86),
      300: hslToHex(h, clamp(s * 0.82, 15, 90), 76),
      400: hslToHex(h, clamp(s * 0.95, 20, 100), 66),
      500: hex,
      600: hslToHex(h, clamp(s * 1.05, s, 100), clamp(l * 0.87, 8, l)),
      700: hslToHex(h, clamp(s * 1.05, s, 100), clamp(l * 0.72, 6, l)),
      800: hslToHex(h, clamp(s * 1.05, s, 100), clamp(l * 0.56, 5, l)),
      900: hslToHex(h, clamp(s * 1.05, s, 100), clamp(l * 0.40, 4, l))
    };
  }

  // ── Storage helpers ─────────────────────────────────────────────────────────

  /** Reads and parses the full storage object from localStorage. Never throws. */
  function getData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { accounts: {}, current: null }; }
    catch { return { accounts: {}, current: null }; }
  }

  /** Serialises and writes the storage object to localStorage. */
  function saveData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

  // ── Global language (pre-login) ─────────────────────────────────────────────

  /**
   * Returns the active UI language ('fr' or 'en').
   * Reads from localStorage first, then falls back to the browser locale.
   * @returns {'fr' | 'en'}
   */
  function getGlobalLang() {
    return localStorage.getItem(LANG_KEY) ||
      (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('fr') ? 'fr' : 'en');
  }

  /**
   * Persists the UI language and updates the <html lang> attribute.
   * @param {'fr' | 'en'} lang
   */
  function setGlobalLang(lang) {
    localStorage.setItem(LANG_KEY, lang);
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  /**
   * Attempts to log in with the given credentials.
   * - If the account doesn't exist and the PIN is '123456', a new profile is created from DEFAULT_PROFILE.
   * - On success, sets `current` in storage and returns `{ ok: true, isNew: boolean }`.
   * - On failure, returns `{ ok: false, msg: string }` with a localised error message.
   * @param {string} accountId - 8-digit account number.
   * @param {string} pin - 6-digit passcode.
   * @returns {{ ok: boolean, isNew?: boolean, msg?: string }}
   */
  function login(accountId, pin) {
    const lang = getGlobalLang();
    const isEn = lang === 'en';
    if (!/^\d{8}$/.test(accountId)) return { ok: false, msg: isEn ? 'Account number must be 8 digits.' : 'Le numéro de compte doit contenir 8 chiffres.' };
    if (!/^\d{6}$/.test(pin)) return { ok: false, msg: isEn ? 'Passcode must be 6 digits.' : 'Le code secret doit contenir 6 chiffres.' };
    const d = getData();
    if (!d.accounts[accountId]) {
      if (pin !== '123456') return { ok: false, msg: isEn ? 'Unknown account. Use passcode 123456 to create a new profile.' : 'Compte inconnu. Utilisez le code 123456 pour créer un nouveau compte.' };
      const profile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
      profile.language = lang;
      d.accounts[accountId] = profile;
      d.current = accountId;
      saveData(d);
      return { ok: true, isNew: true };
    }
    if (d.accounts[accountId].pin !== pin) return { ok: false, msg: isEn ? 'Incorrect passcode.' : 'Code secret incorrect.' };
    d.current = accountId;
    saveData(d);
    return { ok: true, isNew: false };
  }

  /** Clears the current session and redirects to index.html. */
  function logout() {
    const d = getData(); d.current = null; saveData(d);
    window.location.href = 'index.html';
  }

  /**
   * Guards a protected page: redirects to index.html if no valid session exists.
   * Call at the top of every page script before doing anything else.
   * @returns {boolean} true if authenticated, false if redirected.
   */
  function requireAuth() {
    const d = getData();
    if (!d.current || !d.accounts[d.current]) { window.location.href = 'index.html'; return false; }
    return true;
  }

  /**
   * Returns the full profile object for the currently logged-in account, or null.
   * @returns {object | null}
   */
  function getProfile() {
    const d = getData();
    return (d.current && d.accounts[d.current]) ? d.accounts[d.current] : null;
  }

  /**
   * Returns the full profile object for a given account ID, or null.
   * @param {string} accountId
   * @returns {object | null}
   */
  function getProfileByAccountId(accountId) {
    const d = getData();
    return accountId && d.accounts[accountId] ? d.accounts[accountId] : null;
  }

  /**
   * Shallow-merges `updates` into the current account's profile and persists it.
   * Top-level keys in `updates` overwrite existing ones; nested objects are replaced entirely.
   * Use `deepUpdateProfile` to merge into a nested key instead.
   * @param {object} updates - Partial profile fields to overwrite.
   */
  function updateProfile(updates) {
    const d = getData();
    if (!d.current) return;
    Object.assign(d.accounts[d.current], updates);
    saveData(d);
  }

  /**
   * Merges `value` into a single top-level key of the current profile and persists it.
   * If `value` is an object, it is shallow-merged with the existing sub-object.
   * If `value` is a primitive, it replaces the key directly.
   * @param {string} key - Top-level profile key (e.g. 'genesys', 'persona').
   * @param {*} value - New value or partial object to merge in.
   */
  function deepUpdateProfile(key, value) {
    const d = getData();
    if (!d.current) return;
    if (typeof value === 'object' && value !== null) {
      d.accounts[d.current][key] = Object.assign({}, d.accounts[d.current][key] || {}, value);
    } else {
      d.accounts[d.current][key] = value;
    }
    saveData(d);
  }

  // ── Branding applicator ─────────────────────────────────────────────────────

  /**
   * Applies the current profile's branding to the page:
   * - Sets all --brand-* CSS custom properties from the generated palette.
   * - Updates every [data-brand], [data-persona-*], [data-balance-*], [data-logo] element.
   * - Replaces the leading "Démo banque" in the page <title>.
   * - Sets the <html lang> attribute.
   * Safe to call multiple times; idempotent for the same profile state.
   * @param {object} [profile] - Profile to apply; defaults to the current session profile.
   */
  function applyBranding(profile) {
    profile = profile || getProfile() || DEFAULT_PROFILE;
    const color = profile.primaryColor || '#FF4515';
    const palette = generatePalette(color);
    const root = document.documentElement;
    Object.entries(palette).forEach(([k, v]) => root.style.setProperty(`--brand-${k}`, v));
    root.style.setProperty('--brand', palette[500]);
    root.style.setProperty('--brand-soft', palette[50]);
    root.style.setProperty('--brand-border', palette[100]);

    const brand = profile.brandName || 'Démo banque';
    const p = profile.persona || DEFAULT_PROFILE.persona;
    const initials = ((p.firstName || 'S')[0] + (p.lastName || 'M')[0]).toUpperCase();

    document.querySelectorAll('[data-brand]').forEach(el => el.textContent = brand);
    document.querySelectorAll('[data-persona-full]').forEach(el => el.textContent = `${p.firstName || ''} ${p.lastName || ''}`);
    document.querySelectorAll('[data-persona-first]').forEach(el => el.textContent = p.firstName);
    document.querySelectorAll('[data-persona-initials]').forEach(el => el.textContent = initials);

    const bal = profile.balances || DEFAULT_PROFILE.balances;
    document.querySelectorAll('[data-balance-checking]').forEach(el => el.textContent = `${bal.checking} €`);
    document.querySelectorAll('[data-balance-savings]').forEach(el => el.textContent = `${bal.savings} €`);
    document.querySelectorAll('[data-balance-pel]').forEach(el => el.textContent = `${bal.pel} €`);

    if (profile.logoData) {
      document.querySelectorAll('[data-logo]').forEach(el => { el.src = profile.logoData; el.alt = brand; });
    }

    document.title = document.title.replace(/^Démo banque/, brand);
    const lang = profile.language || getGlobalLang();
    root.lang = lang;
  }

  // ── Language switcher ───────────────────────────────────────────────────────

  /**
   * Sets the UI language globally and persists it to the current profile if logged in.
   * Also updates the <html lang> attribute immediately.
   * @param {'fr' | 'en'} lang
   */
  function setLanguage(lang) {
    setGlobalLang(lang);
    const p = getProfile();
    if (p) deepUpdateProfile('language', lang);
  }

  // ── Messages ────────────────────────────────────────────────────────────────

  /**
   * Returns the message thread for the current account.
   * Falls back to DEFAULT_MESSAGES in the account's language if no messages have been saved yet.
   * @returns {Array<object>} Array of message objects.
   */
  function getMessages() {
    const p = getProfile();
    const lang = (p && p.language) || getGlobalLang();
    const defaults = DEFAULT_MESSAGES[lang] || DEFAULT_MESSAGES.fr;
    if (!p) return JSON.parse(JSON.stringify(defaults));
    return (p.messages && p.messages.length > 0) ? p.messages : JSON.parse(JSON.stringify(defaults));
  }

  /**
   * Appends a message to the current account's thread and persists it.
   * Initialises the thread from DEFAULT_MESSAGES first if it is still empty.
   * @param {{ id: string, from: 'me'|'them', text?: string, time: string,
   *           type?: 'file', fileName?: string, fileSize?: string, initials?: string }} msg
   */
  function addMessage(msg) {
    const d = getData();
    if (!d.current) return;
    const p = d.accounts[d.current];
    if (!p.messages || p.messages.length === 0) {
      const lang = p.language || getGlobalLang();
      p.messages = JSON.parse(JSON.stringify(DEFAULT_MESSAGES[lang] || DEFAULT_MESSAGES.fr));
    }
    p.messages.push(msg);
    saveData(d);
  }

  // ── Storage quota helpers ───────────────────────────────────────────────────

  /**
   * Estimates total localStorage usage in bytes (UTF-16, 2 bytes per char).
   * @returns {number}
   */
  function getStorageUsageBytes() {
    let total = 0;
    try {
      for (const key of Object.keys(localStorage)) {
        total += (localStorage.getItem(key) || '').length * 2;
      }
    } catch (e) { /* noop */ }
    return total;
  }

  /**
   * Removes fileData (base64) from all messages of a given account to reclaim storage.
   * The message card (fileName, fileSize) is preserved; the image is no longer displayable.
   * Works across both the thread model and the legacy flat messages array.
   * @param {string} accountId
   * @returns {number} number of attachments purged
   */
  function purgeMessageAttachments(accountId) {
    const d = getData();
    const p = (d.accounts || {})[accountId];
    if (!p) return 0;
    let count = 0;
    const purge = msg => { if (msg.fileData) { delete msg.fileData; count++; } };
    if (p.threads) {
      p.threads.forEach(thread => (thread.messages || []).forEach(purge));
    } else if (p.messages) {
      p.messages.forEach(purge);
    }
    if (count > 0) saveData(d);
    return count;
  }

  // ── Additional JS executor ──────────────────────────────────────────────────

  function regionDomain(raw) {
    return (raw || 'mypurecloud.ie')
      .replace(/^https?:\/\/(login\.|api\.)?/, '')
      .replace(/\/$/, '');
  }

  function loadGenesysToken(clientId) {
    try {
      const stored = JSON.parse(localStorage.getItem(GC_TOKEN_KEY) || 'null');
      if (!stored || !stored.token || !stored.expiry || !clientId) return null;
      if (stored.clientId !== clientId) return null;
      if (Date.now() >= stored.expiry) return null;
      return stored.token;
    } catch {
      return null;
    }
  }

  async function runConfiguredJS(code, profile, runtime) {
    if (!code || !code.trim()) return;

    const gc = profile.genesys || DEFAULT_PROFILE.genesys;
    const clientId = gc.clientId || '';
    const token = loadGenesysToken(clientId);
    const apiBaseUrl = clientId ? `https://api.${regionDomain(gc.region)}` : '';
    const apiUrl = path => /^https?:\/\//.test(path) ? path : `${apiBaseUrl}${path}`;
    const accountId = runtime.accountId || getCurrentAccountId();
    const message = runtime.message || null;
    const messageText = runtime.messageText || (message && (message.text || message.fileName)) || '';

    const fetchGenesys = async (path, init) => {
      if (!apiBaseUrl) throw new Error('Genesys Cloud is not configured.');
      if (!token) throw new Error('No valid Genesys OAuth token found.');

      const opts = Object.assign({}, init || {});
      const headers = new Headers(opts.headers || {});
      headers.set('Authorization', `Bearer ${token}`);

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
      return fetch(apiUrl(path), opts);
    };

    const fetchGenesysJSON = async (path, init) => {
      const res = await fetchGenesys(path, init);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API ${res.status}: ${errText}`);
      }
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    };

    const context = {
      DemoConfig,
      accountId,
      profile,
      settings: profile,
      persona: profile.persona || {},
      balances: profile.balances || {},
      products: profile.products || {},
      genesys: gc,
      audiocodes: profile.audiocodes || DEFAULT_PROFILE.audiocodes,
      salesforce: profile.salesforce || DEFAULT_PROFILE.salesforce,
      Salesforce: (typeof DemoSalesforce !== 'undefined') ? DemoSalesforce : null,
      threadId: runtime.threadId || null,
      language: profile.language || getGlobalLang(),
      tutoiement: !!profile.tutoiement,
      message,
      messageText,
      token,
      apiBaseUrl,
      apiUrl,
      fetchGenesys,
      fetchGenesysJSON,
      role: runtime.role || 'client',
      isClientMessage: !!runtime.isClientMessage,
      isAdvisorMessage: !!runtime.isAdvisorMessage,
      // Loan simulation variables (injected by executeCreditSimulationJS)
      loanType: runtime.loanType || null,
      loanLabel: runtime.loanLabel || null,
      projectNature: runtime.projectNature || null,
      amount: runtime.amount || null,
      months: runtime.months || null,
      rate: runtime.rate || null,
      monthly: runtime.monthly || null,
      totalCost: runtime.totalCost || null,
      console
    };

    try {
      const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
      const fn = new AsyncFunction(...Object.keys(context), code);
      await fn(...Object.values(context));
    } catch (e) {
      console.error(`[DemoConfig] ${runtime.logLabel || 'additionalJS'} error:`, e);
    }
  }

  /**
   * Executes the `additionalJS` snippet stored in the current profile.
   * Used to trigger custom Genesys Cloud actions (e.g. workitem creation) after a message is sent.
   * Errors are caught and logged; they do not propagate.
   */
  function executeAdditionalJS(runtime) {
    const p = getProfile() || DEFAULT_PROFILE;
    const code = p.additionalJS || DEFAULT_CLIENT_ADDITIONAL_JS;
    return runConfiguredJS(code, p, Object.assign({
      role: 'client',
      isClientMessage: true,
      logLabel: 'additionalJS'
    }, runtime || {}));
  }

  /**
   * Executes the `advisorAdditionalJS` snippet stored in a target profile.
   * Used to trigger advisor-side custom actions (e.g. sending an SMS to the customer)
   * after a reply is sent while the customer is offline.
   * Errors are caught and logged; they do not propagate.
   * @param {string} accountId
   * @param {object} [runtime]
   */
  function executeAdvisorAdditionalJS(accountId, runtime) {
    const p = getProfileByAccountId(accountId) || DEFAULT_PROFILE;
    const code = p.advisorAdditionalJS || DEFAULT_ADVISOR_ADDITIONAL_JS;
    return runConfiguredJS(code, p, Object.assign({
      accountId,
      role: 'advisor',
      isAdvisorMessage: true,
      logLabel: 'advisorAdditionalJS'
    }, runtime || {}));
  }

  /**
   * Executes the `creditSimulationJS` snippet when a loan simulation is submitted.
   * Injects loan-specific variables in addition to the standard context.
   * @param {object} runtime - { loanType, loanLabel, projectNature, amount, months, rate, monthly, totalCost }
   */
  function executeCreditSimulationJS(runtime) {
    const p = getProfile() || DEFAULT_PROFILE;
    const code = p.creditSimulationJS || DEFAULT_CREDIT_SIMULATION_JS;
    return runConfiguredJS(code, p, Object.assign({
      role: 'client',
      logLabel: 'creditSimulationJS'
    }, runtime || {}));
  }

  /**
   * Returns the Genesys Cloud configuration object for the current account.
   * Falls back to DEFAULT_PROFILE.genesys if not logged in.
   * @returns {{ region: string, messengerSnippet: string, clientId: string,
   *             queueId: string, scriptId: string, callNumber: string }}
   */
  function getGenesys() {
    const p = getProfile() || DEFAULT_PROFILE;
    return p.genesys || DEFAULT_PROFILE.genesys;
  }

  function getAudiocodes() {
    const p = getProfile() || DEFAULT_PROFILE;
    return p.audiocodes || DEFAULT_PROFILE.audiocodes;
  }

  function getSalesforce() {
    const p = getProfile() || DEFAULT_PROFILE;
    return p.salesforce || DEFAULT_PROFILE.salesforce;
  }

  /**
   * Returns the 8-digit account ID of the currently logged-in user, or null.
   * @returns {string | null}
   */
  function getCurrentAccountId() {
    return getData().current;
  }

  // ── Thread system ───────────────────────────────────────────────────────────

  /**
   * Conversation topic descriptors used for thread creation.
   * Exposed as DemoConfig.MOTIFS for use in messages.html and advisor.html.
   */
  const MOTIFS = [
    { key: 'rdv',             fr: 'Rendez-vous',            en: 'Appointment',     color: '#6366f1' },
    { key: 'epargne',         fr: 'Épargne',                en: 'Savings',         color: '#0ea5e9' },
    { key: 'pret-immo',       fr: 'Prêt immobilier',        en: 'Home loan',       color: '#10b981' },
    { key: 'credit-conso',    fr: 'Crédit à la conso',      en: 'Consumer credit', color: '#f59e0b' },
    { key: 'assurance',       fr: 'Assurance & prévoyance', en: 'Insurance',       color: '#8b5cf6' },
    { key: 'reclamation',     fr: 'Réclamation',            en: 'Complaint',       color: '#ef4444' },
    { key: 'banque-distance', fr: 'Banque à distance',      en: 'Digital banking', color: '#3b82f6' },
    { key: 'compte',          fr: 'Compte bancaire',        en: 'Bank account',    color: '#64748b' },
    { key: 'paiement',        fr: 'Moyen de paiement',      en: 'Payment method',  color: '#ec4899' },
    { key: 'justificatif',    fr: 'Transmission de justificatif', en: 'Document upload', color: '#0d9488' },
    { key: 'autre',           fr: 'Autre',                  en: 'Other',           color: '#94a3b8' },
  ];

  function _motifLabel(key, lang) {
    const m = MOTIFS.find(x => x.key === key) || MOTIFS[MOTIFS.length - 1];
    return lang === 'en' ? m.en : m.fr;
  }

  function _motifColor(key) {
    return (MOTIFS.find(x => x.key === key) || MOTIFS[MOTIFS.length - 1]).color;
  }

  function _generateThreadId() {
    return 'thr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
  }

  function _nowHHMM() {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  }

  // Ensures p.threads exists, migrating from legacy p.messages if needed.
  // Mutates p in-place; caller must saveData() after.
  function _ensureThreads(p) {
    if (p.threads && p.threads.length > 0) return;
    const lang = p.language || 'fr';
    const msgs = p.messages && p.messages.length > 0
      ? p.messages
      : JSON.parse(JSON.stringify(DEFAULT_MESSAGES[lang] || DEFAULT_MESSAGES.fr));
    p.threads = [{ id: 'thr_legacy', motif: 'autre', createdAt: msgs[0]?.time || '10:42', messages: msgs }];
  }

  /**
   * Returns the threads array for the currently logged-in account.
   * Migrates from the legacy flat messages array on first call if needed.
   * @returns {Array<{id:string, motif:string, createdAt:string, messages:Array}>}
   */
  function getThreads() {
    const d = getData();
    if (!d.current || !d.accounts[d.current]) return [];
    const p = d.accounts[d.current];
    const migrated = !p.threads || p.threads.length === 0;
    _ensureThreads(p);
    if (migrated) saveData(d);
    return p.threads;
  }

  /**
   * Returns a single thread by id for the current account, or null.
   * @param {string} threadId
   */
  function getThread(threadId) {
    return getThreads().find(t => t.id === threadId) || null;
  }

  /**
   * Creates a new thread for the current account and persists it.
   * @param {string} motif  - One of MOTIFS[].key
   * @returns {{ id, motif, createdAt, messages }}
   */
  function createThread(motif) {
    const d = getData();
    if (!d.current) return null;
    const p = d.accounts[d.current];
    _ensureThreads(p);
    const thread = { id: _generateThreadId(), motif: motif || 'autre', createdAt: _nowHHMM(), messages: [] };
    p.threads.push(thread);
    saveData(d);
    return thread;
  }

  /**
   * Appends a message to a specific thread of the current account.
   * @param {string} threadId
   * @param {object} msg
   */
  function addMessageToThread(threadId, msg) {
    const d = getData();
    if (!d.current) return;
    const p = d.accounts[d.current];
    _ensureThreads(p);
    const thread = p.threads.find(t => t.id === threadId);
    if (!thread) return;
    thread.messages.push(msg);
    saveData(d);
  }

  /**
   * Returns threads for any account by ID (used by advisor.html).
   * Migrates from legacy messages if needed.
   * @param {string} accountId
   */
  function getThreadsByAccountId(accountId) {
    const d = getData();
    const p = (d.accounts || {})[accountId];
    if (!p) return [];
    const migrated = !p.threads || p.threads.length === 0;
    _ensureThreads(p);
    if (migrated) saveData(d);
    return p.threads;
  }

  /**
   * Appends a message to a specific thread of any account (used by advisor.html).
   * @param {string} accountId
   * @param {string} threadId
   * @param {object} msg
   */
  function addMessageToThreadByAccountId(accountId, threadId, msg) {
    const d = getData();
    const p = (d.accounts || {})[accountId];
    if (!p) return;
    _ensureThreads(p);
    const thread = p.threads.find(t => t.id === threadId);
    if (!thread) return;
    thread.messages.push(msg);
    saveData(d);
  }

  return {
    DEFAULT_PROFILE,
    DEFAULT_MESSAGES,
    MOTIFS,
    generatePalette,
    getGlobalLang, setGlobalLang,
    login, logout, requireAuth,
    getProfile, getProfileByAccountId, updateProfile, deepUpdateProfile,
    applyBranding, setLanguage,
    getMessages, addMessage,
    getThreads, getThread, createThread, addMessageToThread,
    getThreadsByAccountId, addMessageToThreadByAccountId,
    _motifLabel, _motifColor,
    getStorageUsageBytes, purgeMessageAttachments,
    executeAdditionalJS, executeAdvisorAdditionalJS, executeCreditSimulationJS,
    getGenesys,
    getAudiocodes,
    getSalesforce,
    getCurrentAccountId
  };
})();
