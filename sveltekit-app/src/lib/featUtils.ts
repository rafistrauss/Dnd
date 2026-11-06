import { getAvailableFeatures, getSpellSlotProgression } from './classConfig';
import type { Feat } from './dndData';
import type { Character } from './types';

const SOURCE_LABELS: Record<string, string> = {
  'https://a5esrd.com/a5esrd': 'Level Up: Advanced 5e',
  'https://koboldpress.com/kpstore/product/tome-of-heroes-for-5th-edition/': 'Tome of Heroes',
  'http://dnd.wizards.com/articles/features/systems-reference-document-srd': 'SRD',
  'https://https://greenronin.com/blog/2017/09/25/ronin-round-table-integrating-wizards-5e-adventures-with-the-taldorei-campaign-setting/':
    'Tal’Dorei Campaign Setting'
};

export function getFeatSource(source: string): string {
  const value = source.trim();
  if (/^(phb|player['’]?s handbook)$/i.test(value)) return 'PHB';
  return value;
}

export function getFeatSources(feats: Feat[]): { id: string; name: string }[] {
  const sources = new Set([
    'PHB',
    ...feats.map((feat) => getFeatSource(feat.source)).filter(Boolean)
  ]);
  return [...sources].map((id) => ({ id, name: SOURCE_LABELS[id] ?? id }));
}

export function featMatchesClass(feat: Feat, char: Character, level: number): boolean {
  if (!char.class) return false;
  if (
    feat.classes?.length &&
    !feat.classes.some((className) => className.toLowerCase() === char.class.toLowerCase())
  ) {
    return false;
  }
  const features = getAvailableFeatures(char.class, level, char.subclass).map((feature) =>
    (typeof feature.name === 'function' ? feature.name(level) : feature.name).toLowerCase()
  );
  if (feat.requiredFeatures?.some((name) => !features.includes(name.toLowerCase()))) return false;
  const prerequisite = feat.prerequisite ?? '';
  // The catalog expresses spellcasting requirements in prose rather than structured metadata.
  if (
    !/\bor\b/i.test(prerequisite.replace(/\bor higher\b/gi, '')) &&
    /\b(?:cast|casting)\b.*\bspell/i.test(prerequisite) &&
    !getSpellSlotProgression(char.class, level, char.subclass).some((slots) => slots > 0)
  ) {
    return false;
  }
  return true;
}

export function filterLevelUpFeats(
  feats: Feat[],
  char: Character,
  source: string,
  level = char.level + 1
): Feat[] {
  if (!source) return [];
  return feats.filter(
    (feat) =>
      getFeatSource(feat.source) === getFeatSource(source) && featMatchesClass(feat, char, level)
  );
}
