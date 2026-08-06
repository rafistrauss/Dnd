// Armor data for D&D 5e
export interface ArmorInfo {
  name: string;
  type: 'light' | 'medium' | 'heavy' | 'none';
  baseAC: number;
  maxDexBonus?: number; // undefined = unlimited
}

export const ARMOR_LIST: ArmorInfo[] = [
  // No armor
  { name: 'Unarmored', type: 'none', baseAC: 10 },

  // Light Armor (full DEX bonus)
  { name: 'Padded', type: 'light', baseAC: 11 },
  { name: 'Leather', type: 'light', baseAC: 11 },
  { name: 'Studded Leather', type: 'light', baseAC: 12 },

  // Medium Armor (max +2 DEX)
  { name: 'Hide', type: 'medium', baseAC: 12, maxDexBonus: 2 },
  { name: 'Chain Shirt', type: 'medium', baseAC: 13, maxDexBonus: 2 },
  { name: 'Scale Mail', type: 'medium', baseAC: 14, maxDexBonus: 2 },
  { name: 'Breastplate', type: 'medium', baseAC: 14, maxDexBonus: 2 },
  { name: 'Half Plate', type: 'medium', baseAC: 15, maxDexBonus: 2 },

  // Heavy Armor (no DEX bonus)
  { name: 'Ring Mail', type: 'heavy', baseAC: 14, maxDexBonus: 0 },
  { name: 'Chain Mail', type: 'heavy', baseAC: 16, maxDexBonus: 0 },
  { name: 'Splint', type: 'heavy', baseAC: 17, maxDexBonus: 0 },
  { name: 'Plate', type: 'heavy', baseAC: 18, maxDexBonus: 0 }
];

export function getArmorByName(name: string): ArmorInfo | undefined {
  return ARMOR_LIST.find((a) => a.name === name);
}

export function calculateArmorClass(
  armorName: string | undefined,
  dexModifier: number,
  hasShield: boolean
): number {
  if (!armorName) {
    // Unarmored: 10 + DEX
    return 10 + dexModifier + (hasShield ? 2 : 0);
  }

  const armor = getArmorByName(armorName);
  if (!armor) {
    return 10 + dexModifier + (hasShield ? 2 : 0);
  }

  let ac = armor.baseAC;

  // Apply DEX bonus based on armor type
  if (armor.maxDexBonus === undefined) {
    // Unlimited DEX bonus (light armor, unarmored)
    ac += dexModifier;
  } else if (armor.maxDexBonus > 0) {
    // Limited DEX bonus (medium armor)
    ac += Math.min(dexModifier, armor.maxDexBonus);
  }
  // Heavy armor: no DEX bonus (maxDexBonus === 0)

  // Add shield bonus
  if (hasShield) {
    ac += 2;
  }

  return ac;
}
