<script lang="ts">
  import { character, abilityModifiers, collapsedStates, toasts } from '$lib/stores';
  import { getAvailableRacialTraits } from '$lib/raceData';
  import { loadSpells } from '$lib/dndData';
  import SectionHeader from './SectionHeader.svelte';
  import SpellCard from './SpellCard.svelte';
  import type { RacialTrait, RacialSpellTrait, Spell } from '$lib/types';
  import { onMount } from 'svelte';

  // Use character's stored racial traits directly for reactive updates
  $: racialTraits = $character.racialTraits || [];

  let spells: Spell[] = [];
  let spellsLoaded = false;

  onMount(async () => {
    spells = await loadSpells();
    spellsLoaded = true;
    console.log('Racial Traits: Loaded', spells.length, 'spells');
    console.log('Looking for: Mage Hand, Jump, Misty Step');
    console.log('Mage Hand found?', spells.find(s => s.name.toLowerCase() === 'mage hand'));
    console.log('Jump found?', spells.find(s => s.name.toLowerCase() === 'jump'));
    console.log('Misty Step found?', spells.find(s => s.name.toLowerCase() === 'misty step'));
  });

  function getSpellByName(name: string): Spell | undefined {
    const found = spells.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (!found) {
      console.log('Spell not found:', name, 'Available spells:', spells.length);
    }
    return found;
  }

  // Get the casting modifier for a trait
  function getCastingModifier(trait: RacialTrait): number {
    return $abilityModifiers[trait.castingAbility] || 0;
  }

  // Get spell attack bonus
  function getSpellAttackBonus(trait: RacialTrait): number {
    return getCastingModifier(trait) + $character.proficiencyBonus;
  }

  // Get spell save DC
  function getSpellSaveDC(trait: RacialTrait): number {
    return 8 + getCastingModifier(trait) + $character.proficiencyBonus;
  }

  // Check if a spell is currently available to cast
  function isSpellAvailable(trait: RacialTrait, spell: RacialSpellTrait): boolean {
    // At-will spells are always available
    if (spell.usesPerRest === 'at-will') return true;

    // If spell consumes trait's shared use, check trait-level uses
    if (spell.consumesTraitUse) {
      return (trait.currentUses ?? 0) > 0;
    }

    // Otherwise check spell-level uses
    return (spell.currentUses ?? 0) > 0;
  }

  // Use a racial spell
  function useSpell(traitIndex: number, spellIndex: number) {
    console.log('useSpell called', { traitIndex, spellIndex });
    character.update((c) => {
      console.log('Character update function called', c.racialTraits);
      if (!c.racialTraits) return c;

      const trait = c.racialTraits[traitIndex];
      const spell = trait.spells[spellIndex];
      console.log('Trait:', trait, 'Spell:', spell);

      // Don't consume uses for at-will spells
      if (spell.usesPerRest === 'at-will') {
        console.log('At-will spell, not consuming uses');
        return c;
      }

      // Create a new array to ensure reactivity
      const newTraits = [...c.racialTraits];

      // If spell consumes trait's shared use
      if (spell.consumesTraitUse && trait.currentUses !== undefined) {
        console.log('Spell consumes trait use. Current uses:', trait.currentUses);
        if (trait.currentUses > 0) {
          newTraits[traitIndex] = {
            ...trait,
            currentUses: trait.currentUses - 1
          };
          console.log('Decremented trait uses to:', trait.currentUses - 1);
        }
      }
      // If spell has separate uses
      else if (spell.currentUses !== undefined && spell.currentUses > 0) {
        console.log('Spell has separate uses. Current:', spell.currentUses);
        const newSpells = [...trait.spells];
        newSpells[spellIndex] = {
          ...spell,
          currentUses: spell.currentUses - 1
        };
        newTraits[traitIndex] = {
          ...trait,
          spells: newSpells
        };
        console.log('Decremented spell uses to:', spell.currentUses - 1);
      }

      return {
        ...c,
        racialTraits: newTraits
      };
    });
  }

  // Reset trait uses
  function resetTraitUses(traitIndex: number) {
    character.update((c) => {
      if (!c.racialTraits) return c;

      const trait = c.racialTraits[traitIndex];

      // Reset trait-level shared uses
      if (trait.usesPerRest !== undefined) {
        c.racialTraits[traitIndex] = {
          ...trait,
          currentUses: trait.usesPerRest
        };
      }

      // Reset spell-level uses (for spells with separate tracking)
      trait.spells.forEach((spell, spellIdx) => {
        if (
          spell.usesPerRest !== 'at-will' &&
          !spell.consumesTraitUse &&
          typeof spell.usesPerRest === 'number'
        ) {
          c.racialTraits![traitIndex].spells[spellIdx] = {
            ...spell,
            currentUses: spell.usesPerRest
          };
        }
      });

      return c;
    });
  }

  // Get display text for uses
  function getUsesText(trait: RacialTrait, spell: RacialSpellTrait): string {
    if (spell.usesPerRest === 'at-will') return 'At will';

    if (spell.consumesTraitUse) {
      const current = trait.currentUses ?? 0;
      const max = trait.usesPerRest ?? 0;
      return `${current}/${max} uses`;
    }

    if (typeof spell.usesPerRest === 'number') {
      const current = spell.currentUses ?? 0;
      return `${current}/${spell.usesPerRest} uses`;
    }

    return '';
  }

  // Get rest type text
  function getRestTypeText(trait: RacialTrait, spell: RacialSpellTrait): string {
    if (spell.usesPerRest === 'at-will') return '';

    const restType = spell.consumesTraitUse ? trait.restType : spell.restType;
    return restType ? ` (${restType} rest)` : '';
  }

  function handleCastSpell(traitIndex: number, spellIndex: number) {
    console.log('handleCastSpell called', traitIndex, spellIndex);
    
    const trait = $character.racialTraits?.[traitIndex];
    if (!trait) return;
    
    const spell = trait.spells[spellIndex];
    const spellData = spells.find((s) => s.name.toLowerCase() === spell.spellName.toLowerCase());
    
    // Show toast notification
    if (spellData) {
      toasts.add(`Cast ${spellData.name}`, 'success');
    }
    
    // Consume use and trigger any spell effect
    useSpell(traitIndex, spellIndex);
  }
</script>

{#if racialTraits.length > 0}
  <section class="racial-traits">
    <SectionHeader
      title="Racial Traits"
      collapsed={$collapsedStates.racialTraits}
      ariaLabel={$collapsedStates.racialTraits ? 'Expand' : 'Collapse'}
      onToggle={() => collapsedStates.update((s) => ({ ...s, racialTraits: !s.racialTraits }))}
    />
    {#if !$collapsedStates.racialTraits}
      <div class="traits-container">
        {#each racialTraits as trait, traitIdx}
          {#if trait.spells.length > 0}
            <div class="racial-trait">
              <div class="trait-header">
                <h3 class="trait-name">{trait.name}</h3>
                <div class="trait-stats">
                  <span class="stat" title="Spell Attack Bonus">
                    Attack: +{getSpellAttackBonus(trait)}
                  </span>
                  <span class="stat" title="Spell Save DC">DC: {getSpellSaveDC(trait)}</span>
                  <span class="stat ability-indicator" title="Spellcasting Ability">
                    {trait.castingAbility.charAt(0).toUpperCase() +
                      trait.castingAbility.slice(1, 3).toUpperCase()}
                  </span>
                </div>
              </div>

              <p class="trait-description">{trait.description}</p>

              {#if trait.usesPerRest}
                <div class="shared-uses">
                  <span class="uses-label">Shared Uses:</span>
                  <span class="uses-count"
                    >{trait.currentUses ?? 0}/{trait.usesPerRest}</span
                  >
                  <span class="rest-type">({trait.restType} rest)</span>
                  <button
                    class="reset-button"
                    on:click={() => resetTraitUses(traitIdx)}
                    disabled={trait.currentUses === trait.usesPerRest}
                    title="Reset uses">↻</button
                  >
                </div>
              {/if}

              <div class="spells-list">
                {#each trait.spells as spell, spellIdx}
                  {#if spellsLoaded}
                    {@const spellData = getSpellByName(spell.spellName)}
                    {@const available = isSpellAvailable(trait, spell)}
                    {#if spellData}
                      <div class="spell-wrapper" class:unavailable={!available}>
                        <SpellCard
                          spell={spellData}
                          spellName={spell.spellName}
                          specialNotes={spell.specialNotes}
                          hideComponents={!trait.requiresComponents}
                          showLevelSelector={false}
                          showTargetOptions={false}
                          forceUtilityMode={true}
                          disabled={!available}
                          availableLevels={[]}
                          on:castSpell={() => available && handleCastSpell(traitIdx, spellIdx)}
                        />
                        <div class="usage-info">
                          <span class="uses-display">
                            {getUsesText(trait, spell)}{getRestTypeText(trait, spell)}
                          </span>
                        </div>
                      </div>
                    {:else}
                      <div class="spell-missing">Spell "{spell.spellName}" not found</div>
                    {/if}
                  {:else}
                    <div class="spell-loading">Loading {spell.spellName}...</div>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </section>
{/if}

<style>
  .racial-traits {
    background: var(--section-bg);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .traits-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .racial-trait {
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 1.5rem;
  }

  .racial-trait:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .trait-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .trait-name {
    color: var(--primary-color);
    font-size: 1.3rem;
    margin: 0;
    font-weight: bold;
  }

  .trait-stats {
    display: flex;
    gap: 0.75rem;
    font-size: 0.9rem;
  }

  .stat {
    color: var(--text-color);
    background: rgba(0, 123, 255, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .ability-indicator {
    font-weight: bold;
    background: rgba(0, 123, 255, 0.2);
  }

  .trait-description {
    color: #666;
    font-size: 0.9rem;
    line-height: 1.5;
    margin: 0.5rem 0 1rem 0;
    font-style: italic;
  }

  .shared-uses {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    margin: 0.75rem 0;
    font-size: 0.95rem;
  }

  .uses-label {
    color: #856404;
    font-weight: bold;
  }

  .uses-count {
    color: #856404;
    font-weight: bold;
  }

  .rest-type {
    color: #856404;
    font-size: 0.85rem;
  }

  .reset-button {
    margin-left: auto;
    background: #ffc107;
    border: 1px solid #e0a800;
    color: #856404;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: bold;
  }

  .reset-button:hover:not(:disabled) {
    background: #e0a800;
  }

  .reset-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .spells-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-top: 1rem;
  }

  .spell-wrapper {
    transition: opacity 0.2s;
  }

  .usage-info {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: #e7f3ff;
    border: 1px solid #b3d9ff;
    border-radius: 4px;
    text-align: center;
  }

  .uses-display {
    color: #495057;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .spell-loading {
    padding: 1rem;
    text-align: center;
    color: #666;
    font-style: italic;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .spell-missing {
    padding: 1rem;
    text-align: center;
    color: #721c24;
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    .trait-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .trait-stats {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
