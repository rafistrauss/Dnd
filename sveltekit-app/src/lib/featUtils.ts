import { getAvailableFeatures, getSpellSlotProgression } from './classConfig';
import type { Feat } from './dndData';
import type { AbilityName, Character, FeatMetadata, Ruleset } from './types';

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

export const DEFAULT_RULESET: Ruleset = '2024';

export const FEAT_CATEGORY_LABELS: Record<string, string> = {
  origin: 'Origin Feats',
  general: 'General Feats',
  'fighting-style': 'Fighting Style Feats',
  'epic-boon': 'Epic Boon Feats'
};

type FeatLike = Pick<Feat, 'name'> & FeatMetadata;

export function getCharacterRuleset(char: Pick<Character, 'ruleset'>): Ruleset {
  return char.ruleset ?? DEFAULT_RULESET;
}

// Feats recorded through level-up advancements, in the order they were taken.
export function getAdvancementFeats(char: Character): FeatLike[] {
  return Object.keys(char.advancements ?? {})
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((level) => {
      const choices = char.advancements![level].choices;
      return choices.improvement === 'feat' && choices.feat ? [choices.feat] : [];
    });
}

// Fighting styles chosen before level-up tracking (or typed by hand) only exist in the free-text
// features field, so they are matched by name.
export function getKnownFeatNames(char: Character, catalog: Feat[] = []): Set<string> {
  const names = new Set(getAdvancementFeats(char).map((feat) => feat.name.trim().toLowerCase()));
  for (const feat of catalog) {
    if (feat.category !== 'fighting-style') continue;
    const escaped = feat.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(char.features ?? '')) {
      names.add(feat.name.toLowerCase());
    }
  }
  return names;
}

export function meetsAbilityRequirements(feat: FeatMetadata, char: Character): boolean {
  return (feat.abilityRequirements ?? []).every((requirement) =>
    requirement.abilities.some(
      (ability: AbilityName) => (char.abilities?.[ability] ?? 0) >= requirement.min
    )
  );
}

export function getRequiredAbilityIncrease(
  feat: FeatMetadata,
  abilities: Character['abilities']
): number | null {
  const increase = feat.abilityIncrease;
  if (!increase) return null;
  const room = increase.abilities.reduce(
    (total, ability) => total + Math.max(0, increase.max - abilities[ability]),
    0
  );
  return Math.min(increase.amount, room);
}

export function featMatchesClass(
  feat: Feat,
  char: Character,
  level: number,
  catalog: Feat[] = []
): boolean {
  if (!char.class) return false;
  if (feat.ruleset && feat.ruleset !== getCharacterRuleset(char)) return false;
  if (feat.minLevel && level < feat.minLevel) return false;
  if (!meetsAbilityRequirements(feat, char)) return false;
  if (!feat.repeatable && getKnownFeatNames(char, catalog).has(feat.name.trim().toLowerCase())) {
    return false;
  }
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
      getFeatSource(feat.source) === getFeatSource(source) &&
      featMatchesClass(feat, char, level, feats)
  );
}
