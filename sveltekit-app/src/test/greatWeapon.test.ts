import { describe, it, expect } from 'vitest';
import {
  heavyWeaponMasteryBonus,
  addFlatDamage,
  doubleDice,
  applyMinimumDieResult,
  firstDiceCount,
  qualifiesForGreatWeaponFighting,
  contextBlockedReason
} from '../lib/greatWeapon';

const char = {
  proficiencyBonus: 2,
  features: 'Great Weapon Fighting, Great Weapon Master'
};
const greatsword = { damage: '2d6+4', twoHanded: true, heavy: true };

function damage(context: 'attackAction' | 'opportunity' | 'hew', crit: boolean, c = char) {
  const stored = greatsword.damage;
  const withBonus = addFlatDamage(stored, heavyWeaponMasteryBonus(c, greatsword, context));
  return crit ? doubleDice(withBonus) : withBonus;
}

describe('Greatsword damage', () => {
  it('matches expected scenarios', () => {
    expect(damage('attackAction', false)).toBe('2d6+6');
    expect(damage('opportunity', false)).toBe('2d6+4');
    expect(damage('attackAction', true)).toBe('4d6+6');
    expect(damage('opportunity', true)).toBe('4d6+4');
    expect(damage('hew', false)).toBe('2d6+4');
  });

  it('does not mutate stored damage and scales with proficiency', () => {
    expect(greatsword.damage).toBe('2d6+4');
    expect(damage('attackAction', false, { ...char, proficiencyBonus: 3 })).toBe('2d6+7');
  });

  it('requires the Great Weapon Master feat separately from GWF', () => {
    expect(damage('attackAction', false, { ...char, features: 'Great Weapon Fighting' })).toBe(
      '2d6+4'
    );
    expect(qualifiesForGreatWeaponFighting({ features: 'Great Weapon Master' }, greatsword)).toBe(
      false
    );
    expect(qualifiesForGreatWeaponFighting(char, greatsword)).toBe(true);
  });

  it('applies GWF minimum of 3 without rerolls, including crit dice', () => {
    expect(applyMinimumDieResult([1, 5], firstDiceCount('2d6+4'))).toEqual({
      rolls: [3, 5],
      adjustment: 2
    });
    expect(applyMinimumDieResult([1, 2, 6, 2], firstDiceCount('4d6+6')).rolls).toEqual([
      3, 3, 6, 3
    ]);
  });

  it('enforces action economy for Hew and opportunity attacks', () => {
    const used = { action: false, bonusAction: true, reaction: true };
    expect(contextBlockedReason('hew', used)).toBeTruthy();
    expect(contextBlockedReason('opportunity', used)).toBeTruthy();
    expect(contextBlockedReason('attackAction', used)).toBeNull();
  });
});
