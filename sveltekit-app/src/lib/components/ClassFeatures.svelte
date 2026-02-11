<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SlotCheckbox from './SlotCheckbox.svelte';
  import RacialTraits from './RacialTraits.svelte';
  import { character, abilityModifiers, searchFilter, collapsedStates, toasts } from '$lib/stores';
  import { afterUpdate } from 'svelte';
  import {
    getClassConfig,
    getAvailableFeatures,
    getSpellSlots,
    getPreparedSpellsCount,
    getSpellSaveDC
  } from '$lib/classConfig';
  import { rollDice } from '$lib/diceUtils';
  import SectionHeader from './SectionHeader.svelte';
  ``;

  const dispatch = createEventDispatcher();

  $: classConfig = $character.class ? getClassConfig($character.class) : null;
  $: features = $character.class
    ? getAvailableFeatures($character.class, $character.level, $character.subclass)
    : [];
  $: spellSlots = $character.class ? getSpellSlots($character.class, $character.level) : 0;

  // Get all spell slot levels available to this character
  // For now, show levels 1-3 with slots based on character level
  $: availableSpellLevels = (() => {
    if (!classConfig?.spellcaster) return [];
    const charLevel = $character.level;
    const levels: Array<{ level: number; slots: number }> = [];

    // Simple progression: more slots at higher character levels
    if (charLevel >= 1)
      levels.push({ level: 1, slots: Math.min(4, 2 + Math.floor(charLevel / 3)) });
    if (charLevel >= 3)
      levels.push({ level: 2, slots: Math.min(3, 2 + Math.floor((charLevel - 3) / 4)) });
    if (charLevel >= 5)
      levels.push({ level: 3, slots: Math.min(3, 2 + Math.floor((charLevel - 5) / 5)) });
    if (charLevel >= 7)
      levels.push({ level: 4, slots: Math.min(3, 1 + Math.floor((charLevel - 7) / 6)) });
    if (charLevel >= 9)
      levels.push({ level: 5, slots: Math.min(2, 1 + Math.floor((charLevel - 9) / 8)) });
    if (charLevel >= 11) levels.push({ level: 6, slots: 1 });
    if (charLevel >= 13) levels.push({ level: 7, slots: 1 });
    if (charLevel >= 15) levels.push({ level: 8, slots: 1 });
    if (charLevel >= 17) levels.push({ level: 9, slots: 1 });

    return levels;
  })();

  let spellSaveDC = 0;
  let preparedCount = 0;

  $: if (classConfig?.spellcaster && classConfig.spellcastingAbility) {
    const abilityMod = $abilityModifiers[classConfig.spellcastingAbility];
    spellSaveDC = getSpellSaveDC($character.class, abilityMod, $character.proficiencyBonus) || 0;
    preparedCount = getPreparedSpellsCount($character.class, $character.level, abilityMod);
  }

  function resetFeature(featureKey: string, maxUses: number) {
    character.update((c) => {
      if (!c.classFeatures.features[featureKey]) {
        c.classFeatures.features[featureKey] = [];
      }
      c.classFeatures.features[featureKey] = Array(maxUses).fill(false);
      return c;
    });
  }

  function resetPool(featureKey: string, maxPool: number) {
    character.update((c) => {
      c.classFeatures.features[featureKey] = maxPool;
      return c;
    });
  }

  function resetSpellSlots() {
    character.update((c) => {
      c.classFeatures.spellSlots = Array(spellSlots).fill(false);
      return c;
    });
  }

  function resetSpellSlotLevel(level: number, slotCount: number) {
    character.update((c) => {
      if (!c.classFeatures.spellSlotsByLevel) {
        c.classFeatures.spellSlotsByLevel = {};
      }
      c.classFeatures.spellSlotsByLevel[level] = Array(slotCount).fill(false);
      return c;
    });
  }

  function initializeSpellSlots() {
    character.update((c) => {
      if (!c.classFeatures.spellSlotsByLevel) {
        c.classFeatures.spellSlotsByLevel = {};
      }
      availableSpellLevels.forEach(({ level, slots }) => {
        if (!c.classFeatures.spellSlotsByLevel![level]) {
          c.classFeatures.spellSlotsByLevel![level] = Array(slots).fill(false);
        }
      });
      return c;
    });
  }

  // Initialize spell slots when component mounts or class/level changes
  $: if ($character.class && classConfig?.spellcaster && availableSpellLevels.length > 0) {
    initializeSpellSlots();
  }

  function getMaxUses(feature: any): number {
    if (typeof feature.maxUses === 'function') {
      // Check if feature needs ability modifier (Divine Sense, War Priest, etc.)
      if (
        (feature.name === 'Divine Sense' || feature.name === 'War Priest') &&
        classConfig?.spellcastingAbility
      ) {
        const abilityMod = $abilityModifiers[classConfig.spellcastingAbility];
        return feature.maxUses($character.level, abilityMod);
      }
      return feature.maxUses($character.level);
    }
    return feature.maxUses || 0;
  }

  // Ensure uses-based features (like War Priest) always have the correct array size in JSON
  // This will be called in a reactive block below, not in the template
  function ensureCorrectUsesArray(featureKey: string, maxUses: number) {
    character.update((c) => {
      if (
        !c.classFeatures.features[featureKey] ||
        !Array.isArray(c.classFeatures.features[featureKey]) ||
        c.classFeatures.features[featureKey].length !== maxUses
      ) {
        c.classFeatures.features[featureKey] = Array(maxUses).fill(false);
      }
      return c;
    });
  }

  // --- Ensure correct uses array for all uses-based features (afterUpdate, safe) ---
  afterUpdate(() => {
    if (
      filteredFeatures &&
      $character &&
      $character.classFeatures &&
      $character.classFeatures.features
    ) {
      let changed = false;
      filteredFeatures.forEach((feature) => {
        if (feature.type === 'uses') {
          const featureName = getFeatureName(feature);
          const featureKey = featureName.replace(/\s+/g, '');
          const maxUses = getMaxUses(feature);
          const arr = $character.classFeatures.features[featureKey];
          if (!Array.isArray(arr) || arr.length !== maxUses) {
            ensureCorrectUsesArray(featureKey, maxUses);
            changed = true;
          }
        }
      });
    }
  });

  function getMaxPool(feature: any): number {
    if (typeof feature.maxPool === 'function') {
      return feature.maxPool($character.level);
    }
    return feature.maxPool || 0;
  }

  function getDescription(feature: any): string {
    if (typeof feature.description === 'function') {
      // For features that need ability modifier (like Turn Undead)
      if (classConfig?.spellcastingAbility) {
        const abilityMod = $abilityModifiers[classConfig.spellcastingAbility];
        return feature.description($character.level, abilityMod);
      }
      return feature.description($character.level);
    }
    return feature.description;
  }

  function getFeatureName(feature: any): string {
    if (typeof feature.name === 'function') {
      // For features with dynamic names (like Turn Undead -> Sear Undead)
      if (classConfig?.spellcastingAbility) {
        const abilityMod = $abilityModifiers[classConfig.spellcastingAbility];
        return feature.name($character.level, abilityMod);
      }
      return feature.name($character.level);
    }
    return feature.name;
  }

  function getFeatureSubName(feature: any): string | null {
    if (typeof feature.subName === 'function') {
      // For features with dynamic sub-names
      if (classConfig?.spellcastingAbility) {
        const abilityMod = $abilityModifiers[classConfig.spellcastingAbility];
        return feature.subName($character.level, abilityMod);
      }
      return feature.subName($character.level);
    }
    return feature.subName || null;
  }

  function getRollFormula(feature: any): string {
    if (typeof feature.rollFormula === 'function') {
      // For features that need ability modifier (like Turn Undead)
      if (classConfig?.spellcastingAbility) {
        const abilityMod = $abilityModifiers[classConfig.spellcastingAbility];
        return feature.rollFormula($character.level, abilityMod);
      }
      return feature.rollFormula($character.level);
    }
    return feature.rollFormula || '';
  }

  function useChannelDivinityWithRoll(feature: any) {
    const channelDivinityKey = 'ChannelDivinity';
    const current = $character.classFeatures.features[channelDivinityKey];
    
    if (typeof current === 'number' && current > 0) {
      // Consume Channel Divinity
      character.update((c) => {
        c.classFeatures.features[channelDivinityKey] = current - 1;
        return c;
      });
      
      const featureName = getFeatureName(feature);
      
      // If the feature is rollable, open the dice roller
      if (feature.rollable && feature.rollFormula) {
        const formula = getRollFormula(feature);
        if (formula) {
          // Dispatch roll event to open DiceRoller
          dispatch('roll', {
            notation: formula,
            attackName: featureName,
            rollType: 'other'
          });
        } else {
          toasts.add(`Used ${featureName}`, 'info');
        }
      } else {
        toasts.add(`Used ${featureName}`, 'info');
      }
    }
  }

  // Reactive variable to track Channel Divinity availability
  $: channelDivinityRemaining = (() => {
    const channelDivinityKey = 'ChannelDivinity';
    const current = $character.classFeatures.features[channelDivinityKey];
    return typeof current === 'number' ? current : 0;
  })();

  function toggleCollapse() {
    collapsedStates.update((s) => ({ ...s, classFeatures: !s.classFeatures }));
  }

  $: filteredFeatures = features.filter((feature) => {
    if (!$searchFilter) return true;
    const filter = $searchFilter.toLowerCase();
    const featureName = getFeatureName(feature);
    return (
      featureName.toLowerCase().includes(filter) ||
      getDescription(feature).toLowerCase().includes(filter)
    );
  });

  // Consolidate all Channel Divinity features into one
  $: channelDivinityPoolFeature = filteredFeatures.find((f) => f.type === 'pool' && getFeatureName(f) === 'Channel Divinity');
  
  $: allChannelDivinitySubFeatures = filteredFeatures.flatMap((feature) => {
    const subFeats: any[] = [];
    // Get subFeatures from any feature that has them
    if (feature.subFeatures) {
      subFeats.push(...feature.subFeatures);
    }
    // Include standalone channelDivinity features (not the pool itself)
    if (feature.type === 'channelDivinity') {
      subFeats.push(feature);
    }
    return subFeats;
  });

  // Filter out Channel Divinity related features from the main list
  $: nonChannelDivinityFeatures = filteredFeatures.filter((feature) => {
    const featureName = getFeatureName(feature);
    // Keep features that are NOT:
    // - The Channel Divinity pool
    // - A channelDivinity type feature
    // - A feature with the name "Channel Divinity" (like the info box)
    return !(
      (feature.type === 'pool' && featureName === 'Channel Divinity') ||
      feature.type === 'channelDivinity' ||
      (featureName === 'Channel Divinity' && feature.subFeatures)
    );
  });

  $: hasVisibleContent =
    !$searchFilter ||
    $character.class ||
    'class features'.includes($searchFilter.toLowerCase()) ||
    'spellcasting'.includes($searchFilter.toLowerCase()) ||
    filteredFeatures.length > 0;
</script>

<section class="class-features" class:hidden={!hasVisibleContent}>
  <SectionHeader
    title="Class Features"
    collapsed={$collapsedStates.classFeatures}
    ariaLabel={$collapsedStates.classFeatures ? 'Expand' : 'Collapse'}
    onToggle={toggleCollapse}
  />
  {#if !$collapsedStates.classFeatures}
    <RacialTraits />
    {#if !$character.class}
      <p class="no-features">Select a class to see available features</p>
    {:else if features.length === 0}
      <p class="no-features">No class features available at this level</p>
    {:else}
      <!-- Consolidated Channel Divinity Box - Full Width -->
      {#if channelDivinityPoolFeature}
        {@const featureName = getFeatureName(channelDivinityPoolFeature)}
        {@const featureKey = featureName.replace(/\s+/g, '')}
        {@const featureData = $character.classFeatures.features[featureKey]}
        {@const isNumericData = typeof featureData === 'number'}
        {@const maxPool = getMaxPool(channelDivinityPoolFeature)}
        
        <div class="feature-box channel-divinity-main">
          <h3>{featureName}</h3>
          <p class="feature-description">{@html getDescription(channelDivinityPoolFeature)}</p>

          <div class="pool-tracker">
            <input
              type="number"
              value={isNumericData && featureData !== undefined ? featureData : maxPool}
              on:input={(e) => {
                character.update((c) => {
                  c.classFeatures.features[featureKey] = parseInt(e.currentTarget.value) || 0;
                  return c;
                });
              }}
              min="0"
              max={maxPool}
              class="pool-input"
            />
            <span>/ {maxPool}</span>
            <button on:click={() => resetPool(featureKey, maxPool)} class="btn-small">
              {channelDivinityPoolFeature.resetOn === 'short' ? 'Short Rest' : 'Long Rest'}
            </button>
          </div>

          <!-- All Channel Divinity Sub-Features -->
          {#if allChannelDivinitySubFeatures.length > 0}
            <div class="sub-features-grid">
              {#each allChannelDivinitySubFeatures as subFeature}
                {@const subFeatureName = getFeatureName(subFeature)}
                <div class="sub-feature-box">
                  <h4>{subFeatureName}</h4>
                  {#if subFeature.subName}
                    <h5>{getFeatureSubName(subFeature)}</h5>
                  {/if}
                  <p class="feature-description">{@html getDescription(subFeature)}</p>

                  {#if subFeature.type === 'channelDivinity'}
                    <div class="channel-divinity-option">
                      <button
                        on:click={() => useChannelDivinityWithRoll(subFeature)}
                        disabled={channelDivinityRemaining <= 0}
                        class="btn btn-primary use-enabled"
                      >
                        {#if subFeature.rollable && getRollFormula(subFeature)}
                          Roll {subFeatureName}
                        {:else}
                          Use {subFeatureName}
                        {/if}
                      </button>
                      {#if channelDivinityRemaining <= 0}
                        <p class="no-uses">No Channel Divinity uses remaining</p>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <div class="features-grid">
        {#if classConfig?.spellcaster}
          <div class="feature-box spellcasting">
            <h3>Spellcasting ({classConfig.spellcastingAbility?.toUpperCase()})</h3>
            <div class="spell-stats">
              <div class="spell-stat">
                <label>Spell Save DC</label>
                <div class="spell-value">{spellSaveDC}</div>
              </div>
              <div class="spell-stat">
                <label>Prepared Spells</label>
                <div class="spell-value">{preparedCount}</div>
              </div>
            </div>
            {#if availableSpellLevels.length > 0}
              <div class="all-spell-slots">
                {#each availableSpellLevels as { level, slots }}
                  {@const levelSlots =
                    $character.classFeatures.spellSlotsByLevel?.[level] || Array(slots).fill(false)}
                  <div class="spell-slots">
                    <label>
                      {level === 1
                        ? '1st'
                        : level === 2
                          ? '2nd'
                          : level === 3
                            ? '3rd'
                            : `${level}th`} Level Spell Slots
                    </label>
                    <div class="slots-tracker">
                      {#each levelSlots as _, i}
                        <SlotCheckbox
                          checked={levelSlots[i] || false}
                          on:change={(e) => {
                            character.update((c) => {
                              if (!c.classFeatures.spellSlotsByLevel) {
                                c.classFeatures.spellSlotsByLevel = {};
                              }
                              if (!c.classFeatures.spellSlotsByLevel[level]) {
                                c.classFeatures.spellSlotsByLevel[level] = Array(slots).fill(false);
                              }
                              c.classFeatures.spellSlotsByLevel[level][i] = e.detail.checked;
                              return c;
                            });
                          }}
                        />
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
            <div class="prepared-spells">
              <label>Prepared Spells</label>
              <textarea
                bind:value={$character.classFeatures.preparedSpells}
                placeholder="List your prepared spells..."
              ></textarea>
            </div>
          </div>
        {/if}

        {#each nonChannelDivinityFeatures as feature}
          {@const featureName = getFeatureName(feature)}
          {@const featureKey = featureName.replace(/\s+/g, '')}
          {@const featureData = $character.classFeatures.features[featureKey]}
          {@const isArrayData = Array.isArray(featureData)}
          {@const isNumericData = typeof featureData === 'number'}
          <div class="feature-box">
            <h3>
              {#if feature.type === 'channelDivinity'}
                Channel Divinity:
              {/if}
              {featureName}
            </h3>
            <p class="feature-description">{getDescription(feature)}</p>

            {#if feature.type === 'uses'}
              {@const maxUses = getMaxUses(feature)}
              {@const usesArr = (
                Array.isArray(featureData) ? featureData : Array(maxUses).fill(false)
              ) as boolean[]}
              <div class="uses-tracker">
                {#if maxUses === Infinity}
                  <p class="unlimited">Unlimited Uses</p>
                {:else}
                  <div class="slots-tracker">
                    {#each usesArr as checked, i}
                      <SlotCheckbox
                        {checked}
                        index={i}
                        on:change={(e) => {
                          character.update((c) => {
                            if (!c.classFeatures.features[featureKey]) {
                              c.classFeatures.features[featureKey] = Array(maxUses).fill(false);
                            }
                            c.classFeatures.features[featureKey][i] = e.detail.checked;
                            return c;
                          });
                        }}
                      />
                    {/each}
                  </div>
                  <div class="uses-actions-row">
                    <button
                      on:click={() => {
                        character.update((c) => {
                          if (!c.classFeatures.features[featureKey]) {
                            c.classFeatures.features[featureKey] = Array(maxUses).fill(false);
                          }
                          const arr = c.classFeatures.features[featureKey] as boolean[];
                          // Find first unused slot and mark it as used
                          const firstUnused = arr.findIndex((u) => !u);
                          if (firstUnused !== -1) {
                            arr[firstUnused] = true;
                          }
                          return c;
                        });
                      }}
                      disabled={usesArr.filter((u) => !u).length <= 0}
                      class="btn btn-primary use-enabled"
                    >
                      Use {featureName}
                    </button>
                  </div>
                  <div class="uses-info">
                    <span class="reset-info"
                      >Resets on {feature.resetOn === 'short' ? 'Short Rest' : 'Long Rest'}</span
                    >
                  </div>
                {/if}
              </div>
            {:else if feature.type === 'pool'}
              {@const maxPool = getMaxPool(feature)}
              <div class="pool-tracker">
                <input
                  type="number"
                  value={isNumericData && featureData !== undefined ? featureData : maxPool}
                  on:input={(e) => {
                    character.update((c) => {
                      c.classFeatures.features[featureKey] = parseInt(e.currentTarget.value) || 0;
                      return c;
                    });
                  }}
                  min="0"
                  max={maxPool}
                  class="pool-input"
                />
                <span>/ {maxPool}</span>
                <button on:click={() => resetPool(featureKey, maxPool)} class="btn-small">
                  {feature.resetOn === 'short' ? 'Short Rest' : 'Long Rest'}
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</section>

<style>
  .class-features {
    background-color: var(--card-bg);
    padding: 20px;
    border-radius: 8px;
    box-shadow: var(--shadow);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 10px;
    margin-bottom: 15px;
  }

  h2 {
    margin: 0;
    color: var(--primary-color);
  }

  .collapse-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--primary-color);
    padding: 5px 10px;
    transition: transform 0.2s ease;
  }

  .collapse-btn:hover {
    transform: scale(1.1);
  }

  .hidden {
    display: none;
  }

  .no-features {
    text-align: center;
    color: #666;
    padding: 30px;
    font-style: italic;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 15px;
  }

  .feature-box {
    background-color: var(--card-bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 15px;
  }

  .feature-box h3 {
    margin: 0 0 10px 0;
    color: var(--primary-color);
    font-size: 1.1rem;
  }

  .feature-description {
    font-size: 0.9rem;
    color: var(--text-color);
    margin-bottom: 10px;
  }

  .spellcasting {
    grid-column: 1 / -1;
  }

  .spell-stats {
    display: flex;
    gap: 20px;
    margin-bottom: 15px;
  }

  .spell-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .spell-stat label {
    font-size: 0.85rem;
    font-weight: bold;
    margin-bottom: 5px;
  }

  .spell-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary-color);
  }

  .spell-slots {
    margin-bottom: 15px;
  }

  .spell-slots label {
    display: block;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .slots-tracker {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .slot-checkbox,
  .use-checkbox {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .uses-tracker,
  .pool-tracker {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .uses-tracker {
    flex-direction: column;
    align-items: flex-start;
  }

  .pool-input {
    width: 70px;
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    text-align: center;
    font-weight: bold;
  }

  .btn-small {
    padding: 4px 10px;
    background-color: var(--secondary-color);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: background-color 0.2s;
  }

  .btn-small:hover {
    background-color: #b89872;
  }

  .unlimited {
    font-weight: bold;
    color: var(--primary-color);
    margin: 0;
  }

  .prepared-spells {
    margin-top: 15px;
  }

  .prepared-spells label {
    display: block;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .prepared-spells textarea {
    width: 100%;
    min-height: 80px;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.9rem;
    resize: vertical;
  }

  textarea:focus,
  input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .channel-divinity-option {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .channel-divinity-option button {
    align-self: flex-start;
  }

  .no-uses {
    color: #999;
    font-size: 0.85rem;
    font-style: italic;
    margin: 0;
  }

  .uses-with-button {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .uses-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.9rem;
  }

  .uses-remaining {
    font-weight: bold;
    color: var(--primary-color);
  }

  .reset-info {
    color: #666;
    font-size: 0.85rem;
    font-style: italic;
  }

  .sub-features {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid var(--border-color);
  }

  .sub-feature-box {
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 10px;
  }

  .sub-feature-box:last-child {
    margin-bottom: 0;
  }

  .sub-feature-box h4 {
    margin: 0 0 8px 0;
    color: var(--primary-color);
    font-size: 1rem;
  }

  .sub-feature-box h5 {
    margin: 0 0 8px 0;
    color: var(--secondary-color);
    font-size: 0.9rem;
    font-style: italic;
  }

  .sub-feature-box .feature-description {
    margin-bottom: 10px;
  }

  .sub-feature-box .channel-divinity-option {
    margin-top: 10px;
  }

  .channel-divinity-main {
    border: 2px solid var(--primary-color);
    background: linear-gradient(to bottom, var(--card-bg-secondary), var(--card-bg));
    margin-bottom: 20px;
  }

  .channel-divinity-main h3 {
    font-size: 1.2rem;
    color: var(--primary-color);
  }

  .full-width {
    width: 100%;
    margin-bottom: 15px;
  }

  .sub-features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid var(--border-color);
  }
</style>
