import { beforeEach, expect, mock, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { get } from 'svelte/store';

mock.module('$app/environment', () => ({ browser: false }));

const { character, resetCharacter, applyLevelUp, levelDownCharacter } =
  await import('../src/lib/stores.ts');
const { filterLevelUpFeats } = await import('../src/lib/featUtils.ts');
const { validateLevelUpChoices } = await import('../src/lib/advancement.ts');
const { addFlatDamage, canMakeHewAttack, getCriticalThreshold, getHeavyWeaponMasteryBonus } =
  await import('../src/lib/featMechanics.ts');

const catalog = JSON.parse(readFileSync(new URL('../static/data/feats.json', import.meta.url)));
const byId = (id) => catalog.find((feat) => feat.id === id);
const greatsword = {
  id: 'gs',
  name: 'Greatsword',
  bonus: 6,
  damage: '2d6+4',
  damageType: 'slashing'
};

beforeEach(() => {
  resetCharacter();
  character.update((char) => ({
    ...char,
    class: 'fighter',
    subclass: 'champion',
    level: 3,
    maxHP: 30,
    currentHP: 30,
    proficiencyBonus: 2,
    abilities: { ...char.abilities, strength: 18, dexterity: 16, constitution: 14 },
    features: 'Fighting Style: Great Weapon Fighting',
    attacks: [greatsword]
  }));
});

const gwmChoices = (overrides = {}) => ({
  improvement: 'feat',
  featConfirmed: true,
  featSource: 'PHB',
  ruleset: '2024',
  feat: byId('great-weapon-master'),
  abilityIncreases: { strength: 1 },
  ...overrides
});

test('2024 Great Weapon Master is a level 4, Strength 13 general feat from the PHB', () => {
  const feat = byId('great-weapon-master');
  expect(feat).toMatchObject({ source: 'PHB', category: 'general', ruleset: '2024', minLevel: 4 });
  expect(feat.abilityRequirements).toEqual([{ abilities: ['strength'], min: 13 }]);
  expect(feat.abilityIncrease).toEqual({ abilities: ['strength'], amount: 1, max: 20 });
});

test('the feat list separates Great Weapon Master from the owned Great Weapon Fighting style', () => {
  const char = get(character);
  const ids = filterLevelUpFeats(catalog, char, 'PHB', 4).map((feat) => feat.id);
  expect(ids).toContain('great-weapon-master');
  expect(ids).not.toContain('great-weapon-fighting');
  expect(ids).not.toContain('great-weapon-master-2014');
  expect(ids).toContain('archery');
  expect(byId('great-weapon-fighting').category).toBe('fighting-style');
});

test('feats are filtered by level, ability prerequisites and ruleset', () => {
  const char = get(character);
  const has = (c, level, id) =>
    filterLevelUpFeats(catalog, c, 'PHB', level).some((feat) => feat.id === id);
  expect(has(char, 3, 'great-weapon-master')).toBe(false);
  expect(
    has({ ...char, abilities: { ...char.abilities, strength: 12 } }, 4, 'great-weapon-master')
  ).toBe(false);
  const old = { ...char, ruleset: '2014' };
  expect(has(old, 4, 'great-weapon-master')).toBe(false);
  expect(has(old, 4, 'great-weapon-master-2014')).toBe(true);
});

test('a missing feat is never replaced by a similarly named one', () => {
  const trimmed = catalog.filter((feat) => feat.id !== 'great-weapon-master');
  const names = filterLevelUpFeats(trimmed, get(character), 'PHB', 4).map((feat) => feat.name);
  expect(names).not.toContain('Great Weapon Master');
  expect(names).not.toContain('Great Weapon Fighting');
});

test('Great Weapon Fighting is rejected as a duplicate even when only recorded in the features text', () => {
  const choices = gwmChoices({
    feat: byId('great-weapon-fighting'),
    abilityIncreases: {}
  });
  expect(validateLevelUpChoices(get(character), choices)).toBe(
    'Choose a feat available to your class.'
  );
});

test('Great Weapon Master requires exactly +1 Strength', () => {
  const char = get(character);
  expect(validateLevelUpChoices(char, gwmChoices())).toBeNull();
  expect(validateLevelUpChoices(char, gwmChoices({ abilityIncreases: {} }))).toContain('+1');
  expect(
    validateLevelUpChoices(char, gwmChoices({ abilityIncreases: { dexterity: 1 } }))
  ).toContain('strength');
  const capped = { ...char, abilities: { ...char.abilities, strength: 20 } };
  expect(validateLevelUpChoices(capped, gwmChoices({ abilityIncreases: {} }))).toBeNull();
  expect(validateLevelUpChoices(capped, gwmChoices())).toContain('above 20');
});

test('leveling to 4 with Great Weapon Master applies Strength and persists the feat and its mechanics', () => {
  expect(applyLevelUp('average', undefined, gwmChoices())).toBe(true);
  const char = JSON.parse(JSON.stringify(get(character)));
  expect(char.abilities.strength).toBe(19);
  expect(char.features).toContain('Great Weapon Fighting');
  const saved = char.advancements[4].choices;
  expect(saved.feat).toMatchObject({ id: 'great-weapon-master', source: 'PHB', ruleset: '2024' });
  expect(saved.feat.effects.map((effect) => effect.type)).toEqual([
    'heavyWeaponMasteryDamage',
    'hewBonusAttack'
  ]);
  expect(saved.abilityIncreases).toEqual({ strength: 1 });

  // Picking it again, or the other ruleset's copy, is blocked.
  character.set(char);
  const second = validateLevelUpChoices({ ...char, level: 7 }, gwmChoices());
  expect(second).toBe('Choose a feat available to your class.');

  levelDownCharacter();
  expect(get(character).abilities.strength).toBe(18);
});

test('2024 damage bonus applies only to Heavy weapons used with the Attack action', () => {
  applyLevelUp('average', undefined, gwmChoices());
  const char = get(character);
  expect(char.attacks[0].bonus).toBe(6);
  expect(getCriticalThreshold(char, char.attacks[0])).toBe(19);

  const mastery = getHeavyWeaponMasteryBonus(char, char.attacks[0], { attackAction: true });
  expect(mastery).toBe(2);
  expect(addFlatDamage(char.attacks[0].damage, mastery)).toBe('2d6+6');
  expect(addFlatDamage('2d6+4', 0)).toBe('2d6+4');
  expect(getHeavyWeaponMasteryBonus(char, char.attacks[0], { attackAction: false })).toBe(0);
  expect(getHeavyWeaponMasteryBonus(char, { name: 'Longsword' }, { attackAction: true })).toBe(0);
  expect(
    getHeavyWeaponMasteryBonus(
      char,
      { name: 'Club', weaponProperties: ['heavy'] },
      { attackAction: true }
    )
  ).toBe(2);
  expect(
    getHeavyWeaponMasteryBonus(
      char,
      { name: 'Greatsword', weaponProperties: [] },
      { attackAction: true }
    )
  ).toBe(0);
  expect(
    getHeavyWeaponMasteryBonus(
      char,
      { name: 'Fire Bolt', spellRef: 'Fire Bolt' },
      { attackAction: true }
    )
  ).toBe(0);
});

test('Hew is offered for melee weapons only, and the 2014 feat has no automatic damage bonus', () => {
  applyLevelUp('average', undefined, gwmChoices());
  const char = get(character);
  expect(canMakeHewAttack(char, char.attacks[0])).toBe(true);
  expect(canMakeHewAttack(char, { name: 'Longbow' })).toBe(false);
  expect(canMakeHewAttack({ ...char, advancements: {} }, char.attacks[0])).toBe(false);

  const old = {
    ...char,
    advancements: {
      4: { choices: { improvement: 'feat', feat: byId('great-weapon-master-2014') } }
    }
  };
  expect(getHeavyWeaponMasteryBonus(old, char.attacks[0], { attackAction: true })).toBe(0);
  expect(canMakeHewAttack(old, char.attacks[0])).toBe(true);
});
