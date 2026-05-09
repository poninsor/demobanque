# Démo banque — Design System

White-label banking design system inspired by French neobanks (Boursorama, Fortuneo, Revolut, N26). Built as a **demo platform for Genesys Cloud CCaaS integrations** — the UI is intentionally generic so it can be re-skinned per demo via a built-in Settings panel.

> **Sources** — No codebase or Figma was attached. This system is a fresh recreation drawing inspiration from public-facing French banking apps (Boursorama Banque, Fortuneo, Revolut, N26). All assets are original or simple text-based marks.

---

## Brand essentials

| | |
|---|---|
| **Brand name** | Démo banque (white-label, swappable) |
| **Primary** | `#FF4515` Genesys Orange — bold fintech accent, aligné sur l'identité Genesys Cloud |
| **Aesthetic** | Audacieux fintech — generous whitespace, large headlines, soft shadows, full-bleed brand color |
| **Languages** | FR primary, EN parity |
| **Tone** | Tutoiement, conversationnel, direct |
| **Iconography** | [Lucide](https://lucide.dev) via CDN |
| **Type** | Geist (display + body), Geist Mono (amounts) |
| **Footer** | « Powered by Genesys Cloud » + logo, all pages |

---

## Index

| File / folder | What it holds |
|---|---|
| `README.md` | This file — the system at a glance |
| `SKILL.md` | Agent skill manifest (compatible with Claude Code) |
| `colors_and_type.css` | All design tokens (colors, type, spacing, radii, shadows, motion) |
| `assets/` | Logo, mark, Visa & Genesys marks, card backgrounds, illustrations |
| `preview/` | Design-system-tab cards (colors, type, components, brand) |
| `ui_kits/web/` | Desktop espace client — 5 click-thru screens |
| `ui_kits/mobile/` | Mobile responsive variant — same flows on small screen |

---

## CONTENT FUNDAMENTALS

**Voice.** Direct, calme, jamais condescendant. Tutoiement par défaut (« Bonjour Sophie », « Tu peux faire un virement en quelques secondes »). Phrases courtes. Pas de jargon bancaire inutile — on dit « ton solde » et pas « le solde de votre compte courant n°… ».

**Casing.** Sentence case partout (titres, boutons, labels). Pas de TITLE CASE ni de MAJUSCULES sauf overlines (« RÉCENTS », « EN ATTENTE »).

**Numbers & money.** Format français (`1 234,56 €`), espace insécable avant `€`. Tabular nums sur tous les montants. Signe explicite : `+ 240,00 €` pour les crédits, `− 49,90 €` pour les débits.

**Dates.** Court : `12 mai`, `aujourd'hui · 14:32`. Long : `lundi 12 mai 2026`.

**Microcopy examples**
| Contexte | Bon | À éviter |
|---|---|---|
| Bouton primaire | « Faire un virement » | « SOUMETTRE LE FORMULAIRE » |
| Empty state | « Aucune opération ce mois-ci. Profite-en pour respirer. » | « Vous n'avez actuellement aucune transaction enregistrée dans le système. » |
| Erreur | « Le RIB ne semble pas valide. Vérifie les chiffres. » | « ERREUR 422 : VALIDATION FAILED » |
| Confirmation | « C'est parti ! Le virement de 250 € arrivera demain. » | « Votre demande de virement a été soumise avec succès. » |
| Onboarding cartes | « Choisis la carte qui te ressemble. » | « Sélectionnez votre produit bancaire. » |

**Pas d'emoji** dans l'UI produit. Acceptable dans les empty states amicaux et notifications éphémères, **avec parcimonie**. Préférer un pictogramme Lucide.

**Inclusivity.** Formulations neutres quand possible (« la personne bénéficiaire », « ton conseiller / ta conseillère »).

---

## VISUAL FOUNDATIONS

**Palette.** Brand orange `#FF4515` (Genesys Orange) utilisé avec retenue : CTA primaires, badges actifs, états sélectionnés, accents narratifs. Le reste = neutres chauds (`#0d0e12` → `#fafafa`). Vert `#00A35A` pour crédits, rouge `#E11D48` pour alertes, ambre `#F59E0B` pour pending.

**Typographie.** Geist partout. Hiérarchie ferme : H1 48px / H2 36px / H3 24px / body 16px. Tracking serré (`-0.02em`) sur les gros titres pour un look fintech moderne. Montants en Geist semibold avec `tabular-nums` obligatoire — jamais de jitter sur les chiffres.

**Backgrounds.** Plats. Pas de gradients ambiants. Une seule exception : la **carte hero du dashboard** et les **cartes Visa** utilisent un gradient brand → noir. Pas de pattern, pas de texture, pas de bruit. La hiérarchie vient des élévations.

**Spacing.** Grille 4 pt. Densité moyenne — espace généreux dans les cartes principales (24px padding), plus dense dans les listes d'opérations (12px). Marges externes 32–48px sur desktop.

**Radii.** Système à 6 paliers. **16px** est la valeur par défaut pour les cartes, **12px** pour les boutons, **999px** pour pills/avatars/badges. Les cartes hero du dashboard montent à **28px** (`--r-2xl`) pour un effet premium.

**Shadows.** Système à 4 niveaux, tous très soft. `--shadow-sm` sur cartes au repos, `--shadow-md` au hover, `--shadow-lg` sur menus/dropdowns/modals. Une ombre teintée brand (`--shadow-brand`) pour les CTA primaires hover. **Pas de shadow agressive** — fintech moderne = subtilité.

**Borders.** 1px `--border` (`#ECECEF`) sur cartes secondaires et inputs. Les cartes principales sont **shadow-only**, sans border. Au focus : ring 2px `--brand` à 2px d'offset.

**Hover & press.**
- Boutons primaires : hover = `--brand-600` (10% darker), press = `--brand-700` + `transform: scale(0.98)`
- Boutons secondaires : hover = `bg-inset`, press = scale(0.98)
- Cartes cliquables : hover = `--shadow-md` + `translateY(-2px)`, press = scale(0.99)
- Liens texte : hover = underline, color stable
- **Pas de change de couleur** sur hover des cartes — uniquement élévation.

**Animation.** Sobre. Toutes les transitions = 220ms `--ease-out`. Pas de bounce sauf sur l'apparition du panneau de paramètres (`--ease-spring`). Pages : fade + 8px translate sur mount, 220ms. Skeletons pulsent à 1.6s. **Pas de loaders rotatifs** sur les actions courtes — on préfère un skeleton.

**Transparence & blur.** Glassmorphism utilisé une seule fois : header sticky du dashboard (`backdrop-filter: blur(12px)` + bg à `rgba(255,255,255,0.8)`). Sinon tout est opaque.

**Layout rules.**
- Sidebar fixe **264px** sur desktop, escamotable en `<` 1024px
- Header **64px** sticky
- Container max **1200px** centré sur les pages denses, full-width sur dashboard
- Mobile : tab bar fixe en bas (5 onglets max), header 56px

**Imagery.** Pas de photos stock. Quand on illustre (vide, onboarding), illustrations vectorielles plates en 2 couleurs : brand + neutre. **Cartes Visa** = gradient + logo + tracking + texte en blanc — pas de photo de carte physique.

**Iconographie.** Lucide partout, stroke 1.75px, taille par défaut 20px (16px en dense, 24px en hero). Jamais d'emoji dans l'UI. Voir section ICONOGRAPHY ci-dessous.

---

## ICONOGRAPHY

**Système** — [Lucide](https://lucide.dev), via CDN (`https://unpkg.com/lucide@latest`).

**Pourquoi Lucide** — set complet (1500+ icônes), stroke moderne fin (1.75px par défaut), excellente couverture des concepts bancaires (`credit-card`, `wallet`, `arrow-right-left`, `banknote`, `shield-check`, `bell`, `message-circle`).

**Tailles canoniques**
| Usage | Taille | Stroke |
|---|---|---|
| Inline texte | 16px | 1.75 |
| Boutons / champs | 20px | 1.75 |
| Hero / vide | 32–48px | 1.5 |
| Tab bar mobile | 24px | 2 |

**Couleurs** — `currentColor` toujours. Jamais de couleur hardcoded sauf icônes-marques (Visa, Genesys).

**Pas d'emoji** dans l'UI produit. Pas d'icônes PNG. Pas d'icon font custom — Lucide en SVG injecté est suffisant.

**Logos & marques fournies** (dans `assets/`)
- `logo.svg` / `logo-mark.svg` / `logo-light.svg` — Démo banque (wordmark + mark + version dark)
- `visa.svg` / `visa-white.svg` — Mark Visa simplifié (placeholder, à remplacer par le SVG officiel en prod)
- `genesys.svg` — Mark Genesys simplifié pour le footer « Powered by »

> ⚠️ **Substitutions à signaler** — Les marques Visa et Genesys sont des recreations textuelles minimalistes. Pour usage en production ou démo officielle, remplacer par les SVG officiels fournis par les ayants droit.

---

## Tweakable settings (white-label)

Le panneau Settings expose ces leviers (persistés dans `localStorage`, et compatibles avec le panneau Tweaks de l'éditeur) :

- **Logo & nom de marque** — texte + URL logo
- **Couleur primaire / palette** — palette générée automatiquement à partir d'une seule couleur
- **Persona client** — nom, prénom, avatar
- **Soldes des comptes** — montants éditables
- **Liste des produits souscrits** — toggle on/off carte gold/platinum/crédit
