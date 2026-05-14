/* =============================================================================
   DemoConfig — localStorage manager for Démo banque
   ============================================================================= */
const DemoConfig = (() => {
  const STORAGE_KEY = 'demobank_v1';
  const LANG_KEY = 'demobank_lang';

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
      callNumber: '3262'
    },
    additionalJS: 'alert("création d\'un workitem");',
    language: null,
    tutoiement: true,
    messages: null
  };

  // ── Palette generation ──────────────────────────────────────────────────────
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
  function getData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { accounts: {}, current: null }; }
    catch { return { accounts: {}, current: null }; }
  }
  function saveData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

  // ── Global language (pre-login) ─────────────────────────────────────────────
  function getGlobalLang() {
    return localStorage.getItem(LANG_KEY) ||
      (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('fr') ? 'fr' : 'en');
  }

  function setGlobalLang(lang) {
    localStorage.setItem(LANG_KEY, lang);
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
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

  function logout() {
    const d = getData(); d.current = null; saveData(d);
    window.location.href = 'index.html';
  }

  function requireAuth() {
    const d = getData();
    if (!d.current || !d.accounts[d.current]) { window.location.href = 'index.html'; return false; }
    return true;
  }

  function getProfile() {
    const d = getData();
    return (d.current && d.accounts[d.current]) ? d.accounts[d.current] : null;
  }

  function updateProfile(updates) {
    const d = getData();
    if (!d.current) return;
    Object.assign(d.accounts[d.current], updates);
    saveData(d);
  }

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
    document.querySelectorAll('[data-persona-full]').forEach(el => el.textContent = `${p.firstName} ${p.lastName}`);
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
  function setLanguage(lang) {
    setGlobalLang(lang);
    const p = getProfile();
    if (p) deepUpdateProfile('language', lang);
  }

  // ── Messages ────────────────────────────────────────────────────────────────
  function getMessages() {
    const p = getProfile();
    const lang = (p && p.language) || getGlobalLang();
    const defaults = DEFAULT_MESSAGES[lang] || DEFAULT_MESSAGES.fr;
    if (!p) return JSON.parse(JSON.stringify(defaults));
    return (p.messages && p.messages.length > 0) ? p.messages : JSON.parse(JSON.stringify(defaults));
  }

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

  // ── Additional JS executor ──────────────────────────────────────────────────
  function executeAdditionalJS() {
    const p = getProfile() || DEFAULT_PROFILE;
    const code = p.additionalJS || 'alert("création d\'un workitem");';
    try { new Function(code)(); } catch (e) { console.error('AdditionalJS error:', e); }
  }

  function getGenesys() {
    const p = getProfile() || DEFAULT_PROFILE;
    return p.genesys || DEFAULT_PROFILE.genesys;
  }

  return {
    DEFAULT_PROFILE,
    generatePalette,
    getGlobalLang, setGlobalLang,
    login, logout, requireAuth,
    getProfile, updateProfile, deepUpdateProfile,
    applyBranding, setLanguage,
    getMessages, addMessage,
    executeAdditionalJS,
    getGenesys
  };
})();
