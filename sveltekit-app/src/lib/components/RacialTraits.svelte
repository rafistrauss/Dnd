<script lang="ts">
  import { getRaceConfig, getRacialTraitsForLevel, GIANT_ANCESTRIES } from '$lib/raceConfig';
  import type { RacialTrait } from '$lib/raceConfig';
  import { onMount } from 'svelte';
  import {
    character,
    initializeRacialTraits,
    syncRacialSpellAttacks,
    useRacialTrait,
    turnTracker,
    toasts
  } from '$lib/stores';

  // Initialize racial traits and sync attacks only when race or level changes
  let prevRace: string | undefined;
  let prevLevel: number | undefined;
  let prevProficiency: number | undefined;
  let prevRuleset: string | undefined;

  // Run on mount to handle already-set race/level
  onMount(() => {
    if ($character.race && $character.level) {
      initializeRacialTraits();
      syncRacialSpellAttacks();
      prevRace = $character.race;
      prevLevel = $character.level;
      prevProficiency = $character.proficiencyBonus;
      prevRuleset = $character.ruleset;
    }
  });

  $: if (
    $character.race &&
    $character.level &&
    ($character.race !== prevRace ||
      $character.level !== prevLevel ||
      $character.proficiencyBonus !== prevProficiency ||
      $character.ruleset !== prevRuleset)
  ) {
    initializeRacialTraits();
    syncRacialSpellAttacks();
    prevRace = $character.race;
    prevLevel = $character.level;
    prevProficiency = $character.proficiencyBonus;
    prevRuleset = $character.ruleset;
  }
  // Helper: collect all unique resistances from activeStates and raceConfig
  $: racialResistances = (() => {
    const fromStates = $character.activeStates
      ? $character.activeStates
          .filter((state) => state.name && state.name.toLowerCase().includes('racial'))
          .flatMap((state) => state.resistances || [])
      : [];
    const raceConfig = getRaceConfig($character.race || '', $character.ruleset);
    const fromConfig = raceConfig
      ? raceConfig.traits.flatMap((trait) => trait.resistances || [])
      : [];
    return Array.from(new Set([...fromStates, ...fromConfig]));
  })();

  // Helper: get all racial traits from raceConfig
  $: racialTraitsList = (() => {
    return getRacialTraitsForLevel($character.race || '', $character.level, $character.ruleset);
  })();

  $: musician =
    $character.originFeats?.includes('Musician') ||
    ($character.ruleset !== '2014' && $character.background.trim().toLowerCase() === 'entertainer');

  function useTrait(trait: RacialTrait) {
    if (!trait.usesKey || !$character.racialTraits?.uses[trait.usesKey]?.currentUses) {
      toasts.add('No uses remaining. Finish a Long Rest to recover this trait.', 'error');
      return;
    }
    const ancestry = $character.giantAncestry;
    const slot =
      trait.bonusAction || (trait.usesKey === 'GiantAncestry' && ancestry === 'cloud')
        ? 'bonusAction'
        : trait.usesKey === 'GiantAncestry' && (ancestry === 'stone' || ancestry === 'storm')
          ? 'reaction'
          : null;
    if (slot && $turnTracker[slot]) {
      toasts.add(`${slot === 'bonusAction' ? 'Bonus Action' : 'Reaction'} already used.`, 'error');
      return;
    }
    useRacialTrait(trait.usesKey);
    if (slot) turnTracker.update((turn) => ({ ...turn, [slot]: true }));
    toasts.add(
      trait.usesKey === 'GiantAncestry'
        ? GIANT_ANCESTRIES[ancestry ?? ''] || trait.description
        : trait.description,
      'info'
    );
  }
</script>

<!-- Racial Traits UI -->
{#if racialTraitsList.length > 0}
  <div class="racial-traits">
    <h4>Racial Traits</h4>
    <ul>
      {#each racialTraitsList as trait}
        <li>
          <strong>{trait.name}:</strong>
          {#if trait.usesKey === 'GiantAncestry'}
            <label for="giant-ancestry">Giant ancestry</label>
            <select id="giant-ancestry" bind:value={$character.giantAncestry}>
              <option value="">Choose an ancestry</option>
              {#each Object.entries(GIANT_ANCESTRIES) as [id, description]}
                <option value={id}>{description.split(':')[0]}</option>
              {/each}
            </select>
            <p>{GIANT_ANCESTRIES[$character.giantAncestry ?? ''] ?? trait.description}</p>
          {:else}
            {trait.description}
          {/if}
          {#if trait.usesKey}
            {@const uses = $character.racialTraits?.uses[trait.usesKey]}
            <p>{uses?.currentUses ?? 0}/{uses?.maxUses ?? 0} uses. Recover all on a Long Rest.</p>
            <button
              class="btn btn-primary use-enabled"
              on:click={() => useTrait(trait)}
              disabled={!uses?.currentUses ||
                (trait.usesKey === 'GiantAncestry' && !$character.giantAncestry)}
              >Use {trait.usesKey === 'GiantAncestry'
                ? (GIANT_ANCESTRIES[$character.giantAncestry ?? '']?.split(':')[0] ?? trait.name)
                : trait.name}</button
            >
            <p>Apply the described effect manually after its trigger occurs.</p>
          {/if}
          {#if trait.resistances && trait.resistances.length > 0}
            <span style="color:#007bff; margin-left:0.5em;">
              (Resistances: {trait.resistances
                .map((r) => r.charAt(0).toUpperCase() + r.slice(1))
                .join(', ')})
            </span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}

{#if musician}
  <div class="background-traits">
    <h4>Origin Feat: Musician</h4>
    <p>You gain proficiency with three musical instruments of your choice.</p>
    <p>
      After a Short or Long Rest, play a proficient instrument to give Heroic Inspiration to up to {$character.proficiencyBonus}
      allies who hear it.
    </p>
    <p>
      Record the three instruments in Equipment. Apply Heroic Inspiration on each chosen ally's
      sheet.
    </p>
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
