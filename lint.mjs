import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const file = JSON.parse(readFileSync('tokens.json', 'utf8'));

const ALIAS_SETS = ['brand/aster', 'brand/corvid', 'mode/light', 'mode/dark', 'components'];
const violations = [];

function walkTokens(obj, prefix, visit) {
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (value && typeof value === 'object' && '$value' in value) {
      visit([...prefix, key].join('.'), value);
    } else if (value && typeof value === 'object') {
      walkTokens(value, [...prefix, key], visit);
    }
  }
}

for (const set of ALIAS_SETS) {
  walkTokens(file[set], [], (path, token) => {
    const value = token.$value;
    if (typeof value === 'string') {
      if (!value.includes('{')) {
        violations.push(`${set} :: ${path} — surowa wartość "${value}"`);
      }
    } else if (value && typeof value === 'object') {
      for (const [prop, sub] of Object.entries(value)) {
        if (typeof sub === 'string' && !sub.includes('{')) {
          violations.push(`${set} :: ${path}.${prop} — surowa wartość "${sub}" w tokenie kompozytowym`);
        }
      }
    }
  });
}

const ALL_SETS = ['primitives', ...ALIAS_SETS];
const known = new Set();
for (const set of ALL_SETS) {
  walkTokens(file[set], [], (path) => known.add(path));
}

for (const set of ALL_SETS) {
  walkTokens(file[set], [], (path, token) => {
    const values = typeof token.$value === 'string'
      ? [token.$value]
      : Object.values(token.$value ?? {}).filter((v) => typeof v === 'string');

    for (const value of values) {
      for (const match of value.matchAll(/\{([^}]+)\}/g)) {
        const target = match[1].trim();
        if (!known.has(target)) {
          violations.push(`${set} :: ${path} — alias do {${target}}, który nie istnieje`);
        }
      }
    }
  });
}

// Rule 3: UI code may only consume semantic and component tokens.
const manifest = JSON.parse(readFileSync('build/tokens-manifest.json', 'utf8'));
const forbidden = new Set(
  manifest.tokens
    .filter((t) => t.tier === 'primitive' || t.tier === 'brand')
    .map((t) => t.cssVariable)
);

const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|(?<![-\w])rgba?\(/;
const RAW_DIMENSION = /:\s*[^;{]*?(?<![\w.-])(?!0)(\d+(?:\.\d+)?)(px|rem|em)\b/;

for (const dir of ['docs', 'demo']) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((f) => /\.(html|css|jsx?)$/.test(f))) {
    const filePath = path.join(dir, f);
    readFileSync(filePath, 'utf8').split('\n').forEach((line, i) => {
      const where = `${filePath}:${i + 1}`;
      if (line.includes('lint-ignore')) return;
      if (RAW_COLOR.test(line)) violations.push(`${where} — surowy kolor`);
      if (RAW_DIMENSION.test(line)) violations.push(`${where} — surowy wymiar (${line.match(RAW_DIMENSION)[1]}${line.match(RAW_DIMENSION)[2]})`);
      for (const v of [...line.matchAll(/var\((--[\w-]+)\)/g)]) {
        if (forbidden.has(v[1])) violations.push(`${where} — zmienna prymitywna ${v[1]}`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`Lint nie przeszedł — ${violations.length} naruszeń:\n`);
  for (const v of violations) console.error('  ' + v);
  process.exit(1);
} else {
  console.log('Lint przeszedł: warstwy aliasowe zawierają wyłącznie referencje, wszystkie aliasy się rozwiązują.');
}