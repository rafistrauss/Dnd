// Great Weapon Fighting, Great Weapon Master (Heavy Weapon Mastery / Hew) and critical-hit helpers (2024 rules)

import { getAdvancementFeats } from './featUtils';
import { hasFeatEffect, isHeavyWeapon, isMeleeWeapon } from './featMechanics';
import type { Attack, Character } from './types';

export { addFlatDamage } from './featMechanics';

export type AttackContext = 'attackAction' | 'opportunity' | 'hew' | 'other';

export const ATTACK_CONTEXTS: Array<{ value: AttackContext; label: string }> = [
  { value: 'attackAction', label: 'Attack action' },
  { value: 'opportunity', label: 'Opportunity Attack (Reaction)' },
  { value: 'hew', label: 'Hew (Bonus Action)' },
  { value: 'other', label: 'Other' }
];

interface FeatSource extends Pick<Character, 'advancements' | 'ruleset'> {
  features?: string;
  greatWeaponFighting?: boolean;
  greatWeaponMaster?: boolean;
}

export function hasGreatWeaponFighting(char: FeatSource): boolean {
  return !!char.greatWeaponFighting || /\bgreat weapon fighting\b/i.test(char.features || '');
}

export function hasGreatWeaponMaster(char: FeatSource): boolean {
  return (
    hasFeatEffect(char, 'hewBonusAttack') ||
    !!char.greatWeaponMaster ||
    /\bgreat weapon master\b/i.test(char.features || '')
  );
}

/** GWF: melee weapon held in two hands with the Two-Handed or Versatile property. */
export function qualifiesForGreatWeaponFighting(
  char: FeatSource,
  attack: Partial<Pick<Attack, 'twoHanded' | 'versatile' | 'spellRef' | 'weaponType' | 'name'>>
): boolean {
  return isMeleeWeapon(attack) && hasGreatWeaponFighting(char) && !!attack.twoHanded;
}

/** Heavy Weapon Mastery: Heavy weapon hit made as part of the Attack action. */
export function heavyWeaponMasteryBonus(
  char: FeatSource & { proficiencyBonus?: number },
  attack: Partial<Pick<Attack, 'name' | 'heavy' | 'spellRef' | 'weaponProperties'>>,
  context: AttackContext
): number {
  if (!isHeavyWeapon(attack) || context !== 'attackAction') return 0;
  const recordedMaster = getAdvancementFeats(char).some(
    (feat) => feat.name === 'Great Weapon Master'
  );
  if (recordedMaster) {
    if (!hasFeatEffect(char, 'heavyWeaponMasteryDamage')) return 0;
  } else if (char.ruleset === '2014' || !hasGreatWeaponMaster(char)) {
    return 0;
  }
  return Math.max(0, char.proficiencyBonus || 0);
}

/** Doubles dice counts only; flat modifiers are untouched. */
export function doubleDice(notation: string): string {
  return notation.replace(/(\d+)d(\d+)/gi, (_m, count, sides) => `${parseInt(count) * 2}d${sides}`);
}

/** Number of dice in the first dice term of a notation. */
export function firstDiceCount(notation: string): number {
  const m = notation.replace(/\s+/g, '').match(/(?:^|[+(\-])(\d*)d\d+/i);
  return m ? parseInt(m[1] || '1') : 0;
}

/** Treat die results below the minimum as the minimum (GWF: 1 or 2 -> 3); no rerolls. */
export function applyMinimumDieResult(
  rolls: number[],
  diceCount: number,
  minimum = 3
): { rolls: number[]; adjustment: number } {
  const out = [...rolls];
  let adjustment = 0;
  for (let i = 0; i < diceCount && i < out.length; i++) {
    if (out[i] < minimum) {
      adjustment += minimum - out[i];
      out[i] = minimum;
    }
  }
  return { rolls: out, adjustment };
}

export interface TurnSlots {
  action: boolean;
  bonusAction: boolean;
  reaction: boolean;
}

/** Action-economy slot an attack in the given context uses, if any. */
export function slotForContext(context: AttackContext): keyof TurnSlots | null {
  if (context === 'hew') return 'bonusAction';
  if (context === 'opportunity') return 'reaction';
  if (context === 'attackAction') return 'action';
  return null;
}

/** Hew needs an unused Bonus Action; Opportunity Attacks need an unused Reaction. */
export function contextBlockedReason(context: AttackContext, turn: TurnSlots): string | null {
  if (context === 'hew' && turn.bonusAction) return 'Bonus Action already used this turn (Hew)';
  if (context === 'opportunity' && turn.reaction) return 'Reaction already used';
  return null;
}
