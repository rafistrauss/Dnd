import type { RacialTrait } from './types';

/**
 * Race configurations with their racial traits
 */

export interface RaceConfig {
  name: string;
  traits: RacialTrait[];
}

export const RACE_CONFIGS: Record<string, RaceConfig> = {
  githyanki: {
    name: 'Githyanki',
    traits: [
      {
        name: 'Githyanki Psionics',
        description:
          'You know the Mage Hand cantrip, and the hand is invisible when you cast the cantrip with this trait. When you reach 3rd level, you can cast the Jump spell once with this trait, and you regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the Misty Step spell once with this trait, and you regain the ability to do so when you finish a long rest. Intelligence is your spellcasting ability for these spells. When you cast them with this trait, they don\'t require components.',
        castingAbility: 'intelligence',
        requiresComponents: false,
        // Shared use pool for Jump and Misty Step
        usesPerRest: 1,
        restType: 'long',
        currentUses: 1,
        spells: [
          {
            spellName: 'Mage Hand',
            minLevel: 1,
            usesPerRest: 'at-will',
            specialNotes: 'The hand is invisible',
            consumesTraitUse: false // Cantrip doesn't consume the shared use
          },
          {
            spellName: 'Jump',
            minLevel: 3,
            specialNotes: 'Shares use with Misty Step',
            consumesTraitUse: true // Consumes the trait's shared use
          },
          {
            spellName: 'Misty Step',
            minLevel: 5,
            specialNotes: 'Shares use with Jump',
            consumesTraitUse: true // Consumes the trait's shared use
          }
        ]
      }
    ]
  }
};

/**
 * Get race configuration by race name (case-insensitive)
 */
export function getRaceConfig(raceName: string): RaceConfig | null {
  if (!raceName) return null;
  const normalizedName = raceName.toLowerCase().trim();
  return RACE_CONFIGS[normalizedName] || null;
}

/**
 * Get available racial traits for a character based on their race and level
 */
export function getAvailableRacialTraits(
  raceName: string,
  characterLevel: number
): RacialTrait[] {
  const raceConfig = getRaceConfig(raceName);
  if (!raceConfig) return [];

  // Filter spells based on character level
  return raceConfig.traits.map((trait) => ({
    ...trait,
    spells: trait.spells.filter((spell) => characterLevel >= spell.minLevel)
  }));
}

/**
 * Initialize racial trait uses for a character
 */
export function initializeRacialTraitUses(traits: RacialTrait[]): RacialTrait[] {
  console.log('initializeRacialTraitUses called with:', traits);
  return traits.map((trait) => ({
    ...trait,
    // Initialize trait-level shared uses - if usesPerRest is defined, use it, otherwise keep currentUses
    currentUses: trait.usesPerRest !== undefined ? trait.usesPerRest : (trait.currentUses ?? 0),
    spells: trait.spells.map((spell) => ({
      ...spell,
      // Only initialize spell-level uses if the spell has its own separate uses (not using trait's shared uses)
      currentUses:
        spell.usesPerRest === 'at-will' || spell.consumesTraitUse
          ? undefined
          : (spell.usesPerRest !== undefined ? spell.usesPerRest : (spell.currentUses ?? 0))
    }))
  }));
}

/**
 * Reset racial trait uses after a rest
 */
export function resetRacialTraitUses(
  traits: RacialTrait[],
  restType: 'short' | 'long'
): RacialTrait[] {
  console.log('resetRacialTraitUses called with:', { traits, restType });
  const result = traits.map((trait) => {
    // Reset trait-level shared uses
    let updatedTrait = { ...trait };
    console.log('Processing trait:', trait.name, 'usesPerRest:', trait.usesPerRest, 'restType:', trait.restType);
    if (trait.usesPerRest !== undefined && trait.restType) {
      if (trait.restType === restType || (restType === 'long' && trait.restType === 'short')) {
        updatedTrait.currentUses = trait.usesPerRest;
        console.log('Reset trait uses to:', trait.usesPerRest);
      }
    }

    // Reset spell-level uses (for spells with separate use tracking)
    updatedTrait.spells = trait.spells.map((spell) => {
      // Skip at-will spells and spells that use trait's shared uses
      if (spell.usesPerRest === 'at-will' || spell.consumesTraitUse) {
        return spell;
      }
      // Reset separate spell uses
      if (spell.restType === restType || (restType === 'long' && spell.restType === 'short')) {
        return {
          ...spell,
          currentUses: spell.usesPerRest
        };
      }
      return spell;
    });

    return updatedTrait;
  });
  console.log('resetRacialTraitUses result:', result);
  return result;
}
