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
  applyLevelUp('average');
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
