import { writable, derived } from 'svelte/store';
import type { Character, RacialTraitUses, RollHistoryEntry } from './types';
import { browser } from '$app/environment';
import { getRacialSpellsForLevel, getRaceConfig } from './raceConfig';
import { getAvailableFeatures, getClassConfig, getSpellSlotProgression } from './classConfig';
import { calculateMaxHP } from './combatUtils';

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

// Roll history store
function createRollHistoryStore() {
  // Load from localStorage if available
  const loadFromStorage = (): RollHistoryEntry[] => {
    if (browser) {
      const saved = localStorage.getItem('dnd_roll_history');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse roll history from localStorage:', e);
        }
      }
    }
    return [];
  };

  const { subscribe, update, set } = writable<RollHistoryEntry[]>(loadFromStorage());

  let nextId = 0;
  // Set nextId based on existing entries
  const existing = loadFromStorage();
  if (existing.length > 0) {
    nextId = Math.max(...existing.map(e => e.id)) + 1;
  }

  const saveToStorage = (history: RollHistoryEntry[]) => {
    if (browser) {
      localStorage.setItem('dnd_roll_history', JSON.stringify(history));
    }
  };

  return {
    subscribe,
    addRoll: (purpose: string, notation: string, result: number, breakdown?: string) => {
      const id = nextId++;
      const entry: RollHistoryEntry = {
        id,
        timestamp: Date.now(),
        purpose,
        notation,
        result,
        breakdown
      };

      update((history) => {
        const newHistory = [entry, ...history].slice(0, 50); // Keep last 50 rolls
        saveToStorage(newHistory);
        return newHistory;
      });
    },
    clear: () => {
      set([]);
      saveToStorage([]);
    },
    import: (history: RollHistoryEntry[]) => {
      // Reset nextId based on imported entries
      if (history.length > 0) {
        nextId = Math.max(...history.map(e => e.id)) + 1;
      }
      set(history);
      saveToStorage(history);
    },
    export: (): RollHistoryEntry[] => {
      let currentHistory: RollHistoryEntry[] = [];
      const unsubscribe = subscribe(value => {
        currentHistory = value;
      });
      unsubscribe();
      return currentHistory;
    }
  };
}

export const rollHistory = createRollHistoryStore();

// Initial character state
const initialCharacter: Character = {
  name: '',
  class: '',
  subclass: '',
  level: 1,
  hpByLevel: { 1: 0 },
  hpRolls: [],
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

const MAX_CHARACTER_LEVEL = 20;

function ensureCharacterStructures(char: Character): Character {
  if (!char.hpByLevel) {
    char.hpByLevel = {};
  }

  if (!char.hpRolls) {
    char.hpRolls = [];
  }

  if (!char.classFeatures) {
    char.classFeatures = {
      features: {},
      spellSlots: [],
      spellSlotsByLevel: {},
      preparedSpells: ''
    };
  } else {
    if (!char.classFeatures.features) {
      char.classFeatures.features = {};
    }
    if (!char.classFeatures.spellSlots) {
      char.classFeatures.spellSlots = [];
    }
    if (!char.classFeatures.spellSlotsByLevel) {
      char.classFeatures.spellSlotsByLevel = {};
    }
    if (char.classFeatures.preparedSpells === undefined) {
      char.classFeatures.preparedSpells = '';
    }
  }

  if (!char.racialTraits) {
    char.racialTraits = { uses: {} };
  }

  return char;
}

function getAverageHPGain(char: Character): number {
  const classConfig = char.class ? getClassConfig(char.class) : null;
  if (!classConfig) {
    return 0;
  }

  const hitDieSize = parseInt(classConfig.hitDice.substring(1));
  const conMod = calculateModifier(char.abilities.constitution);
  return Math.max(1, Math.floor(hitDieSize / 2) + 1 + conMod);
}

function getCalculatedHPAtLevel(char: Character, level: number): number {
  return calculateMaxHP({ ...char, level }, char.abilities);
}

function ensureHPHistory(char: Character): Character {
  ensureCharacterStructures(char);

  if (!char.class) {
    char.hpByLevel![char.level] = char.maxHP;
    return char;
  }

  const currentLevel = Math.max(1, char.level || 1);
  const currentHp = char.maxHP > 0 ? char.maxHP : getCalculatedHPAtLevel(char, currentLevel);

  if (!char.hpByLevel![currentLevel]) {
    char.hpByLevel![currentLevel] = currentHp;
  }

  for (let level = 1; level < currentLevel; level++) {
    if (!char.hpByLevel![level]) {
      char.hpByLevel![level] = getCalculatedHPAtLevel(char, level);
    }
  }

  return char;
}

function syncSpellSlotsForLevel(char: Character): Character {
  ensureCharacterStructures(char);

  if (!char.class) {
    char.classFeatures.spellSlotsByLevel = {};
    char.classFeatures.spellSlots = [];
    return char;
  }

  const progression = getSpellSlotProgression(char.class, char.level);
  const previousSlots = char.classFeatures.spellSlotsByLevel || {};
  const nextSlots: Record<number, boolean[]> = {};

  progression.forEach((totalSlots, idx) => {
    if (totalSlots <= 0) {
      return;
    }

    const spellLevel = idx + 1;
    const usedSlots = (previousSlots[spellLevel] || []).filter(Boolean).length;
    nextSlots[spellLevel] = Array.from({ length: totalSlots }, (_, slotIdx) => slotIdx < usedSlots);
  });

  char.classFeatures.spellSlotsByLevel = nextSlots;
  char.classFeatures.spellSlots = nextSlots[1] || [];
  return char;
}

function syncClassFeatureResources(char: Character): Character {
  ensureCharacterStructures(char);

  if (!char.class) {
    char.classFeatures.features = {};
    return char;
  }

  const classConfig = getClassConfig(char.class);
  const spellcastingAbility = classConfig?.spellcastingAbility;
  const abilityMod = spellcastingAbility ? calculateModifier(char.abilities[spellcastingAbility]) : undefined;
  const nextFeatures: Record<string, boolean[] | number> = {};
  const availableFeatures = getAvailableFeatures(char.class, char.level, char.subclass);

  availableFeatures.forEach((feature) => {
    const featureName =
      typeof feature.name === 'function' ? feature.name(char.level, abilityMod) : feature.name;
    const featureKey = featureName.replace(/\s+/g, '');
    const currentValue = char.classFeatures.features[featureKey];

    if (feature.type === 'uses') {
      const maxUses =
        typeof feature.maxUses === 'function'
          ? feature.maxUses(char.level, abilityMod)
          : feature.maxUses || 0;
      const usedCount = Array.isArray(currentValue) ? currentValue.filter(Boolean).length : 0;
      nextFeatures[featureKey] = Array.from(
        { length: maxUses },
        (_, idx) => idx < Math.min(usedCount, maxUses)
      );
      return;
    }

    if (feature.type === 'pool') {
      const maxPool =
        typeof feature.maxPool === 'function' ? feature.maxPool(char.level) : feature.maxPool;

      if (maxPool !== undefined) {
        nextFeatures[featureKey] =
          typeof currentValue === 'number' ? Math.min(currentValue, maxPool) : maxPool;
      }
    }
  });

  char.classFeatures.features = nextFeatures;
  return char;
}

function syncLevelDerivedState(char: Character, previousLevel: number): Character {
  ensureCharacterStructures(char);

  char.proficiencyBonus = calculateProficiencyBonus(char.level);
  char.hitDice.max = char.level;

  if (char.level > previousLevel) {
    char.hitDice.current = Math.min(char.hitDice.max, char.hitDice.current + (char.level - previousLevel));
  } else {
    char.hitDice.current = Math.min(char.hitDice.current, char.hitDice.max);
  }

  syncSpellSlotsForLevel(char);
  syncClassFeatureResources(char);
  return char;
}

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

      if (!loaded.hpByLevel) {
        loaded.hpByLevel = {};
      }

      if (!loaded.hpRolls) {
        loaded.hpRolls = [];
      }

      ensureHPHistory(loaded);

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

export function syncCurrentLevelHP() {
  character.update((char) => {
    ensureCharacterStructures(char);
    char.hpByLevel![char.level] = char.maxHP;
    return char;
  });
}

export function setCharacterLevel(level: number) {
  character.update((char) => {
    const nextLevel = Math.max(1, Math.min(MAX_CHARACTER_LEVEL, Math.floor(level || 1)));
    const previousLevel = Math.max(1, char.level || 1);

    if (nextLevel === previousLevel) {
      return char;
    }

    ensureCharacterStructures(char);
    ensureHPHistory(char);
    char.hpByLevel![previousLevel] = char.maxHP;

    if (char.class) {
      const previousMaxHP = char.hpByLevel![previousLevel] || char.maxHP || getCalculatedHPAtLevel(char, previousLevel);
      let targetMaxHP = char.hpByLevel![nextLevel];

      if (targetMaxHP === undefined) {
        if (nextLevel > previousLevel) {
          let runningHP = previousMaxHP;
          const averageGain = getAverageHPGain(char);

          for (let currentLevel = previousLevel + 1; currentLevel <= nextLevel; currentLevel++) {
            if (char.hpByLevel![currentLevel] === undefined) {
              runningHP += averageGain;
              char.hpByLevel![currentLevel] = runningHP;
            } else {
              runningHP = char.hpByLevel![currentLevel];
            }
          }
        } else {
          char.hpByLevel![nextLevel] = getCalculatedHPAtLevel(char, nextLevel);
        }

        targetMaxHP = char.hpByLevel![nextLevel];
      }

      const hpDelta = targetMaxHP - previousMaxHP;
      char.maxHP = targetMaxHP;
      char.currentHP = Math.max(0, Math.min(targetMaxHP, char.currentHP + hpDelta));
    }

    char.level = nextLevel;
    syncLevelDerivedState(char, previousLevel);
    return char;
  });
}

export interface LevelUpPreview {
  newLevel: number;
  currentHP: number;
  maxHPCurrent: number;
  maxHPAfter: number;
  hpGainAverage: number;
  conMod: number;
  spellSlotsRestored: number;
  classFeatureCounts: { [name: string]: { current: number; max: number } };
}

export function getLevelUpPreview(): LevelUpPreview | null {
  let preview: LevelUpPreview | null = null;

  const unsubscribe = character.subscribe((char) => {
    if (!char.class || char.level >= MAX_CHARACTER_LEVEL) {
      preview = null;
      return;
    }

    const currentLevel = char.level;
    const newLevel = currentLevel + 1;
    const conMod = calculateModifier(char.abilities.constitution);
    const classConfig = getClassConfig(char.class);

    if (!classConfig) {
      preview = null;
      return;
    }

    // Calculate HP gain
    const hitDieSize = parseInt(classConfig.hitDice.substring(1));
    const hpGainAverage = Math.max(1, Math.floor(hitDieSize / 2) + 1 + conMod);

    // Calculate spell slots to restore
    const currentProgression = getSpellSlotProgression(char.class, currentLevel);
    const nextProgression = getSpellSlotProgression(char.class, newLevel);
    const spellSlotsRestored = nextProgression.reduce(
      (sum, slots, idx) => sum + (slots > 0 ? slots : 0),
      0
    );

    // Get class features
    const currentFeatures = getAvailableFeatures(char.class, currentLevel, char.subclass);
    const nextFeatures = getAvailableFeatures(char.class, newLevel, char.subclass);
    const classFeatureCounts: { [name: string]: { current: number; max: number } } = {};

    nextFeatures.forEach((feature) => {
      if (feature.type === 'uses' || feature.type === 'pool') {
        const featureName =
          typeof feature.name === 'function' ? feature.name(newLevel, conMod) : feature.name;
        const maxCount =
          feature.type === 'uses'
            ? typeof feature.maxUses === 'function'
              ? feature.maxUses(newLevel, conMod)
              : feature.maxUses
            : typeof feature.maxPool === 'function'
              ? feature.maxPool(newLevel)
              : feature.maxPool;

        if (maxCount !== undefined) {
          classFeatureCounts[featureName] = { current: 0, max: maxCount };
        }
      }
    });

    preview = {
      newLevel,
      currentHP: char.currentHP,
      maxHPCurrent: char.maxHP,
      maxHPAfter: char.maxHP + hpGainAverage,
      hpGainAverage,
      conMod,
      spellSlotsRestored,
      classFeatureCounts
    };
  });

  unsubscribe();
  return preview;
}

export function applyLevelUp(hpGainMethod: 'average' | 'roll' | 'reuse', hpRollResult?: number) {
  character.update((char) => {
    if (!char.class || char.level >= MAX_CHARACTER_LEVEL) {
      return char;
    }

    const currentLevel = char.level;
    const newLevel = currentLevel + 1;
    const previousLevel = currentLevel;

    ensureCharacterStructures(char);
    ensureHPHistory(char);

    // Store current level's HP before leveling
    char.hpByLevel![currentLevel] = char.maxHP;

    const classConfig = getClassConfig(char.class);
    if (!classConfig) {
      return char;
    }

    const conMod = calculateModifier(char.abilities.constitution);
    const hitDieSize = parseInt(classConfig.hitDice.substring(1));

    // Calculate HP gain or use stored
    let newMaxHP: number;
    
    if (hpGainMethod === 'reuse' && char.hpByLevel![newLevel]) {
      // Reuse previously stored HP for this level
      newMaxHP = char.hpByLevel![newLevel];
    } else {
      // Calculate new HP
      let hpGain: number;
      if (hpGainMethod === 'roll' && hpRollResult !== undefined) {
        hpGain = Math.max(1, hpRollResult + conMod);
      } else {
        // average (rounded up)
        hpGain = Math.max(1, Math.floor(hitDieSize / 2) + 1 + conMod);
      }
      newMaxHP = char.maxHP + hpGain;
    }
    char.maxHP = newMaxHP;
    char.currentHP = newMaxHP; // Restore to full HP on level up

    // Store new level's HP
    char.hpByLevel![newLevel] = newMaxHP;

    // Record the HP roll if it was rolled
    if (hpGainMethod === 'roll' && hpRollResult !== undefined) {
      if (!char.hpRolls) {
        char.hpRolls = [];
      }
      char.hpRolls.push(hpRollResult);
    }

    // Update level and derived state
    char.level = newLevel;
    syncLevelDerivedState(char, previousLevel);

    // Restore all spell slots
    const nextProgression = getSpellSlotProgression(char.class, newLevel);
    const nextSlots: Record<number, boolean[]> = {};
    nextProgression.forEach((totalSlots, idx) => {
      if (totalSlots > 0) {
        const spellLevel = idx + 1;
        nextSlots[spellLevel] = Array(totalSlots).fill(false);
      }
    });
    char.classFeatures.spellSlotsByLevel = nextSlots;
    char.classFeatures.spellSlots = nextSlots[1] || [];

    // Restore all class features
    const availableFeatures = getAvailableFeatures(char.class, newLevel, char.subclass);
    const nextFeatures: Record<string, boolean[] | number> = {};

    availableFeatures.forEach((feature) => {
      const featureName =
        typeof feature.name === 'function' ? feature.name(newLevel, conMod) : feature.name;
      const featureKey = featureName.replace(/\s+/g, '');

      if (feature.type === 'uses') {
        const maxUses =
          typeof feature.maxUses === 'function'
            ? feature.maxUses(newLevel, conMod)
            : feature.maxUses || 0;
        nextFeatures[featureKey] = Array(maxUses).fill(false);
      } else if (feature.type === 'pool') {
        const maxPool =
          typeof feature.maxPool === 'function' ? feature.maxPool(newLevel) : feature.maxPool;
        if (maxPool !== undefined) {
          nextFeatures[featureKey] = maxPool;
        }
      }
    });

    char.classFeatures.features = nextFeatures;

    // Restore hit dice to match new level
    char.hitDice.max = newLevel;
    char.hitDice.current = newLevel;
    return char;
  });
}

export function levelDownCharacter() {
  character.update((char) => {
    if (char.level <= 1 || !char.class) {
      return char;
    }

    const previousLevel = char.level;
    const newLevel = previousLevel - 1;

    ensureCharacterStructures(char);

    // Store current level's HP before downleveling
    char.hpByLevel![previousLevel] = char.maxHP;

    // Restore HP from the level we're going back to
    const targetHP = char.hpByLevel![newLevel];
    if (targetHP !== undefined) {
      char.maxHP = targetHP;
      char.currentHP = Math.min(char.currentHP, targetHP);
    } else {
      // Fallback: calculate HP for this level
      char.maxHP = getCalculatedHPAtLevel(char, newLevel);
      char.currentHP = Math.min(char.currentHP, char.maxHP);
    }

    char.level = newLevel;
    syncLevelDerivedState(char, previousLevel);

    // Adjust hit dice
    char.hitDice.max = newLevel;
    char.hitDice.current = Math.min(char.hitDice.current, newLevel);

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

        if (!merged.hpByLevel) {
          merged.hpByLevel = {};
        }

        if (!merged.hpRolls) {
          merged.hpRolls = [];
        }

        ensureHPHistory(merged);

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
    // Ensure uses is always an object
    if (!char.racialTraits) {
      char.racialTraits = { uses: {} };
    }
    if (!char.racialTraits!.uses) {
      char.racialTraits!.uses = {};
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
  rollHistory: boolean;
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
      damageInput: false,
      rollHistory: false
    };
  }

  try {
    const saved = localStorage.getItem('dndCollapsedStates');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure damageInput and rollHistory exist in loaded state
      return {
        characterInfo: parsed.characterInfo ?? false,
        combatStats: parsed.combatStats ?? false,
        abilityScores: parsed.abilityScores ?? false,
        skills: parsed.skills ?? false,
        attacks: parsed.attacks ?? false,
        classFeatures: parsed.classFeatures ?? false,
        notes: parsed.notes ?? false,
        damageInput: parsed.damageInput ?? false,
        rollHistory: parsed.rollHistory ?? false
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
    damageInput: false,
    rollHistory: false
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
