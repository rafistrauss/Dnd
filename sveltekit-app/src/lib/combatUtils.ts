import type { Character, Abilities } from './types';
import { getClassConfig } from './classConfig';

/**
 * Calculate ability modifier from ability score
 */
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Calculate Armor Class based on armor type, dexterity, and bonuses
 */
export function calculateAC(char: Character, abilities: Abilities): number {
  const dexMod = calculateModifier(abilities.dexterity);
  let ac = 10; // Base unarmored AC

  // Apply armor type
  if (char.armorType === 'none') {
    // Unarmored: 10 + DEX
    ac = 10 + dexMod;
  } else if (char.armorType === 'light') {
    // Light armor: base + full DEX (e.g., Leather = 11 + DEX)
    ac = (char.baseArmorAC || 11) + dexMod;
  } else if (char.armorType === 'medium') {
    // Medium armor: base + DEX (max +2) (e.g., Scale Mail = 14 + DEX max 2)
    ac = (char.baseArmorAC || 14) + Math.min(2, dexMod);
  } else if (char.armorType === 'heavy') {
    // Heavy armor: base only, no DEX (e.g., Plate = 18)
    ac = char.baseArmorAC || 18;
  }

  // Add shield (+2)
  if (char.shieldEquipped) {
    ac += 2;
  }

  // Add other bonuses (magical items, features, etc.)
  if (char.acBonuses) {
    ac += char.acBonuses;
  }

  return ac;
}

/**
 * Calculate Initiative bonus (DEX modifier + bonuses)
 */
export function calculateInitiative(abilities: Abilities): number {
  return calculateModifier(abilities.dexterity);
}

/**
 * Calculate maximum HP based on class, level, constitution, and rolls
 * For level 1: max hit die + CON mod
 * For levels 2+: either use average or rolled values
 */
export function calculateMaxHP(char: Character, abilities: Abilities): number {
  if (!char.class || char.level < 1) return 0;

  const classConfig = getClassConfig(char.class);
  if (!classConfig) return 0;

  const conMod = calculateModifier(abilities.constitution);

  // Parse hit die (e.g., "d10" -> 10)
  const hitDieSize = parseInt(classConfig.hitDice.substring(1));

  // Level 1: max hit die + CON mod
  let hp = hitDieSize + conMod;

  // Levels 2+
  if (char.level > 1) {
    if (char.hpRolls && char.hpRolls.length > 0) {
      // Use stored rolls for levels 2+
      // hpRolls[0] should be for level 2, hpRolls[1] for level 3, etc.
      for (let i = 0; i < Math.min(char.hpRolls.length, char.level - 1); i++) {
        hp += char.hpRolls[i] + conMod;
      }

      // If we don't have enough rolls, use average for remaining levels
      const rollsNeeded = char.level - 1;
      if (char.hpRolls.length < rollsNeeded) {
        const avgPerLevel = Math.floor(hitDieSize / 2) + 1; // Average of hit die
        const missingLevels = rollsNeeded - char.hpRolls.length;
        hp += missingLevels * (avgPerLevel + conMod);
      }
    } else {
      // No rolls stored, use average
      const avgPerLevel = Math.floor(hitDieSize / 2) + 1; // Average of hit die
      hp += (char.level - 1) * (avgPerLevel + conMod);
    }
  }

  return Math.max(1, hp); // Minimum 1 HP
}

/**
 * Get the average HP increase per level
 */
export function getAverageHPPerLevel(char: Character, abilities: Abilities): number {
  if (!char.class) return 0;

  const classConfig = getClassConfig(char.class);
  if (!classConfig) return 0;

  const hitDieSize = parseInt(classConfig.hitDice.substring(1));
  const conMod = calculateModifier(abilities.constitution);
  const avgPerLevel = Math.floor(hitDieSize / 2) + 1;

  return avgPerLevel + conMod;
}

/**
 * Roll HP for a level increase
 */
export function rollHPForLevel(hitDice: string): number {
  const dieSize = parseInt(hitDice.substring(1));
  return Math.floor(Math.random() * dieSize) + 1;
}

/**
 * Calculate Spell Save DC: 8 + proficiency bonus + spellcasting ability modifier
 */
export function getSpellSaveDC(char: Character, abilities: Abilities): number | null {
  if (!char.class) return null;
  const classConfig = getClassConfig(char.class);
  if (!classConfig || !classConfig.spellcaster || !classConfig.spellcastingAbility) return null;
  const spellcastingMod = calculateModifier(abilities[classConfig.spellcastingAbility]);
  return 8 + char.proficiencyBonus + spellcastingMod;
}

/**
 * Get spellcasting ability modifier for a character
 */
export function getSpellcastingModifier(char: Character, abilities: Abilities): number {
  if (!char.class) return 0;
  const classConfig = getClassConfig(char.class);
  if (!classConfig || !classConfig.spellcaster || !classConfig.spellcastingAbility) return 0;
  return calculateModifier(abilities[classConfig.spellcastingAbility]);
}

import { getArmorByName } from './armorData';

/**
 * Generate AC breakdown tooltip text
 */
export function getACBreakdown(char: Character, abilities: Abilities): string {
  const parts: string[] = [];
  const dexMod = calculateModifier(abilities.dexterity);
  const armor = char.armorName ? getArmorByName(char.armorName) : undefined;

  if (armor) {
    if (armor.type === 'none') {
      parts.push('Unarmored');
      parts.push(`Base: 10`);
      parts.push(`Dexterity: ${dexMod >= 0 ? '+' : ''}${dexMod}`);
    } else if (armor.type === 'light') {
      parts.push(`${armor.name}: ${armor.baseAC}`);
      parts.push(`Dexterity: ${dexMod >= 0 ? '+' : ''}${dexMod}`);
    } else if (armor.type === 'medium') {
      const effectiveDex = Math.min(2, dexMod);
      parts.push(`${armor.name}: ${armor.baseAC}`);
      parts.push(`Dexterity: ${effectiveDex >= 0 ? '+' : ''}${effectiveDex} (max +2)`);
    } else if (armor.type === 'heavy') {
      parts.push(`${armor.name}: ${armor.baseAC}`);
      parts.push('Dexterity: +0 (heavy armor)');
    }

    if (char.shieldEquipped) {
      parts.push('Shield: +2');
    }
  } else {
    // Fallback if no armor specified
    parts.push('Base: 10');

    if (dexMod !== 0) {
      parts.push(`Dexterity: ${dexMod >= 0 ? '+' : ''}${dexMod}`);
    }

    const basePlusDex = 10 + dexMod;
    const difference = char.armorClass - basePlusDex;

    if (difference !== 0) {
      parts.push(`Other: ${difference >= 0 ? '+' : ''}${difference}`);
    }
  }

  // Add spell effects and other active states that affect AC
  if (char.activeStates && char.activeStates.length > 0) {
    char.activeStates.forEach((state) => {
      if (
        typeof state.acBonus === 'number' &&
        state.acBonus !== 0 &&
        (!state.target || state.target === 'self')
      ) {
        parts.push(`${state.name}: ${state.acBonus >= 0 ? '+' : ''}${state.acBonus}`);
      }
    });
  }

  return parts.join('\n');
}

/**
 * Generate Initiative breakdown tooltip text
 */
export function getInitiativeBreakdown(char: Character, abilities: Abilities): string {
  const parts: string[] = [];
  const dexMod = calculateModifier(abilities.dexterity);

  // Base initiative is just dexterity modifier
  parts.push(`Dexterity: ${dexMod >= 0 ? '+' : ''}${dexMod}`);

  // Calculate the difference between stored initiative and dex mod
  const difference = char.initiative - dexMod;

  if (difference !== 0) {
    parts.push(`Other Bonuses: ${difference >= 0 ? '+' : ''}${difference}`);
  }

  return parts.join('\n');
}

/**
 * Generate Spell Save DC breakdown tooltip text
 */
export function getSpellSaveDCBreakdown(char: Character, abilities: Abilities): string {
  if (!char.class) return '';
  const classConfig = getClassConfig(char.class);
  if (!classConfig || !classConfig.spellcaster || !classConfig.spellcastingAbility) return '';

  const parts: string[] = [];
  const spellcastingMod = calculateModifier(abilities[classConfig.spellcastingAbility]);
  const abilityName =
    classConfig.spellcastingAbility.charAt(0).toUpperCase() +
    classConfig.spellcastingAbility.slice(1);

  parts.push('Base: 8');
  parts.push(`Proficiency: +${char.proficiencyBonus}`);
  parts.push(`${abilityName}: ${spellcastingMod >= 0 ? '+' : ''}${spellcastingMod}`);

  return parts.join('\n');
}

/**
 * Calculate damage after applying resistances and immunities
 */
export function calculateDamage(
  damageAmount: number,
  damageType: string,
  char: Character
): { finalDamage: number; adjustments: string[] } {
  const adjustments: string[] = [];
  let finalDamage = damageAmount;

  // Normalize damage type for comparison (lowercase)
  const normalizedType = damageType.toLowerCase().trim();

  // Check immunities first
  if (char.activeStates) {
    for (const state of char.activeStates) {
      if (state.immunities && state.immunities.length > 0) {
        const isImmune = state.immunities.some(
          (immunity) => immunity.toLowerCase().trim() === normalizedType
        );
        if (isImmune) {
          adjustments.push(`Immune to ${damageType} (${state.name})`);
          return { finalDamage: 0, adjustments };
        }
      }
    }
  }

  // Check resistances (D&D 5e: resistance halves damage, rounded down)
  if (char.activeStates) {
    for (const state of char.activeStates) {
      if (state.resistances && state.resistances.length > 0) {
        const isResistant = state.resistances.some(
          (resistance) => resistance.toLowerCase().trim() === normalizedType
        );
        if (isResistant) {
          const reducedAmount = Math.floor(finalDamage / 2);
          adjustments.push(
            `Resistant to ${damageType} (${state.name}): ${finalDamage} → ${reducedAmount}`
          );
          finalDamage = reducedAmount;
          break; // Resistance only applies once
        }
      }
    }
  }

  if (adjustments.length === 0) {
    adjustments.push(`No adjustments for ${damageType}`);
  }

  return { finalDamage, adjustments };
}

/**
 * Apply damage to character HP
 */
export function applyDamage(char: Character, damage: number): Character {
  const updatedChar = { ...char };

  // Apply to temp HP first
  if (updatedChar.tempHP > 0) {
    if (damage <= updatedChar.tempHP) {
      updatedChar.tempHP -= damage;
      return updatedChar;
    } else {
      damage -= updatedChar.tempHP;
      updatedChar.tempHP = 0;
    }
  }

  // Apply remaining damage to current HP
  updatedChar.currentHP = Math.max(0, updatedChar.currentHP - damage);

  return updatedChar;
}
