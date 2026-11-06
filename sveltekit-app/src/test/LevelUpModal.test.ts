import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import type { Feat } from '../lib/dndData';
import catalog from '../../static/data/feats.json';
import { character, resetCharacter } from '../lib/stores';
import LevelUpModal from '../lib/components/LevelUpModal.svelte';

vi.mock('$lib/dndData', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/dndData')>()),
  loadFeats: async () => catalog as Feat[]
}));

beforeEach(() => {
  resetCharacter();
  character.update((char) => ({
    ...char,
    class: 'fighter',
    subclass: 'champion',
    level: 3,
    maxHP: 30,
    currentHP: 30,
    abilities: { ...char.abilities, strength: 18, constitution: 14 }
  }));
});

async function selectOption(element: HTMLElement, value: string) {
  const select = element as HTMLSelectElement;
  // happy-dom does not match selected options with Svelte's :checked selector.
  const querySelector = select.querySelector.bind(select);
  const query = vi.spyOn(select, 'querySelector').mockImplementation((selector) => {
    return selector === ':checked'
      ? (Array.from(select.options).find((option) => option.selected) ?? null)
      : querySelector(selector);
  });
  select.value = value;
  await fireEvent.change(select);
  query.mockRestore();
}

it('previews and applies the fixed Strength increase when Great Weapon Master is selected', async () => {
  const { getByLabelText, getByRole, getByText } = render(LevelUpModal, { isOpen: true });
  await selectOption(getByLabelText('Choose your improvement'), 'feat');
  await waitFor(() => expect(getByRole('option', { name: 'Great Weapon Master' })).toBeTruthy());
  await selectOption(getByLabelText('Feat', { exact: true }), 'great-weapon-master');

  const strength = getByLabelText('strength (18 → 19)') as HTMLInputElement;
  expect(strength.value).toBe('1');
  expect(strength.disabled).toBe(true);
  expect(getByText(/Applied automatically:/).textContent).toContain('Hew');
  await selectOption(getByLabelText('Feat', { exact: true }), 'great-weapon-master');
  expect(strength.value).toBe('1');
  const confirm = getByRole('button', { name: 'Confirm Level Up' }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  await fireEvent.click(
    getByLabelText('I have checked the prerequisites and any manual effects with my DM.')
  );
  expect(confirm.disabled).toBe(false);
  await fireEvent.click(confirm);

  expect(get(character).level).toBe(4);
  expect(get(character).abilities.strength).toBe(19);
  expect(get(character).advancements?.[4].choices.abilityIncreases).toEqual({ strength: 1 });
});

it.each([19, 20])('respects the ability cap when Strength starts at %i', async (strength) => {
  character.update((char) => ({
    ...char,
    abilities: { ...char.abilities, strength }
  }));
  const { getByLabelText, getByRole } = render(LevelUpModal, { isOpen: true });
  await selectOption(getByLabelText('Choose your improvement'), 'feat');
  await waitFor(() => expect(getByRole('option', { name: 'Great Weapon Master' })).toBeTruthy());
  await selectOption(getByLabelText('Feat', { exact: true }), 'great-weapon-master');

  const input = getByLabelText(`strength (${strength} → 20)`) as HTMLInputElement;
  expect(input.value).toBe(String(20 - strength));
  expect(input.disabled).toBe(true);
  await fireEvent.click(
    getByLabelText('I have checked the prerequisites and any manual effects with my DM.')
  );
  const confirm = getByRole('button', { name: 'Confirm Level Up' }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(false);
  await fireEvent.click(confirm);
  expect(get(character).level).toBe(4);
  expect(get(character).abilities.strength).toBe(20);
});

it('clears fixed increases for other feats and allows manual ASI allocation', async () => {
  const { getByLabelText, getByRole } = render(LevelUpModal, { isOpen: true });
  const improvement = getByLabelText('Choose your improvement');
  await selectOption(improvement, 'feat');
  await waitFor(() => expect(getByRole('option', { name: 'Great Weapon Master' })).toBeTruthy());
  const feat = getByLabelText('Feat', { exact: true });
  await selectOption(feat, 'great-weapon-master');
  await selectOption(feat, 'great-weapon-fighting');
  expect((getByLabelText('strength (18 → 18)') as HTMLInputElement).value).toBe('0');
  await fireEvent.click(
    getByLabelText('I have checked the prerequisites and any manual effects with my DM.')
  );
  const confirm = getByRole('button', { name: 'Confirm Level Up' }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(false);

  await selectOption(feat, 'great-weapon-master');
  expect((getByLabelText('strength (18 → 19)') as HTMLInputElement).value).toBe('1');
  expect(confirm.disabled).toBe(true);
  await selectOption(improvement, 'asi');
  const strength = getByLabelText('strength (18 → 18)') as HTMLInputElement;
  expect(strength.disabled).toBe(false);
  await fireEvent.input(strength, { target: { value: '2' } });
  expect(getByLabelText('strength (18 → 20)')).toBeTruthy();
  expect(confirm.disabled).toBe(false);
  await fireEvent.click(confirm);
  expect(get(character).abilities.strength).toBe(20);
  expect(get(character).advancements?.[4].choices.improvement).toBe('asi');
});

it('preserves manual ability increases for custom feats', async () => {
  const { getByLabelText, getByRole } = render(LevelUpModal, { isOpen: true });
  await selectOption(getByLabelText('Choose your improvement'), 'feat');
  await selectOption(getByLabelText('Feat source'), 'custom');
  await selectOption(getByLabelText('Feat', { exact: true }), 'custom');
  await fireEvent.input(getByLabelText('Feat name'), { target: { value: 'Custom training' } });
  await fireEvent.input(getByLabelText('strength (18 → 18)'), { target: { value: '1' } });
  expect(getByLabelText('strength (18 → 19)')).toBeTruthy();
  await fireEvent.click(
    getByLabelText('I have checked the prerequisites and any manual effects with my DM.')
  );
  const confirm = getByRole('button', { name: 'Confirm Level Up' }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(false);
  await fireEvent.click(confirm);
  expect(get(character).abilities.strength).toBe(19);
  expect(get(character).advancements?.[4].choices.feat?.name).toBe('Custom training');
});
