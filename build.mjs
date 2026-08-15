import { readFileSync, writeFileSync } from 'node:fs';
import StyleDictionary from 'style-dictionary';
import { register, expandTypesMap } from '@tokens-studio/sd-transforms';

register(StyleDictionary);

const file = JSON.parse(readFileSync('tokens.json', 'utf8'));

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    const isGroup = value && typeof value === 'object'
      && !Array.isArray(value) && !('$value' in value);
    if (isGroup) {
      target[key] = deepMerge(target[key] ?? {}, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function collectNames(obj, prefix = [], out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (value && typeof value === 'object' && '$value' in value) {
      out.add([...prefix, key].join('.'));
    } else if (value && typeof value === 'object') {
      collectNames(value, [...prefix, key], out);
    }
  }
  return out;
}

function tierOf(set) {
  if (set === 'primitives') return 'primitive';
  if (set.startsWith('brand/')) return 'brand';
  if (set.startsWith('mode/')) return 'semantic';
  if (set === 'components') return 'component';
  return 'unknown';
}

const groups = {};
for (const t of file.$themes) {
  if (!groups[t.group]) groups[t.group] = [];
  groups[t.group].push(t);
}
const manifest = {};

for (const brand of groups.Brand) {
  for (const mode of groups.Appearance) {
    const selected = { ...brand.selectedTokenSets, ...mode.selectedTokenSets };

    const active = file.$metadata.tokenSetOrder.filter(
      (set) => selected[set] === 'source' || selected[set] === 'enabled'
    );

    const tokens = {};
    const exported = new Set();
    const tokenTier = new Map();

    for (const set of active) {
      deepMerge(tokens, file[set]);
      collectNames(file[set]).forEach((name) => tokenTier.set(name, tierOf(set)));
      if (selected[set] === 'enabled') {
        collectNames(file[set]).forEach((name) => exported.add(name));
      }
    }

    const key = `${brand.name}-${mode.name}`.toLowerCase();
    const selector = `[data-brand="${brand.name.toLowerCase()}"][data-mode="${mode.name.toLowerCase()}"]`;

    const sd = new StyleDictionary({
      tokens,
      preprocessors: ['tokens-studio'],
      expand: { typesMap: expandTypesMap },
      platforms: {
        css: {
          transformGroup: 'tokens-studio',
          transforms: ['name/kebab'],
          buildPath: 'build/',
          files: [{
            destination: `${key}.css`,
            format: 'css/variables',
            options: { selector },
            filter: (token) => {
              const path = token.path.join('.');
              return [...exported].some((e) => path === e || path.startsWith(e + '.'));
            },
          }],
        },
      },
    });

    await sd.buildAllPlatforms();

    const dictionary = await sd.getPlatformTokens('css');

    for (const token of dictionary.allTokens) {
      const name = token.path.join('.');
      if (!manifest[name]) {
        manifest[name] = {
          name,
          cssVariable: '--' + token.name,
          type: token.$type ?? token.type ?? 'unknown',
          tier: tokenTier.get(name) ?? 'unknown',
          description: token.$description ?? null,
          aliases: {},
          values: {},
        };
      }
      const original = token.original?.$value ?? token.original?.value;
      if (typeof original === 'string' && original.includes('{')) {
        manifest[name].aliases[key] = original;
      }
      manifest[name].values[key] = String(token.$value ?? token.value);
    }
    
  }
}

for (const token of Object.values(manifest)) {
  const unique = [...new Set(Object.values(token.aliases))];
  token.alias = unique.length === 0 ? null : unique.length === 1 ? unique[0] : token.aliases;
  delete token.aliases;
}

const PERMS = groups.Brand.flatMap((b) =>
  groups.Appearance.map((m) => `${b.name}-${m.name}`.toLowerCase())
);

const payload = { permutations: PERMS, tokens: Object.values(manifest) };

writeFileSync('build/tokens-manifest.json', JSON.stringify(payload, null, 2));
writeFileSync('build/tokens-manifest.js', `window.__TOKEN_MANIFEST__ = ${JSON.stringify(payload)};`);

console.log(`Manifest: ${Object.values(manifest).length} tokenów, ${PERMS.length} permutacji.`);