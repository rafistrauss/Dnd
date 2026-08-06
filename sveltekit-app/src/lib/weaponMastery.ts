// Weapon Mastery Properties (D&D 2024 PHB)

export type WeaponMasteryName =
  | 'Cleave'
  | 'Graze'
  | 'Nick'
  | 'Push'
  | 'Sap'
  | 'Slow'
  | 'Topple'
  | 'Vex';

export interface WeaponMastery {
  name: WeaponMasteryName;
  /** When the effect triggers */
  trigger: 'on-hit' | 'on-miss' | 'passive';
  /** Short summary shown in use mode */
  summary: string;
  /** Full description */
  description: string;
}

export const WEAPON_MASTERIES: WeaponMastery[] = [
  {
    name: 'Cleave',
    trigger: 'on-hit',
    summary: 'On hit → deal STR mod to adjacent creature',
    description:
      'If you hit a creature with a melee attack using this weapon, you can make a free attack against a second creature within reach and within 5 ft of the first. The extra attack automatically hits and deals damage equal to your Strength modifier (minimum 0, same damage type).'
  },
  {
    name: 'Graze',
    trigger: 'on-miss',
    summary: 'On miss → deal ability mod damage',
    description:
      'If your attack roll misses a creature, you can deal damage equal to your Strength or Dexterity modifier to that creature (your choice, minimum 0). This damage is the same type as the weapon.'
  },
  {
    name: 'Nick',
    trigger: 'passive',
    summary: 'Light extra attack is free (no Bonus Action)',
    description:
      'When you make the extra attack granted by the Light weapon property, that attack does not require your Bonus Action — it is a free part of the Attack action.'
  },
  {
    name: 'Push',
    trigger: 'on-hit',
    summary: 'On hit → push target 10 ft away',
    description:
      'If you hit a creature with this weapon, you can push the target up to 10 feet straight away from you (your choice).'
  },
  {
    name: 'Sap',
    trigger: 'on-hit',
    summary: 'On hit → target has Disadvantage on next attack',
    description:
      'If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll before the start of your next turn.'
  },
  {
    name: 'Slow',
    trigger: 'on-hit',
    summary: 'On hit → target speed −10 ft until your next turn',
    description:
      'If you hit a creature with this weapon, the target\'s Speed is reduced by 10 feet until the start of your next turn.'
  },
  {
    name: 'Topple',
    trigger: 'on-hit',
    summary: 'On hit → CON save or Prone',
    description:
      'If you hit a creature with this weapon, you can force the target to make a Constitution saving throw (DC = 8 + your proficiency bonus + the ability modifier used for the attack). On a failure, the target has the Prone condition.'
  },
  {
    name: 'Vex',
    trigger: 'on-hit',
    summary: 'On hit → Advantage on your next attack vs that target',
    description:
      'If you hit a creature with this weapon, you have Advantage on your next attack roll against that creature before the end of your next turn.'
  }
];

export const MASTERY_MAP: Record<WeaponMasteryName, WeaponMastery> = Object.fromEntries(
  WEAPON_MASTERIES.map((m) => [m.name, m])
) as Record<WeaponMasteryName, WeaponMastery>;
