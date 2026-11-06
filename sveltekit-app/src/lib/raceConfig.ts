import type { AbilityName, Ruleset } from './types';

export interface RacialSpell {
  name: string;
  level: number;
  minCharacterLevel: number;
  usesPerRest?: number; // If undefined, it's a cantrip or always available
  restType?: 'short' | 'long';
  notes?: string; // Special notes about this spell when used as racial trait
}

export interface RacialTrait {
  name: string;
  description: string;
  spells?: RacialSpell[];
  spellcastingAbility?: AbilityName;
  componentsRequired?: boolean; // Default false for racial spells
  resistances?: string[];
  minLevel?: number;
  usesKey?: string;
  usesPerRest?: number | ((proficiencyBonus: number) => number);
  restType?: 'short' | 'long';
  bonusAction?: boolean;
}

export interface RaceConfig {
  name: string;
  traits: RacialTrait[];
}

export const RACE_CONFIG: Record<string, RaceConfig> = {
  goliath: {
    name: 'Goliath',
    traits: [
      {
        name: 'Giant Ancestry',
        description:
          'Choose your giant ancestry. You can use its benefit a number of times equal to your Proficiency Bonus. Recover all uses on a Long Rest.',
        usesKey: 'GiantAncestry',
        usesPerRest: (proficiencyBonus) => proficiencyBonus,
        restType: 'long'
      },
      {
        name: 'Large Form',
        minLevel: 5,
        description:
          'As a Bonus Action, become Large for up to 10 minutes. You need enough space. Gain Advantage on Strength checks and +10 feet of Speed.',
        usesKey: 'LargeForm',
        usesPerRest: 1,
        restType: 'long',
        bonusAction: true
      },
      {
        name: 'Powerful Build',
        description:
          'Gain Advantage on checks to end the Grappled condition. Count as one size larger for carrying capacity.'
      }
    ]
  },
  githyanki: {
    name: 'Githyanki',
    traits: [
      {
        name: 'Astral Knowledge',
        description:
          'Whenever you finish a long rest, you gain proficiency in one skill of your choice and with one weapon or tool of your choice, selected from the Player’s Handbook, as you momentarily project your consciousness into the Astral Plane. These proficiencies last until the end of your next long rest.'
      },
      {
        name: 'Psychic Resilience',
        description: 'You have resistance to psychic damage.',
        resistances: ['psychic']
      },
      {
        name: 'Githyanki Psionics',
        description:
          "You know the Mage Hand cantrip, and the hand is invisible when you cast the cantrip with this trait. When you reach 3rd level, you can cast the Jump spell once with this trait, and you regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Misty Step spell once with this trait, and you regain the ability to do so when you finish a long rest. Intelligence is your spellcasting ability for these spells. When you cast them with this trait, they don't require components.",
        spells: [
          {
            name: 'Mage Hand',
            level: 0,
            minCharacterLevel: 1,
            notes: 'The hand is invisible when cast with this trait'
          },
          {
            name: 'Jump',
            level: 1,
            minCharacterLevel: 3,
            usesPerRest: 1,
            restType: 'long'
          },
          {
            name: 'Misty Step',
            level: 2,
            minCharacterLevel: 5,
            usesPerRest: 1,
            restType: 'long'
          }
        ],
        spellcastingAbility: 'intelligence',
        componentsRequired: false
      }
    ]
  }
};

export const GIANT_ANCESTRIES: Record<string, string> = {
  cloud: "Cloud's Jaunt: teleport up to 30 feet as a Bonus Action.",
  fire: "Fire's Burn: add 1d10 Fire damage after an attack hits and deals damage.",
  frost:
    "Frost's Chill: add 1d6 Cold damage and reduce Speed by 10 feet until your next turn after an attack hits and deals damage.",
  hill: "Hill's Tumble: after an attack hits and deals damage, knock a Large or smaller target Prone.",
  stone:
    "Stone's Endurance: use a Reaction to reduce incoming damage by 1d12 + Constitution modifier.",
  storm:
    "Storm's Thunder: use a Reaction after a creature within 60 feet damages you to deal 1d8 Thunder damage to it."
};

export function getRacialTraitsForLevel(
  race: string,
  level: number,
  ruleset?: Ruleset
): RacialTrait[] {
  return (getRaceConfig(race, ruleset)?.traits ?? []).filter(
    (trait) => level >= (trait.minLevel ?? 1)
  );
}

export function getRaceConfig(race: string, ruleset: Ruleset = '2024'): RaceConfig | null {
  const normalizedRace = race.toLowerCase().trim();
  if (normalizedRace === 'goliath' && ruleset === '2014') return null;
  return RACE_CONFIG[normalizedRace] || null;
}

export function getRacialSpellsForLevel(race: string, characterLevel: number): RacialSpell[] {
  const raceConfig = getRaceConfig(race);
  if (!raceConfig) return [];

  const allSpells: RacialSpell[] = [];
  raceConfig.traits.forEach((trait) => {
    if (trait.spells) {
      trait.spells.forEach((spell) => {
        if (characterLevel >= spell.minCharacterLevel) {
          allSpells.push(spell);
        }
      });
    }
  });

  return allSpells;
}

export function getAvailableRaces(): Array<{ id: string; name: string }> {
  return Object.entries(RACE_CONFIG).map(([id, config]) => ({
    id,
    name: config.name
  }));
}
