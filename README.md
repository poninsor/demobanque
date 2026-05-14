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
- **Messagerie sécurisée** : conversation client ↔ conseiller persistée en localStorage, synchronisation temps réel entre onglets
- **Vue conseiller** (`advisor.html`) : interface miroir pour répondre aux clients, accessible sans authentification client
- **Intégration Genesys Cloud** : Messenger snippet (exécuté au chargement), OAuth 2.0 Implicit Grant, numéro d'appel `tel:`, JavaScript additionnel déclenché à chaque envoi de message
- **Bilingue FR/EN** : basculement instantané, persisté par profil
- **Import / Export** : sauvegarde et restauration du paramétrage complet en `.json` (hors token OAuth)
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
| `settings.html` | Paramètres — 8 panneaux : sauvegarde, marque, persona, soldes, produits, langue, sécurité, Genesys Cloud |

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
- **Genesys Cloud** — région AWS, Client ID OAuth, Messenger snippet, Queue ID, Script ID, numéro d'appel, JavaScript additionnel

> **Configuration OAuth dans Genesys Cloud**
> L'intégration utilise le flux **Implicit Grant** (pas de Client Secret). Dans votre org Genesys Cloud, créez un client OAuth de type *Token Implicit Grant* et autorisez au minimum les URI de redirection suivantes :
>
> ```
> https://poninsor.github.io/demobanque/app/index.html
> https://poninsor.github.io/demobanque/app/settings.html
> https://poninsor.github.io/demobanque/app/contact.html
> ```
>
> En local, ajoutez également l'URL de votre serveur (ex. `http://localhost:8080/index.html`, etc.).

### Vue conseiller

Ouvrir `advisor.html` dans un second onglet (sans être connecté côté client) :

```
https://poninsor.github.io/demobanque/app/advisor.html
```

Paramètre URL optionnel pour ouvrir directement une conversation :

```
advisor.html?account=12345678
```

Les messages sont synchronisés en temps réel entre `messages.html` (client) et `advisor.html` (conseiller) via l'API `storage` du navigateur.

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
├── config.js           # DemoConfig — toute la logique localStorage
├── genesys.js          # DemoGenesys — intégration Genesys Cloud
├── shell.js            # Comportements globaux (nav mobile, Messenger snippet)
├── shell.css           # Design system + app shell
└── assets/
    ├── logo.svg
    ├── logo-light.svg
    ├── logo-mark.svg
    ├── visa.svg
    ├── visa-white.svg
    └── genesys.png
```

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
        "callNumber": "3262"
      },
      "additionalJS": "alert(\"création d'un workitem\");",
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
| `executeAdditionalJS()` | Exécute le snippet `additionalJS` du profil |

---

## Exécution locale

Aucun build requis. N'importe quel serveur de fichiers statiques suffit :

```bash
# Python
cd app/
python3 -m http.server 8080

# Node (npx)
npx serve app/

# VS Code : Live Server
# Clic droit sur index.html → "Open with Live Server"
```

Puis ouvrir `http://localhost:8080`.

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
