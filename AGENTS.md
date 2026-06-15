# CLAUDE.md — Coding guidelines for Démo banque

Static white-label banking demo app for Genesys Cloud demonstrations.
No backend, no build step, no framework — plain HTML/CSS/vanilla JS served as static files.

---

## Documentation maintenance

**Keep the documentation up to date automatically — as part of the same change, without
being asked.** Whenever a change alters documented behaviour, update every affected doc in
the same commit. This is part of the definition of done; a change that leaves the docs
stale is incomplete.

Treat the following as documentation that must track the code:

- `README.md` **and** `README.en.md` — always updated **together** and mirrored (FR/EN);
  any change to one must be applied to the other in the same edit.
- `AGENTS.md` — architecture, module list, script load order, settings panels, storage
  schema, localStorage keys, public APIs, and the patterns/anti-patterns tables.
- `js-api.html` — the custom-JS API reference: any new/changed variable or helper exposed
  to `additionalJS` / `advisorAdditionalJS` (e.g. a new `Salesforce.*` method) must be
  reflected here, with an example when it is non-trivial.

Trigger points that almost always require a doc update: adding/removing a page, JS module,
or settings panel; changing the `DEFAULT_PROFILE` schema or a localStorage key; adding or
renaming a public method on `DemoConfig` / `DemoGenesys` / `DemoSalesforce` / `DemoAudioCodes`;
changing the variables/functions injected into the custom-JS snippets; or changing an OAuth
/ integration setup requirement.

---

## Local development

```bash
node server.js            # starts at http://localhost:5500/
PORT=5500 node server.js  # or any other port
# or via npm:
npm start
```

`server.js` is a zero-dependency static file server (Node built-ins only, no `npm install`).
It serves the `app/` directory as the web root. Requires **Node 18+**.

### Genesys Cloud OAuth redirect URIs

`crypto.subtle` (used by PKCE) requires a **secure context** — `localhost` qualifies.
Register the following URIs in **Genesys Cloud Admin → OAuth → your client**:

```
For live demo on https://poninsor.github.io/demobanque/
https://poninsor.github.io/demobanque/app/index.html
https://poninsor.github.io/demobanque/app/settings.html
https://poninsor.github.io/demobanque/app/contact.html

For local development
http://localhost/index.html
http://localhost/settings.html
http://localhost/contact.html
```

Genesys Cloud ignores the port number for `localhost` URIs — the three `localhost`
entries above cover all local ports (5500, 5500, 8080, etc.).

> **Why `index.html` explicitly?** `window.location.pathname` returns `/index.html`
> when navigating to that page directly, not `/`. The registered redirect URI must
> match exactly what the app sends.

---

## Architecture

```
app/
  index.html          Login page (account number + PIN)
  dashboard.html      Dashboard — total assets, transactions, chart
  account.html        Checking account — transaction list
  transfer.html       Transfer wizard (3 steps)
  cards.html          Credit cards
  beneficiaries.html  Saved recipients
  credits.html        Loans
  messages.html       Secure messaging — client view, file attachments, advisor presence
  advisor.html        Advisor view — all conversations, real-time replies, presence heartbeat
  contact.html        Contact — channels, appointment booking, ASAP callback
  settings.html       Settings — 10 panels (backup, brand, persona, balances, products,
                      language, security, Genesys Cloud, AudioCodes WebRTC, Salesforce)
  js-api.html         Custom-JS API reference — variables and helpers available in the
                      additionalJS / advisorAdditionalJS snippets (Genesys + Salesforce),
                      with copyable examples; linked from the Settings info-bubbles

  config.js           DemoConfig — all localStorage read/write, auth, branding
  genesys.js          DemoGenesys — OAuth PKCE flow, Genesys Cloud API calls,
                      unified call entry point (delegates to AudioCodes or tel:)
  salesforce.js       DemoSalesforce — Salesforce OAuth (Authorization Code + PKCE) and
                      REST helpers (create/get/update for Task, Contact, Case; query);
                      depends on config.js only, so it is safe on advisor.html
  audiocodes.js       DemoAudioCodes — AudioCodes WebRTC integration (custom UI on top
                      of the standalone SDK), with SIP extraHeaders and call restore
  shell.js            Global shell behaviours (mobile sheet, Messenger snippet)
  shell.css           Shared layout styles (nav, bottom sheet, profile card)
  audiocodes.css      Floating call button + call panel styles, brand-aligned
  colors.css          CSS custom properties (brand palette, semantic tokens)

  lib/
    audiocodes/       AudioCodes SDK — vendor files, never modify
      click-to-call.js          Standalone AudioCodesUA SDK + JsSIP. THIS is the file
                                loaded at runtime by audiocodes.js — the app builds its
                                own UI on top so call state and persistence are in our hands.
      click-to-call-widget.js   Self-contained widget bundle (Web Component + SDK + JsSIP).
                                NOT used — the widget's "Restore Call after Page Refresh"
                                feature is broken (unbound beforeunload handler) and the
                                widget cannot reconnect to the same agent after a refresh
                                per official AudioCodes guidance.
      basic.js / advanced.js / advancedauthUrl.js
                                Reference snippets only. Never loaded.
```

### Module pattern

Every JS file exports a single IIFE-based object (`DemoConfig`, `DemoGenesys`,
`DemoSalesforce`, `DemoAudioCodes`). No ES modules, no bundler. Scripts are loaded via
`<script src="...">` in order:
`shell.js` → `config.js` → `genesys.js` → `salesforce.js` → `audiocodes.js` → inline page script.

Each page loads only what it needs — the full chain is the pattern, not a requirement:
- `advisor.html` loads `config.js` + `salesforce.js` only (no shell, no Genesys, no AudioCodes)
- `index.html` loads `config.js` + `genesys.js` (no shell.js, no AudioCodes)
- `index.html` links `colors.css` directly; all other pages link `shell.css`,
  which pulls in the tokens via `@import url("colors.css")`

`audiocodes.js` and `audiocodes.css` are loaded on every authenticated page (all except
`index.html` and `advisor.html`) so that an active SIP call survives navigation — the SDK
state and the active-call snapshot are persisted to `localStorage` on `beforeunload` /
`pagehide` and the SDK is re-initialised on the next page's auto-init.

---

## Language & comments

- **All code comments must be in English.** No French in `//` or `/* */` blocks.
- UI strings (labels, toasts, error messages) remain bilingual (FR/EN) using the
  `t(fr, en)` helper or `i18n-fr` / `i18n-en` CSS classes.
- Do not translate or touch visible UI text unless the task explicitly requires it.

---

## Code style

- Vanilla JS only. No TypeScript, no React, no Vue, no lodash.
- Prefer `const` / `let`. Never `var`.
- Arrow functions for callbacks; named functions for anything called by name.
- No unnecessary abstractions. Three similar lines beat a premature helper.
- Do not add error handling for scenarios that cannot happen (trust internal guarantees).
- Do not add feature flags, backwards-compatibility shims, or dead code.

---

## DOM & security

### Never use `innerHTML` for dynamic content

Dynamic values (API responses, user input, `err.message`) must be set via DOM methods
to prevent XSS:

```js
// Correct
const el = document.createElement('span');
el.textContent = userValue;
parent.appendChild(el);

// Wrong — XSS risk
parent.innerHTML = `<span>${userValue}</span>`;
```

Static markup (hardcoded SVGs, fixed templates with no dynamic parts) may use `innerHTML`.

### `replaceChildren` for updates

Prefer `el.replaceChildren(...nodes)` over `el.innerHTML = ''` followed by appends.

### Event listeners on dynamic elements

Attach listeners via `addEventListener`, not `onclick="..."` inline attributes —
except in static markup where the handler is a simple named function call.

---

## Persistence

| Store | Usage |
|---|---|
| `localStorage['demobank_v1']` | User profiles — main object (config, persona, messages) |
| `localStorage['demobank_gc_token']` | Genesys OAuth token cache `{ token, expiry, clientId }` |
| `localStorage['demobank_lang']` | Global language preference, read before the profile loads |
| `localStorage['demobank_adv_active']` | Advisor presence heartbeat — `{ accountId, ts }` written every 15 s by `advisor.html`; read by `messages.html` to show online/offline status; TTL 30 s |
| `localStorage['demobank_client_active']` | Client presence heartbeat — `{ accountId, ts }` written every 15 s by `messages.html`; read by `advisor.html` to show online/offline status; TTL 30 s |
| `localStorage['demobank_ac_restore']` | AudioCodes call snapshot for cross-page restoration |
| `localStorage['demobank_sf_token']` | Salesforce OAuth token cache `{ token, instanceUrl, expiry, clientId }` |
| `localStorage['demobank_settings_collapsed']` | Settings page — array of collapsed panel ids (fold state) |
| `sessionStorage` | Transient OAuth state: `_gc_code_verifier`, `_gc_oauth_state`, `_gc_post_login_redirect`, `_gc_pending` |
| `sessionStorage['demobank_ac_mic']` / `['demobank_ac_spk']` | Selected microphone / speaker device index in the AudioCodes call panel |

Always read the profile once at the start of a function and reuse the local variable.
Do not call `DemoConfig.getProfile()` multiple times in a single operation.

---

## OAuth — Authorization Code + PKCE

The app uses **OAuth 2.0 Authorization Code with PKCE** (no client secret).
The Genesys Cloud OAuth client type must be set to **"Code Authorization"** with
**"PKCE Required"** enabled.

### Flow

1. `_buildAuthUrl(gc, redirectUri)` — generates `code_verifier`, `code_challenge` (SHA-256),
   `state`; stores verifier + state in `sessionStorage`; returns the authorization URL.
2. Page navigates to Genesys login.
3. Genesys redirects back to the originating page with `?code=&state=` in the query string
   (never in the hash).
4. The IIFE in `genesys.js` runs async on page load, detects `?code=`, validates `state`,
   exchanges the code via `POST /oauth/token`, saves the token to `localStorage`.
5. Page redirects to `_gc_post_login_redirect` (set before step 2).

### Critical rules

- **Never use `response_type=token`** (Implicit Grant is disabled).
- `redirect_uri` must be `window.location.origin + window.location.pathname` (no hash,
  no query string) and must be registered in the Genesys Cloud OAuth client settings.
- Pages that auto-call `fetchToken` on load (e.g. `fetchWaitTime`) must always pass
  `{ noRedirect: true }` to avoid triggering a redirect loop during the PKCE callback.
- Pages with an auto-redirect on existing profile (e.g. `index.html`) must skip that
  redirect when `?code=` is present in the URL:
  ```js
  if (DemoConfig.getProfile() && !new URLSearchParams(location.search).has('code'))
    window.location.href = 'dashboard.html';
  ```

### Token cache

Token is stored in `localStorage` under key `demobank_gc_token` as
`{ token, expiry, clientId }`. It is loaded by `_loadToken()` on every page init
and validated against the current `clientId` and expiry timestamp.

---

## AudioCodes WebRTC Click-to-Call

Managed by `DemoAudioCodes` in `audiocodes.js`. The app uses the **standalone SDK**
(`lib/audiocodes/click-to-call.js`, `AudioCodesUA` singleton) and renders its **own UI**
(floating FAB + call panel) styled with the project's brand variables. The bundled
widget (`click-to-call-widget.js`) is intentionally NOT used because its
"Restore Call after Page Refresh" feature is broken and, per official AudioCodes
guidance, custom UI is required for cross-page call continuity.

### Lifecycle

1. `audiocodes.js` auto-invokes `init()` on `DOMContentLoaded` on every authenticated page.
   `_initialized` guards against re-entry.
2. Guard: returns immediately if `audiocodes.enabled` is false, or `domain` / `caller` is blank.
3. The UI is built once in the DOM: hidden `<audio id="dac-audio">`, floating button
   `#dac-fab`, and call panel `#dac-panel`. All elements use CSS classes defined in
   `audiocodes.css` and inherit brand variables (`--brand`, `--brand-fg`, `--success-500`,
   `--danger-500`, `--font-body`).
4. `lib/audiocodes/click-to-call.js` is loaded dynamically as a `<script defer>`.
5. On `load`: `AudioCodesUA.instance` is configured via `setServerConfig`, `setAccount`,
   `setListeners`, `setModes`, `setWebSocketKeepAlive`, then `init(false)`.
6. SDK events drive UI state machine: `idle → connecting → ringing → in-call ↔ on-hold`.
   Audio playback is attached on `callShowStreams` via `audio.srcObject = call.data._remoteMediaStream`.
7. `?call=1` on the URL auto-triggers `DemoGenesys.call(_urlHeaders)` after init (chatbot use case),
   which in turn calls `DemoAudioCodes.call(urlHeaders)` when AudioCodes is enabled.
   Any additional URL params whose name starts with `X-User-` are collected and forwarded as extra
   SIP headers on top of the auto-generated profile headers:
   ```
   contact.html?call=1&X-User-ParentConnID=abc123&X-User-Segment=premium
   ```
   → adds `X-User-ParentConnID: abc123` and `X-User-Segment: premium` to the INVITE headers.

### Public API

```js
DemoAudioCodes.call(urlHeaders?)         // dial genesys.internalCallNumber (fallback: callNumber);
                                         // urlHeaders is an optional string[] of 'Name: Value' headers
DemoAudioCodes.callTo(number, headers?)  // dial arbitrary number; headers override auto-built set
DemoAudioCodes.hangup()                  // terminate active call
DemoAudioCodes.mute(on?)                 // toggle or set audio mute
DemoAudioCodes.hold(on?)                 // toggle or set local hold
DemoAudioCodes.sendDTMF(digit)           // send a single DTMF tone
DemoAudioCodes.isEnabled()               // bool — config is valid
DemoAudioCodes.getState()                // 'idle'|'connecting'|'ringing'|'in-call'|'on-hold'
```

### SIP extraHeaders (call context for Genesys Cloud)

Every outgoing call attaches a set of custom SIP headers built from the current profile:

| Header | Source |
|---|---|
| `X-User-FirstName` | `persona.firstName` |
| `X-User-LastName` | `persona.lastName` |
| `X-User-Email` | `persona.email` |
| `X-User-Phone` | `persona.phone` |
| `X-User-ProfileType` | `persona.profileType` |
| `X-User-AdvisorName` | `persona.advisor` |
| `X-User-AccountId` | `DemoConfig.getCurrentAccountId()` |

Additional headers are appended from the textarea `#ac-extra-headers` in the settings
panel (`audiocodes.extraHeaders`, one per line, format `Name: Value`). These are passed
as the third argument to `phone.call(phone.AUDIO, number, headers)`. Use the
**`X-User-*`** prefix and never `X-Genesys-*` / `X-inin-*` / `X-pcv-*` / `X-gcv-*`
(those prefixes are reserved by Genesys internals).

In a Genesys Cloud Architect flow, retrieve these headers with the **"Get SIP Headers"**
action and route on the values.

### Call restoration across page navigation (SDK Reference §4.11)

On `beforeunload` / `pagehide`, if `_activeCall && _activeCall.isEstablished()`, the
module snapshots the call to `localStorage['demobank_ac_restore']`:

```js
{
  callTo, video, replaces, time, hold, mute, extraHeaders
}
```

On the next page's init, the snapshot is read (and deleted) before the SDK script
loads. After the SDK reports `loginStateChanged: cause === 'connected'`, the module
issues a new INVITE with `['Replaces: <dialog>', ...extraHeaders]` as extra headers
to take over the existing dialog. The 20-second `restoreCallMaxDelay` window from the
doc is enforced. Restoration depends on the SBC keeping the dialog alive long enough;
if the dialog has been torn down server-side, the SBC returns `481 Call/Transaction
Does Not Exist` and the call cannot be resumed (frontend has done everything correctly).

### Settings storage schema (`audiocodes` key)

```js
audiocodes: {
  enabled: false,         // master toggle
  domain: '',             // SIP server FQDN
  wssAddress: '',         // optional WSS override; default = 'wss://' + domain
  caller: '',             // SIP username
  password: '',           // SIP password
  extraHeaders: ''        // raw text, one header per line ('Name: Value')
}
```

### Unified call entry point

**All phone call triggers must go through `DemoGenesys.call(urlHeaders?)`**, not directly to `DemoAudioCodes.call()`. `DemoGenesys.call()` inspects `DemoAudioCodes.isEnabled()` and delegates accordingly:

```js
// genesys.js
call(urlHeaders) {
  if (DemoAudioCodes.isEnabled()) { DemoAudioCodes.call(urlHeaders); return; }
  const digits = (gc.callNumber || '').replace(/\D/g, '');
  if (digits) window.location.href = `tel:${digits}`;
  else showNotif(t('Aucun numéro configuré', 'No number configured'), true);
}
```

- Phone buttons in `contact.html` call `DemoGenesys.call()`
- The `?call=1` auto-trigger on `contact.html` calls `DemoGenesys.call(_urlHeaders)`
- `DemoAudioCodes.call()` is never called directly from page code; only from `DemoGenesys.call()`

### tel: fallback

When AudioCodes is disabled or not configured, `DemoGenesys.call()` falls back to
`window.location.href = 'tel:' + digits` using `genesys.callNumber`. The FAB is not
rendered in this case.

### Vendor files

`app/lib/audiocodes/click-to-call.js` — standalone SDK + JsSIP, loaded at runtime.
Never modify. `click-to-call-widget.js`, `basic.js`, `advanced.js`, `advancedauthUrl.js`
are references only and never loaded by the app.

---

## Salesforce Integration

Managed by `DemoSalesforce` in `salesforce.js`. Provides REST helpers for the Task,
Contact and Case objects, usable directly from the custom-JS snippets via the injected
`Salesforce` variable. `salesforce.js` depends on `config.js` only (no `genesys.js`, no
`shell.js`) so it is safe to load on `advisor.html`. Loaded on `settings.html`,
`messages.html` and `advisor.html`.

### Auth — Authorization Code + PKCE (public client, no secret)

Same shape as the Genesys flow in `genesys.js`. The token-exchange POST to
`${loginUrl}/services/oauth2/token` and every REST call run in the browser, so:

- The Connected App must have **PKCE required** and no client secret.
- The `settings.html` URL must be a registered **Callback URL**.
- The app origin must be on the org's **CORS allowlist** (Setup → CORS). Without it,
  the token exchange and REST calls fail with a CORS error — this is an org-side config
  gap, not a frontend bug.

### Settings storage schema (`salesforce` key)

```js
salesforce: {
  enabled: false,                          // master toggle
  loginUrl: 'https://login.salesforce.com', // or https://test.salesforce.com (sandbox)
  clientId: '',                            // Connected App Consumer Key
  apiVersion: 'v60.0'                      // REST API version
}
```

### Token cache (`demobank_sf_token`)

`{ token, instanceUrl, expiry, clientId }`. `instanceUrl` comes from the token response
(`instance_url`) and is the base for REST calls. Salesforce does not return `expires_in`,
so `expiry` is a soft 2h hint; a `401` from the API is the real source of truth.

### OAuth callback coexistence with Genesys on `settings.html`

Both providers redirect back to `settings.html?code=&state=`. Each load-time IIFE only
acts on the callback when **it** initiated the flow — i.e. its own `state` is present in
`sessionStorage` (`_gc_oauth_state` / `_sf_oauth_state`). If that key is absent, the IIFE
returns **without** wiping the URL, leaving the `?code=` for the other provider's handler.
`genesys.js` has an explicit guard for this; do not remove it.

### REST API

```js
DemoSalesforce.createTask(fields)          // POST   /sobjects/Task        → { id, success }
DemoSalesforce.getTask(id, fields?)        // GET    /sobjects/Task/{id}   → record
DemoSalesforce.updateTask(id, fields)      // PATCH  /sobjects/Task/{id}   → true (204)
// …Contact and …Case: identical three methods
DemoSalesforce.query(soql)                 // GET    /query?q=…            → { totalSize, records }
DemoSalesforce.sfFetch(path, init)         // low-level fetch (auto Bearer, JSON body)
DemoSalesforce.sfFetchJSON(path, init)     // same, throws on non-2xx, parses JSON
DemoSalesforce.isEnabled()                 // config.enabled && clientId
DemoSalesforce.getTokenStatus()            // { connected, expiresAt, instanceUrl }
DemoSalesforce.clearToken()
DemoSalesforce.redirectForAuth(sf, redirectUri)
```

`update*` is PATCH (HTTP 204, returns `true`). Keep the public naming `create`/`get`/
`update` — not `set`. The full reference and examples live in `js-api.html`.

---

## Secure Messaging — Attachments & Advisor Presence

### Intentional duplication between `messages.html` and `advisor.html`

The lightbox (`openViewer` / `closeViewer` + `#img-viewer*` CSS), `escapeHtml`, `getTime`
and the attachment CSS (`.attach-card`, `.attach-img*`) are **deliberately duplicated** in
both pages: `advisor.html` loads only `config.js`, there is no module system, and the two
copies are small enough that a shared file is not worth the extra script tag. **Rule: any
change to one copy must be mirrored in the other.** Accepted divergences: `.attach-card`
max-width is 320px in `messages.html` vs 280px in `advisor.html` (narrower panel), and
`renderMessage()` differs by design (client vs advisor perspective flip, avatar handling).

### File attachments (`messages.html`)

Clients can attach files to messages. Attachment state is held in `_pendingFile` before send.

**Allowed types** (`_ALLOWED_TYPES` / `_isAllowedType()`):
- `image/*` — JPEG, PNG, WebP, GIF — rendered as inline thumbnail, full-screen in lightbox
- `application/pdf` — rendered as an attach-card; PDF preview via `<iframe>` + blob URL in lightbox
- `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` — card only, direct download on click
- `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` — card only, direct download on click

**Size limit**: 2 MB per file (checked before FileReader). Toast error if exceeded.

**Quota guard**: if `getStorageUsageBytes()` > 4 MB, a `confirm()` dialog offers to purge `fileData` from old messages before sending. `purgeMessageAttachments(accountId)` removes binary payloads while preserving the message card.

**Message schema** (type `'file'`):
```js
{ id, from, type: 'file', fileName, fileSize, mimeType, fileData /* data URL */, time }
```

**Rendering** (`renderMessage()`):
- `image/*` with `fileData` → `<button class="attach-img-btn">` wrapping `<img class="attach-img">` → click opens lightbox
- `application/pdf` with `fileData` → `<button>` wrapping `.attach-card` (with `line-height:normal`) → click opens lightbox with `<iframe>` + blob URL
- Non-previewable with `fileData` → `.attach-card` wrapped in `<a download>` → direct download
- Any type without `fileData` (purged or legacy) → static `.attach-card`, no click action

### Lightbox viewer (`openViewer` / `closeViewer`)

Both `messages.html` and `advisor.html` include an identical `#img-viewer` overlay:
- Images: `<img id="img-viewer-img">` — `src` set to `fileData`
- PDFs: `<iframe id="img-viewer-pdf">` — `src` set to a blob URL created from the base64 data; blob URL is revoked on `closeViewer()` to prevent memory leaks
- Download button wraps the file data as an `<a download>` link
- Close: backdrop click, ✕ button, or Escape key

### Advisor presence (`demobank_adv_active`)

`advisor.html` maintains a heartbeat in `localStorage` so `messages.html` can show whether the advisor is currently viewing the conversation.

**In `advisor.html`:**
- `_writeAdvisorActive(accountId)` writes `{ accountId, ts: Date.now() }` to `demobank_adv_active`
- `selectAccount(id)` calls `_writeAdvisorActive()` immediately and starts a `setInterval` (15 s)
- `deselectAccount()` calls `_clearAdvisorActive()` and stops the interval
- `beforeunload` calls `_clearAdvisorActive()` — `visibilitychange` does NOT clear it (tab switch is not a disconnect)

**In `messages.html`:**
- `_advisorIsPresent()` reads the key and returns `true` if `accountId` matches and `ts` is < 30 s old
- `_updateAdvisorStatus()` updates the `#conv-role` badge (green dot = online, grey = offline)
- A `storage` event listener on `window` detects `demobank_adv_active` changes in real time
- A 30 s `setInterval` is a safety net for crash scenarios where no `storage` event fires
- `sendMessage()` skips `executeAdditionalJS()` when `_advisorIsPresent()` is true

**Account deselection in `advisor.html`:**
Clicking empty space inside `#threads-panel` (anywhere that is not a `.thread` element) calls `deselectAccount()`, which resets `selectedAccountId`, clears the heartbeat, removes the `?account=` URL param, and hides the active conversation panel.

### Client presence (`demobank_client_active`)

`messages.html` maintains a heartbeat in `localStorage` so `advisor.html` can show whether the client is currently viewing the secure conversation.

**In `messages.html`:**
- `_writeClientActive()` writes `{ accountId, ts: Date.now() }` to `demobank_client_active`
- `DOMContentLoaded` calls `_writeClientActive()` immediately and starts a `setInterval` (15 s)
- `beforeunload` clears the interval and calls `_clearClientActive()`
- `visibilitychange` must NOT clear it (tab switching is not a disconnect)

**In `advisor.html`:**
- `_clientIsPresent(accountId)` reads the key and returns `true` if `accountId` matches and `ts` is < 30 s old
- `_updateClientStatus()` updates the `#conv-client-status` badge (green dot = online, grey = offline)
- A `storage` event listener on `window` detects `demobank_client_active` changes in real time
- A 30 s `setInterval` is a safety net for crash scenarios where no `storage` event fires

### Additional JavaScript hooks (`additionalJS` / `advisorAdditionalJS`)

Two configurable JavaScript snippets exist in `settings.html`:

- `additionalJS` — triggered by `messages.html` only when the client sends a message and the advisor is **not** present
- `advisorAdditionalJS` — triggered by `advisor.html` only when the advisor sends a message and the client is **not** present

Both snippets execute through `DemoConfig` with an injected runtime context. The following variables are available directly in the snippet:

- `token` — cached Genesys OAuth token for the current profile's `clientId`, or `null`
- `apiBaseUrl` — API base URL derived from `genesys.region`, e.g. `https://api.mypurecloud.ie`
- `apiUrl(path)` — helper that expands a relative API path to a full URL
- `fetchGenesys(path, init)` — helper around `fetch()` that injects the `Authorization: Bearer` header and JSON-serialises plain-object bodies
- `fetchGenesysJSON(path, init)` — same helper, but throws on non-2xx and parses the JSON response
- `profile` / `settings` — full profile object
- `persona`, `genesys`, `balances`, `products`, `audiocodes`, `salesforce`
- `Salesforce` — the `DemoSalesforce` object (or `null` if `salesforce.js` is not loaded on the page)
- `accountId`, `message`, `messageText`, `language`, `tutoiement`, `role`

Rules:
- Keep snippet examples ASCII-only unless the surrounding file already requires otherwise
- Do not add any new `new Function(...)` execution path outside `messengerSnippet`, `additionalJS`, and `advisorAdditionalJS`
- `advisor.html` still does not load `shell.js`, but advisor-side snippets must work with `config.js` only
- Snippets must stay non-blocking from the page UX perspective: log errors, do not crash the send flow

---

## Internationalisation (i18n)

Two mechanisms coexist:

**CSS classes** (preferred for static markup):
```html
<span class="i18n-fr">Bonjour</span>
<span class="i18n-en">Hello</span>
```
`html[lang="en"] .i18n-fr { display: none }` and vice-versa.

**`t(fr, en)` helper** (JS strings only, inside `genesys.js`):
```js
showNotif(t('Connexion réussie', 'Connection successful'), false);
```

**`syncI18nInputs()`** pattern (for `<option>` and `<textarea>` whose `value` must
change with language): uses `data-fr` / `data-en` attributes and a `MutationObserver`
on `document.documentElement[lang]`.

The `MutationObserver` should only call `syncI18nInputs`. Do not piggyback unrelated
logic (e.g. `updateOAuthStatus`) onto that observer.

---

## Branding & CSS variables

All colours come from `colors.css` via CSS custom properties (`--brand`, `--brand-500`,
`--fg`, `--bg`, etc.). Never hardcode hex values in JS or inline styles except in SVG
icons that require a stroke/fill attribute.

`DemoConfig.applyBranding()` regenerates the palette from the stored `primaryColor` and
writes it to `:root`. Call it after any profile update that may change the colour.

---

## Notifications

**In-page toast** (`settings.html`, `messages.html`, and other pages): `showToast(msg, isError)`.
Must update the icon attribute (`data-lucide`) to reflect the error state, then call
`lucide.createIcons()`. Each page that needs toasts must include its own `#toast` element and the `showToast` function — there is no shared implementation.

**Genesys overlay notification** (`genesys.js`): `showNotif(message, isError)`.
Text is set via `createTextNode` (not `innerHTML`). Supports `\n` for line breaks.

---

## Patterns to avoid

| Anti-pattern | Why |
|---|---|
| `innerHTML` with dynamic data | XSS |
| `new Function(code)()` for anything other than `messengerSnippet`, `additionalJS`, or `advisorAdditionalJS` | arbitrary code execution |
| `response_type=token` | Implicit Grant is deprecated and disabled |
| `{ noRedirect: false }` in auto-called `fetchToken` | triggers redirect loops on callback pages |
| `p.persona.firstName` without guard | TypeError if profile is incomplete |
| `parseInt(str)` without radix | implicit base-8 for strings starting with `0` |
| `Date.getMonth() >= 3 && <= 9` for Paris DST | wrong boundary; use `getTimezoneOffset()` |
| Hardcoded Paris UTC offset (`+02:00` / `+01:00`) | DST transitions are date-dependent |
| `MutationObserver` with mixed responsibilities | can create side-effect loops |
| Calling `DemoConfig.getProfile()` more than once per function | redundant `JSON.parse` |
| Calling `DemoAudioCodes.call()` directly from page code | bypasses the unified entry point; always use `DemoGenesys.call()` |
| `visibilitychange` to clear advisor heartbeat | tab-switching is not a disconnect; use `beforeunload` only |
| Blob URL not revoked after lightbox close | memory leak; always call `URL.revokeObjectURL()` in `closeViewer()` |
