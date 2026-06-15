> 🇬🇧 [English version](README.en.md)

# Démo banque

Application bancaire statique pour les démonstrations Genesys Cloud. Simule une banque en ligne en marque blanche — entièrement personnalisable (couleurs, logo, persona, soldes, produits) sans aucun backend.

**Live demo : [poninsor.github.io/demobanque/app](https://poninsor.github.io/demobanque/app)**

---

## Fonctionnalités

- **Multi-profils** : plusieurs démonstrateurs peuvent coexister, chacun avec son propre compte (numéro à 8 chiffres + PIN à 6 chiffres)
- **White-label** : nom de marque, logo, couleur primaire, slogan — appliqués instantanément sur toutes les pages
- **Persona configurable** : prénom/nom, email, téléphone, type de profil, conseiller(ère)
- **Soldes & produits** : comptes courant, Livret A, PEL ; cartes Visa Premier/Classic, prêt auto, assurance-vie
- **Messagerie sécurisée** : conversation client ↔ conseiller persistée en localStorage, synchronisation temps réel entre onglets ; **pièces jointes** (images, PDF, Word, Excel, jusqu'à 2 Mo) avec visionneuse intégrée en plein écran (images inline, prévisualisation PDF via iframe, téléchargement direct pour les autres formats) ; indicateur de présence du conseiller en temps réel
- **Vue conseiller** (`advisor.html`) : interface miroir pour répondre aux clients, accessible sans authentification client ; **indicateur de présence en direct** (pastille verte/grise dans `messages.html`) via un heartbeat localStorage mis à jour toutes les 15 s, synchronisé instantanément par l'API `storage`
- **Intégration Genesys Cloud** : Messenger snippet (exécuté au chargement), OAuth 2.0 Authorization Code + PKCE, JavaScript additionnel déclenché quand le client envoie un message hors présence conseiller, et miroir conseiller déclenché quand le client est hors ligne
- **AudioCodes WebRTC Click-to-Call** : intégration custom complète bâtie sur le SDK standalone AudioCodes (bouton flottant + panel d'appel dans la charte — pas de widget tout-fait) ; SIP over WSS avec authentification Basic ; **`extraHeaders` SIP custom (`X-User-FirstName`, `X-User-Email`, etc.) auto-générés depuis le persona et configurables dans les Paramètres** pour permettre à Architect Genesys Cloud de router sur le contexte client via l'action "Get SIP Headers" ; **les appels en cours survivent à la navigation entre pages** (état persisté dans `localStorage` sur `beforeunload` et repris via SIP REPLACES sur la page suivante, fenêtre de 20 s) ; bascule sur `tel:` si non configuré ; déclenchable via `contact.html?call=1` (cas d'usage chatbot) ; **les paramètres URL préfixés `X-User-`** (`contact.html?call=1&X-User-ParentConnID=abc123`) sont automatiquement ajoutés aux headers SIP de l'appel ; **point d'entrée unifié** : tous les boutons d'appel passent par `DemoGenesys.call()` qui délègue à AudioCodes ou `tel:` selon la configuration
- **Intégration Salesforce** : OAuth 2.0 Authorization Code + PKCE (public client, sans secret) entièrement côté navigateur ; objet `Salesforce` exposé dans le JavaScript personnalisé avec des helpers `create`/`get`/`update` pour les objets **Task**, **Contact** et **Case**, plus `query(soql)` ; nécessite une Connected App (PKCE requis) et l'ajout de l'origine de l'app à l'allowlist **CORS** de l'org
- **Documentation intégrée** (`js-api.html`) : référence des variables et fonctions disponibles dans le JavaScript personnalisé (helpers Genesys + Salesforce) avec exemples copiables, liée depuis les Paramètres
- **Bilingue FR/EN** : basculement instantané, persisté par profil
- **Import / Export** : sauvegarde et restauration du paramétrage complet en `.json`
- **Responsive & mobile-ready** : interface adaptée aux petits écrans, navigation par bottom sheet, utilisable comme web app depuis l'écran d'accueil (PWA-like)

---

## Pages

| URL | Description |
|---|---|
| `index.html` | Connexion — numéro de compte 8 chiffres + PIN 6 chiffres |
| `dashboard.html` | Tableau de bord — patrimoine total, transactions récentes, graphique dépenses |
| `account.html` | Détail compte courant — liste des transactions, solde prévisionnel |
| `transfer.html` | Virement — wizard 3 étapes |
| `cards.html` | Cartes bancaires — Visa Premier / Visa Classic |
| `beneficiaries.html` | Bénéficiaires — Favoris et Organismes |
| `credits.html` | Crédits — prêt actif + offres pré-acceptées |
| `messages.html` | Messagerie sécurisée — conversation client |
| `advisor.html` | Vue conseiller — liste de toutes les conversations, réponses en temps réel |
| `contact.html` | Nous contacter — canaux, prise de rendez-vous, rappel immédiat |
| `settings.html` | Paramètres — 10 panneaux : sauvegarde, marque, persona, soldes, produits, langue, sécurité, Genesys Cloud, AudioCodes WebRTC, Salesforce |
| `js-api.html` | Documentation — variables et fonctions du JavaScript personnalisé (Genesys + Salesforce) avec exemples |

---

## Prise en main

### Connexion

1. Ouvrir [l'app](https://poninsor.github.io/demobanque/app)
2. Saisir n'importe quel numéro à 8 chiffres comme numéro de compte
3. Utiliser le code **`123456`** pour créer automatiquement un nouveau profil
4. La première connexion redirige vers les **Paramètres** pour configurer la démo

### Configurer la démo

Tout se passe dans **Paramètres** (`settings.html`) :

- **Sauvegarde & restauration** — exporter le profil en `.json` avant un Reset ; l'importer après pour tout restaurer
- **Marque & logo** — nom, slogan, couleur primaire (palette générée automatiquement), logo SVG/PNG
- **Persona** — identité du client fictif affichée dans toute l'app
- **Soldes** — montants affichés dans le dashboard et les comptes
- **Produits** — activer/désactiver chaque produit selon le scénario
- **Langue** — FR ou EN, tutoiement activable
- **Code secret** — modifier le PIN du profil
- **Genesys Cloud** — région AWS, Client ID OAuth, Messenger snippet, Queue ID, Script ID, numéro d'appel, JavaScript additionnel côté client, JavaScript additionnel côté conseiller
- **Salesforce** — URL de login (production, sandbox ou My Domain personnalisé), Consumer Key, version d'API ; bouton Tester/Renouveler pour l'OAuth ; expose l'objet `Salesforce` dans le JavaScript personnalisé (voir `js-api.html`)

#### Créer la Connected App Salesforce (OAuth + PKCE)

L'intégration utilise le flux **Authorization Code + PKCE** en **client public** (aucun secret). Pas à pas dans votre org Salesforce :

1. **Setup → App Manager → New Connected App** (choisir *Create a Connected App*).
2. Renseigner *Connected App Name* et *Contact Email*.
3. Cocher **Enable OAuth Settings**.
4. **Callback URL** — l'URL **exacte** de `settings.html`, une par ligne. Live et dev local (⚠️ Salesforce **ne** ignore **pas** le port, ajoutez chaque port utilisé) :
   ```
   https://poninsor.github.io/demobanque/app/settings.html
   http://localhost:5500/settings.html
   ```
5. **Selected OAuth Scopes** : au minimum **Manage user data via APIs (api)**. Le scope `refresh_token` n'est pas nécessaire.
6. Cocher **Require Proof Key for Code Exchange (PKCE) Extension for Supported Authorization Flows**.
7. **Décocher** **Require Secret for Web Server Flow** et **Require Secret for Refresh Token Flow** (client public, sans secret).
8. **Save**, puis **Manage → Edit Policies** : *Permitted Users* = `All users may self-authorize` (ou *Admin approved*), *IP Relaxation* = `Relax IP restrictions`.
9. **Manage Consumer Details** → copier le **Consumer Key** (le Consumer Secret n'est pas utilisé).
10. **Setup → CORS → New** : ajouter l'**origine** de l'app (schéma + host + port, **sans** chemin) — couvre l'échange de token **et** les appels REST :
    ```
    https://poninsor.github.io
    http://localhost:5500
    ```
11. Dans **Paramètres → Salesforce** : choisir l'environnement (Production / Sandbox `test.salesforce.com`), coller le **Consumer Key**, activer le toggle, **Enregistrer**, puis **Tester**.

> L'activation OAuth peut prendre 2 à 10 minutes après la création. Erreurs fréquentes : `redirect_uri_mismatch` (la Callback URL ne correspond pas au caractère près — port, `http`/`https`, `/app/`) ; erreur **CORS** dans la console (origine absente de l'allowlist).

> **Configuration OAuth dans Genesys Cloud**
> L'intégration utilise le flux **Authorization Code + PKCE** (pas de Client Secret). Dans votre org Genesys Cloud, créez un client OAuth de type *Code Authorization* avec l'option **PKCE Required** activée, et autorisez au minimum les URI de redirection suivantes :
>
> Pour la démo live sur [poninsor.github.io/demobanque](https://poninsor.github.io/demobanque/) :
>
> ```
> https://poninsor.github.io/demobanque/app/index.html
> https://poninsor.github.io/demobanque/app/settings.html
> https://poninsor.github.io/demobanque/app/contact.html
> ```
>
> Pour le développement local — Genesys Cloud ignore le numéro de port pour les URI `localhost`, ces trois entrées couvrent donc tous vos ports locaux :
>
> ```
> http://localhost/index.html
> http://localhost/settings.html
> http://localhost/contact.html
> ```

### Vue conseiller

Ouvrir `advisor.html` dans un second onglet (sans être connecté côté client) :

```
https://poninsor.github.io/demobanque/app/advisor.html
```

Paramètre URL optionnel pour ouvrir directement une conversation :

```
advisor.html?account=12345678
```

Les messages sont synchronisés en temps réel entre `messages.html` (client) et `advisor.html` (conseiller) via l'API `storage` du navigateur. Dans `messages.html`, une pastille indique si le conseiller est actuellement connecté sur `advisor.html` — le statut est mis à jour instantanément via l'API `storage` et vérifié toutes les 30 s en filet de sécurité.

Pour désélectionner un compte dans `advisor.html`, cliquer dans une zone vide de la liste des conversations.

---

## Architecture technique

### Stack

- **HTML / CSS / JS vanilla** — zéro dépendance, zéro build step
- **[Lucide Icons](https://lucide.dev)** — chargé depuis unpkg
- **localStorage** — seul mécanisme de persistance

### Structure des fichiers

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
├── advisor.html        # Vue conseiller (pas d'auth requise)
├── contact.html
├── settings.html
├── js-api.html         # Documentation du JavaScript personnalisé (Genesys + Salesforce)
├── config.js           # DemoConfig — toute la logique localStorage
├── genesys.js          # DemoGenesys — intégration Genesys Cloud
├── salesforce.js       # DemoSalesforce — OAuth PKCE + helpers REST (Task/Contact/Case)
├── audiocodes.js       # DemoAudioCodes — intégration WebRTC custom (UI propre sur le SDK standalone)
├── shell.js            # Comportements globaux (nav mobile, Messenger snippet)
├── shell.css           # App shell — layout, nav, bottom sheet (importe colors.css)
├── colors.css          # Design tokens — palette, typo, espacements, ombres
├── audiocodes.css      # Bouton flottant + panel d'appel (charte projet)
├── assets/
│   ├── logo.svg
│   ├── logo-light.svg
│   ├── logo-mark.svg
│   ├── visa.svg
│   ├── visa-white.svg
│   └── genesys.png
└── lib/
    └── audiocodes/     # SDK AudioCodes — fichiers vendor (ne pas modifier)
        └── click-to-call.js   # SDK standalone (AudioCodesUA + JsSIP) — chargé au runtime
```

### Clés localStorage globales

| Clé | Contenu |
|---|---|
| `demobank_v1` | Objet principal — profils, config, messages |
| `demobank_gc_token` | Cache token OAuth Genesys `{ token, expiry, clientId }` |
| `demobank_sf_token` | Cache token OAuth Salesforce `{ token, instanceUrl, expiry, clientId }` |
| `demobank_lang` | Langue globale, lue avant le chargement du profil |
| `demobank_adv_active` | Heartbeat conseiller `{ accountId, ts }` — présent si `advisor.html` est ouvert |
| `demobank_ac_restore` | Snapshot d'appel AudioCodes pour restauration après navigation |
| `demobank_settings_collapsed` | Paramètres — ids des panneaux repliés (état de pliage) |

### Schéma localStorage (`demobank_v1`)

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
      "language": "fr",
      "tutoiement": true,
      "messages": null
    }
  },
  "current": "12345678"
}
```

### API publique — `DemoConfig`

| Méthode | Description |
|---|---|
| `login(accountId, pin)` | Authentifie ou crée un profil ; retourne `{ ok, isNew, msg }` |
| `logout()` | Termine la session et redirige vers `index.html` |
| `requireAuth()` | Guard — redirige si non connecté ; appeler en tête de chaque page protégée |
| `getCurrentAccountId()` | Retourne le numéro de compte actif (`"12345678"`) ou `null` |
| `getProfile()` | Retourne l'objet profil complet du compte actif |
| `updateProfile(updates)` | Fusionne `updates` dans le profil et persiste |
| `deepUpdateProfile(key, value)` | Fusionne dans une clé imbriquée (ex. `'genesys'`) |
| `applyBranding([profile])` | Applique la palette CSS + les données `data-*` au DOM |
| `generatePalette(hex)` | Génère les 10 teintes (50–900) depuis une couleur hex |
| `setLanguage(lang)` | Change la langue (`'fr'` ou `'en'`) globalement et en profil |
| `getGlobalLang()` | Retourne la langue active |
| `getMessages()` | Retourne les messages du compte actif (ou les défauts) |
| `addMessage(msg)` | Ajoute un message et persiste |
| `getGenesys()` | Retourne la config Genesys du compte actif |
| `getAudiocodes()` | Retourne la config AudioCodes du compte actif |
| `getSalesforce()` | Retourne la config Salesforce du compte actif |
| `executeAdditionalJS(runtime?)` | Exécute le snippet `additionalJS` du profil avec variables injectées (`token`, `genesys`, `persona`, `message`, `fetchGenesys`, etc.) |
| `executeAdvisorAdditionalJS(accountId, runtime?)` | Exécute le snippet `advisorAdditionalJS` du profil ciblé avec le même contexte injecté |
| `getStorageUsageBytes()` | Estime l'usage total du localStorage en octets (UTF-16, 2 octets/char) |
| `purgeMessageAttachments(accountId)` | Supprime `fileData` des messages d'un compte ; retourne le nombre purgé |

### API publique — `DemoSalesforce`

Disponible dans le JavaScript personnalisé via la variable `Salesforce` (ou globalement `DemoSalesforce`). Toutes les méthodes REST renvoient une promesse. Voir `js-api.html` pour la documentation détaillée et des exemples.

| Méthode | Description |
|---|---|
| `createTask(fields)` / `getTask(id, fields?)` / `updateTask(id, fields)` | CRUD sur l'objet Task (`update` = PATCH) |
| `createContact(...)` / `getContact(...)` / `updateContact(...)` | Idem pour Contact |
| `createCase(...)` / `getCase(...)` / `updateCase(...)` | Idem pour Case |
| `query(soql)` | Exécute une requête SOQL ; retourne `{ totalSize, records }` |
| `sfFetch(path, init)` / `sfFetchJSON(path, init)` | Accès bas niveau à l'API REST (Bearer auto) |
| `isEnabled()` | `true` si l'intégration est activée et un Consumer Key configuré |
| `getTokenStatus()` / `clearToken()` / `redirectForAuth(sf, redirectUri)` | Gestion du token OAuth |

---

## Exécution locale

Aucun build requis, aucune dépendance à installer.

### Recommandé — serveur Node.js intégré

```bash
node server.js            # http://localhost:5500/
PORT=5500 node server.js  # port personnalisé
# ou
npm start
```

`server.js` utilise uniquement les modules Node.js natifs (Node 18+ requis).

### Alternatives

```bash
# Python (si Node non disponible)
cd app && python3 -m http.server 5500

# VS Code : Live Server
# Clic droit sur index.html → "Open with Live Server"
```

---

## Reset

Pour repartir de zéro :

- **Conversation uniquement** : lien **Reset** en bas de `messages.html`
- **Paramètres uniquement** : bouton **Réinitialiser** dans `settings.html`
- **Tout effacer** : lien **Reset** dans le pied de page de `index.html` (efface tout le localStorage)

---

## Déploiement

L'app est déployée sur **GitHub Pages** depuis le dossier `app/`. Aucune configuration serveur n'est nécessaire (pas de routing, pas d'auth côté serveur).

Pour déployer sur Azure Static Web Apps, pointer la racine sur `app/`. Aucun `staticwebapp.config.json` n'est requis pour un déploiement basique.
