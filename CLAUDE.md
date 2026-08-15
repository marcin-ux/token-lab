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