<script lang="ts">
  import {
    character,
    initializeRacialTraits,
    useRacialTrait
  } from '$lib/stores';
  import { getRaceConfig, getRacialSpellsForLevel } from '$lib/raceConfig';
  import type { RacialSpell, RacialTrait } from '$lib/raceConfig';

  // Initialize racial traits when component mounts or race/level changes
  $: if ($character.race && $character.level) {
    initializeRacialTraits();
  }

  $: raceConfig = $character.race ? getRaceConfig($character.race) : null;
  $: racialSpells = getRacialSpellsForLevel($character.race, $character.level);

  function handleUseRacialSpell(spellName: string) {
    useRacialTrait(spellName);
  }

  function getRemainingUses(spellName: string): number {
    if (!$character.racialTraits) return 0;
    const traitUse = $character.racialTraits.uses[spellName];
    return traitUse ? traitUse.currentUses : 0;
  }

  function getMaxUses(spellName: string): number {
    if (!$character.racialTraits) return 0;
    const traitUse = $character.racialTraits.uses[spellName];
    return traitUse ? traitUse.maxUses : 0;
  }

  function hasLimitedUses(spell: RacialSpell): boolean {
    return spell.usesPerRest !== undefined;
  }

  $: hasVisibleRacialTraits =
    raceConfig &&
    raceConfig.traits &&
    raceConfig.traits.length > 0 &&
    racialSpells.length > 0;
</script>

{#if hasVisibleRacialTraits && raceConfig}
  <div class="racial-traits-section">
    <h3 class="racial-traits-title">Racial Traits</h3>

    {#each raceConfig.traits as trait}
      <div class="feature-box racial-trait">
        <h4>{trait.name}</h4>
        <p class="feature-description">{trait.description}</p>

        {#if trait.spells && racialSpells.length > 0}
          <div class="racial-spells">
            <h5>Spells:</h5>
            <div class="racial-spells-list">
              {#each racialSpells as spell}
                <div class="racial-spell-item">
                  <div class="spell-info">
                    <span class="spell-name">{spell.name}</span>
                    {#if spell.level === 0}
                      <span class="spell-type cantrip">Cantrip</span>
                    {:else}
                      <span class="spell-type">Level {spell.level}</span>
                    {/if}
                    {#if spell.notes}
                      <span class="spell-notes">({spell.notes})</span>
                    {/if}
                  </div>
                  {#if hasLimitedUses(spell)}
                    {@const remaining = getRemainingUses(spell.name)}
                    {@const max = getMaxUses(spell.name)}
                    <div class="spell-uses">
                      <span class="uses-count" class:depleted={remaining === 0}>
                        {remaining}/{max} uses
                      </span>
                      <button
                        class="btn btn-sm btn-primary"
                        disabled={remaining === 0}
                        aria-label="Use {spell.name}"
                        on:click={() => handleUseRacialSpell(spell.name)}
                      >
                        Use
                      </button>
                    </div>
                  {:else}
                    <div class="spell-uses">
                      <span class="uses-count unlimited">At will</span>
                    </div>
                  {/if}
                  <div class="spell-meta">
                    {#if spell.restType}
                      <span class="rest-type"
                        >Recharges on {spell.restType === 'short' ? 'Short' : 'Long'} Rest</span
                      >
                    {/if}
                    {#if trait.spellcastingAbility}
                      <span class="spellcasting-ability"
                        >Spellcasting: {trait.spellcastingAbility.toUpperCase()}</span
                      >
                    {/if}
                    {#if trait.componentsRequired === false}
                      <span class="no-components">No components required</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .racial-traits-section {
    margin-top: 20px;
  }

  .racial-traits-title {
    font-size: 1.2rem;
    color: var(--primary-color);
    margin-bottom: 15px;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 8px;
  }

  .racial-trait {
    background-color: var(--card-bg);
    border: 2px solid var(--primary-color);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
  }

  .racial-trait h4 {
    margin: 0 0 10px 0;
    color: var(--primary-color);
    font-size: 1.1rem;
  }

  .feature-description {
    margin-bottom: 15px;
    line-height: 1.5;
    color: var(--text-color);
  }

  .racial-spells h5 {
    margin-top: 15px;
    margin-bottom: 10px;
    font-size: 1rem;
    color: var(--text-color);
  }

  .racial-spells-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .racial-spell-item {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
  }

  .spell-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .spell-name {
    font-weight: bold;
    font-size: 1rem;
  }

  .spell-type {
    background-color: var(--primary-color);
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .spell-type.cantrip {
    background-color: #9333ea;
  }

  .spell-notes {
    font-style: italic;
    color: var(--text-color);
    font-size: 0.9rem;
  }

  .spell-uses {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .uses-count {
    font-weight: bold;
    padding: 4px 8px;
    background-color: rgba(76, 175, 80, 0.2);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .uses-count.depleted {
    background-color: rgba(244, 67, 54, 0.2);
    color: #d32f2f;
  }

  .uses-count.unlimited {
    background-color: rgba(33, 150, 243, 0.2);
    color: #1976d2;
  }

  .btn-sm {
    padding: 4px 12px;
    font-size: 0.85rem;
  }

  .spell-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 8px;
    font-size: 0.85rem;
    color: var(--text-color);
  }

  .spell-meta span {
    background-color: rgba(0, 0, 0, 0.15);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .rest-type {
    color: #ff9800;
  }

  .spellcasting-ability {
    color: #2196f3;
  }

  .no-components {
    color: #4caf50;
  }

  .btn {
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn:hover:not(:disabled) {
    background-color: var(--primary-color-dark, #1976d2);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: var(--primary-color);
  }
</style>
