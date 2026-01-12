// D&D Character Types

export interface Abilities {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export type AbilityName = keyof Abilities;

export interface SaveProficiencies {
  strength: boolean;
  dexterity: boolean;
  constitution: boolean;
  intelligence: boolean;
  wisdom: boolean;
  charisma: boolean;
}

export interface SkillProficiencies {
  acrobatics: boolean;
  animalHandling: boolean;
  arcana: boolean;
  athletics: boolean;
  deception: boolean;
  history: boolean;
  insight: boolean;
  intimidation: boolean;
  investigation: boolean;
  medicine: boolean;
  nature: boolean;
  perception: boolean;
  performance: boolean;
  persuasion: boolean;
  religion: boolean;
  sleightOfHand: boolean;
  stealth: boolean;
  survival: boolean;
}

export type SkillName = keyof SkillProficiencies;

export interface Attack {
  id: string;
  name: string;
  bonus: number;
  damage: string;
  damageType: string;
  spellRef?: string; // canonical spell name
  infoNotes?: string; // Range, Duration, Components, etc.
  generalNotes?: string; // summary/effects
  castAtLevel?: number; // for spells that can be cast at higher levels
  targetIsFiendOrUndead?: boolean; // for conditional damage like Divine Smite
  targetSucceededSave?: boolean; // for spells with saving throws
  notes?: string; // for non-spell attacks
}

export interface Spell {
  name: string;
  level: number;
  school: string;
  classes: string[];
  actionType: string;
  concentration: boolean;
  ritual: boolean;
  range: string;
  components: string[];
  duration: string;
  description: string;
  cantripUpgrade?: string;
  material?: string;
  castingTime?: string;
  higherLevelSlot?: string;
  castingTrigger?: string;
}

export interface HitDice {
  current: number;
  max: number;
}

export interface SpellState {
  name: string;
  attackBonus: number;
  damageBonus: number | string;
  description: string;
  acBonus?: number; // Optional AC bonus from spell effect
}

export interface ClassFeatures {
  features: Record<string, boolean[] | number>;
  spellSlots: boolean[]; // Legacy - 1st level only
  spellSlotsByLevel?: Record<number, boolean[]>; // Slots by level 1-9
  preparedSpells: string;
}

export interface Character {
  name: string;
  class: string;
  subclass?: string;
  level: number;
  race: string;
  background: string;
  alignment: string;
  armorClass: number;
  initiative: number;
  speed: string;
  currentHP: number;
  maxHP: number;
  tempHP: number;
  hitDice: HitDice;
  abilities: Abilities;
  proficiencyBonus: number;
  saveProficiencies: SaveProficiencies;
  skillProficiencies: SkillProficiencies;
  attacks: Attack[];
  features: string;
  equipment: string;
  notes: string;
  classFeatures: ClassFeatures;
  activeStates?: SpellState[];
}

// Class Configuration Types

export type ResetType = 'short' | 'long';
export type FeatureType = 'uses' | 'pool' | 'spellSlot' | 'info' | 'channelDivinity';

export interface ClassFeature {
  name: string;
  type: FeatureType;
  maxUses?: number | ((level: number, abilityMod?: number) => number);
  maxPool?: number | ((level: number) => number);
  resetOn?: ResetType;
  description: string | ((level: number) => string);
  minLevel?: number;
  rollable?: boolean;
  rollFormula?: string | ((level: number) => string);
}

export interface SubclassConfig {
  name: string;
  features: ClassFeature[];
}

export interface ClassConfig {
  name: string;
  hitDice: string;
  spellcaster: boolean;
  spellcastingAbility?: AbilityName;
  spellSlotsByLevel?: Record<number, number>; // Legacy: character level -> 1st level slots
  spellSlotProgression?: Record<number, number[]>; // character level -> [slots for spell level 1-9]
  features: ClassFeature[];
  subclasses?: Record<string, SubclassConfig>;
}

export type ClassName = 'paladin' | 'fighter' | 'rogue' | 'wizard' | 'cleric' | 'barbarian';

// Skill to ability mapping
export const SKILL_ABILITIES: Record<SkillName, AbilityName> = {
  acrobatics: 'dexterity',
  animalHandling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleightOfHand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom'
};
