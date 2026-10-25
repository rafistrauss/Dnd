import { beforeEach, expect, mock, test } from 'bun:test';
import { get } from 'svelte/store';

mock.module('$app/environment', () => ({ browser: false }));

const {
  character,
  resetCharacter,
  applyLevelUp,
  getLevelUpPreview,
  levelDownCharacter,
  setCharacterLevel,
  syncCurrentLevelHP
} = await import('../src/lib/stores.ts');

beforeEach(() => {
  resetCharacter();
  character.update((char) => ({
    ...char,
    class: 'paladin',
    maxHP: 12,
    currentHP: 3,
    hitDice: { current: 0, max: 1 },
    abilities: { ...char.abilities, constitution: 14, charisma: 18 }
  }));
});

test('average level-up restores HP, hit dice, spell slots and ability-based resources', () => {
  const preview = getLevelUpPreview();
  expect(preview.hpGainAverage).toBe(8);
  expect(preview.maxHPAfter).toBe(20);
  expect(preview.classFeatureCounts['Divine Sense'].max).toBe(5);

  applyLevelUp('average');
  const char = get(character);
  expect(char.level).toBe(2);
  expect(char.maxHP).toBe(preview.maxHPAfter);
  expect(char.currentHP).toBe(char.maxHP);
  expect(char.hitDice).toEqual({ current: 2, max: 2 });
  expect(char.classFeatures.spellSlotsByLevel[1]).toEqual([false, false]);
  expect(char.classFeatures.features.DivineSense).toEqual(Array(5).fill(false));
  expect(char.classFeatures.features.LayonHands).toBe(10);
});

test('HP rolls are stored by level, including average levels and replacement rolls', () => {
  applyLevelUp('average');
  applyLevelUp('roll', 9);
  expect(get(character).maxHP).toBe(31);
  expect(get(character).hpRolls).toEqual([6, 9]);
  levelDownCharacter();
  applyLevelUp('roll', 4);
  expect(get(character).maxHP).toBe(26);
  expect(get(character).hpRolls).toEqual([6, 4]);
});

test('rolled HP gain has a minimum of one', () => {
  character.update((char) => ({
    ...char,
    abilities: { ...char.abilities, constitution: 3 }
  }));
  applyLevelUp('roll', 1);
  expect(get(character).maxHP).toBe(13);
});

test('level-down and reuse preserve manually edited HP totals', () => {
  applyLevelUp('roll', 9);
  character.update((char) => ({ ...char, maxHP: 30 }));
  syncCurrentLevelHP();
  levelDownCharacter();
  expect(get(character).maxHP).toBe(12);
  expect(get(character).currentHP).toBe(12);
  applyLevelUp('reuse');
  expect(get(character).maxHP).toBe(30);
  expect(get(character).currentHP).toBe(30);
});

test('subclass spell slots are previewed, restored and resized on level changes', () => {
  character.update((char) => ({
    ...char,
    class: 'rogue',
    subclass: 'arcane trickster',
    level: 3,
    maxHP: 24,
    classFeatures: {
      ...char.classFeatures,
      spellSlotsByLevel: { 1: [true, true] }
    }
  }));
  expect(getLevelUpPreview().spellSlotsRestored).toBe(3);
  applyLevelUp('average', undefined, {
    improvement: 'asi',
    abilityIncreases: { dexterity: 2 }
  });
  expect(get(character).classFeatures.spellSlotsByLevel[1]).toEqual([false, false, false]);
  levelDownCharacter();
  expect(get(character).classFeatures.spellSlotsByLevel[1]).toEqual([false, false]);
  setCharacterLevel(4);
  expect(get(character).classFeatures.spellSlotsByLevel[1]).toEqual([false, false, false]);
});

test('direct level changes update proficiency and clamp to supported levels', () => {
  setCharacterLevel(5);
  expect(get(character).proficiencyBonus).toBe(3);
  expect(get(character).maxHP).toBe(44);
  setCharacterLevel(99);
  expect(get(character).level).toBe(20);
  const before = structuredClone(get(character));
  expect(getLevelUpPreview()).toBeNull();
  applyLevelUp('average');
  expect(get(character)).toEqual(before);
  setCharacterLevel(-1);
  expect(get(character).level).toBe(1);
  levelDownCharacter();
  expect(get(character).level).toBe(1);
});

test('reset does not retain character changes or share HP history between characters', () => {
  applyLevelUp('roll', 9);
  resetCharacter();
  expect(get(character).class).toBe('');
  expect(get(character).level).toBe(1);
  expect(get(character).hpByLevel).toBeUndefined();
  expect(get(character).hpRolls).toBeUndefined();
  expect(get(character).classFeatures.features).toEqual({});
});

test('characters without a class cannot level up or down', () => {
  character.update((char) => ({ ...char, class: '' }));
  const before = structuredClone(get(character));
  expect(getLevelUpPreview()).toBeNull();
  applyLevelUp('average');
  levelDownCharacter();
  expect(get(character)).toEqual(before);
});

test('unlimited Rage at level 20 does not allocate an infinite uses array', () => {
  character.update((char) => ({
    ...char,
    class: 'barbarian',
    subclass: 'berserker',
    level: 19,
    maxHP: 176
  }));
  expect(getLevelUpPreview().classFeatureCounts.Rage.max).toBe(Infinity);
  applyLevelUp('average');
  expect(get(character).level).toBe(20);
  expect(get(character).classFeatures.features.Rage).toEqual([]);
  levelDownCharacter();
  expect(get(character).classFeatures.features.Rage).toEqual(Array(6).fill(false));
  setCharacterLevel(20);
  expect(get(character).classFeatures.features.Rage).toEqual([]);
});

test('ASI levels include the extra Fighter and Rogue improvements, not level 20', async () => {
  const { gainsAbilityImprovement } = await import('../src/lib/advancement.ts');
  for (const className of ['paladin', 'fighter', 'rogue', 'wizard', 'cleric', 'barbarian']) {
    expect([4, 8, 12, 16, 19].every((level) => gainsAbilityImprovement(className, level))).toBe(
      true
    );
    expect(gainsAbilityImprovement(className, 20)).toBe(false);
  }
  expect(gainsAbilityImprovement('fighter', 6)).toBe(true);
  expect(gainsAbilityImprovement('fighter', 14)).toBe(true);
  expect(gainsAbilityImprovement('rogue', 10)).toBe(true);
  expect(gainsAbilityImprovement('wizard', 6)).toBe(false);
});

function prepareImprovement() {
  character.update((char) => ({ ...char, level: 3, maxHP: 35 }));
}

test('ASI previews and applies Constitution HP retroactively and updates resources', () => {
  prepareImprovement();
  const choices = { improvement: 'asi', abilityIncreases: { constitution: 2 } };
  const preview = getLevelUpPreview(choices);
  expect(preview.conMod).toBe(3);
  expect(preview.constitutionHPBonus).toBe(3);
  expect(preview.maxHPAfter).toBe(47);
  expect(applyLevelUp('average', undefined, choices)).toBe(true);
  expect(get(character).abilities.constitution).toBe(16);
  expect(get(character).currentHP).toBe(47);
  expect(get(character).maxHP).toBe(preview.maxHPAfter);
  expect(get(character).advancements[4].choices).toEqual(choices);
  levelDownCharacter();
  expect(get(character).abilities.constitution).toBe(14);
  expect(get(character).maxHP).toBe(35);
  expect(get(character).advancements[4]).toBeUndefined();
  expect(get(character).hpByLevel[4]).toBeUndefined();
  applyLevelUp('average', undefined, choices);
  expect(get(character).maxHP).toBe(47);
});

test('ASI splits points and rolls HP using the new Constitution modifier', () => {
  prepareImprovement();
  character.update((char) => ({
    ...char,
    abilities: { ...char.abilities, constitution: 15 }
  }));
  expect(
    applyLevelUp('roll', 7, {
      improvement: 'asi',
      abilityIncreases: { constitution: 1, strength: 1 }
    })
  ).toBe(true);
  expect(get(character).maxHP).toBe(48);
  expect(get(character).abilities.strength).toBe(11);
});

test('invalid or incomplete advancement choices do not mutate the character', () => {
  prepareImprovement();
  character.update((char) => ({ ...char, abilities: { ...char.abilities, strength: 19 } }));
  const before = structuredClone(get(character));
  const invalid = [
    {},
    { improvement: 'asi' },
    { improvement: 'asi', abilityIncreases: { strength: 2 } },
    { improvement: 'asi', abilityIncreases: { wisdom: 1 } },
    { improvement: 'asi', abilityIncreases: { wisdom: 3 } },
    { improvement: 'asi', abilityIncreases: { wisdom: 1.5, charisma: 0.5 } },
    { improvement: 'asi', abilityIncreases: { luck: 2 } },
    { improvement: 'feat' },
    { improvement: 'feat', feat: { name: 'Custom feat', description: '' } }
  ];
  for (const choices of invalid) {
    expect(applyLevelUp('average', undefined, choices)).toBe(false);
    expect(get(character)).toEqual(before);
  }
});

test('feats, selected score increases and other choices persist and undo without duplicates', () => {
  prepareImprovement();
  const choices = {
    improvement: 'feat',
    featConfirmed: true,
    feat: { id: 'custom', name: 'Custom training', description: 'DM-approved benefits' },
    abilityIncreases: { strength: 1 },
    notes: 'Chosen skill: Athletics'
  };
  expect(applyLevelUp('average', undefined, choices)).toBe(true);
  expect(get(character).abilities.strength).toBe(11);
  expect(get(character).features).toContain('Feat: Custom training');
  expect(get(character).features).toContain('Chosen skill: Athletics');
  const saved = JSON.parse(JSON.stringify(get(character)));
  resetCharacter();
  character.set(saved);
  levelDownCharacter();
  expect(get(character).abilities.strength).toBe(10);
  expect(get(character).features).not.toContain('Custom training');
  applyLevelUp('reuse', undefined, choices);
  expect(get(character).abilities.strength).toBe(11);
  expect(get(character).features.match(/Feat: Custom training/g)).toHaveLength(1);
});

test('new subclass choices change spell slots and are undone on level-down', () => {
  character.update((char) => ({ ...char, class: 'rogue', level: 2, maxHP: 17 }));
  const before = structuredClone(get(character));
  expect(applyLevelUp('average')).toBe(false);
  expect(get(character)).toEqual(before);
  const choices = { subclass: 'arcane trickster', notes: 'Mage Hand selected' };
  const preview = getLevelUpPreview(choices);
  expect(preview.spellSlotsRestored).toBe(2);
  expect(preview.newFeatures.some((feature) => feature.name === 'Mage Hand Legerdemain')).toBe(
    true
  );
  expect(applyLevelUp('average', undefined, choices)).toBe(true);
  expect(get(character).subclass).toBe('arcane trickster');
  expect(get(character).classFeatures.spellSlotsByLevel[1]).toEqual([false, false]);
  levelDownCharacter();
  expect(get(character).subclass).toBe('');
  expect(get(character).classFeatures.spellSlotsByLevel).toEqual({});
});

test('direct level decreases undo all advancements above the target level', () => {
  prepareImprovement();
  const originalFeatures = get(character).features;
  applyLevelUp('average', undefined, {
    improvement: 'asi',
    abilityIncreases: { charisma: 2 }
  });
  setCharacterLevel(2);
  expect(get(character).abilities.charisma).toBe(18);
  expect(get(character).features).toBe(originalFeatures);
  expect(get(character).advancements).toEqual({});
});

test('Constitution increases update future cached HP for reuse and direct level changes', () => {
  prepareImprovement();
  character.update((char) => ({ ...char, hpByLevel: { 3: 35, 4: 43, 5: 51 } }));
  const choices = { improvement: 'asi', abilityIncreases: { constitution: 2 } };
  applyLevelUp('average', undefined, choices);
  expect(get(character).hpByLevel[5]).toBe(56);
  applyLevelUp('reuse');
  expect(get(character).maxHP).toBe(56);
  levelDownCharacter();
  setCharacterLevel(5);
  expect(get(character).maxHP).toBe(56);
  setCharacterLevel(3);
  expect(get(character).abilities.constitution).toBe(14);
  expect(get(character).hpByLevel[5]).toBeUndefined();
});

test('ASI to a spellcasting ability refreshes ability-based resource limits', () => {
  prepareImprovement();
  const choices = { improvement: 'asi', abilityIncreases: { charisma: 2 } };
  expect(getLevelUpPreview(choices).classFeatureCounts['Divine Sense'].max).toBe(6);
  applyLevelUp('average', undefined, choices);
  expect(get(character).classFeatures.features.DivineSense).toEqual(Array(6).fill(false));
});

test('feat source is saved and incompatible class/source selections cannot level up', () => {
  prepareImprovement();
  const before = structuredClone(get(character));
  const choices = {
    improvement: 'feat',
    featConfirmed: true,
    featSource: 'PHB',
    feat: { id: 'example', name: 'Example', description: '', source: 'SRD', classes: ['wizard'] }
  };
  expect(applyLevelUp('average', undefined, choices)).toBe(false);
  expect(get(character)).toEqual(before);
  choices.feat.source = 'PHB';
  expect(applyLevelUp('average', undefined, choices)).toBe(false);
  choices.feat.classes = ['paladin'];
  expect(applyLevelUp('average', undefined, choices)).toBe(true);
  const saved = JSON.parse(JSON.stringify(get(character)));
  expect(saved.advancements[4].choices.featSource).toBe('PHB');
  expect(saved.advancements[4].choices.feat.source).toBe('PHB');
});
