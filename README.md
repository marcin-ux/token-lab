# Token Lab

A complete design token pipeline in miniature: **Figma → Tokens Studio → GitHub → Style Dictionary → CSS**, producing four theme permutations from a single source of truth, with two automated gates and a documentation surface generated from the same build.

Two brands × two modes. Every colour, dimension and type decision resolves through a four-tier token architecture, and nothing reaches the UI without passing an architecture lint and a WCAG contrast audit.

---

## Quickstart

```bash
npm install
npm run check          # build → brief → lint → contrast
open docs/index.html   # token reference, component gallery, live contrast audit
```

| Command | What it does |
| --- | --- |
| `npm run build` | Compiles `tokens.json` into four CSS files plus `build/tokens-manifest.json` |
| `npm run brief` | Regenerates `build/AGENT-BRIEF.md` — the token contract for AI-assisted work |
| `npm run lint` | Fails if alias tiers hold raw values, aliases dangle, or UI code reaches past the semantic tier |
| `npm run contrast` | Fails if any declared colour pair drops below WCAG AA in any permutation |
| `npm run check` | All of the above. Intended as a merge gate. |

---

## Architecture

Token sets, in resolution order:

```
primitives     Tier 1 — raw values only. Colour ramps, spacing scale (math tokens:
               {space.base} * 3), type scale, sizing, radii.

brand/aster    Tier 2a — per-brand accent ramp and radius character.
brand/corvid   Aliases only. Each brand declares its accent for light AND dark
               surfaces, so it knows nothing about which mode is active.

mode/light     Tier 2b — semantic colour. Intent-based names. Aliases only.
mode/dark      The only tier that differs per mode.

layout         Tier 2c — semantic spacing and sizing. Mode-independent.

components     Tier 3 — component-level decisions and composite typography.
               Aliases only.
```

UI code consumes the semantic and component tiers only. Reaching into `primitives` or `brand/*` is a lint failure — that rule is what keeps a re-brand to a single file.

### Design decisions worth defending

**1. Brand and mode are orthogonal dimensions, not four themes.**
The naive setup makes `aster-light`, `aster-dark`, `corvid-light` and `corvid-dark` four parallel definitions and duplicates every decision four times. Here they compose. Adding a third brand means one new file and one new theme in the Brand group — it works in both modes automatically. Adding a high-contrast mode means one file, not three.

The mechanism that allows this: brands declare their accent by **surface polarity**, not by mode — `brand.accent.on-light` and `brand.accent.on-dark`. Neither tier imports the other's concepts.

**2. Modes live in the semantic tier, never in primitives.**
Primitives are context-free facts ("this hex exists"); semantics are decisions ("accent surfaces use this ramp step *in this context*"). Note that dark mode maps `background.accent` to a *lighter* ramp step, with dark text on top — a decision that cannot be expressed at all if themes live at the primitive level, because a primitive doesn't know what it sits on.

**3. The contrast audit runs on built output, not source.**
It parses the generated CSS, so it validates what actually ships, per permutation. Auditing the source would mean re-resolving aliases — duplicating the build's work and risking a different answer.

**4. Ramp position does not guarantee contrast.**
Corvid (teal) uses a darker ramp step on light surfaces than Aster (indigo) — 700 rather than 600. Teal is perceptually lighter than indigo at the same numeric step, so a symmetric choice would not clear 4.5:1 under white text. This is the practical argument for automating the check rather than eyeballing a palette.

---

## Gates

**Architecture lint** (`lint.mjs`)

1. The brand, mode, layout and component tiers may only alias. Raw values belong in `primitives`.
2. Every alias must resolve to a token that exists.
3. UI code may not use primitive- or brand-tier variables, raw colours, or raw dimensions.

**Contrast audit** (`contrast.mjs`)

23 foreground/background pairs, checked in all four permutations: 4.5:1 for text (SC 1.4.3), 3:1 for non-text elements such as borders and focus rings (SC 1.4.11). SC 2.4.13 Focus Appearance is AAA and is deliberately not gated here, though the focus ring is still checked at 3:1 under 1.4.11.

Both exit non-zero on failure, so `npm run check` can block a merge.

**The rule that makes gates worth having:** when a gate fails, fix the token — never the threshold. A contrast failure is resolved by adding a ramp step and re-aliasing, not by lowering a minimum.

---

## What the gates found

Rule 3 was added after the first UI was written. It reported fifteen violations across two files — and none of them were coding errors. Every one was a raw dimension standing in for a token that did not exist.

The system had a semantic tier for colour and for spacing, but none for **sizes**. That gap had already produced three different container widths (980 / 680 / 480 px) and two different button heights (32 / 40 px) across two files written an hour apart. Nobody made a mistake; there was simply no token carrying the decision, so each author invented a value.

The fix was architectural: `size.control.*` and `size.container.*` primitives, with an intent-named layer above them (`layout.control.height-comfortable`, `layout.container.narrow`). The lint did not so much catch a bug as show where the system ended.

---

## Documentation

`docs/index.html` renders the token manifest, a component gallery in every state, and the live contrast audit — switchable across all four permutations.

It is generated from the same build that produces the CSS, so it cannot drift from what ships. Each token shows its alias chain, which makes the architecture legible at a glance:

```
button.primary.background → color.background.accent → brand.accent.on-light → color.indigo.600
```

The page is itself styled only with semantic and component tokens, so it passes the same lint as any other consumer of the system.

---

## AI-assisted workflow

`build/AGENT-BRIEF.md` is generated from the manifest: the 93 tokens UI code may use, grouped, with the intent of each, plus the rules and the accessibility floor. `CLAUDE.md` carries the project conventions.

The approach is a **contract plus a feedback loop** rather than a prompt. Pasting token files into a prompt does not work — the model will still emit a raw hex somewhere. A generated list of permitted tokens, combined with a lint that reports file, line and reason, converges quickly.

`docs/settings.html` was produced this way, from the brief alone.

---

## Scope

This is a lab, not a production system. Deliberately absent:

- Token versioning and npm publishing
- Deprecation and migration tooling
- Platform outputs beyond CSS
- Visual regression testing
- Theming dimensions beyond brand × mode
- Adoption metrics

Tokens sync to a single `tokens.json` rather than a directory, which means a one-token change produces a whole-file diff. A directory layout is the right choice in production, where reviewable diffs matter.