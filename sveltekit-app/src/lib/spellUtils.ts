import type { Spell } from './types';

/**
 * Parse saving throw information from a spell's description
 * @param spell The spell to analyze
 * @returns Object with ability, halfDamageOnSave, and noDamageOnSave, or null if no saving throw
 */
export function getSavingThrowInfo(spell: Spell): { ability: string; halfDamageOnSave: boolean; noDamageOnSave: boolean } | null {
	const description = spell.description;
	
	// Pattern to detect saving throws: "Strength saving throw", "Dexterity saving throw", etc.
	const savingThrowPattern = /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving\s+throw/i;
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
