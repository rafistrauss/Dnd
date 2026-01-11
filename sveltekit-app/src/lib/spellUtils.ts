import type { Spell } from './types';

/**
 * Parse saving throw information from a spell's description
 * @param spell The spell to analyze
 * @returns Object with ability and halfDamageOnSave, or null if no saving throw
 */
export function getSavingThrowInfo(spell: Spell): { ability: string; halfDamageOnSave: boolean } | null {
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
	
	return {
		ability,
		halfDamageOnSave
	};
}
