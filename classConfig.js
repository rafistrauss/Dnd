/**
 * Class Configuration System
 * Data-driven class definitions for D&D 5e
 */

const CLASS_CONFIG = {
  // Paladin - the original class
  paladin: {
    name: 'Paladin',
    hitDice: 'd10',
    spellcaster: true,
    spellcastingAbility: 'charisma',
    spellSlotsByLevel: {
      1: 0,
      2: 2,
      3: 3,
      4: 3,
      5: 4,
      6: 4,
      7: 4,
      8: 4,
      9: 4,
      10: 4,
      11: 4,
      12: 4,
      13: 4,
      14: 4,
      15: 4,
      16: 4,
      17: 4,
      18: 4,
      19: 4,
      20: 4
    },
    features: [
      {
        name: 'Divine Sense',
        type: 'uses',
        maxUses: (level, chaMod) => 1 + Math.max(1, chaMod),
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
        type: 'uses',
        maxUses: (level) => (level >= 18 ? 3 : level >= 6 ? 2 : 1),
        resetOn: 'short',
        description: 'Sacred Weapon or Turn Undead',
        minLevel: 3
      }
    ]
  },

  // Fighter - action surge and second wind
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
        maxUses: (level) => (level >= 17 ? 2 : 1),
        resetOn: 'short',
        description: 'Take one additional action on your turn',
        minLevel: 2
      },
      {
        name: 'Indomitable',
        type: 'uses',
        maxUses: (level) => (level >= 17 ? 3 : level >= 13 ? 2 : 1),
        resetOn: 'long',
        description: 'Reroll a failed saving throw',
        minLevel: 9
      }
    ]
  },

  // Rogue - sneak attack
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

  // Wizard - spell slots and arcane recovery
  wizard: {
    name: 'Wizard',
    hitDice: 'd6',
    spellcaster: true,
    spellcastingAbility: 'intelligence',
    spellSlotsByLevel: {
      1: 2,
      2: 3,
      3: 4,
      4: 4,
      5: 4,
      6: 4,
      7: 4,
      8: 4,
      9: 4,
      10: 4,
      11: 4,
      12: 4,
      13: 4,
      14: 4,
      15: 4,
      16: 4,
      17: 4,
      18: 4,
      19: 4,
      20: 4
    },
    features: [
      {
        name: 'Arcane Recovery',
        type: 'uses',
        maxUses: 1,
        resetOn: 'long',
        description: (level) =>
          `Recover spell slots totaling up to ${Math.ceil(level / 2)} levels during short rest`,
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

  // Cleric - channel divinity and spell slots
  cleric: {
    name: 'Cleric',
    hitDice: 'd8',
    spellcaster: true,
    spellcastingAbility: 'wisdom',
    spellSlotsByLevel: {
      1: 2,
      2: 3,
      3: 4,
      4: 4,
      5: 4,
      6: 4,
      7: 4,
      8: 4,
      9: 4,
      10: 4,
      11: 4,
      12: 4,
      13: 4,
      14: 4,
      15: 4,
      16: 4,
      17: 4,
      18: 4,
      19: 4,
      20: 4
    },
    features: [
      {
        name: 'Channel Divinity',
        type: 'uses',
        maxUses: (level) => (level >= 18 ? 3 : level >= 6 ? 2 : 1),
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
    ]
  },

  // Barbarian - rage
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
    ]
  }
};

// Helper function to get class config
function getClassConfig(className) {
  const key = className.toLowerCase();
  return CLASS_CONFIG[key] || null;
}

// Get available class features for a given class and level
function getAvailableFeatures(className, level) {
  const config = getClassConfig(className);
  if (!config) return [];

  return config.features.filter((feature) => !feature.minLevel || feature.minLevel <= level);
}

// Calculate proficiency bonus based on level
function calculateProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1;
}

// Get spell slots for a class at a given level
function getSpellSlots(className, level) {
  const config = getClassConfig(className);
  if (!config || !config.spellcaster) return 0;

  return config.spellSlotsByLevel[level] || 0;
}

// Get prepared spells count for spellcasters
function getPreparedSpellsCount(className, level, abilityMod) {
  const config = getClassConfig(className);
  if (!config || !config.spellcaster) return 0;

  return Math.max(1, abilityMod + level);
}

// Get spell save DC
function getSpellSaveDC(className, abilityMod, profBonus) {
  const config = getClassConfig(className);
  if (!config || !config.spellcaster) return null;

  return 8 + abilityMod + profBonus;
}

// Get list of all available classes
function getAvailableClasses() {
  return Object.keys(CLASS_CONFIG).map((key) => ({
    id: key,
    name: CLASS_CONFIG[key].name
  }));
}
