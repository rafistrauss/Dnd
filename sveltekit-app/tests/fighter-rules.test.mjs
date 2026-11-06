import { beforeEach, expect, mock, test } from 'bun:test';
import { get } from 'svelte/store';

mock.module('$app/environment', () => ({ browser: false }));

const {
  character,
  resetCharacter,
  initializeRacialTraits,
  resetRacialTraitUses,
  useRacialTrait,
  turnTracker,
  applySecondWindHealing,
  getLevelUpPreview
} = await import('../src/lib/stores.ts');
const { getAvailableFeatures, getFighterMasteryCount, hasRemarkableAthlete } =
  await import('../src/lib/classConfig.ts');
const { restoreClassResources } = await import('../src/lib/classResources.ts');
const { getRacialTraitsForLevel } = await import('../src/lib/raceConfig.ts');
const { calculateArmorClass, getArmorByName } = await import('../src/lib/armorData.ts');
const { getD20Result } = await import('../src/lib/diceUtils.ts');
const { getAttackMastery } = await import('../src/lib/weaponMastery.ts');

beforeEach(() => {
  resetCharacter();
  turnTracker.set({ round: 1, action: false, bonusAction: false, reaction: false });
  character.update((char) => ({
    ...char,
    class: 'fighter',
    subclass: 'champion',
    ruleset: '2024',
    level: 4,
    race: 'Goliath',
    giantAncestry: 'hill',
    maxHP: 36,
    currentHP: 10,
    proficiencyBonus: 2,
    hpRolls: [6, 6, 6],
    hpByLevel: { 1: 12, 2: 20, 3: 28, 4: 36 },
    abilities: {
      strength: 19,
      dexterity: 16,
      constitution: 14,
      intelligence: 10,
      wisdom: 12,
      charisma: 8
    },
    classFeatures: {
      features: { SecondWind: [true, true, true], ActionSurge: [true] },
      spellSlots: [],
      spellSlotsByLevel: {},
      preparedSpells: ''
    }
  }));
});

test('2024 Second Wind follows Fighter level progression without changing 2014 rules', () => {
  const secondWind = (level, ruleset) =>
    getAvailableFeatures('fighter', level, 'champion', ruleset).find(
      (f) => f.name === 'Second Wind'
    );
  for (const [level, uses] of [
    [1, 2],
    [3, 2],
    [4, 3],
    [9, 3],
    [10, 4],
    [20, 4]
  ]) {
    expect(secondWind(level, '2024').maxUses(level)).toBe(uses);
  }
  expect(secondWind(4, '2024')).toMatchObject({ resetOn: 'long', shortRestRecovery: 1 });
  expect(secondWind(4, '2014')).toMatchObject({ maxUses: 1, resetOn: 'short' });
  expect(secondWind(4, '2014').shortRestRecovery).toBeUndefined();
});

test('Short Rest recovers one Second Wind and all Action Surge uses without restoring Hit Dice', () => {
  const char = get(character);
  char.hitDice = { current: 0, max: 4 };
  restoreClassResources(char, 'short');
  expect(char.classFeatures.features.SecondWind).toEqual([true, true, false]);
  expect(char.classFeatures.features.ActionSurge).toEqual([false]);
  expect(char.hitDice.current).toBe(0);
  restoreClassResources(char, 'long');
  expect(char.classFeatures.features.SecondWind).toEqual([false, false, false]);
});

test('rest recovery does not create extra uses and supports the legacy Fighter', () => {
  const char = get(character);
  char.classFeatures.features.SecondWind = [false, false, false];
  restoreClassResources(char, 'short');
  expect(char.classFeatures.features.SecondWind).toEqual([false, false, false]);
  char.ruleset = '2014';
  char.classFeatures.features.SecondWind = [true];
  restoreClassResources(char, 'short');
  expect(char.classFeatures.features.SecondWind).toEqual([false]);
});

test('Second Wind healing consumes one use and a Bonus Action and caps at maximum HP', () => {
  character.update((char) => ({
    ...char,
    classFeatures: { ...char.classFeatures, features: { SecondWind: [false, false, false] } }
  }));
  expect(applySecondWindHealing(9)).toBe(true);
  expect(get(character).currentHP).toBe(19);
  expect(get(character).classFeatures.features.SecondWind).toEqual([true, false, false]);
  expect(get(turnTracker).bonusAction).toBe(true);
  expect(applySecondWindHealing(9)).toBe(false);
  expect(get(character).currentHP).toBe(19);
  turnTracker.update((turn) => ({ ...turn, bonusAction: false }));
  expect(applySecondWindHealing(30)).toBe(true);
  expect(get(character).currentHP).toBe(36);
});

test('Second Wind rejects exhausted resources and invalid rolls without healing', () => {
  expect(applySecondWindHealing(10)).toBe(false);
  expect(applySecondWindHealing(NaN)).toBe(false);
  expect(get(character).currentHP).toBe(10);
  expect(get(turnTracker).bonusAction).toBe(false);
});

test('Champion and Fighter features use the correct 2024 level gates', () => {
  const names = (level, ruleset = '2024') =>
    getAvailableFeatures('fighter', level, 'champion', ruleset).map((f) => f.name);
  expect(names(4)).toContain('Tactical Mind');
  expect(names(4)).toContain('Weapon Mastery');
  expect(names(4)).toContain('Remarkable Athlete');
  expect(names(4)).not.toContain('Extra Attack');
  expect(names(5)).toContain('Extra Attack');
  expect(names(5)).toContain('Tactical Shift');
  expect(names(7)).toContain('Additional Fighting Style');
  expect(names(10)).toContain('Heroic Warrior');
  expect(names(4, '2014')).not.toContain('Remarkable Athlete');
  expect(hasRemarkableAthlete(get(character))).toBe(true);
  expect(hasRemarkableAthlete({ ...get(character), ruleset: '2014' })).toBe(false);
  expect(hasRemarkableAthlete({ ...get(character), subclass: 'battlemaster' })).toBe(false);
});

test('Fighter mastery counts and per-weapon selections control available mastery effects', () => {
  expect([1, 4, 10, 16].map(getFighterMasteryCount)).toEqual([3, 4, 5, 6]);
  const attack = { name: 'Greatsword +1', mastery: 'Graze' };
  expect(getAttackMastery({ weaponMasteries: ['Greatsword'] }, attack)).toBe('Graze');
  expect(getAttackMastery({ weaponMasteries: ['Longbow'] }, attack)).toBeUndefined();
  expect(getAttackMastery({ weaponMasteries: [] }, attack)).toBeUndefined();
  expect(getAttackMastery({}, attack)).toBe('Graze');
});

test('Goliath uses track proficiency, retain spent uses, and recover only on a Long Rest', () => {
  initializeRacialTraits();
  expect(get(character).racialTraits.uses.GiantAncestry).toEqual({
    currentUses: 2,
    maxUses: 2,
    restType: 'long'
  });
  useRacialTrait('GiantAncestry');
  initializeRacialTraits();
  resetRacialTraitUses('short');
  expect(get(character).racialTraits.uses.GiantAncestry.currentUses).toBe(1);
  resetRacialTraitUses('long');
  expect(get(character).racialTraits.uses.GiantAncestry.currentUses).toBe(2);
  character.update((char) => ({ ...char, proficiencyBonus: 3 }));
  initializeRacialTraits();
  expect(get(character).racialTraits.uses.GiantAncestry).toMatchObject({
    currentUses: 2,
    maxUses: 3
  });
  resetRacialTraitUses('long');
  expect(get(character).racialTraits.uses.GiantAncestry.currentUses).toBe(3);
});

test('Large Form is unavailable until level 5 and does not change legacy Goliaths', () => {
  initializeRacialTraits();
  expect(get(character).racialTraits.uses.LargeForm).toBeUndefined();
  expect(getRacialTraitsForLevel('Goliath', 4).map((trait) => trait.name)).not.toContain(
    'Large Form'
  );
  expect(getRacialTraitsForLevel('Goliath', 4, '2014')).toEqual([]);
  character.update((char) => ({ ...char, level: 5 }));
  initializeRacialTraits();
  expect(get(character).racialTraits.uses.LargeForm).toMatchObject({ currentUses: 1, maxUses: 1 });
  character.update((char) => ({ ...char, level: 4 }));
  initializeRacialTraits();
  expect(get(character).racialTraits.uses.LargeForm).toBeUndefined();
});

test('average HP and armor match a level-4 Fighter with Constitution 14 and Dexterity 16', () => {
  expect(getLevelUpPreview().maxHPAfter).toBe(44);
  expect(getLevelUpPreview().classFeatureCounts['Second Wind'].max).toBe(3);
  expect(calculateArmorClass('Half Plate', 3, false)).toBe(17);
  expect(getArmorByName('Half Plate').stealthDisadvantage).toBe(true);
  expect(getArmorByName('Breastplate').stealthDisadvantage).toBeUndefined();
});

test('Advantage and Disadvantage keep one d20 and add the modifier exactly once', () => {
  expect(getD20Result([3, 17], 6, 'advantage')).toMatchObject({ result: [17], resultTotal: 23 });
  expect(getD20Result([17, 3], 3, 'disadvantage')).toMatchObject({ result: [3], resultTotal: 6 });
  expect(getD20Result([7, 7], -1, 'advantage').resultTotal).toBe(6);
});
