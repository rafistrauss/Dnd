import type { ClassConfig, ClassName, ClassFeature } from './types';

export const CLASS_CONFIG: Record<ClassName, ClassConfig> = {
	paladin: {
		name: 'Paladin',
		hitDice: 'd10',
		spellcaster: true,
		spellcastingAbility: 'charisma',
		spellSlotsByLevel: {
			1: 0, 2: 2, 3: 3, 4: 3, 5: 4,
			6: 4, 7: 4, 8: 4, 9: 4, 10: 4,
			11: 4, 12: 4, 13: 4, 14: 4, 15: 4,
			16: 4, 17: 4, 18: 4, 19: 4, 20: 4
		},
		features: [
			{
				name: 'Divine Sense',
				type: 'uses',
				maxUses: (level, chaMod = 1) => 1 + Math.max(1, chaMod),
				resetOn: 'long',
				description: 'Detect celestials, fiends, and undead within 60 feet',
				minLevel: 1
			},
			{
				name: 'Lay on Hands',
				type: 'pool',
				maxPool: (level) => level * 5,
				resetOn: 'long',
				description: 'Heal wounds or cure disease',
				minLevel: 1
			},
			{
				name: 'Divine Smite',
				type: 'spellSlot',
				description: 'Expend spell slot to deal extra radiant damage',
				minLevel: 2,
				rollable: true
			},
			{
				name: 'Channel Divinity',
				type: 'pool',
				maxPool: (level) => level >= 18 ? 3 : level >= 6 ? 2 : 1,
				resetOn: 'short',
				description: 'Sacred Weapon or Turn Undead',
				minLevel: 3
			}
		]
	},

	fighter: {
		name: 'Fighter',
		hitDice: 'd10',
		spellcaster: false,
		features: [
			{
				name: 'Second Wind',
				type: 'uses',
				maxUses: 1,
				resetOn: 'short',
				description: 'Regain 1d10 + fighter level HP as bonus action',
				minLevel: 1,
				rollable: true,
				rollFormula: (level) => `1d10+${level}`
			},
			{
				name: 'Action Surge',
				type: 'uses',
				maxUses: (level) => level >= 17 ? 2 : 1,
				resetOn: 'short',
				description: 'Take one additional action on your turn',
				minLevel: 2
			},
			{
				name: 'Indomitable',
				type: 'uses',
				maxUses: (level) => level >= 17 ? 3 : level >= 13 ? 2 : 1,
				resetOn: 'long',
				description: 'Reroll a failed saving throw',
				minLevel: 9
			}
		],
		subclasses: {
			'champion': {
				name: 'Champion',
				features: [
					{
						name: 'Improved Critical',
						type: 'info',
						description: 'Critical hit on 19-20',
						minLevel: 3
					},
					{
						name: 'Remarkable Athlete',
						type: 'info',
						description: 'Add half proficiency to STR/DEX/CON checks, increase long jump distance',
						minLevel: 7
					},
					{
						name: 'Additional Fighting Style',
						type: 'info',
						description: 'Choose a second fighting style',
						minLevel: 10
					},
					{
						name: 'Superior Critical',
						type: 'info',
						description: 'Critical hit on 18-20',
						minLevel: 15
					},
					{
						name: 'Survivor',
						type: 'info',
						description: 'Regain 5 + CON mod HP at start of turn if below half HP',
						minLevel: 18
					}
				]
			},
			'battlemaster': {
				name: 'Battle Master',
				features: [
					{
						name: 'Combat Superiority',
						type: 'uses',
						maxUses: (level) => level >= 15 ? 6 : level >= 7 ? 5 : 4,
						resetOn: 'short',
						description: (level) => {
							const die = level >= 18 ? 'd12' : level >= 10 ? 'd10' : 'd8';
							return `Use superiority dice (${die}) for maneuvers`;
						},
						minLevel: 3
					},
					{
						name: 'Know Your Enemy',
						type: 'info',
						description: 'Learn capabilities of creatures you observe',
						minLevel: 7
					},
					{
						name: 'Improved Combat Superiority',
						type: 'info',
						description: 'Superiority dice become d10',
						minLevel: 10
					},
					{
						name: 'Relentless',
						type: 'info',
						description: 'Regain 1 superiority die if you have none at start of turn',
						minLevel: 15
					}
				]
			}
		}
	},

	rogue: {
		name: 'Rogue',
		hitDice: 'd8',
		spellcaster: false,
		features: [
			{
				name: 'Sneak Attack',
				type: 'info',
				description: (level) => {
					const dice = Math.ceil(level / 2);
					return `Deal ${dice}d6 extra damage once per turn with advantage or ally nearby`;
				},
				minLevel: 1,
				rollable: true,
				rollFormula: (level) => `${Math.ceil(level / 2)}d6`
			},
			{
				name: 'Cunning Action',
				type: 'info',
				description: 'Dash, Disengage, or Hide as a bonus action',
				minLevel: 2
			},
			{
				name: 'Uncanny Dodge',
				type: 'info',
				description: 'Use reaction to halve damage from an attack',
				minLevel: 5
			},
			{
				name: 'Evasion',
				type: 'info',
				description: 'Take no damage on successful Dex save (half on fail)',
				minLevel: 7
			}
		]
	},

	wizard: {
		name: 'Wizard',
		hitDice: 'd6',
		spellcaster: true,
		spellcastingAbility: 'intelligence',
		spellSlotsByLevel: {
			1: 2, 2: 3, 3: 4, 4: 4, 5: 4,
			6: 4, 7: 4, 8: 4, 9: 4, 10: 4,
			11: 4, 12: 4, 13: 4, 14: 4, 15: 4,
			16: 4, 17: 4, 18: 4, 19: 4, 20: 4
		},
		features: [
			{
				name: 'Arcane Recovery',
				type: 'uses',
				maxUses: 1,
				resetOn: 'long',
				description: (level) => `Recover spell slots totaling up to ${Math.ceil(level / 2)} levels during short rest`,
				minLevel: 1
			},
			{
				name: 'Spell Mastery',
				type: 'info',
				description: 'Cast one 1st-level and one 2nd-level spell at will',
				minLevel: 18
			}
		]
	},

	cleric: {
		name: 'Cleric',
		hitDice: 'd8',
		spellcaster: true,
		spellcastingAbility: 'wisdom',
		spellSlotsByLevel: {
			1: 2, 2: 3, 3: 4, 4: 4, 5: 4,
			6: 4, 7: 4, 8: 4, 9: 4, 10: 4,
			11: 4, 12: 4, 13: 4, 14: 4, 15: 4,
			16: 4, 17: 4, 18: 4, 19: 4, 20: 4
		},
		features: [
			{
				name: 'Channel Divinity',
				type: 'pool',
				maxPool: (level) => level >= 18 ? 3 : level >= 6 ? 2 : 1,
				resetOn: 'short',
				description: 'Turn Undead or domain-specific ability',
				minLevel: 2
			},
			{
				name: 'Destroy Undead',
				type: 'info',
				description: (level) => {
					const cr = level >= 17 ? 4 : level >= 14 ? 3 : level >= 11 ? 2 : level >= 8 ? 1 : 0.5;
					return `Channel Divinity destroys undead of CR ${cr} or lower`;
				},
				minLevel: 5
			},
			{
				name: 'Divine Intervention',
				type: 'uses',
				maxUses: 1,
				resetOn: 'long',
				description: (level) => `${level}% chance to succeed, implore deity for aid`,
				minLevel: 10
			}
		],
		subclasses: {
			'war': {
				name: 'War Domain',
				features: [
					{
						name: 'War Priest',
						type: 'uses',
						maxUses: (level, wisMod = 1) => Math.max(1, wisMod),
						resetOn: 'long',
						description: 'Make one weapon attack as a bonus action',
						minLevel: 1
					},
					{
						name: 'Guided Strike',
						type: 'channelDivinity',
						description: 'Use your Channel Divinity to gain +10 to an attack roll. Make this choice after you see the roll, but before the DM says whether the attack hits or misses.',
						minLevel: 2,
						resetOn: 'short'
					},
					{
						name: 'War God\'s Blessing',
						type: 'channelDivinity',
						description: 'Use reaction to grant +10 to an ally\'s attack roll within 30 feet. Consumes one use of Channel Divinity.',
						minLevel: 6,
						resetOn: 'short'
					},
					{
						name: 'Divine Strike',
						type: 'info',
						description: (level) => {
							const dice = level >= 14 ? '2d8' : '1d8';
							return `Deal extra ${dice} weapon damage once per turn`;
						},
						minLevel: 8,
						rollable: true,
						rollFormula: (level) => level >= 14 ? '2d8' : '1d8'
					},
					{
						name: 'Avatar of Battle',
						type: 'info',
						description: 'Gain resistance to nonmagical weapon damage',
						minLevel: 17
					}
				]
			},
			'life': {
				name: 'Life Domain',
				features: [
					{
						name: 'Disciple of Life',
						type: 'info',
						description: 'Healing spells restore additional 2 + spell level HP',
						minLevel: 1
					},
					{
						name: 'Preserve Life',
						type: 'pool',
						maxPool: (level) => level * 5,
						resetOn: 'short',
						description: 'Restore HP to creatures within 30 feet',
						minLevel: 2
					},
					{
						name: 'Blessed Healer',
						type: 'info',
						description: 'Regain 2 + spell level HP when you cast healing spell',
						minLevel: 6
					},
					{
						name: 'Divine Strike',
						type: 'info',
						description: (level) => {
							const dice = level >= 14 ? '2d8' : '1d8';
							return `Deal extra ${dice} radiant damage once per turn`;
						},
						minLevel: 8,
						rollable: true,
						rollFormula: (level) => level >= 14 ? '2d8' : '1d8'
					},
					{
						name: 'Supreme Healing',
						type: 'info',
						description: 'Maximize healing dice instead of rolling',
						minLevel: 17
					}
				]
			}
		}
	},

	barbarian: {
		name: 'Barbarian',
		hitDice: 'd12',
		spellcaster: false,
		features: [
			{
				name: 'Rage',
				type: 'uses',
				maxUses: (level) => {
					if (level >= 20) return Infinity;
					if (level >= 17) return 6;
					if (level >= 12) return 5;
					if (level >= 6) return 4;
					if (level >= 3) return 3;
					return 2;
				},
				resetOn: 'long',
				description: (level) => {
					const bonus = level >= 16 ? 4 : level >= 9 ? 3 : 2;
					return `+${bonus} damage, resistance to physical damage`;
				},
				minLevel: 1
			},
			{
				name: 'Reckless Attack',
				type: 'info',
				description: 'Gain advantage on melee attacks, enemies get advantage on you',
				minLevel: 2
			},
			{
				name: 'Danger Sense',
				type: 'info',
				description: 'Advantage on Dex saves against effects you can see',
				minLevel: 2
			}
		],
		subclasses: {
			'berserker': {
				name: 'Path of the Berserker',
				features: [
					{
						name: 'Frenzy',
						type: 'info',
						description: 'While raging, make melee attack as bonus action (gain 1 exhaustion after rage)',
						minLevel: 3
					},
					{
						name: 'Mindless Rage',
						type: 'info',
						description: 'Cannot be charmed or frightened while raging',
						minLevel: 6
					},
					{
						name: 'Intimidating Presence',
						type: 'info',
						description: 'Use action to frighten creature within 30 feet',
						minLevel: 10
					},
					{
						name: 'Retaliation',
						type: 'info',
						description: 'When damaged by creature within 5 feet, make melee attack as reaction',
						minLevel: 14
					}
				]
			}
		}
	}
};

export function getClassConfig(className: string): ClassConfig | null {
	const key = className.toLowerCase() as ClassName;
	return CLASS_CONFIG[key] || null;
}

export function getAvailableFeatures(className: string, level: number, subclassName?: string): ClassFeature[] {
	const config = getClassConfig(className);
	if (!config) return [];
	
	const classFeatures = config.features.filter(feature => 
		!feature.minLevel || feature.minLevel <= level
	);
	
	// If subclass is specified, add its features
	if (subclassName && config.subclasses && config.subclasses[subclassName]) {
		const subclassFeatures = config.subclasses[subclassName].features.filter(feature =>
			!feature.minLevel || feature.minLevel <= level
		);
		return [...classFeatures, ...subclassFeatures];
	}
	
	return classFeatures;
}

export function getAvailableSubclasses(className: string): { id: string; name: string }[] {
	const config = getClassConfig(className);
	if (!config || !config.subclasses) return [];
	
	return Object.keys(config.subclasses).map(key => ({
		id: key,
		name: config.subclasses![key].name
	}));
}

export function getSpellSlots(className: string, level: number): number {
	const config = getClassConfig(className);
	if (!config || !config.spellcaster || !config.spellSlotsByLevel) return 0;
	
	return config.spellSlotsByLevel[level] || 0;
}

export function getPreparedSpellsCount(className: string, level: number, abilityMod: number): number {
	const config = getClassConfig(className);
	if (!config || !config.spellcaster) return 0;
	
	return Math.max(1, abilityMod + level);
}

export function getSpellSaveDC(className: string, abilityMod: number, profBonus: number): number | null {
	const config = getClassConfig(className);
	if (!config || !config.spellcaster) return null;
	
	return 8 + abilityMod + profBonus;
}

export function getAvailableClasses(): { id: ClassName; name: string }[] {
	return Object.keys(CLASS_CONFIG).map(key => ({
		id: key as ClassName,
		name: CLASS_CONFIG[key as ClassName].name
	}));
}
