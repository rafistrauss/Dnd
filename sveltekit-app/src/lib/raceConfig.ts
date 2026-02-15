import type { AbilityName } from './types';

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
}

export interface RaceConfig {
  name: string;
  traits: RacialTrait[];
}

export const RACE_CONFIG: Record<string, RaceConfig> = {
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

export function getRaceConfig(race: string): RaceConfig | null {
  const normalizedRace = race.toLowerCase().trim();
  return RACE_CONFIG[normalizedRace] || null;
}

export function getRacialSpellsForLevel(
  race: string,
  characterLevel: number
): RacialSpell[] {
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
