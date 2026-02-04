import { writable, derived } from 'svelte/store';
import type { Character, RacialTraitUses } from './types';
import { browser } from '$app/environment';
import { getRacialSpellsForLevel, getRaceConfig } from './raceConfig';

// Toast notification store
export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  let nextId = 0;

  return {
    subscribe,
    add: (message: string, type: Toast['type'] = 'info', duration: number = 3000) => {
      const id = nextId++;
      const toast: Toast = { id, message, type, duration };

      update((toasts) => [...toasts, toast]);

      if (duration > 0) {
        setTimeout(() => {
          update((toasts) => toasts.filter((t) => t.id !== id));
        }, duration);
      }
    },
    remove: (id: number) => {
      update((toasts) => toasts.filter((t) => t.id !== id));
    },
    clear: () => {
      update(() => []);
    }
  };
}

export const toasts = createToastStore();

// Initial character state
const initialCharacter: Character = {
  name: '',
  class: '',
  subclass: '',
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
    spellSlotsByLevel: {},
    preparedSpells: ''
  },
  racialTraits: { uses: {} }
};

// Load from localStorage if available
function loadFromStorage(): Character {
  if (!browser) return initialCharacter;

  try {
    const saved = localStorage.getItem('dndCharacter');
    if (saved) {
      const loaded = { ...initialCharacter, ...JSON.parse(saved) };

      // Migrate: ensure all attacks have IDs and array exists
      if (!loaded.attacks || !Array.isArray(loaded.attacks)) {
        loaded.attacks = [];
      } else {
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
          spellSlotsByLevel: {},
          preparedSpells: ''
        };
      } else {
        if (!loaded.classFeatures.features) {
          loaded.classFeatures.features = {};
        }
        if (!loaded.classFeatures.spellSlots) {
          loaded.classFeatures.spellSlots = [];
        }
        if (!loaded.classFeatures.spellSlotsByLevel) {
          loaded.classFeatures.spellSlotsByLevel = {};
        }
        if (loaded.classFeatures.preparedSpells === undefined) {
          loaded.classFeatures.preparedSpells = '';
        }
      }

      // Migrate: ensure racialTraits structure exists
      if (!loaded.racialTraits) {
        loaded.racialTraits = { uses: {} };
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
  character.subscribe((value) => {
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

  isEditMode.subscribe((value) => {
    localStorage.setItem('dndMode', value ? 'edit' : 'use');
  });
}

// Derived stores for commonly used calculations
export const abilityModifiers = derived(character, ($char) => {
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
  character.update((char) => {
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
            spellSlotsByLevel: {},
            preparedSpells: ''
          };
        } else {
          if (!merged.classFeatures.features) {
            merged.classFeatures.features = {};
          }
          if (!merged.classFeatures.spellSlots) {
            merged.classFeatures.spellSlots = [];
          }
          if (!merged.classFeatures.spellSlotsByLevel) {
            merged.classFeatures.spellSlotsByLevel = {};
          }
          if (merged.classFeatures.preparedSpells === undefined) {
            merged.classFeatures.preparedSpells = '';
          }
        }

        // Migrate: ensure racialTraits structure exists
        if (!merged.racialTraits) {
          merged.racialTraits = { uses: {} };
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

export function initializeRacialTraits() {
  character.update((char) => {
    if (!char.racialTraits) {
      char.racialTraits = { uses: {} };
    }
    
    const racialSpells = getRacialSpellsForLevel(char.race, char.level);
    
    // Initialize uses for spells that have limited uses
    racialSpells.forEach((spell) => {
      if (spell.usesPerRest !== undefined && spell.restType) {
        const key = spell.name;
        if (!char.racialTraits!.uses[key]) {
          char.racialTraits!.uses[key] = {
            currentUses: spell.usesPerRest,
            maxUses: spell.usesPerRest,
            restType: spell.restType
          };
        } else {
          // Update max uses if it changed
          char.racialTraits!.uses[key].maxUses = spell.usesPerRest;
        }
      }
    });
    
    return char;
  });
}

export function resetRacialTraitUses(restType: 'short' | 'long') {
  character.update((char) => {
    if (!char.racialTraits) return char;
    
    Object.keys(char.racialTraits.uses).forEach((key) => {
      const traitUse = char.racialTraits!.uses[key];
      if (traitUse.restType === restType || (restType === 'long' && traitUse.restType === 'short')) {
        traitUse.currentUses = traitUse.maxUses;
      }
    });
    
    return char;
  });
}

export function useRacialTrait(spellName: string) {
  character.update((char) => {
    if (!char.racialTraits || !char.racialTraits.uses[spellName]) return char;
    
    const traitUse = char.racialTraits.uses[spellName];
    if (traitUse.currentUses > 0) {
      traitUse.currentUses -= 1;
    }
    
    return char;
  });
}

export function syncRacialSpellAttacks() {
  character.update((char) => {
    if (!char.race) return char;
    
    const raceConfig = getRaceConfig(char.race);
    if (!raceConfig) return char;
    
    const racialSpells = getRacialSpellsForLevel(char.race, char.level);
    
    // Get current attacks
    if (!char.attacks) {
      char.attacks = [];
    }
    
    // Remove old racial spell attacks that are no longer available
    char.attacks = char.attacks.filter((attack) => {
      if (attack.source !== 'racial') return true;
      // Keep only if still in racialSpells list
      return racialSpells.some((spell) => spell.name === attack.name);
    });
    
    // Add or update racial spell attacks
    racialSpells.forEach((spell) => {
      const existingAttack = char.attacks!.find(
        (a) => a.source === 'racial' && a.name === spell.name
      );
      
      if (!existingAttack) {
        // Find which trait this spell belongs to
        let traitName = '';
        for (const trait of raceConfig.traits) {
          if (trait.spells && trait.spells.some((s) => s.name === spell.name)) {
            traitName = trait.name;
            break;
          }
        }
        
        // Create new attack for this racial spell
        const newAttack = {
          id: `racial-${spell.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          name: spell.name,
          bonus: 0, // Spells use proficiency + ability mod
          damage: '', // Will be looked up from spell data
          damageType: '',
          spellRef: spell.name,
          source: 'racial' as const,
          racialTraitName: traitName,
          infoNotes: spell.notes || '',
          notes: spell.notes || ''
        };
        char.attacks!.push(newAttack);
      }
    });
    
    return char;
  });
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
  damageInput: boolean;
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
      notes: false,
      damageInput: false
    };
  }

  try {
    const saved = localStorage.getItem('dndCollapsedStates');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure damageInput exists in loaded state
      return {
        characterInfo: parsed.characterInfo ?? false,
        combatStats: parsed.combatStats ?? false,
        abilityScores: parsed.abilityScores ?? false,
        skills: parsed.skills ?? false,
        attacks: parsed.attacks ?? false,
        classFeatures: parsed.classFeatures ?? false,
        notes: parsed.notes ?? false,
        damageInput: parsed.damageInput ?? false
      };
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
    notes: false,
    damageInput: false
  };
}

export const collapsedStates = writable<CollapsedStates>(loadCollapsedStates());

// Auto-save collapsed states to localStorage
if (browser) {
  collapsedStates.subscribe((value) => {
    try {
      localStorage.setItem('dndCollapsedStates', JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save collapsed states:', e);
    }
  });
}
