# Token Lab — project conventions

## Before writing any UI

Read `build/AGENT-BRIEF.md`. It lists every token you may use.
Do not read `tokens.json` to pick values — the brief is the contract.

## Token architecture

- `primitives` — raw values. Nothing else may hold a raw value.
- `brand/*` — per-brand accent ramp and radius character. Aliases only.
- `mode/*` — semantic colour. The only tier that differs per mode. Aliases only.
- `layout` — semantic spacing and sizing. Mode-independent. Aliases only.
- `components` — component decisions. Aliases only.

UI code consumes `mode/*`, `layout` and `components` only. Never primitives or brand.

## Commands

- `npm run check` — build, brief, lint, contrast. This is the merge gate.

## Hard rules

- Never weaken a gate to make a change pass. If `contrast` fails, fix it at the
  token level — pick a different ramp step or add one to primitives. Do not lower
  a threshold or delete a pair. If `lint` fails, add the missing token — do not
  add an exception.
- If you need a value and no token covers it, that is a gap in the token
  architecture. Say so instead of reaching into the primitive tier.
- `build/` is generated. Never hand-edit it.

## When the system doesn't cover what you need

Do not stop. Build the thing, then report the gap.

1. **Compose from the nearest available tier.** If no component token exists, use the semantic tier. Never a primitive or brand token, and never a raw value.
2. **Mark it in the code** with a comment prefixed `TOKEN GAP:` on the line or block concerned. State what you needed and what you used instead.
3. **Record it** in `build/reports/token-gaps.md`. Create the file if it doesn't exist.
   One entry per gap:
   - **Needed** — what the requirement asked for, in the requirement's own words.
   - **Used instead** — the tokens you composed it from.
   - **Proposed token** — the name and tier you would add, plus what it should alias.
   - **Risk of the workaround** — what breaks or degrades because the real token is missing. Be specific: a missing hover state, a value that will drift when an unrelated token changes, a pair the contrast audit does not cover.

Composing from a lower tier is a compromise, not a solution. An unreported compromise is worse than a visible failure, because it looks like the system covered the case.

Distinguish two situations and say which one you are in:

- **A missing value** in an existing category — e.g. a hover state for a colour that already has a resting state. Low risk, straightforward to add.
- **A missing category** — e.g. no elevation or overlay tokens at all. Higher risk, because it means a whole class of decisions has no home and every consumer will invent its own.