<script lang="ts">
    import { getRaceConfig } from '$lib/raceConfig';
  import { onMount } from 'svelte';
  import { character, initializeRacialTraits, syncRacialSpellAttacks } from '$lib/stores';

  // Initialize racial traits and sync attacks only when race or level changes
  let prevRace: string | undefined;
  let prevLevel: number | undefined;

  // Run on mount to handle already-set race/level
  onMount(() => {
    if ($character.race && $character.level) {
      initializeRacialTraits();
      syncRacialSpellAttacks();
      prevRace = $character.race;
      prevLevel = $character.level;
    }
  });

  $: if (
    $character.race &&
    $character.level &&
    ($character.race !== prevRace || $character.level !== prevLevel)
  ) {
    initializeRacialTraits();
    syncRacialSpellAttacks();
    prevRace = $character.race;
    prevLevel = $character.level;
  }
  // Helper: collect all unique resistances from activeStates and raceConfig
  $: racialResistances = (() => {
    const fromStates = $character.activeStates
      ? $character.activeStates
          .filter((state) => state.name && state.name.toLowerCase().includes('racial'))
          .flatMap((state) => state.resistances || [])
      : [];
    const raceConfig = getRaceConfig($character.race || '');
    const fromConfig = raceConfig
      ? raceConfig.traits.flatMap((trait) => trait.resistances || [])
      : [];
    return Array.from(new Set([...fromStates, ...fromConfig]));
  })();

  // Helper: get all racial traits from raceConfig
  $: racialTraitsList = (() => {
    const raceConfig = getRaceConfig($character.race || '');
    return raceConfig ? raceConfig.traits : [];
  })();
</script>

<!-- Racial Traits UI -->
{#if racialTraitsList.length > 0}
  <div class="racial-traits">
    <h4>Racial Traits</h4>
    <ul>
      {#each racialTraitsList as trait}
        <li>
          <strong>{trait.name}:</strong> {trait.description}
          {#if trait.resistances && trait.resistances.length > 0}
            <span style="color:#007bff; margin-left:0.5em;">
              (Resistances: {trait.resistances.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')})
            </span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}

<!-- Racial Resistances UI (summary) -->
{#if racialResistances.length > 0}
  <div class="racial-resistances">
    <h4>Racial Resistances</h4>
    <ul>
      {#each racialResistances as resist}
        <li>{resist.charAt(0).toUpperCase() + resist.slice(1)}</li>
      {/each}
    </ul>
  </div>
{/if}
