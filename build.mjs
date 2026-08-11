import { readFileSync } from 'node:fs';
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

const groups = {};
for (const t of file.$themes) {
  if (!groups[t.group]) groups[t.group] = [];
  groups[t.group].push(t);
}

for (const brand of groups.Brand) {
  for (const mode of groups.Appearance) {
    const selected = { ...brand.selectedTokenSets, ...mode.selectedTokenSets };

    const active = file.$metadata.tokenSetOrder.filter(
      (set) => selected[set] === 'source' || selected[set] === 'enabled'
    );

    const tokens = {};
    const exported = new Set();

    for (const set of active) {
      deepMerge(tokens, file[set]);
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
  }
}