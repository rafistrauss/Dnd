<script lang="ts">
  import {
    character,
    initializeRacialTraits,
    syncRacialSpellAttacks
  } from '$lib/stores';

  // Initialize racial traits and sync attacks only when race or level changes
  let prevRace: string | undefined;
  let prevLevel: number | undefined;
  $: if ($character.race && $character.level &&
    ($character.race !== prevRace || $character.level !== prevLevel)) {
    initializeRacialTraits();
    syncRacialSpellAttacks();
    prevRace = $character.race;
    prevLevel = $character.level;
  }
</script>

<!-- This component now only handles initialization logic, no UI -->
