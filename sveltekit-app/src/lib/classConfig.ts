import type {
  ClassConfig,
  ClassName,
  ClassFeature,
  SubclassConfig,
  AbilityName,
  Ruleset
} from './types';

export const CLASS_CONFIG: Record<ClassName, ClassConfig> = {
  paladin: {
    name: 'Paladin',
    hitDice: 'd10',
    spellcaster: true,
    spellcastingAbility: 'charisma',
    // Half-caster: slots per spell level [1st, 2nd, 3rd, 4th, 5th] by character level
    spellSlotProgression: {
      1: [0, 0, 0, 0, 0],
      2: [2, 0, 0, 0, 0],
      3: [3, 0, 0, 0, 0],
      4: [3, 0, 0, 0, 0],
      5: [4, 2, 0, 0, 0],
      6: [4, 2, 0, 0, 0],
      7: [4, 3, 0, 0, 0],
      8: [4, 3, 0, 0, 0],
      9: [4, 3, 2, 0, 0],
      10: [4, 3, 2, 0, 0],
      11: [4, 3, 3, 0, 0],
      12: [4, 3, 3, 0, 0],
      13: [4, 3, 3, 1, 0],
      14: [4, 3, 3, 1, 0],
      15: [4, 3, 3, 2, 0],
      16: [4, 3, 3, 2, 0],
      17: [4, 3, 3, 3, 1],
      18: [4, 3, 3, 3, 1],
      19: [4, 3, 3, 3, 2],
      20: [4, 3, 3, 3, 2]
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
        name: 'Fighting Style',
        type: 'info',
        description: 'Gain a Fighting Style feat of your choice',
        minLevel: 2
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
        maxPool: (level) => (level >= 18 ? 3 : level >= 6 ? 2 : 1),
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
        name: 'Fighting Style',
        type: 'info',
        description: 'Gain a Fighting Style feat of your choice',
        minLevel: 1
      },
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
    ],
    subclasses: {
      champion: {
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
      battlemaster: {
        name: 'Battle Master',
        features: [
          {
            name: 'Combat Superiority',
            type: 'uses',
            maxUses: (level) => (level >= 15 ? 6 : level >= 7 ? 5 : 4),
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
    ],
    subclasses: {
      'arcane trickster': {
        name: 'Arcane Trickster',
        spellcaster: true,
        spellcastingAbility: 'intelligence',
        // Third-caster: slots per spell level [1st-4th] by character (rogue) level
        spellSlotProgression: {
          3: [2, 0, 0, 0],
          4: [3, 0, 0, 0],
          5: [3, 0, 0, 0],
          6: [3, 0, 0, 0],
          7: [4, 2, 0, 0],
          8: [4, 2, 0, 0],
          9: [4, 2, 0, 0],
          10: [4, 3, 0, 0],
          11: [4, 3, 0, 0],
          12: [4, 3, 0, 0],
          13: [4, 3, 2, 0],
          14: [4, 3, 2, 0],
          15: [4, 3, 2, 0],
          16: [4, 3, 3, 0],
          17: [4, 3, 3, 0],
          18: [4, 3, 3, 0],
          19: [4, 3, 3, 1],
          20: [4, 3, 3, 1]
        },
        features: [
          {
            name: 'Mage Hand Legerdemain',
            type: 'info',
            description:
              'Your Mage Hand is invisible and can stow/retrieve objects, pick locks, and disarm traps using your Sleight of Hand check.',
            minLevel: 3
          },
          {
            name: 'Magical Ambush',
            type: 'info',
            description:
              'If you are hidden from a creature when you cast a spell on it, it has Disadvantage on any saving throw it makes against the spell this turn.',
            minLevel: 9
          },
          {
            name: 'Versatile Trickster',
            type: 'info',
            description:
              'Use a bonus action to gain Advantage on attack rolls against a creature within 5 feet of your Mage Hand this turn.',
            minLevel: 13
          },
          {
            name: 'Spell Thief',
            type: 'uses',
            maxUses: 1,
            resetOn: 'long',
            description:
              'When a creature casts a spell targeting you, use your reaction to force a save; on a failure, you steal the spell for 8 hours.',
            minLevel: 17
          }
        ]
      }
    }
  },

  wizard: {
    name: 'Wizard',
    hitDice: 'd6',
    spellcaster: true,
    spellcastingAbility: 'intelligence',
    // Full-caster: slots per spell level [1st–9th] by character level
    spellSlotProgression: {
      1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
      2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
      3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
      4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
      5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
      6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
      7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
      8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
      9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
      10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
      11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
      12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
      13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
      14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
      15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
      16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
      17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
      18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
      19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
      20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
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
    ],
    subclasses: {
      evoker: {
        name: 'Evoker',
        features: [
          {
            name: 'Potent Cantrip',
            type: 'info',
            description:
              "When you cast a damaging cantrip at a creature and you miss with the attack roll or the target succeeds on the saving throw, the target takes half the cantrip's damage (if any) but suffers no additional effect from the cantrip.",
            minLevel: 3
          }
        ]
      }
    }
  },

  cleric: {
    name: 'Cleric',
    hitDice: 'd8',
    spellcaster: true,
    spellcastingAbility: 'wisdom',
    // Full-caster: slots per spell level [1st–9th] by character level
    spellSlotProgression: {
      1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
      2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
      3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
      4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
      5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
      6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
      7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
      8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
      9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
      10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
      11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
      12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
      13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
      14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
      15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
      16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
      17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
      18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
      19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
      20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
    },
    features: [
      {
        name: 'Channel Divinity',
        type: 'pool',
        // These are the 2014 rules
        // maxPool: (level) => (level >= 18 ? 3 : level >= 6 ? 2 : 1),
        // These are the 2024 rules:
        maxPool: (level) => (level >= 18 ? 4 : level >= 6 ? 3 : 2),
        resetOn: 'short',
        description: 'Turn Undead or domain-specific ability',
        minLevel: 2
      },
      {
        name: (level) => {
          if (level >= 5) return 'Sear Undead';
          return 'Turn Undead';
        },
        subName: (level) => (level >= 5 ? 'Improved Turn Undead' : null),
        type: 'channelDivinity',
        description: (level, wisMod = 1) => {
          let description =
            'As a Magic action, you present your Holy Symbol and censure Undead creatures. Each Undead of your choice within 30 feet of you must make a Wisdom saving throw. If the creature fails its save, it has the Frightened and Incapacitated conditions for 1 minute. For that duration, it tries to move as far from you as it can on its turns. This effect ends early on the creature if it takes any damage, if you have the Incapacitated condition, or if you die.';

          if (level >= 5) {
            const diceCount = Math.max(1, wisMod);
            description += ` <br /><br />
            
          With Sear Undead, roll ${diceCount}d8 radiant damage to turned undead.`;
          }
          return description;
        },
        minLevel: 2,
        rollable: true,
        rollFormula: (level, wisMod = 1) => {
          if (level >= 5) {
            const diceCount = Math.max(1, wisMod);
            return `${diceCount}d8`;
          }
          return '';
        }
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
      war: {
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
            name: 'Channel Divinity',
            type: 'info',
            description: 'Additional Channel Divinity options from War Domain',
            minLevel: 2,
            subFeatures: [
              {
                name: 'Guided Strike',
                type: 'channelDivinity',
                description:
                  'Use your Channel Divinity to gain +10 to an attack roll. Make this choice after you see the roll, but before the DM says whether the attack hits or misses.',
                minLevel: 2
              },
              {
                name: "War God's Blessing",
                type: 'channelDivinity',
                description:
                  "Use reaction to grant +10 to an ally's attack roll within 30 feet. Consumes one use of Channel Divinity.",
                minLevel: 6,
                resetOn: 'short'
              }
            ]
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
            rollFormula: (level) => (level >= 14 ? '2d8' : '1d8')
          },
          {
            name: 'Avatar of Battle',
            type: 'info',
            description: 'Gain resistance to nonmagical weapon damage',
            minLevel: 17
          }
        ]
      },
      life: {
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
            rollFormula: (level) => (level >= 14 ? '2d8' : '1d8')
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
      berserker: {
        name: 'Path of the Berserker',
        features: [
          {
            name: 'Frenzy',
            type: 'info',
            description:
              'While raging, make melee attack as bonus action (gain 1 exhaustion after rage)',
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

function findSubclass(config: ClassConfig, subclassName?: string): SubclassConfig | null {
  if (!subclassName || !config.subclasses) return null;
  const wanted = subclassName.trim().toLowerCase();
  const key = Object.keys(config.subclasses).find(
    (k) => k.toLowerCase() === wanted || config.subclasses![k].name.toLowerCase() === wanted
  );
  return key ? config.subclasses[key] : null;
}

export function getSubclassConfig(className: string, subclassName?: string): SubclassConfig | null {
  const config = getClassConfig(className);
  return config ? findSubclass(config, subclassName) : null;
}

/**
 * Whether the class (or its subclass, e.g. Arcane Trickster) grants spellcasting.
 */
export function isSpellcaster(className: string, subclassName?: string): boolean {
  const config = getClassConfig(className);
  if (config?.spellcaster) return true;
  return !!getSubclassConfig(className, subclassName)?.spellcaster;
}

/**
 * The spellcasting ability for the class or a spellcasting subclass.
 */
export function getSpellcastingAbility(
  className: string,
  subclassName?: string
): AbilityName | null {
  const config = getClassConfig(className);
  if (config?.spellcaster && config.spellcastingAbility) return config.spellcastingAbility;
  const subclass = getSubclassConfig(className, subclassName);
  if (subclass?.spellcaster && subclass.spellcastingAbility) return subclass.spellcastingAbility;
  return null;
}

export function getAvailableFeatures(
  className: string,
  level: number,
  subclassName?: string,
  ruleset: Ruleset = '2024'
): ClassFeature[] {
  const config = getClassConfig(className);
  if (!config) return [];

  let definitions = config.features;
  let subclassDefinitions = findSubclass(config, subclassName)?.features ?? [];
  if (className.toLowerCase() === 'fighter' && ruleset === '2024') {
    definitions = config.features.map((feature) =>
      feature.name === 'Second Wind'
        ? {
            ...feature,
            maxUses: (level: number) => (level >= 10 ? 4 : level >= 4 ? 3 : 2),
            resetOn: 'long' as const,
            shortRestRecovery: 1,
            description:
              'As a Bonus Action, regain 1d10 + Fighter level HP. Recover one use on a Short Rest and all uses on a Long Rest.'
          }
        : feature
    );
    definitions = [
      ...definitions,
      {
        name: 'Weapon Mastery',
        type: 'info',
        minLevel: 1,
        description: (level) =>
          `Choose ${getFighterMasteryCount(level)} weapon types for mastery. After a Long Rest, you can replace one choice.`
      },
      {
        name: 'Tactical Mind',
        type: 'info',
        minLevel: 2,
        rollable: true,
        rollFormula: '1d10',
        description:
          'After a failed ability check, add 1d10. Spend one Second Wind use only if the check then succeeds. Mark that use in Second Wind.'
      },
      {
        name: 'Extra Attack',
        type: 'info',
        minLevel: 5,
        description: (level) =>
          `Make ${level >= 20 ? 4 : level >= 11 ? 3 : 2} attacks when you take the Attack action on your turn.`
      },
      {
        name: 'Tactical Shift',
        type: 'info',
        minLevel: 5,
        description:
          'When you use Second Wind as a Bonus Action, you can move up to half your Speed without Opportunity Attacks.'
      }
    ];
    if (subclassName?.toLowerCase() === 'champion') {
      subclassDefinitions = subclassDefinitions.map((feature) => {
        if (feature.name === 'Remarkable Athlete')
          return {
            ...feature,
            minLevel: 3,
            description:
              'You have Advantage on Initiative and Strength (Athletics) checks. After a critical hit, you can move up to half your Speed without Opportunity Attacks.'
          };
        if (feature.name === 'Additional Fighting Style') return { ...feature, minLevel: 7 };
        return feature;
      });
      subclassDefinitions = [
        ...subclassDefinitions,
        {
          name: 'Heroic Warrior',
          type: 'info',
          minLevel: 10,
          description: 'During combat, gain Heroic Inspiration when you start your turn without it.'
        }
      ];
    }
  }
  const classFeatures = definitions.filter(
    (feature) => !feature.minLevel || feature.minLevel <= level
  );

  // If subclass is specified, add its features
  const subclass = findSubclass(config, subclassName);
  if (subclass) {
    const subclassFeatures = subclassDefinitions.filter(
      (feature) => !feature.minLevel || feature.minLevel <= level
    );
    return [...classFeatures, ...subclassFeatures];
  }

  return classFeatures;
}

export function getFighterMasteryCount(level: number): number {
  return level >= 16 ? 6 : level >= 10 ? 5 : level >= 4 ? 4 : 3;
}

export function hasRemarkableAthlete(char: {
  class: string;
  subclass?: string;
  level: number;
  ruleset?: Ruleset;
}): boolean {
  return (
    char.ruleset !== '2014' &&
    char.class.toLowerCase() === 'fighter' &&
    char.subclass?.toLowerCase() === 'champion' &&
    char.level >= 3
  );
}

export function getAvailableSubclasses(className: string): { id: string; name: string }[] {
  const config = getClassConfig(className);
  if (!config || !config.subclasses) return [];

  return Object.keys(config.subclasses).map((key) => ({
    id: key,
    name: config.subclasses![key].name
  }));
}

export function getSpellSlots(className: string, level: number): number {
  const config = getClassConfig(className);
  if (!config || !config.spellcaster || !config.spellSlotsByLevel) return 0;

  return config.spellSlotsByLevel[level] || 0;
}

/**
 * Returns the number of spell slots for each spell level (indices 0–8 = spell levels 1–9)
 * at the given character level, or an empty array if the class has no spell slot progression.
 */
export function getSpellSlotProgression(
  className: string,
  charLevel: number,
  subclassName?: string
): number[] {
  const subclass = getSubclassConfig(className, subclassName);
  if (subclass?.spellcaster && subclass.spellSlotProgression) {
    return subclass.spellSlotProgression[charLevel] ?? [];
  }
  const config = getClassConfig(className);
  if (!config || !config.spellcaster || !config.spellSlotProgression) return [];
  return config.spellSlotProgression[charLevel] ?? [];
}

export function getPreparedSpellsCount(
  className: string,
  level: number,
  abilityMod: number,
  subclassName?: string
): number {
  if (!isSpellcaster(className, subclassName)) return 0;

  return Math.max(1, abilityMod + level);
}

export function getSpellSaveDC(
  className: string,
  abilityMod: number,
  profBonus: number,
  subclassName?: string
): number | null {
  if (!isSpellcaster(className, subclassName)) return null;

  return 8 + abilityMod + profBonus;
}

export function getAvailableClasses(): { id: ClassName; name: string }[] {
  return Object.keys(CLASS_CONFIG).map((key) => ({
    id: key as ClassName,
    name: CLASS_CONFIG[key as ClassName].name
  }));
}
