// Local D&D data management
// Data is pre-fetched and stored in static/data/

import { resolve } from '$app/paths';

export interface Spell {
	name: string;
	level: number;
	school: string;
	classes: string[];
	actionType: string;
	concentration: boolean;
	ritual: boolean;
	castingTime?: string;
	range: string;
	components: string[];
	material?: string;
	duration: string;
	description: string;
	cantripUpgrade?: string;
	higherLevelSlot?: string;
}

export interface Feat {
	id: string;
	name: string;
	prerequisite?: string;
	description: string;
	source: string;
}

let spellsCache: Spell[] | null = null;
let featsCache: Feat[] | null = null;

/**
 * Load spells from local data file
 */
export async function loadSpells(): Promise<Spell[]> {
	if (spellsCache) return spellsCache;
	
	try {
		const response = await fetch(resolve('/data/spells.json'));
		spellsCache = await response.json();
		return spellsCache || [];
	} catch (error) {
		console.error('Failed to load spells:', error);
		return [];
	}
}

/**
 * Load feats from local data file
 */
export async function loadFeats(): Promise<Feat[]> {
	if (featsCache) return featsCache;
	
	try {
		const response = await fetch(resolve('/data/feats.json'));
		featsCache = await response.json();
		return featsCache || [];
	} catch (error) {
		console.error('Failed to load feats:', error);
		return [];
	}
}

/**
 * Search spells by name, class, school, or description
 */
export function searchSpells(spells: Spell[], query: string): Spell[] {
	if (!query.trim()) return spells;
	
	const lowerQuery = query.toLowerCase();
	return spells.filter(spell => 
		spell.name.toLowerCase().includes(lowerQuery) ||
		spell.school.toLowerCase().includes(lowerQuery) ||
		spell.classes.some(c => c.toLowerCase().includes(lowerQuery)) ||
		spell.description.toLowerCase().includes(lowerQuery)
	);
}

/**
 * Filter spells by level
 */
export function filterSpellsByLevel(spells: Spell[], level: number | null): Spell[] {
	if (level === null) return spells;
	return spells.filter(spell => spell.level === level);
}

/**
 * Search feats by name or description
 */
export function searchFeats(feats: Feat[], query: string): Feat[] {
	if (!query.trim()) return feats;
	
	const lowerQuery = query.toLowerCase();
	return feats.filter(feat => 
		feat.name.toLowerCase().includes(lowerQuery) ||
		feat.description.toLowerCase().includes(lowerQuery)
	);
}

/**
 * Get spell by ID
 */
export function getSpellById(spells: Spell[], id: string): Spell | undefined {
	return spells.find(spell => spell.id === id);
}

/**
 * Get feat by ID
 */
export function getFeatById(feats: Feat[], id: string): Feat | undefined {
	return feats.find(feat => feat.id === id);
}
