> 🇫🇷 [Version française](README.md)

# Démo banque

A fully static banking app built for Genesys Cloud sales demonstrations. Simulates a white-label online bank — completely customisable (colours, logo, persona, balances, products) with no backend required.

**Live demo: [poninsor.github.io/demobanque/app](https://poninsor.github.io/demobanque/app)**

---

## Features

- **Multi-profile**: multiple demo users can coexist, each with their own account (8-digit number + 6-digit PIN)
- **White-label**: brand name, logo, primary colour, tagline — applied instantly across all pages
- **Configurable persona**: first/last name, email, phone, profile type, advisor
- **Balances & products**: current account, savings account, PEL; Visa Premier/Classic cards, auto loan, life insurance
- **Secure inbox**: client ↔ advisor conversation persisted in localStorage, real-time sync across browser tabs; **file attachments** (images, PDF, Word, Excel, up to 2 MB) with a built-in full-screen viewer (inline image thumbnails, PDF preview via iframe, direct download for other formats); real-time advisor presence indicator
- **Advisor view** (`advisor.html`): mirror interface for advisors to reply to clients, no client-side login required; **live presence indicator** (green/grey dot in `messages.html`) via a localStorage heartbeat updated every 15 s, synced instantly via the `storage` API
- **Genesys Cloud integration**: Messenger snippet (executed on page load), OAuth 2.0 Authorization Code + PKCE, additional JavaScript triggered when the client sends a message while the advisor is offline, plus the mirrored advisor-side hook triggered when the client is offline
- **AudioCodes WebRTC Click-to-Call**: full custom integration built on the standalone AudioCodes SDK (own brand-aligned floating button + call panel — no off-the-shelf widget); SIP over WSS with Basic auth; **custom SIP `extraHeaders` (`X-User-FirstName`, `X-User-Email`, etc.) auto-populated from the persona and configurable in Settings** so Genesys Cloud Architect can route on context via the "Get SIP Headers" action; **active calls survive page navigation** (state persisted to `localStorage` on `beforeunload` and resumed via SIP REPLACES on the next page, 20 s window); falls back to `tel:` when not configured; triggerable via `contact.html?call=1` (chatbot use case); **`X-User-` URL params** (`contact.html?call=1&X-User-ParentConnID=abc123`) are automatically forwarded as extra SIP headers on the call; **unified call entry point**: all call buttons go through `DemoGenesys.call()` which delegates to AudioCodes or `tel:` based on configuration
- **Salesforce integration**: OAuth 2.0 Authorization Code + PKCE (public client, no secret) fully in the browser; `Salesforce` object exposed in custom JavaScript with `create`/`get`/`update` helpers for the **Task**, **Contact** and **Case** objects, plus `query(soql)`; requires a Connected App (PKCE required) and adding the app origin to the org's **CORS** allowlist
- **Built-in documentation** (`js-api.html`): reference of the variables and functions available in custom JavaScript (Genesys + Salesforce helpers) with copyable examples, linked from Settings
- **Bilingual FR/EN**: instant toggle, persisted per profile
- **Import / Export**: full profile backup and restore as `.json` 
- **Responsive & mobile-ready**: fully adapted for small screens, bottom sheet navigation, usable as a web app from the home screen (PWA-like)

---

## Pages

| URL | Description |
|---|---|
| `index.html` | Login — 8-digit account number + 6-digit PIN |
| `dashboard.html` | Dashboard — total wealth, recent transactions, spending chart |
| `account.html` | Current account detail — transaction list, projected balance |
| `transfer.html` | Transfer — 3-step wizard |
| `cards.html` | Cards — Visa Premier / Visa Classic |
| `beneficiaries.html` | Payees — Favourites and Organisations |
| `credits.html` | Loans — active loan + pre-approved offers |
| `messages.html` | Secure inbox — client-side conversation |
| `advisor.html` | Advisor view — full conversation list, real-time replies |
| `contact.html` | Contact us — channels, appointment booking, immediate callback |
| `settings.html` | Settings — 10 panels: backup, brand, persona, balances, products, language, security, Genesys Cloud, AudioCodes WebRTC, Salesforce |
| `js-api.html` | Documentation — variables and functions of the custom JavaScript (Genesys + Salesforce) with examples |

---

## Getting started

### Login

1. Open [the app](https://poninsor.github.io/demobanque/app)
2. Enter any 8-digit number as the account number
3. Use passcode **`123456`** to automatically create a new profile
4. First login redirects to **Settings** to configure the demo

### Configuring the demo

Everything is in **Settings** (`settings.html`):

- **Backup & restore** — export the profile as `.json` before a Reset; import it afterwards to restore everything
- **Brand & logo** — name, tagline, primary colour (palette auto-generated), SVG/PNG logo
- **Persona** — identity of the fictional customer shown throughout the app
- **Balances** — amounts displayed on the dashboard and accounts pages
- **Products** — enable/disable each product depending on the demo scenario
- **Language** — FR or EN, informal tone toggle
- **Passcode** — change the profile PIN
- **Genesys Cloud** — AWS region, OAuth Client ID, Messenger snippet, Queue ID, Script ID, call number, client-side additional JavaScript, advisor-side additional JavaScript
- **Salesforce** — login URL (production, sandbox or custom My Domain), Consumer Key, API version; Test/Renew button for OAuth; exposes the `Salesforce` object in custom JavaScript (see `js-api.html`)

#### Create the Salesforce Connected App (OAuth + PKCE)

The integration uses the **Authorization Code + PKCE** flow as a **public client** (no secret). Step by step in your Salesforce org:

1. **Setup → App Manager → New Connected App** (choose *Create a Connected App*).
2. Fill in *Connected App Name* and *Contact Email*.
3. Tick **Enable OAuth Settings**.
4. **Callback URL** — the **exact** `settings.html` URL, one per line. Live and local dev (⚠️ Salesforce does **not** ignore the port, add every port you use):
   ```
   https://poninsor.github.io/demobanque/app/settings.html
   http://localhost:5500/settings.html
   ```
5. **Selected OAuth Scopes**: at least **Manage user data via APIs (api)**. The `refresh_token` scope is not needed.
6. Tick **Require Proof Key for Code Exchange (PKCE) Extension for Supported Authorization Flows**.
7. **Untick** **Require Secret for Web Server Flow** and **Require Secret for Refresh Token Flow** (public client, no secret).
8. **Save**, then **Manage → Edit Policies**: *Permitted Users* = `All users may self-authorize` (or *Admin approved*), *IP Relaxation* = `Relax IP restrictions`.
9. **Manage Consumer Details** → copy the **Consumer Key** (the Consumer Secret is not used).
10. **Setup → CORS → New**: add the app **origin** (scheme + host + port, **no** path) — covers both the token exchange **and** REST calls:
    ```
    https://poninsor.github.io
    http://localhost:5500
    ```
11. In **Settings → Salesforce**: pick the environment (Production / Sandbox `test.salesforce.com`), paste the **Consumer Key**, enable the toggle, **Save**, then **Test**.

> OAuth activation can take 2–10 minutes after creation. Common errors: `redirect_uri_mismatch` (the Callback URL must match exactly — port, `http`/`https`, `/app/`); a **CORS** error in the console (origin missing from the allowlist).

> **OAuth configuration in Genesys Cloud**
> The integration uses the **Authorization Code + PKCE** flow (no Client Secret). In your Genesys Cloud org, create an OAuth client of type *Code Authorization* with **PKCE Required** enabled, and authorise at least the following redirect URIs.
>
> For the live demo on [poninsor.github.io/demobanque](https://poninsor.github.io/demobanque/):
>
> ```
> https://poninsor.github.io/demobanque/app/index.html
> https://poninsor.github.io/demobanque/app/settings.html
> https://poninsor.github.io/demobanque/app/contact.html
> ```
>
> For local development — Genesys Cloud ignores the port number for `localhost`, so these three URIs cover all local ports:
>
> ```
> http://localhost/index.html
> http://localhost/settings.html
> http://localhost/contact.html
> ```

### Advisor view

Open `advisor.html` in a second tab (no client-side login needed):

```
https://poninsor.github.io/demobanque/app/advisor.html
```

Optional URL parameter to open a specific conversation directly:

```
advisor.html?account=12345678
```

Messages are synchronised in real time between `messages.html` (client) and `advisor.html` (advisor) via the browser's `storage` event API. In `messages.html`, a dot indicator shows whether the advisor currently has `advisor.html` open — the status updates instantly via the `storage` API and is polled every 30 s as a fallback.

To deselect an account in `advisor.html`, click on empty space in the conversations list.

---

## Technical architecture

### Stack

- **Vanilla HTML / CSS / JS** — zero dependencies, zero build step
- **[Lucide Icons](https://lucide.dev)** — loaded from unpkg
- **localStorage** — sole persistence mechanism

### File structure

```
app/
├── index.html          # Login
├── dashboard.html
├── account.html
├── transfer.html
├── cards.html
├── beneficiaries.html
├── credits.html
├── messages.html
├── advisor.html        # Advisor view (no auth required)
├── contact.html
├── settings.html
├── js-api.html         # Custom JavaScript documentation (Genesys + Salesforce)
├── config.js           # DemoConfig — all localStorage logic
├── genesys.js          # DemoGenesys — Genesys Cloud integration
├── salesforce.js       # DemoSalesforce — OAuth PKCE + REST helpers (Task/Contact/Case)
├── audiocodes.js       # DemoAudioCodes — WebRTC custom integration (own UI on the standalone SDK)
├── shell.js            # Global behaviours (mobile nav, Messenger snippet)
├── shell.css           # App shell — layout, nav, bottom sheet (imports colors.css)
├── colors.css          # Design tokens — palette, type, spacing, shadows
├── audiocodes.css      # Floating call button + call panel (brand-aligned)
├── assets/
│   ├── logo.svg
│   ├── logo-light.svg
│   ├── logo-mark.svg
│   ├── visa.svg
│   ├── visa-white.svg
│   └── genesys.png
└── lib/
    └── audiocodes/     # AudioCodes SDK — vendor files (never modify)
        └── click-to-call.js   # standalone SDK (AudioCodesUA + JsSIP) — loaded at runtime
```

### Global localStorage keys

| Key | Contents |
|---|---|
| `demobank_v1` | Main object — profiles, config, messages |
| `demobank_gc_token` | Genesys OAuth token cache `{ token, expiry, clientId }` |
| `demobank_sf_token` | Salesforce OAuth token cache `{ token, instanceUrl, expiry, clientId }` |
| `demobank_lang` | Global language preference, read before the profile loads |
| `demobank_adv_active` | Advisor heartbeat `{ accountId, ts }` — present when `advisor.html` is open |
| `demobank_ac_restore` | AudioCodes call snapshot for restoration after page navigation |
| `demobank_settings_collapsed` | Settings page — array of collapsed panel ids (fold state) |

### localStorage schema (`demobank_v1`)

```json
{
  "accounts": {
    "12345678": {
      "pin": "123456",
      "brandName": "Démo banque",
      "slogan": "Ta banque, en plus simple.",
      "primaryColor": "#FF4515",
      "logoData": null,
      "persona": {
        "firstName": "Sophie",
        "lastName": "Martin",
        "email": "sophie.martin@example.fr",
        "phone": "+33612345678",
        "profileType": "Particulier — salariée cadre",
        "advisor": "Camille Lefebvre — Paris 11"
      },
      "balances": { "checking": "12 480,57", "savings": "22 950,00", "pel": "0,00" },
      "products": { "visaPremier": true, "visaClassic": true, "autoLoan": true, "assuranceVie": false },
      "genesys": {
        "region": "mypurecloud.ie",
        "messengerSnippet": "",
        "clientId": "",
        "queueId": "",
        "scriptId": "",
        "callNumber": "3262",
        "internalCallNumber": ""
      },
      "audiocodes": {
        "enabled": false,
        "domain": "",
        "wssAddress": "",
        "caller": "",
        "password": "",
        "extraHeaders": ""
      },
      "salesforce": {
        "enabled": false,
        "loginUrl": "https://login.salesforce.com",
        "clientId": "",
        "apiVersion": "v60.0"
      },
      "additionalJS": "alert(\"création d'un workitem\");",
      "advisorAdditionalJS": "// Example: notify the customer by SMS when the advisor replies while the customer is offline.",
      "language": "en",
      "tutoiement": true,
      "messages": null
    }
  },
  "current": "12345678"
}
```

### Public API — `DemoConfig`

| Method | Description |
|---|---|
| `login(accountId, pin)` | Authenticates or creates a profile; returns `{ ok, isNew, msg }` |
| `logout()` | Ends the session and redirects to `index.html` |
| `requireAuth()` | Guard — redirects if not logged in; call at the top of every protected page |
| `getCurrentAccountId()` | Returns the active account number (`"12345678"`) or `null` |
| `getProfile()` | Returns the full profile object for the active account |
| `updateProfile(updates)` | Shallow-merges `updates` into the profile and persists |
| `deepUpdateProfile(key, value)` | Merges into a nested key (e.g. `'genesys'`) |
| `applyBranding([profile])` | Applies the CSS palette + `data-*` bindings to the DOM |
| `generatePalette(hex)` | Generates the 10-stop palette (50–900) from a hex colour |
| `setLanguage(lang)` | Changes the language (`'fr'` or `'en'`) globally and in the profile |
| `getGlobalLang()` | Returns the active language |
| `getMessages()` | Returns the active account's messages (or defaults) |
| `addMessage(msg)` | Appends a message and persists |
| `getGenesys()` | Returns the active account's Genesys config |
| `getAudiocodes()` | Returns the active account's AudioCodes config |
| `getSalesforce()` | Returns the active account's Salesforce config |
| `executeAdditionalJS(runtime?)` | Executes the profile's `additionalJS` snippet with injected variables (`token`, `genesys`, `persona`, `message`, `fetchGenesys`, etc.) |
| `executeAdvisorAdditionalJS(accountId, runtime?)` | Executes the target profile's `advisorAdditionalJS` snippet with the same injected context |
| `getStorageUsageBytes()` | Estimates total localStorage usage in bytes (UTF-16, 2 bytes/char) |
| `purgeMessageAttachments(accountId)` | Removes `fileData` from all messages of an account; returns the count purged |

### Public API — `DemoSalesforce`

Available in custom JavaScript via the `Salesforce` variable (or globally as `DemoSalesforce`). All REST methods return a promise. See `js-api.html` for detailed documentation and examples.

| Method | Description |
|---|---|
| `createTask(fields)` / `getTask(id, fields?)` / `updateTask(id, fields)` | CRUD on the Task object (`update` = PATCH) |
| `createContact(...)` / `getContact(...)` / `updateContact(...)` | Same for Contact |
| `createCase(...)` / `getCase(...)` / `updateCase(...)` | Same for Case |
| `query(soql)` | Runs a SOQL query; returns `{ totalSize, records }` |
| `sfFetch(path, init)` / `sfFetchJSON(path, init)` | Low-level access to the REST API (auto Bearer) |
| `isEnabled()` | `true` if the integration is enabled and a Consumer Key is set |
| `getTokenStatus()` / `clearToken()` / `redirectForAuth(sf, redirectUri)` | OAuth token management |

---

## Running locally

No build required, no dependencies to install.

### Recommended — built-in Node.js server

```bash
node server.js            # http://localhost:5500/
PORT=5500 node server.js  # custom port
# or
npm start
```

`server.js` uses only Node.js built-in modules (Node 18+ required).

### Alternatives

```bash
# Python (if Node is not available)
cd app && python3 -m http.server 5500

# VS Code: Live Server
# Right-click index.html → "Open with Live Server"
```

---

## Reset

To start fresh:

- **Conversation only**: **Reset** link at the bottom of `messages.html`
- **Settings only**: **Reset** button in `settings.html`
- **Everything**: **Reset** link in the `index.html` footer (clears all localStorage)

---

## Deployment

The app is deployed on **GitHub Pages** from the `app/` folder. No server configuration is needed (no routing rules, no server-side auth).

To deploy on Azure Static Web Apps, point the root at `app/`. No `staticwebapp.config.json` is required for a basic deployment.
