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
- **Genesys Cloud integration**: Messenger snippet (executed on page load), OAuth 2.0 Authorization Code + PKCE, additional JavaScript triggered on every message send
- **AudioCodes WebRTC Click-to-Call**: full custom integration built on the standalone AudioCodes SDK (own brand-aligned floating button + call panel — no off-the-shelf widget); SIP over WSS with Basic auth; **custom SIP `extraHeaders` (`X-User-FirstName`, `X-User-Email`, etc.) auto-populated from the persona and configurable in Settings** so Genesys Cloud Architect can route on context via the "Get SIP Headers" action; **active calls survive page navigation** (state persisted to `localStorage` on `beforeunload` and resumed via SIP REPLACES on the next page, 20 s window); falls back to `tel:` when not configured; triggerable via `contact.html?call=1` (chatbot use case); **`X-User-` URL params** (`contact.html?call=1&X-User-ParentConnID=abc123`) are automatically forwarded as extra SIP headers on the call; **unified call entry point**: all call buttons go through `DemoGenesys.call()` which delegates to AudioCodes or `tel:` based on configuration
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
| `settings.html` | Settings — 9 panels: backup, brand, persona, balances, products, language, security, Genesys Cloud, AudioCodes WebRTC |

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
- **Genesys Cloud** — AWS region, OAuth Client ID, Messenger snippet, Queue ID, Script ID, call number, additional JavaScript

> **OAuth configuration in Genesys Cloud**
> The integration uses the **Authorization Code + PKCE** flow (no Client Secret). In your Genesys Cloud org, create an OAuth client of type *Code Authorization* with **PKCE Required** enabled, and authorise at least the following redirect URIs:
>
> ```
> https://poninsor.github.io/demobanque/app/index.html
> https://poninsor.github.io/demobanque/app/settings.html
> https://poninsor.github.io/demobanque/app/contact.html
> ```
>
> For local development, also add these entries — Genesys Cloud ignores the port number for `localhost`, so these three URIs cover all local ports:
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
├── config.js           # DemoConfig — all localStorage logic
├── genesys.js          # DemoGenesys — Genesys Cloud integration
├── audiocodes.js       # DemoAudioCodes — WebRTC custom integration (own UI on the standalone SDK)
├── shell.js            # Global behaviours (mobile nav, Messenger snippet)
├── shell.css           # Design system + app shell
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
| `demobank_gc_token` | OAuth token cache `{ token, expiry, clientId }` |
| `demobank_adv_active` | Advisor heartbeat `{ accountId, ts }` — present when `advisor.html` is open |
| `demobank_ac_restore` | AudioCodes call snapshot for restoration after page navigation |

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
      "additionalJS": "alert(\"création d'un workitem\");",
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
| `executeAdditionalJS()` | Executes the `additionalJS` snippet from the profile |
| `getStorageUsageBytes()` | Estimates total localStorage usage in bytes (UTF-16, 2 bytes/char) |
| `purgeMessageAttachments(accountId)` | Removes `fileData` from all messages of an account; returns the count purged |

---

## Running locally

No build required, no dependencies to install.

### Recommended — built-in Node.js server

```bash
node server.js            # http://localhost:3000/
PORT=5000 node server.js  # custom port
# or
npm start
```

`server.js` uses only Node.js built-in modules (Node 18+ required).

### Alternatives

```bash
# Python (if Node is not available)
cd app && python3 -m http.server 3000

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
