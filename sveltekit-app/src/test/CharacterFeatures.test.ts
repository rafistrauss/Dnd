import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { character, resetCharacter, turnTracker, collapsedStates } from '../lib/stores';
import Skills from '../lib/components/Skills.svelte';
import CombatStats from '../lib/components/CombatStats.svelte';
import RacialTraits from '../lib/components/RacialTraits.svelte';
import ClassFeatures from '../lib/components/ClassFeatures.svelte';

beforeEach(() => {
  resetCharacter();
  collapsedStates.update((state) => ({
    ...state,
    skills: false,
    combatStats: false,
    classFeatures: false
  }));
  turnTracker.set({ round: 1, action: false, bonusAction: false, reaction: false });
  character.update((char) => ({
    ...char,
    class: 'fighter',
    subclass: 'champion',
    ruleset: '2024',
    level: 4,
    race: 'Goliath',
    giantAncestry: 'hill',
    background: 'Entertainer',
    armorName: 'Half Plate',
    armorClass: 17,
    maxHP: 36,
    currentHP: 36,
    proficiencyBonus: 2,
    abilities: { ...char.abilities, strength: 19, dexterity: 16, constitution: 14 },
    skillProficiencies: { ...char.skillProficiencies, athletics: true },
    weaponMasteries: ['Greatsword', 'Longbow', 'Handaxe'],
    classFeatures: {
      ...char.classFeatures,
      features: { SecondWind: [true], ActionSurge: [false] }
    }
  }));
});

it('Athletics uses Champion Advantage and Stealth uses armor Disadvantage', async () => {
  const roll = vi.fn();
  const { container } = render(Skills, { events: { roll } });
  const athletics = container.querySelector('#athletics')?.closest('.skill-row');
  const stealth = container.querySelector('#stealth')?.closest('.skill-row');
  expect(athletics?.textContent).toContain('+6');
  expect(athletics?.textContent).toContain('Advantage');
  await fireEvent.click(athletics!.querySelector('button')!);
  expect(roll.mock.calls[0][0].detail).toMatchObject({
    notation: '1d20+6',
    advantage: true,
    disadvantage: false
  });
  expect(stealth?.textContent).toContain('Disadvantage');
  await fireEvent.click(stealth!.querySelector('button')!);
  expect(roll.mock.calls[1][0].detail).toMatchObject({
    notation: '1d20+3',
    advantage: false,
    disadvantage: true
  });
});

it('Initiative remains +3 and rolls with Champion Advantage', async () => {
  const rollInitiative = vi.fn();
  const { getByRole } = render(CombatStats, { events: { rollInitiative } });
  await fireEvent.click(getByRole('button', { name: /roll initiative/i }));
  expect(rollInitiative.mock.calls[0][0].detail).toMatchObject({
    notation: '1d20+3',
    advantage: true
  });
  expect(get(character).armorClass).toBe(17);
});

it('Goliath displays and spends ancestry uses but hides Large Form at level 4', async () => {
  const { getByRole, getByText, queryByText } = render(RacialTraits);
  await waitFor(() => expect(getByText(/2\/2 uses/)).toBeTruthy());
  expect(queryByText('Large Form:')).toBeNull();
  expect(getByText('Origin Feat: Musician')).toBeTruthy();
  await fireEvent.click(getByRole('button', { name: "Use Hill's Tumble" }));
  expect(get(character).racialTraits?.uses.GiantAncestry.currentUses).toBe(1);
  expect(get(turnTracker).bonusAction).toBe(false);
});

it('Class Features preserves spent Second Wind uses when it resizes the tracker', async () => {
  const roll = vi.fn();
  const { getByRole, getByText, getByLabelText } = render(ClassFeatures, { events: { roll } });
  await waitFor(() =>
    expect(get(character).classFeatures.features.SecondWind).toEqual([true, false, false])
  );
  expect(getByText('Remarkable Athlete')).toBeTruthy();
  expect(getByText('Tactical Mind')).toBeTruthy();
  expect(getByText('3/4 weapon types selected.')).toBeTruthy();
  expect(
    (getByLabelText('Mastered weapon types (one per line)') as HTMLTextAreaElement).value
  ).toContain('Greatsword');
  await fireEvent.click(getByRole('button', { name: 'Use Second Wind (1d10+4)' }));
  expect(roll.mock.calls[0][0].detail).toMatchObject({ notation: '1d10+4', secondWind: true });
});

it('Tactical Mind shares Second Wind uses without healing or spending a Bonus Action', async () => {
  const { getByRole } = render(ClassFeatures);
  const spend = getByRole('button', { name: 'Check succeeded: spend one Second Wind use' });
  await fireEvent.click(spend);
  await fireEvent.click(spend);
  expect(get(character).classFeatures.features.SecondWind).toEqual([true, true, true]);
  expect(get(character).currentHP).toBe(36);
  expect(get(turnTracker).bonusAction).toBe(false);
  expect((spend as HTMLButtonElement).disabled).toBe(true);
  expect(
    (getByRole('button', { name: 'Roll Tactical Mind (1d10)' }) as HTMLButtonElement).disabled
  ).toBe(true);
});

it('Weapon Mastery rejects more choices than the Fighter level allows', async () => {
  const { getByLabelText } = render(ClassFeatures);
  const choices = getByLabelText('Mastered weapon types (one per line)') as HTMLTextAreaElement;
  await fireEvent.change(choices, {
    target: { value: 'Greatsword\nLongbow\nHandaxe\nMaul\nPike' }
  });
  expect(get(character).weaponMasteries).toEqual(['Greatsword', 'Longbow', 'Handaxe']);
  expect(choices.value).toBe('Greatsword\nLongbow\nHandaxe');
});

it('Large Form appears at level 5 and uses its own resource and a Bonus Action', async () => {
  character.update((char) => ({ ...char, level: 5, proficiencyBonus: 3 }));
  const { getByRole } = render(RacialTraits);
  await fireEvent.click(getByRole('button', { name: 'Use Large Form' }));
  expect(get(character).racialTraits?.uses.LargeForm.currentUses).toBe(0);
  expect(get(character).racialTraits?.uses.GiantAncestry.currentUses).toBe(3);
  expect(get(turnTracker).bonusAction).toBe(true);
});
