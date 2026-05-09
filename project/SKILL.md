# SKILL — Démo banque design system

This project is a **white-label French banking design system** for Genesys Cloud demos.

When asked to mock or extend banking screens for this customer, use these conventions:

## Visual identity
- **Primary color**: `#FF4515` (Genesys Orange). Override via `--brand-500` only.
- **Typography**: Geist (display + body), Geist Mono (amounts). Tracking `-0.02em` on display.
- **Iconography**: Lucide via CDN (`https://unpkg.com/lucide@latest`). Stroke 1.75. Never emoji in product UI.
- **Cards**: 16 px radius default, 28 px for hero tiles. Soft layered shadows.
- **Logos**: `assets/logo.svg`, `assets/logo-mark.svg`, `assets/logo-light.svg`.

## Tone (FR primary, EN parity)
- Tutoiement throughout. "Bonjour Sophie", "Tu peux faire un virement…"
- Sentence case everywhere. Overlines uppercase only.
- Numbers: `1 234,56 €` (espace insécable). Tabular nums on every amount.
- **Persona** par défaut: Sophie Martin, salariée cadre, IBAN ****6892.

## Foundations location
- `colors_and_type.css` — all design tokens
- `ui_kits/web/_shell.css` — desktop app shell (sidebar + topbar + buttons + footer)
- `ui_kits/web/*.html` — 10 desktop screens
- `ui_kits/mobile/mobile-kit.html` — 5 mobile iPhone screens
- `assets/` — logo, Visa, Genesys

## Mandatory footer
Every screen (web + mobile) ends with **« Powered by Genesys Cloud »** + `assets/genesys.svg`. Style: 11 px, faint color, centered.

## When extending
1. Reuse `_shell.css` for any new desktop screen — copy `dashboard.html` as scaffold.
2. Hero areas allowed to use the brand→noir gradient. Backgrounds elsewhere stay flat.
3. Keep CTAs to one primary per surface; secondary buttons are bordered, not filled.
4. New tokens → add to `:root` in `colors_and_type.css`, never inline magic numbers.
