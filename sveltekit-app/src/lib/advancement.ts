import { getAvailableSubclasses, getClassConfig } from './classConfig';
import type { Abilities, AbilityName, Character, LevelUpChoices } from './types';
import { featMatchesClass, getFeatSource } from './featUtils';

export const ABILITY_NAMES: AbilityName[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma'
];

export function gainsAbilityImprovement(className: string, level: number): boolean {
  return (
    [4, 8, 12, 16, 19].includes(level) ||
    (className.toLowerCase() === 'fighter' && [6, 14].includes(level)) ||
    (className.toLowerCase() === 'rogue' && level === 10)
  );
}

export function getSubclassChoices(char: Character, level: number) {
  if (char.subclass) return [];
  const config = getClassConfig(char.class);
  const options = getAvailableSubclasses(char.class);
  const firstLevel = Math.min(
    ...Object.values(config?.subclasses ?? {}).flatMap((subclass) =>
      subclass.features.map((feature) => feature.minLevel ?? 1)
    )
  );
  return level >= firstLevel ? options : [];
}

export function getAdvancedAbilities(abilities: Abilities, choices: LevelUpChoices): Abilities {
  const next = { ...abilities };
  for (const ability of ABILITY_NAMES) {
    const increase = choices.abilityIncreases?.[ability] ?? 0;
    if (Number.isInteger(increase) && increase >= 0 && increase <= 2) {
      next[ability] += increase;
    }
  }
  return next;
}

export function validateLevelUpChoices(char: Character, choices: LevelUpChoices): string | null {
  const level = char.level + 1;
  const earnsImprovement = gainsAbilityImprovement(char.class, level);
  const increases = choices.abilityIncreases ?? {};
  if (Object.keys(increases).some((key) => !ABILITY_NAMES.includes(key as AbilityName))) {
    return 'Choose a valid ability score.';
  }
  let points = 0;
  for (const ability of ABILITY_NAMES) {
    const increase = increases[ability] ?? 0;
    if (
      !Number.isInteger(increase) ||
      increase < 0 ||
      increase > 2 ||
      (increase > 0 && char.abilities[ability] + increase > 20)
    ) {
      return 'Ability increases must be whole numbers from 0 to 2 and cannot raise a score above 20.';
    }
    points += increase;
  }
  if (earnsImprovement) {
    if (choices.improvement !== 'asi' && choices.improvement !== 'feat') {
      return 'Choose an ability score improvement or a feat.';
    }
    if (choices.improvement === 'asi' && points !== 2) {
      return 'Allocate exactly 2 ability score points (+2 to one score or +1 to two scores).';
    }
    if (choices.improvement === 'asi' && choices.feat) return 'Choose either an ASI or a feat.';
    if (choices.improvement === 'feat' && !choices.feat?.name.trim()) {
      return 'Select a feat or enter a custom feat name.';
    }
    if (choices.improvement === 'feat' && !choices.featConfirmed) {
      return 'Confirm the feat prerequisites and any manual effects with your DM.';
    }
    if (choices.improvement === 'feat' && choices.feat) {
      if (choices.feat.source && !choices.featSource) return 'Choose a feat source.';
      if (
        choices.featSource &&
        getFeatSource(choices.feat.source ?? '') !== getFeatSource(choices.featSource)
      ) {
        return 'Choose a feat from the selected source.';
      }
      if (
        !featMatchesClass(
          { ...choices.feat, id: choices.feat.id ?? '', source: choices.feat.source ?? '' },
          { ...char, subclass: choices.subclass || char.subclass },
          level
        )
      )
        return 'Choose a feat available to your class.';
    }
    if (points > 2) return 'Allocate no more than 2 ability score points.';
  } else if (choices.improvement || choices.feat || points) {
    return 'This level does not grant an ability score improvement or feat.';
  }
  const subclasses = getSubclassChoices(char, level);
  if (subclasses.length && !subclasses.some((option) => option.id === choices.subclass)) {
    return 'Choose a subclass.';
  }
  if (choices.subclass && !subclasses.some((option) => option.id === choices.subclass)) {
    return 'This subclass is not available for this level-up.';
  }
  return null;
}

export function removeAdvancementsAbove(char: Character, level: number): void {
  for (const entryLevel of Object.keys(char.advancements ?? {})
    .map(Number)
    .sort((a, b) => b - a)) {
    if (entryLevel <= level) continue;
    const entry = char.advancements![entryLevel];
    for (const ability of ABILITY_NAMES) {
      char.abilities[ability] -= entry.choices.abilityIncreases?.[ability] ?? 0;
    }
    if (entry.choices.subclass) char.subclass = entry.previousSubclass;
    char.features = char.features.replace(entry.featureText, '');
    // Stored totals with a Constitution increase cannot be reused after undoing that increase.
    if (entry.constitutionHPBonus && char.hpByLevel) {
      for (const hpLevel of Object.keys(char.hpByLevel).map(Number)) {
        if (hpLevel >= entryLevel) delete char.hpByLevel[hpLevel];
      }
    }
    delete char.advancements![entryLevel];
  }
}
