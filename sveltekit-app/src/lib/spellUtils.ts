import type { Spell, SpellState } from './types';

/**
 * Parse saving throw information from a spell's description
 * @param spell The spell to analyze
 * @returns Object with ability, halfDamageOnSave, and noDamageOnSave, or null if no saving throw
 */
export function getSavingThrowInfo(
  spell: Spell
): { ability: string; halfDamageOnSave: boolean; noDamageOnSave: boolean } | null {
  const description = spell.description;

  // Pattern to detect saving throws: "Strength saving throw", "Dexterity saving throw", etc.
  const savingThrowPattern =
    /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving\s+throw/i;
  const match = description.match(savingThrowPattern);

  if (!match) {
    return null;
  }

  const ability = match[1].toLowerCase();

  // Check if the spell does half damage on a successful save
  const halfDamagePattern = /half\s+(?:as\s+much\s+)?damage\s+on\s+a\s+successful(?:\s+save)?/i;
  const halfDamageOnSave = halfDamagePattern.test(description);

  // Check if the spell does no damage on a successful save (pattern: "or take damage")
  // This pattern indicates the target only takes damage if they fail the save
  const noDamagePattern = /saving\s+throw\s+or\s+take.*?damage/i;
  const noDamageOnSave = noDamagePattern.test(description) && !halfDamageOnSave;

  return {
    ability,
    halfDamageOnSave,
    noDamageOnSave
  };
}

/**
 * Check if a spell adds the spellcasting ability modifier to damage
 * Examples: "1d8 plus your spellcasting ability modifier", "add your spellcasting ability modifier"
 * @param spell The spell to analyze
 * @returns true if the spell adds spellcasting modifier to damage
 */
export function addsSpellcastingModifierToDamage(spell: Spell): boolean {
  const description = spell.description;
  // Pattern to detect various forms of adding spellcasting modifier
  const modifierPattern = /(plus|add)\s+your\s+spellcasting\s+(ability\s+)?modifier/i;
  return modifierPattern.test(description);
}

/**
 * Check if a spell requires a spell attack roll (ranged or melee)
 * @param spell The spell to analyze
 * @returns true if the spell requires an attack roll
 */
export function requiresSpellAttackRoll(spell: Spell): boolean {
  const description = spell.description.toLowerCase();
  return description.includes('ranged spell attack') || description.includes('melee spell attack');
}

/**
 * Check if a spell is a buff spell (provides bonuses but doesn't deal damage directly)
 * @param spell The spell to analyze
 * @returns true if the spell is a buff spell
 */
export function isBuffSpell(spell: Spell): boolean {
  const description = spell.description.toLowerCase();

  // Specific spells that are always buff/utility spells
  const buffSpellNames = ['Divine Favor', 'Bless', 'Aid', 'Command'];
  if (buffSpellNames.includes(spell.name)) {
    return true;
  }

  // Check for damage-dealing keywords that indicate it's NOT a buff spell
  const damageKeywords = [
    'takes',
    'take',
    'deals',
    'deal',
    'damage equal to',
    'force damage',
    'fire damage',
    'cold damage',
    'lightning damage',
    'thunder damage',
    'acid damage',
    'poison damage',
    'necrotic damage',
    'radiant damage',
    'psychic damage',
    'regain',
    'regains',
    'hit point' // healing spells
  ];

  const hasDamageKeyword = damageKeywords.some((keyword) => description.includes(keyword));

  // Check for buff keywords
  const buffKeywords = [
    'bonus to attack',
    'bonus to damage',
    'bonus to ac',
    'gains a +',
    'gain a +',
    '+1 bonus',
    '+2 bonus',
    '+3 bonus',
    'advantage on',
    'becomes a magic weapon'
  ];

  const hasBuffKeyword = buffKeywords.some((keyword) => description.includes(keyword));

  // It's a buff spell if it has buff keywords but no damage keywords
  return hasBuffKeyword && !hasDamageKeyword;
}

/**
 * Extract spell effect bonuses from a spell description
 * @param spell The spell to analyze
 * @returns SpellState object with extracted bonuses, or null if no bonuses found
 */
export function extractSpellEffectBonuses(
  spell: Spell
): SpellState | null {
  const description = spell.description;
  let attackBonus: number | string = 0;
  let damageBonus: number | string = 0;
  let acBonus = 0;
  let effectDescription = '';


  // Magic Weapon: "+1 bonus to attack rolls and damage rolls" or "+2 bonus" or "+3 bonus"
  const magicWeaponMatch = description.match(
    /\+(\d+)\s+bonus\s+to\s+attack\s+rolls\s+and\s+damage\s+rolls/i
  );
  if (magicWeaponMatch) {
    const bonus = parseInt(magicWeaponMatch[1]);
    attackBonus = bonus;
    damageBonus = bonus;
    effectDescription = `+${bonus} to attack and damage rolls`;
  }

  // Bless: "adds 1d4 to the attack roll"
  if (spell.name === 'Bless') {
    effectDescription = 'Add 1d4 to attack rolls and saves';
    attackBonus = '1d4';
  }

  // Aid: increases HP maximum and current HP
  if (spell.name === 'Aid') {
    // Aid increases HP by 5, or 5 per spell level above 2nd
    // The caller will need to pass the cast level to calculate this properly
    effectDescription = '+5 HP (max and current) for 8 hours';
    // We'll set a default of 5, the casting function will update based on slot level
    return {
      attackBonus: 0,
      damageBonus: 0,
      acBonus: 0,
      hpBonus: 5,
      description: effectDescription,
      name: spell.name
    };
  }

  // Divine Favor: ongoing effect, not direct damage
  if (spell.name === 'Divine Favor') {
    effectDescription = 'Your weapon attacks deal an extra 1d4 radiant damage on a hit.';
    damageBonus = '1d4';
  }

  // Shield of Faith: "+2 bonus to AC"
  const acBonusMatch = description.match(/\+(\d+)\s+bonus\s+to\s+AC/i);
  if (acBonusMatch) {
    acBonus = parseInt(acBonusMatch[1]);
    effectDescription = `+${acBonus} to AC`;
  }

  // Haste: "+2 bonus to Armor Class"
  if (spell.name === 'Haste') {
    effectDescription = '+2 AC, doubled speed, extra action';
    acBonus = 2;
  }

  // If we found any effect, return it
  if (effectDescription || attackBonus !== 0 || damageBonus !== 0 || acBonus !== 0) {
    return {
      attackBonus,
      damageBonus,
      acBonus,
      description: effectDescription || spell.description.substring(0, 100),
      name: spell.name
    };
  }

  return null;
}
