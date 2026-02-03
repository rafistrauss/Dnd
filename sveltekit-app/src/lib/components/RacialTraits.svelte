<script lang="ts">
  import { onMount } from 'svelte';
  import {
    character,
    initializeRacialTraits,
    syncRacialSpellAttacks
  } from '$lib/stores';

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
  
  $: if ($character.race && $character.level &&
    ($character.race !== prevRace || $character.level !== prevLevel)) {
    initializeRacialTraits();
    syncRacialSpellAttacks();
    prevRace = $character.race;
    prevLevel = $character.level;
  }
</script>

<!-- This component now only handles initialization logic, no UI -->
