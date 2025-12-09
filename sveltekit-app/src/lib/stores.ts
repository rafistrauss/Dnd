import { writable, derived } from 'svelte/store';
import type { Character } from './types';
import { browser } from '$app/environment';

// Initial character state
const initialCharacter: Character = {
	name: '',
	class: '',
	level: 1,
	race: '',
	background: '',
	alignment: '',
	armorClass: 10,
	initiative: 0,
	speed: '30 ft',
	currentHP: 0,
	maxHP: 0,
	tempHP: 0,
	hitDice: { current: 3, max: 3 },
	abilities: {
		strength: 10,
		dexterity: 10,
		constitution: 10,
		intelligence: 10,
		wisdom: 10,
		charisma: 10
	},
	proficiencyBonus: 2,
	saveProficiencies: {
		strength: false,
		dexterity: false,
		constitution: false,
		intelligence: false,
		wisdom: false,
		charisma: false
	},
	skillProficiencies: {
		acrobatics: false,
		animalHandling: false,
		arcana: false,
		athletics: false,
		deception: false,
		history: false,
		insight: false,
		intimidation: false,
		investigation: false,
		medicine: false,
		nature: false,
		perception: false,
		performance: false,
		persuasion: false,
		religion: false,
		sleightOfHand: false,
		stealth: false,
		survival: false
	},
	attacks: [],
	features: '',
	equipment: '',
	notes: '',
	classFeatures: {
		features: {},
		spellSlots: [],
		preparedSpells: ''
	}
};

// Load from localStorage if available
function loadFromStorage(): Character {
	if (!browser) return initialCharacter;
	
	try {
		const saved = localStorage.getItem('dndCharacter');
		if (saved) {
			const loaded = { ...initialCharacter, ...JSON.parse(saved) };
			
			// Migrate: ensure all attacks have IDs
			if (loaded.attacks && Array.isArray(loaded.attacks)) {
				loaded.attacks = loaded.attacks.map((attack: any) => ({
					...attack,
					id: attack.id || crypto.randomUUID()
				}));
			}
			
			// Migrate: ensure classFeatures structure exists
			if (!loaded.classFeatures) {
				loaded.classFeatures = {
					features: {},
					spellSlots: [],
					preparedSpells: ''
				};
			} else {
				if (!loaded.classFeatures.features) {
					loaded.classFeatures.features = {};
				}
				if (!loaded.classFeatures.spellSlots) {
					loaded.classFeatures.spellSlots = [];
				}
				if (loaded.classFeatures.preparedSpells === undefined) {
					loaded.classFeatures.preparedSpells = '';
				}
			}
			
			return loaded;
		}
	} catch (e) {
		console.error('Failed to load character from storage:', e);
	}
	return initialCharacter;
}

// Create the main character store
export const character = writable<Character>(loadFromStorage());

// Auto-save to localStorage whenever character changes
if (browser) {
	character.subscribe(value => {
		try {
			localStorage.setItem('dndCharacter', JSON.stringify(value));
		} catch (e) {
			console.error('Failed to save character to storage:', e);
		}
	});
}

// Edit mode store
export const isEditMode = writable(true);

if (browser) {
	const savedMode = localStorage.getItem('dndMode');
	isEditMode.set(savedMode === 'edit');
	
	isEditMode.subscribe(value => {
		localStorage.setItem('dndMode', value ? 'edit' : 'use');
	});
}

// Derived stores for commonly used calculations
export const abilityModifiers = derived(character, $char => {
	const calculateModifier = (score: number) => Math.floor((score - 10) / 2);
	
	return {
		strength: calculateModifier($char.abilities.strength),
		dexterity: calculateModifier($char.abilities.dexterity),
		constitution: calculateModifier($char.abilities.constitution),
		intelligence: calculateModifier($char.abilities.intelligence),
		wisdom: calculateModifier($char.abilities.wisdom),
		charisma: calculateModifier($char.abilities.charisma)
	};
});

// Helper functions
export function calculateModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

export function calculateProficiencyBonus(level: number): number {
	return Math.ceil(level / 4) + 1;
}

export function updateProficiencyBonus() {
	character.update(char => {
		char.proficiencyBonus = calculateProficiencyBonus(char.level);
		return char;
	});
}

export function exportCharacter(char: Character): void {
	const dataStr = JSON.stringify(char, null, 2);
	const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
	const exportFileDefaultName = `${char.name || 'character'}_${new Date().toISOString().split('T')[0]}.json`;

	const linkElement = document.createElement('a');
	linkElement.setAttribute('href', dataUri);
	linkElement.setAttribute('download', exportFileDefaultName);
	linkElement.click();
}

export function importCharacter(file: File): Promise<Character> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const imported = JSON.parse(e.target?.result as string);
				const merged = { ...initialCharacter, ...imported };
				
				// Migrate: ensure all attacks have IDs
				if (merged.attacks && Array.isArray(merged.attacks)) {
					merged.attacks = merged.attacks.map((attack: any) => ({
						...attack,
						id: attack.id || crypto.randomUUID()
					}));
				}
				
				// Migrate: ensure classFeatures structure exists
				if (!merged.classFeatures) {
					merged.classFeatures = {
						features: {},
						spellSlots: [],
						preparedSpells: ''
					};
				} else {
					if (!merged.classFeatures.features) {
						merged.classFeatures.features = {};
					}
					if (!merged.classFeatures.spellSlots) {
						merged.classFeatures.spellSlots = [];
					}
					if (merged.classFeatures.preparedSpells === undefined) {
						merged.classFeatures.preparedSpells = '';
					}
				}
				
				resolve(merged);
			} catch {
				reject(new Error('Invalid character file'));
			}
		};
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsText(file);
	});
}

export function resetCharacter(): void {
	character.set(initialCharacter);
}

// Global search filter
export const searchFilter = writable<string>('');

// Collapsed states for all sections
interface CollapsedStates {
	characterInfo: boolean;
	combatStats: boolean;
	abilityScores: boolean;
	skills: boolean;
	attacks: boolean;
	classFeatures: boolean;
	notes: boolean;
}

function loadCollapsedStates(): CollapsedStates {
	if (!browser) {
		return {
			characterInfo: false,
			combatStats: false,
			abilityScores: false,
			skills: false,
			attacks: false,
			classFeatures: false,
			notes: false
		};
	}
	
	try {
		const saved = localStorage.getItem('dndCollapsedStates');
		if (saved) {
			return JSON.parse(saved);
		}
	} catch (e) {
		console.error('Failed to load collapsed states:', e);
	}
	
	return {
		characterInfo: false,
		combatStats: false,
		abilityScores: false,
		skills: false,
		attacks: false,
		classFeatures: false,
		notes: false
	};
}

export const collapsedStates = writable<CollapsedStates>(loadCollapsedStates());

// Auto-save collapsed states to localStorage
if (browser) {
	collapsedStates.subscribe(value => {
		try {
			localStorage.setItem('dndCollapsedStates', JSON.stringify(value));
		} catch (e) {
			console.error('Failed to save collapsed states:', e);
		}
	});
}
