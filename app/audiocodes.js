/* =============================================================================
   DemoAudioCodes — custom integration of the AudioCodes WebRTC standalone SDK
   (click-to-call.js, AudioCodesUA singleton). Provides:
     - Custom floating UI (FAB + call panel) styled with the project brand
     - SIP extraHeaders auto-built from the customer profile + user-configurable
       additions, so Genesys Cloud Architect can route on context
     - Call persistence across page navigation following the official
       "Restore Call after Page Refresh" pattern (SDK Reference §4.11)
   ============================================================================= */
const DemoAudioCodes = (() => {
  const SDK_SRC = 'lib/audiocodes/click-to-call.js';
  const RESTORE_KEY = 'demobank_ac_restore';
  const RESTORE_MAX_DELAY_S = 20;

  // ── Private state ─────────────────────────────────────────────────────────
  let _phone = null;
  let _activeCall = null;
  let _initialized = false;
  let _connected = false;   // true once loginStateChanged: 'connected' fires
  let _state = 'idle'; // 'idle' | 'ready' | 'connecting' | 'ringing' | 'in-call' | 'on-hold'
  let _callStartMs = 0;
  let _timerInterval = null;
  let _currentExtraHeaders = [];
  let _pendingCallNumber = null;   // stored while in 'ready' (preview) state
  let _pendingExtraHeaders = [];   // X-User-* headers passed via URL params (?call=1&X-User-Foo=bar)
  let _ui = null;
  let _restoreData = null; // pending restore payload waiting for SDK ready

  // ── Config helpers ────────────────────────────────────────────────────────
  function _parseExtraHeadersText(raw) {
    if (!raw) return [];
    return raw.split('\n').map(s => s.trim()).filter(s => s && s.includes(':'));
  }

  // Build the canonical X-User-* headers from the active profile, then append
  // any user-defined headers from settings (audiocodes.extraHeaders textarea).
  function _buildExtraHeaders(p) {
    const persona = p.persona || {};
    const ac = p.audiocodes || {};
    const accountId = DemoConfig.getCurrentAccountId() || '';
    const headers = [];
    if (persona.firstName)   headers.push('X-User-FirstName: ' + persona.firstName);
    if (persona.lastName)    headers.push('X-User-LastName: '  + persona.lastName);
    if (persona.email)       headers.push('X-User-Email: '     + persona.email);
    if (persona.phone)       headers.push('X-User-Phone: '     + persona.phone);
    if (persona.profileType) headers.push('X-User-ProfileType: ' + persona.profileType);
    if (persona.advisor)     headers.push('X-User-AdvisorName: ' + persona.advisor);
    if (accountId)           headers.push('X-User-AccountId: ' + accountId);
    headers.push(..._parseExtraHeadersText(ac.extraHeaders));
    return headers;
  }

  // ── SDK loading ───────────────────────────────────────────────────────────
  // click-to-call.js is a webpack CommonJS bundle. It does NOT expose AudioCodesUA
  // to window. We fetch the source text, temporarily intercept Object.defineProperty
  // to capture every module-exports object marked with __esModule:true, execute the
  // bundle, then find the one that contains the AudioCodesUA class.
  function _loadSDK(callback) {
    const capturedExports = [];
    const origDefProp = Object.defineProperty;

    Object.defineProperty = function(target, prop, descriptor) {
      const result = origDefProp.call(Object, target, prop, descriptor);
      if (prop === '__esModule' && descriptor && descriptor.value === true) {
        capturedExports.push(target);
      }
      return result;
    };

    fetch(SDK_SRC)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(src => {
        try {
          // eslint-disable-next-line no-new-func
          (new Function(src))();
        } finally {
          Object.defineProperty = origDefProp;
        }
        const sdkExports = capturedExports.find(m => typeof m.AudioCodesUA === 'function');
        if (!sdkExports) {
          console.error('[DemoAudioCodes] AudioCodesUA class not found in SDK bundle');
          return;
        }
        callback(sdkExports.AudioCodesUA);
      })
      .catch(err => {
        Object.defineProperty = origDefProp;
        console.error('[DemoAudioCodes] SDK load failed:', err);
      });
  }

  // ── SDK setup ─────────────────────────────────────────────────────────────
  function _configurePhone(ac, AudioCodesUA) {
    _phone = new AudioCodesUA(); // constructor returns the singleton (AudioCodesUA.instance)
    const wss = ac.wssAddress || ('wss://' + ac.domain);

    _phone.setServerConfig([wss], ac.domain, []);
    _phone.setAccount(ac.caller, persona_displayName(), ac.password);
    // authUser omitted → SDK defaults it to ac.caller (setAccount signature: user, displayName, password, authUser)
    _phone.setConstraints({ echoCancellation: true, noiseSuppression: true }, false, {});
    _phone.setWebSocketKeepAlive(10, true, true, 0, false);
    _phone.setEnableAddVideo(false);
    _phone.setModes({
      video_call_audio_answer_firefox_fix: true,
      video_call_audio_answer_safari_fix:  true,
      ice_timeout_fix: 2000,
      chrome_rtp_timeout_fix: 13,
      sbc_switch_register5xx_mode: true,
      cache_register_auth_mode: true,
      check_remote_sdp_mode: true
    });
    _phone.setListeners({
      loginStateChanged:   _onLoginStateChanged,
      outgoingCallProgress: _onOutgoingCallProgress,
      callConfirmed:       _onCallConfirmed,
      callShowStreams:     _onCallShowStreams,
      callTerminated:      _onCallTerminated,
      callHoldStateChanged: _onCallHoldStateChanged,
      incomingCall:        _onIncomingCall
    });
    _phone.init(true); // connect immediately so transport is ready before user calls
  }

  function persona_displayName() {
    const p = DemoConfig.getProfile() || DemoConfig.DEFAULT_PROFILE;
    const per = p.persona || {};
    return per.phone || (per.firstName && per.lastName ? per.firstName + ' ' + per.lastName : '') || '';
  }

  // ── SDK event handlers ────────────────────────────────────────────────────
  function _onLoginStateChanged(_isLogin, cause) {
    if (cause === 'connected') {
      _connected = true;
      if (_restoreData) {
        _attemptRestoreCall();
      } else if (_pendingCallNumber && !_activeCall) {
        // User clicked "Start call" before transport was ready — fire now.
        callTo(_pendingCallNumber);
      }
    } else {
      _connected = false;
    }
  }

  function _onOutgoingCallProgress(call /*, response */) {
    _activeCall = call;
    _setState('ringing');
    _updatePeerFromCall(call);
  }

  function _onCallConfirmed(call /*, message, cause */) {
    _activeCall = call;
    _callStartMs = Date.now();
    _setState('in-call');
    _startTimer();
  }

  function _onCallShowStreams(call /*, localStream, remoteStream */) {
    if (!_ui || !_ui.audio) return;
    const remote = call && call.data && call.data._remoteMediaStream;
    if (remote) {
      _ui.audio.srcObject = remote;
      _ui.audio.play().catch(() => { /* autoplay may be blocked; ignored */ });
    }
  }

  function _onCallTerminated(/* call, message, cause */) {
    _activeCall = null;
    _pendingCallNumber = null;
    _pendingExtraHeaders = [];
    _setState('idle');
    _stopTimer();
    _clearRestore();
    if (_ui && _ui.audio) _ui.audio.srcObject = null;
    if (_ui && _ui.panel) _ui.panel.classList.remove('open');
  }

  function _onCallHoldStateChanged(call /*, local, remote */) {
    if (!_activeCall) return;
    _setState(call.isLocalHold() ? 'on-hold' : 'in-call');
  }

  function _onIncomingCall(call /*, video */) {
    // Demo app does not handle inbound calls — reject politely.
    try { call.reject(486, 'Busy Here'); } catch (e) { /* noop */ }
  }

  // ── Restore (SDK Reference §4.11) ─────────────────────────────────────────
  // Note: The SBC (AudioCodes Live Hub) terminates the SIP dialog when the WebSocket
  // drops on navigation. The INVITE-with-Replaces will receive 481 on the next page.
  // We still attempt the restore (correct per SDK docs §4.11) but also show a browser
  // confirm so the user knows leaving the page will likely drop their call.
  function _saveCall(event) {
    if (!_activeCall || !_activeCall.isEstablished || !_activeCall.isEstablished()) return;
    if (event && event.type === 'beforeunload') {
      // Trigger browser "Leave page?" dialog — message text is browser-controlled.
      event.preventDefault();
      event.returnValue = '';
    }
    try {
      const data = {
        callTo:   _activeCall.data && _activeCall.data._user,
        video:    typeof _activeCall.getVideoState === 'function' ? _activeCall.getVideoState() : 'inactive',
        replaces: typeof _activeCall.getReplacesHeader === 'function' ? _activeCall.getReplacesHeader() : '',
        time:     Date.now(),
        hold:     (_activeCall.isLocalHold && _activeCall.isLocalHold() ? 'local' : '') +
                  (_activeCall.isRemoteHold && _activeCall.isRemoteHold() ? 'remote' : ''),
        mute:     (_activeCall.isAudioMuted && _activeCall.isAudioMuted() ? 'audio' : ''),
        extraHeaders: _currentExtraHeaders
      };
      localStorage.setItem(RESTORE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[DemoAudioCodes] _saveCall failed', e);
    }
  }

  function _loadRestore() {
    try {
      const raw = localStorage.getItem(RESTORE_KEY);
      if (!raw) return null;
      localStorage.removeItem(RESTORE_KEY);
      const r = JSON.parse(raw);
      const delaySec = Math.ceil(Math.abs(r.time - Date.now()) / 1000);
      if (delaySec > RESTORE_MAX_DELAY_S) {
        console.log('[DemoAudioCodes] Restore skipped — delay too long (' + delaySec + 's)');
        return null;
      }
      return r;
    } catch (e) {
      console.warn('[DemoAudioCodes] _loadRestore failed', e);
      return null;
    }
  }

  function _clearRestore() {
    try { localStorage.removeItem(RESTORE_KEY); } catch (e) { /* noop */ }
  }

  function _attemptRestoreCall() {
    if (!_restoreData || !_phone) return;
    const r = _restoreData;
    _restoreData = null;
    const headers = ['Replaces: ' + r.replaces, ...(r.extraHeaders || [])];
    _currentExtraHeaders = r.extraHeaders || [];
    console.log('[DemoAudioCodes] Try restore call to', r.callTo);
    _setState('connecting');
    _activeCall = _phone.call(_phone.AUDIO, r.callTo, headers);
  }

  // ── SDK load + configure (shared by init restore path and _showPreview) ──
  function _loadAndConfigure() {
    const p = DemoConfig.getProfile() || DemoConfig.DEFAULT_PROFILE;
    const ac = p.audiocodes;
    _loadSDK(AudioCodesUA => {
      try { _configurePhone(ac, AudioCodesUA); }
      catch (e) { console.error('[DemoAudioCodes] SDK configuration failed', e); }
    });
  }

  // ── Public actions ────────────────────────────────────────────────────────
  function call(urlHeaders) {
    const p = DemoConfig.getProfile() || DemoConfig.DEFAULT_PROFILE;
    if (!isEnabled()) {
      const digits = ((p.genesys || {}).callNumber || '3262').replace(/\D/g, '');
      window.location.href = 'tel:' + digits;
      return;
    }
    const number = ((p.genesys || {}).internalCallNumber || (p.genesys || {}).callNumber || '').trim();
    if (!number) {
      console.warn('[DemoAudioCodes] No call number configured');
      return;
    }
    _showPreview(number, urlHeaders);
  }

  function _showPreview(number, urlHeaders) {
    _pendingCallNumber = number;
    _pendingExtraHeaders = Array.isArray(urlHeaders) ? urlHeaders : [];
    _setState('ready');
    if (_ui) {
      _ui.panel.classList.add('open');
      _populateDevices(); // independent of SDK — getUserMedia runs in parallel
    }
    if (!_phone) {
      _loadAndConfigure(); // start connecting while user picks devices
    }
  }

  function _populateDevices() {
    if (!_ui) return;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(devices => {
        _fillDeviceSelect(_ui.micSelect, devices.filter(d => d.kind === 'audioinput'), 'demobank_ac_mic');
        _fillDeviceSelect(_ui.spkSelect, devices.filter(d => d.kind === 'audiooutput'), 'demobank_ac_spk');
        _ui.spkRow.style.display = typeof _ui.audio.setSinkId === 'function' ? '' : 'none';
      })
      .catch(err => {
        console.warn('[DemoAudioCodes] _populateDevices failed:', err);
      });
  }

  function _fillDeviceSelect(select, devices, storageKey) {
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = t('defaultDev');
    const opts = [defaultOpt, ...devices.map((d, i) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || ('Device ' + (i + 1));
      return opt;
    })];
    select.replaceChildren(...opts);
    const saved = storageKey && sessionStorage.getItem(storageKey);
    if (saved) select.value = saved;
    // If the saved device is no longer available, fall back to default silently.
    if (saved && !select.value) { select.value = ''; sessionStorage.removeItem(storageKey); }
  }

  function callTo(number, extraHeaders) {
    if (!_phone || !isEnabled()) return;
    if (_activeCall) {
      console.warn('[DemoAudioCodes] callTo ignored — already in a call');
      return;
    }
    if (!_connected) {
      // Transport still connecting — keep _pendingCallNumber; _onLoginStateChanged will retry.
      _pendingCallNumber = number;
      console.log('[DemoAudioCodes] SIP transport not ready — call queued');
      return;
    }
    const p = DemoConfig.getProfile() || DemoConfig.DEFAULT_PROFILE;
    const headers = Array.isArray(extraHeaders)
      ? extraHeaders
      : [..._buildExtraHeaders(p), ..._pendingExtraHeaders];
    _currentExtraHeaders = headers;
    _pendingCallNumber = null;
    _pendingExtraHeaders = [];

    // Apply selected microphone if the user picked one in the preview panel
    const micId = _ui && _ui.micSelect && _ui.micSelect.value;
    if (micId) {
      _phone.setConstraints(
        { echoCancellation: true, noiseSuppression: true, deviceId: { exact: micId } },
        false, {}
      );
    }
    // Apply selected speaker (Chrome/Edge only — setSinkId is undefined in Firefox/Safari)
    const spkId = _ui && _ui.spkSelect && _ui.spkSelect.value;
    if (spkId && _ui && _ui.audio && typeof _ui.audio.setSinkId === 'function') {
      _ui.audio.setSinkId(spkId).catch(e => console.warn('[DemoAudioCodes] setSinkId failed:', e));
    }

    _setState('connecting');
    _ui && _ui.panel && _ui.panel.classList.add('open');
    _activeCall = _phone.call(_phone.AUDIO, number, headers);
  }

  function hangup() {
    if (_activeCall && typeof _activeCall.terminate === 'function') _activeCall.terminate();
  }

  function mute(on) {
    if (!_activeCall) return;
    const target = (typeof on === 'boolean') ? on : !_activeCall.isAudioMuted();
    _activeCall.muteAudio(target);
    if (_ui && _ui.muteBtn) _ui.muteBtn.classList.toggle('active', target);
  }

  function hold(on) {
    if (!_activeCall) return;
    const target = (typeof on === 'boolean') ? on : !_activeCall.isLocalHold();
    _activeCall.setHold(target);
    if (_ui && _ui.holdBtn) _ui.holdBtn.classList.toggle('active', target);
  }

  function sendDTMF(digit) {
    if (_activeCall && typeof _activeCall.sendDTMF === 'function') _activeCall.sendDTMF(String(digit));
  }

  function isEnabled() {
    const ac = DemoConfig.getAudiocodes();
    return !!(ac.enabled && ac.domain && ac.caller);
  }

  function getState() { return _state; }

  // ── UI ────────────────────────────────────────────────────────────────────
  // Bilingual labels stored as { fr, en } and applied based on document language.
  const L = {
    idle:        { fr: "Appeler",            en: "Call" },
    ready:       { fr: "Prêt à appeler",     en: "Ready to call" },
    connecting:  { fr: "Connexion…",         en: "Connecting…" },
    ringing:     { fr: "Sonnerie…",          en: "Ringing…" },
    inCall:      { fr: "En communication",   en: "In call" },
    onHold:      { fr: "En attente",         en: "On hold" },
    mute:        { fr: "Couper le micro",    en: "Mute" },
    holdLbl:     { fr: "Mettre en attente",  en: "Hold" },
    keypadLbl:   { fr: "Clavier",            en: "Keypad" },
    hangupLbl:   { fr: "Raccrocher",         en: "Hang up" },
    callBtnLbl:  { fr: "Lancer l'appel",     en: "Start call" },
    cancelLbl:   { fr: "Annuler",            en: "Cancel" },
    micLbl:      { fr: "Microphone",         en: "Microphone" },
    spkLbl:      { fr: "Haut-parleur",       en: "Speaker" },
    defaultDev:  { fr: "Par défaut",         en: "Default" }
  };
  function t(key) {
    const lang = (document.documentElement.lang || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
    return L[key][lang];
  }

  // Lucide icons may not be loaded yet on every page — fallback to inline SVG.
  function _icon(name, size) {
    const sz = size || 18;
    // Minimal inline SVG fallback (we use lucide when available later).
    const paths = {
      'phone':     '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.93.36 1.84.7 2.71a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.37-1.37a2 2 0 0 1 2.11-.45c.87.34 1.78.57 2.71.7A2 2 0 0 1 22 16.92z"/>',
      'phone-call':'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.93.36 1.84.7 2.71a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.37-1.37a2 2 0 0 1 2.11-.45c.87.34 1.78.57 2.71.7A2 2 0 0 1 22 16.92z"/><path d="M14.05 2a9 9 0 0 1 8 7.94"/><path d="M14.05 6A5 5 0 0 1 18 10"/>',
      'phone-off': '<path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" y1="2" x2="2" y2="22"/>',
      'mic-off':   '<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
      'mic':       '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
      'pause':     '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
      'play':      '<polygon points="5 3 19 12 5 21 5 3"/>',
      'grid':      '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'
    };
    const body = paths[name] || paths.phone;
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  function _buildUI() {
    // Hidden audio element for remote media
    const audio = document.createElement('audio');
    audio.id = 'dac-audio';
    audio.autoplay = true;
    audio.playsInline = true;

    // Floating button
    const fab = document.createElement('button');
    fab.className = 'dac-fab';
    fab.id = 'dac-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', t('idle'));
    fab.dataset.state = 'idle';
    // Static markup, no dynamic content interpolation → innerHTML is safe.
    fab.innerHTML = _icon('phone', 24);
    fab.addEventListener('click', _onFabClick);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'dac-panel';
    panel.id = 'dac-panel';
    panel.dataset.state = 'idle';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-live', 'polite');

    // Status row
    const status = document.createElement('div');
    status.className = 'dac-status';
    const statusDot = document.createElement('span');
    statusDot.className = 'dac-status-dot';
    const statusLabel = document.createElement('span');
    statusLabel.textContent = t('idle');
    statusDot.appendChild(statusLabel);
    const timer = document.createElement('span');
    timer.className = 'dac-timer';
    timer.textContent = '00:00';
    status.append(statusDot, timer);

    // Peer info
    const peer = document.createElement('div');
    peer.className = 'dac-peer';
    const peerName = document.createElement('div');
    peerName.className = 'dac-peer-name';
    const peerNum = document.createElement('div');
    peerNum.className = 'dac-peer-num';
    peer.append(peerName, peerNum);

    // ── Preview: device selectors (visible only in 'ready' state) ──────────
    const devices = document.createElement('div');
    devices.className = 'dac-devices';

    const micRow = document.createElement('div');
    micRow.className = 'dac-device-row';
    const micLabel = document.createElement('label');
    micLabel.textContent = t('micLbl');
    const micSelect = document.createElement('select');
    micSelect.className = 'dac-device-select';
    micSelect.setAttribute('aria-label', t('micLbl'));
    micSelect.addEventListener('change', () => sessionStorage.setItem('demobank_ac_mic', micSelect.value));
    micRow.append(micLabel, micSelect);

    const spkRow = document.createElement('div');
    spkRow.className = 'dac-device-row';
    const spkLabel = document.createElement('label');
    spkLabel.textContent = t('spkLbl');
    const spkSelect = document.createElement('select');
    spkSelect.className = 'dac-device-select';
    spkSelect.setAttribute('aria-label', t('spkLbl'));
    spkSelect.addEventListener('change', () => sessionStorage.setItem('demobank_ac_spk', spkSelect.value));
    spkRow.append(spkLabel, spkSelect);

    devices.append(micRow, spkRow);

    // Call button (preview only)
    const callBtn = document.createElement('button');
    callBtn.className = 'dac-call-btn';
    callBtn.type = 'button';
    // Static markup — innerHTML is safe here.
    callBtn.innerHTML = _icon('phone', 18);
    const callBtnLbl = document.createElement('span');
    callBtnLbl.textContent = t('callBtnLbl');
    callBtn.appendChild(callBtnLbl);
    callBtn.addEventListener('click', () => {
      if (_pendingCallNumber) callTo(_pendingCallNumber);
    });

    // Cancel button (preview only)
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'dac-cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = t('cancelLbl');
    cancelBtn.addEventListener('click', () => {
      _pendingCallNumber = null;
      _pendingExtraHeaders = [];
      _setState('idle');
      if (_ui) _ui.panel.classList.remove('open');
    });

    // ── Active-call controls ─────────────────────────────────────────────────
    const actions = document.createElement('div');
    actions.className = 'dac-actions';
    const muteBtn   = _makeActionButton('mic-off',  'mute',      () => mute());
    const holdBtn   = _makeActionButton('pause',    'holdLbl',   () => hold());
    const keypadBtn = _makeActionButton('grid',     'keypadLbl', _toggleKeypad);
    actions.append(muteBtn, holdBtn, keypadBtn);

    // DTMF keypad
    const keypad = document.createElement('div');
    keypad.className = 'dac-keypad';
    ['1','2','3','4','5','6','7','8','9','*','0','#'].forEach(d => {
      const b = document.createElement('button');
      b.className = 'dac-key';
      b.type = 'button';
      b.textContent = d;
      b.addEventListener('click', () => sendDTMF(d));
      keypad.appendChild(b);
    });

    // Hangup button (primary destructive)
    const hangupBtn = document.createElement('button');
    hangupBtn.className = 'dac-hangup';
    hangupBtn.type = 'button';
    hangupBtn.innerHTML = _icon('phone-off', 18);
    const hangupLbl = document.createElement('span');
    hangupLbl.textContent = t('hangupLbl');
    hangupBtn.appendChild(hangupLbl);
    hangupBtn.addEventListener('click', hangup);

    panel.append(status, peer, devices, callBtn, cancelBtn, actions, keypad, hangupBtn);

    document.body.append(audio, fab, panel);

    _ui = {
      fab, panel, audio,
      status, statusLabel, timer,
      peerName, peerNum,
      devices, micSelect, spkRow, spkSelect,
      callBtn, cancelBtn,
      muteBtn, holdBtn, keypadBtn, keypad,
      hangupLbl
    };
  }

  function _makeActionButton(iconName, labelKey, onClick) {
    const btn = document.createElement('button');
    btn.className = 'dac-action';
    btn.type = 'button';
    btn.innerHTML = _icon(iconName, 18);
    const span = document.createElement('span');
    span.textContent = t(labelKey);
    btn.appendChild(span);
    btn.addEventListener('click', onClick);
    btn._labelKey = labelKey;
    btn._span = span;
    return btn;
  }

  function _toggleKeypad() {
    if (!_ui) return;
    _ui.keypad.classList.toggle('open');
    _ui.keypadBtn.classList.toggle('active');
  }

  function _onFabClick() {
    if (!_ui) return;
    if (_state === 'idle') {
      call();
    } else {
      _ui.panel.classList.toggle('open');
    }
  }

  function _setState(s) {
    _state = s;
    if (!_ui) return;
    _ui.fab.dataset.state = s;
    _ui.panel.dataset.state = s;
    const lbl = (s === 'idle')        ? t('idle')
              : (s === 'ready')       ? t('ready')
              : (s === 'connecting')  ? t('connecting')
              : (s === 'ringing')     ? t('ringing')
              : (s === 'on-hold')     ? t('onHold')
              : t('inCall');
    _ui.statusLabel.textContent = lbl;
    _ui.fab.setAttribute('aria-label', lbl);
    if (s !== 'in-call' && s !== 'on-hold') _ui.timer.textContent = '00:00';
    if (s !== 'in-call' && s !== 'on-hold' && s !== 'ringing' && s !== 'connecting') {
      _ui.peerName.textContent = '';
      _ui.peerNum.textContent = '';
    }
  }

  function _updatePeerFromCall(call) {
    if (!_ui || !call || !call.data) return;
    const num = call.data._tel || call.data._user || '';
    const name = call.data._display_name || '';
    _ui.peerName.textContent = name || num;
    _ui.peerNum.textContent  = name ? num : '';
  }

  function _startTimer() {
    _stopTimer();
    _timerInterval = setInterval(() => {
      if (!_ui) return;
      const secs = Math.floor((Date.now() - _callStartMs) / 1000);
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      _ui.timer.textContent = mm + ':' + ss;
    }, 1000);
  }

  function _stopTimer() {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (_initialized) return;
    if (!isEnabled()) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[DemoAudioCodes] WebRTC not supported in this browser');
      return;
    }
    _initialized = true;

    const p = DemoConfig.getProfile() || DemoConfig.DEFAULT_PROFILE;
    const ac = p.audiocodes;

    // Stash any saved call BEFORE loading SDK so we can act on it after login.
    _restoreData = _loadRestore();

    _buildUI();

    if (/\s/.test(ac.caller)) {
      console.error('[DemoAudioCodes] Invalid caller value "' + ac.caller + '" — SIP usernames cannot contain spaces. Fix the "SIP username" field in Settings → AudioCodes WebRTC.');
      _initialized = false;
      return;
    }

    if (_restoreData) {
      // A call is waiting to be restored — must connect immediately (20 s window).
      _loadAndConfigure();
    }
    // Otherwise: defer SDK load + SIP connection to _showPreview() (user-triggered).
  }

  // ── Auto-init on every page ───────────────────────────────────────────────
  if (typeof DemoConfig !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  // Save the active call on every reasonable unload signal — covers desktop and mobile.
  window.addEventListener('beforeunload', _saveCall);
  window.addEventListener('pagehide',     _saveCall);

  return {
    init,
    call,
    callTo,
    hangup,
    mute,
    hold,
    sendDTMF,
    isEnabled,
    getState
  };
})();
