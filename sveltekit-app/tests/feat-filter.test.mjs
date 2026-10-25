import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { filterLevelUpFeats, getFeatSources } from '../src/lib/featUtils.ts';
import { validateLevelUpChoices } from '../src/lib/advancement.ts';

const catalog = JSON.parse(readFileSync(new URL('../static/data/feats.json', import.meta.url)));
const advanced = 'https://a5esrd.com/a5esrd';
const heroes = 'https://koboldpress.com/kpstore/product/tome-of-heroes-for-5th-edition/';
const char = {
  class: 'fighter',
  subclass: 'champion',
  level: 3,
  abilities: {
    strength: 16,
    dexterity: 14,
    constitution: 14,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  }
};

test('source selection is required and PHB never includes SRD or third-party entries', () => {
  expect(filterLevelUpFeats(catalog, char, '')).toEqual([]);
  expect(filterLevelUpFeats(catalog, char, 'PHB')).toEqual([]);
  const feats = [
    { id: 'phb', name: 'PHB example', source: "Player's Handbook", description: '' },
    ...catalog
  ];
  expect(filterLevelUpFeats(feats, char, 'phb').map((feat) => feat.id)).toEqual(['phb']);
  expect(getFeatSources(catalog).map((source) => source.id)).toContain('PHB');
  expect(filterLevelUpFeats(catalog, char, heroes).every((feat) => feat.source === heroes)).toBe(
    true
  );
});

test('general feats remain available but class-feature feats require their features', () => {
  const feats = filterLevelUpFeats(catalog, char, heroes);
  expect(feats.some((feat) => feat.id === 'diehard')).toBe(true);
  expect(feats.some((feat) => feat.id === 'boundless-reserves')).toBe(false);
  expect(feats.some((feat) => feat.id === 'sorcerous-vigor')).toBe(false);
});

test('spellcasting feats respect the chosen class, subclass and target level', () => {
  const hasCasterFeat = (character) =>
    filterLevelUpFeats(catalog, character, advanced).some((feat) => feat.id === 'battle-caster');
  expect(hasCasterFeat(char)).toBe(false);
  expect(hasCasterFeat({ ...char, class: 'wizard', subclass: '' })).toBe(true);
  expect(hasCasterFeat({ ...char, class: 'rogue', subclass: 'arcane trickster' })).toBe(true);
  expect(hasCasterFeat({ ...char, class: 'rogue', subclass: '' })).toBe(false);
  expect(hasCasterFeat({ ...char, class: 'rogue', subclass: 'arcane trickster', level: 1 })).toBe(
    false
  );
});

test('explicit class restrictions exclude other classes without excluding general feats', () => {
  const feats = [
    { id: 'fighter', name: 'Fighter choice', description: '', source: 'PHB', classes: ['Fighter'] },
    { id: 'wizard', name: 'Wizard choice', description: '', source: 'PHB', classes: ['Wizard'] },
    { id: 'general', name: 'General choice', description: '', source: 'PHB' }
  ];
  expect(filterLevelUpFeats(feats, char, 'PHB').map((feat) => feat.id)).toEqual([
    'fighter',
    'general'
  ]);
});

test('advancement validation rejects incompatible source and class selections', () => {
  const choices = {
    improvement: 'feat',
    featConfirmed: true,
    featSource: 'PHB',
    feat: { id: 'example', name: 'Example', description: '', source: advanced }
  };
  expect(validateLevelUpChoices(char, choices)).toBe('Choose a feat from the selected source.');
  choices.feat.source = 'PHB';
  choices.feat.classes = ['wizard'];
  expect(validateLevelUpChoices(char, choices)).toBe('Choose a feat available to your class.');
  choices.feat.classes = ['fighter'];
  expect(validateLevelUpChoices(char, choices)).toBeNull();
});

test('alternative racial prerequisites remain DM-confirmed rather than excluding noncasters', () => {
  expect(filterLevelUpFeats(catalog, char, heroes).some((feat) => feat.id === 'harrier')).toBe(
    true
  );
});

test('omitting a source does not bypass class restrictions or catalog source selection', () => {
  const choices = {
    improvement: 'feat',
    featConfirmed: true,
    feat: { name: 'Custom choice', description: '', classes: ['wizard'] }
  };
  expect(validateLevelUpChoices(char, choices)).toBe('Choose a feat available to your class.');
  choices.feat.classes = ['fighter'];
  choices.feat.source = 'PHB';
  expect(validateLevelUpChoices(char, choices)).toBe('Choose a feat source.');
});
