import { getAvailableFeatures, getSpellcastingAbility } from './classConfig';
import type { Character, ResetType } from './types';

export function restoreClassResources(char: Character, rest: ResetType): string[] {
  const restored: string[] = [];
  const ability = getSpellcastingAbility(char.class, char.subclass);
  const modifier = ability ? Math.floor((char.abilities[ability] - 10) / 2) : undefined;
  for (const feature of getAvailableFeatures(char.class, char.level, char.subclass, char.ruleset)) {
    const partial = rest === 'short' ? feature.shortRestRecovery : undefined;
    if (rest === 'short' && feature.resetOn !== 'short' && !partial) continue;
    const name =
      typeof feature.name === 'function' ? feature.name(char.level, modifier) : feature.name;
    const key = name.replace(/\s+/g, '');
    if (feature.type === 'uses') {
      const max =
        typeof feature.maxUses === 'function'
          ? feature.maxUses(char.level, modifier)
          : (feature.maxUses ?? 0);
      if (!Number.isFinite(max)) continue;
      const stored = char.classFeatures.features[key];
      let used = Array.isArray(stored) ? stored.filter(Boolean).length : 0;
      used = partial ? Math.max(0, used - partial) : 0;
      char.classFeatures.features[key] = Array.from({ length: max }, (_, i) => i < used);
      restored.push(name);
    } else if (feature.type === 'pool') {
      const max =
        typeof feature.maxPool === 'function' ? feature.maxPool(char.level) : feature.maxPool;
      if (max !== undefined) {
        char.classFeatures.features[key] = max;
        restored.push(name);
      }
    }
  }
  return restored;
}
