import { getAdvancementFeats } from './featUtils';
import type { Attack, Character, FeatEffect } from './types';

const HEAVY_WEAPONS = [
  'glaive',
  'greataxe',
  'greatsword',
  'halberd',
  'heavy crossbow',
  'lance',
  'longbow',
  'maul',
  'musket',
  'pike'
];
const RANGED_WEAPONS = ['heavy crossbow', 'longbow', 'musket'];

function matchesWeapon(name: string, weapons: string[]): boolean {
  const lower = name.toLowerCase();
  return weapons.some((weapon) => new RegExp(`\\b${weapon}\\b`).test(lower));
}

// Explicit settings on the attack win; otherwise common weapon names are recognised.
export function isHeavyWeapon(
  attack: Partial<Pick<Attack, 'name' | 'spellRef' | 'heavy' | 'weaponProperties'>>
): boolean {
  if (attack.spellRef) return false;
  if (attack.heavy !== undefined) return attack.heavy;
  if (attack.weaponProperties) return attack.weaponProperties.includes('heavy');
  return matchesWeapon(attack.name ?? '', HEAVY_WEAPONS);
}

export function isMeleeWeapon(
  attack: Partial<Pick<Attack, 'name' | 'spellRef' | 'weaponType'>>
): boolean {
  if (attack.spellRef) return false;
  if (attack.weaponType) return attack.weaponType === 'melee';
  return !matchesWeapon(attack.name ?? '', RANGED_WEAPONS);
}

export function getFeatEffects(char: Pick<Character, 'advancements'>): FeatEffect[] {
  return getAdvancementFeats(char).flatMap((feat) => feat.effects ?? []);
}

export function hasFeatEffect(
  char: Pick<Character, 'advancements'>,
  type: FeatEffect['type']
): boolean {
  return getFeatEffects(char).some((effect) => effect.type === type);
}

// 2024 Great Weapon Master: add proficiency bonus to damage when a Heavy weapon hits as part of
// the Attack action. Bonus-action attacks (Hew), opportunity attacks, etc. do not qualify.
export function getHeavyWeaponMasteryBonus(
  char: Character,
  attack: Attack,
  context: { attackAction: boolean }
): number {
  if (!context.attackAction || !isHeavyWeapon(attack)) return 0;
  if (!hasFeatEffect(char, 'heavyWeaponMasteryDamage')) return 0;
  return Math.max(0, char.proficiencyBonus || 0);
}

export function canMakeHewAttack(char: Character, attack: Attack): boolean {
  return isMeleeWeapon(attack) && hasFeatEffect(char, 'hewBonusAttack');
}

// Champion's Improved (level 3) and Superior (level 15) Critical apply to weapon attacks.
export function getCriticalThreshold(char: Character, attack?: Attack): number {
  if (attack?.spellRef) return 20;
  if (char.class?.toLowerCase() !== 'fighter' || char.subclass?.toLowerCase() !== 'champion') {
    return 20;
  }
  if (char.level >= 15) return 18;
  return char.level >= 3 ? 19 : 20;
}

export function addFlatDamage(notation: string, amount: number): string {
  if (!amount) return notation;
  const match = notation.match(/^(\s*\d+d\d+)\s*([+-]\s*\d+)?(?!\d*d)/i);
  if (!match) return `${notation}${amount > 0 ? '+' : ''}${amount}`;
  const existing = match[2] ? parseInt(match[2].replace(/\s+/g, '')) : 0;
  const total = existing + amount;
  const modifier = total === 0 ? '' : `${total > 0 ? '+' : ''}${total}`;
  return `${match[1]}${modifier}${notation.slice(match[0].length)}`;
}
