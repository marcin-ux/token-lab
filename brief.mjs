import { readFileSync, writeFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('build/tokens-manifest.json', 'utf8'));

// UI code may only consume these two tiers — the same rule the lint enforces.
const usable = manifest.tokens.filter(
  (t) => t.tier === 'semantic' || t.tier === 'component'
);

function groupOf(name) {
  const parts = name.split('.');
  return (parts[0] === 'color' || parts[0] === 'layout')
    ? parts.slice(0, 2).join('.')
    : parts[0];
}

const groups = new Map();
for (const token of usable) {
  const g = groupOf(token.name);
  if (!groups.has(g)) groups.set(g, []);
  groups.get(g).push(token);
}

const lines = [];

lines.push('# Token contract');
lines.push('');
lines.push('Read this before writing any UI in this repo.');
lines.push('');
lines.push('## Rules');
lines.push('');
lines.push('1. Every colour, spacing, radius and type value must come from a CSS variable listed below.');
lines.push('2. Never write a raw value: no hex, no `rgb()`, no `12px`, no `1.5rem`.');
lines.push('3. Never use a primitive or brand variable (`--color-indigo-600`, `--space-md`, `--brand-radius-control`).');
lines.push('   Those exist so the tiers below can reference them. UI code consumes intent, not values.');
lines.push('4. Prefer a component token when one exists: `--field-border` over `--color-border-strong`.');
lines.push('5. Theme switching happens through `data-brand` and `data-mode` on `<html>`. Never hardcode a theme.');
lines.push('6. Run `npm run check` when done and fix every violation. Do not weaken a gate to make a change pass.');
lines.push('');
lines.push(`Permutations: ${manifest.permutations.join(', ')}`);
lines.push('');
lines.push('## Available tokens');
lines.push('');

for (const [groupName, tokens] of [...groups].sort()) {
  lines.push(`### ${groupName}`);
  lines.push('');
  lines.push('| CSS variable | Type | Use for |');
  lines.push('| --- | --- | --- |');
  for (const t of tokens.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`| \`var(${t.cssVariable})\` | ${t.type} | ${t.description ?? '—'} |`);
  }
  lines.push('');
}

lines.push('## Accessibility floor');
lines.push('');
lines.push('- Interactive targets at least 24×24 CSS px (WCAG 2.2 SC 2.5.8).');
lines.push('- Every interactive element needs a visible `:focus-visible` style using `--focus-ring-color`,');
lines.push('  `--focus-ring-width` and `--focus-ring-offset`. Never remove an outline without replacing it.');
lines.push('- `npm run contrast` checks token pairs in all four permutations and will fail the build.');
lines.push('');

writeFileSync('build/AGENT-BRIEF.md', lines.join('\n'));
console.log(`Brief: ${usable.length} tokens, ${groups.size} groups.`);