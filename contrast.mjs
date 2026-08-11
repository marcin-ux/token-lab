import { readFileSync } from 'node:fs';

const PERMUTATIONS = ['aster-light', 'aster-dark', 'corvid-light', 'corvid-dark'];

function parseVariables(css) {
  const vars = {};
  for (const match of css.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    vars[match[1]] = match[2].trim();
  }
  return vars;
}

function toRgb(hex) {
  const n = parseInt(hex.match(/^#([0-9a-f]{6})/i)[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(toRgb(fg));
  const l2 = relativeLuminance(toRgb(bg));
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

const PAIRS = [
  // Text — SC 1.4.3 Contrast (Minimum), AA, 4.5:1
  ['--color-text-default',      '--color-background-default',        4.5, 'Body text on default surface',        '1.4.3'],
  ['--color-text-default',      '--color-background-subtle',         4.5, 'Body text on recessed surface',       '1.4.3'],
  ['--color-text-default',      '--color-background-accent-subtle',  4.5, 'Body text on tinted surface',         '1.4.3'],
  ['--color-text-muted',        '--color-background-default',        4.5, 'Muted text on default surface',       '1.4.3'],
  ['--color-text-accent',       '--color-background-default',        4.5, 'Accent text and links',               '1.4.3'],
  ['--color-text-accent',       '--color-background-accent-subtle',  4.5, 'Accent text on tinted surface',       '1.4.3'],
  ['--color-text-on-accent',    '--color-background-accent',         4.5, 'Text on accent surface',              '1.4.3'],
  ['--button-primary-text',     '--button-primary-background',       4.5, 'Primary button label',                '1.4.3'],
  ['--button-secondary-text',   '--button-secondary-background',     4.5, 'Secondary button label',              '1.4.3'],
  ['--field-text',              '--field-background',                4.5, 'Field value text',                    '1.4.3'],
  ['--field-placeholder',       '--field-background',                4.5, 'Field placeholder',                   '1.4.3'],
  ['--field-label',             '--color-background-default',        4.5, 'Field label',                         '1.4.3'],
  ['--field-hint',              '--color-background-default',        4.5, 'Field hint text',                     '1.4.3'],
  ['--field-error-text',        '--color-background-default',        4.5, 'Field error message',                 '1.4.3'],
  ['--badge-success-text',      '--badge-success-background',        4.5, 'Badge label, success',                '1.4.3'],
  ['--badge-warning-text',      '--badge-warning-background',        4.5, 'Badge label, warning',                '1.4.3'],
  ['--badge-danger-text',       '--badge-danger-background',         4.5, 'Badge label, danger',                 '1.4.3'],

  // Non-text — SC 1.4.11 Non-text Contrast, AA, 3:1
  ['--color-focus-ring',        '--color-background-default',        3.0, 'Focus ring against default surface',  '1.4.11'],
  ['--color-focus-ring',        '--color-background-subtle',         3.0, 'Focus ring against recessed surface', '1.4.11'],
  ['--field-border',            '--field-background',                3.0, 'Field border against its fill',       '1.4.11'],
  ['--field-border-error',      '--field-background',                3.0, 'Field error border against its fill', '1.4.11'],
  ['--button-secondary-border', '--button-secondary-background',     3.0, 'Secondary button border',             '1.4.11'],
  ['--button-primary-background','--color-background-default',       3.0, 'Primary button against surface',      '1.4.11'],
];

const report = { generated: new Date().toISOString(), permutations: {} };
let failures = 0;

for (const key of PERMUTATIONS) {
  const vars = parseVariables(readFileSync(`build/${key}.css`, 'utf8'));
  const results = [];

  for (const [fgVar, bgVar, minRatio, label, criterion] of PAIRS) {
    const fg = vars[fgVar];
    const bg = vars[bgVar];

    if (!fg || !bg) {
      results.push({ label, criterion, fgVar, bgVar, ratio: null, minRatio, pass: false,
                     error: `missing ${!fg ? fgVar : bgVar}` });
      failures++;
      continue;
    }

    const ratio = Number(contrastRatio(fg, bg).toFixed(2));
    const pass = ratio >= minRatio;
    if (!pass) failures++;
    results.push({ label, criterion, fgVar, bgVar, fg, bg, ratio, minRatio, pass });
  }

  report.permutations[key] = {
    passed: results.filter((r) => r.pass).length,
    total: results.length,
    results,
  };

  console.log(`\n${key}: ${results.filter((r) => r.pass).length}/${results.length}`);
  for (const r of results.filter((r) => !r.pass)) {
    console.log(`  FAIL ${r.label}: ${r.ratio ?? r.error} (needs ${r.minRatio}:1, SC ${r.criterion})`);
  }
}

import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('build/reports', { recursive: true });
writeFileSync('build/reports/contrast.json', JSON.stringify(report, null, 2));
writeFileSync(
  'build/reports/contrast.js',
  `window.__CONTRAST_REPORT__ = ${JSON.stringify(report)};`
);

if (failures > 0) {
  console.error(`\nContrast audit FAILED: ${failures} pair(s) below threshold.`);
  process.exit(1);
} else {
  console.log('\nContrast audit passed in all permutations.');
}