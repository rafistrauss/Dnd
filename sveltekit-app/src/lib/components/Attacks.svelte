<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import {
    character,
    abilityModifiers,
    searchFilter,
    collapsedStates,
    isEditMode,
    toasts
  } from '$lib/stores';
  import SectionHeader from '$lib/components/SectionHeader.svelte';

  // Debug flag: set to true to force all d20 rolls to 20
  let debugForceD20Twenty = false;
  import type { Attack, Spell, SpellState } from '$lib/types';
  import { loadSpells } from '$lib/dndData';
  import {
    getSavingThrowInfo,
    addsSpellcastingModifierToDamage,
    isBuffSpell,
    extractSpellEffectBonuses
  } from '$lib/spellUtils';
  import { getSpellSaveDC, getSpellcastingModifier } from '$lib/combatUtils';

  const dispatch = createEventDispatcher();

  // Track collapsed state for each attack's spell info (collapsed by default)
  let collapsedSpellInfo: Record<string, boolean> = {};

  // Collapse spell info by default for all attacks with spellRef
  $: {
    if ($character && $character.attacks) {
      for (const attack of $character.attacks) {
        if (attack.spellRef && collapsedSpellInfo[attack.id] === undefined) {
          collapsedSpellInfo[attack.id] = true;
        }
      }
    }
  }

  function toggleSpellInfo(attackId: string) {
    collapsedSpellInfo[attackId] = !collapsedSpellInfo[attackId];
    collapsedSpellInfo = { ...collapsedSpellInfo }; // Trigger reactivity
  }

  function isHealingSpell(spell: Spell): boolean {
    return (
      spell.description.toLowerCase().includes('regain') &&
      (spell.description.toLowerCase().includes('hit point') ||
        spell.description.toLowerCase().includes('hp'))
    );
  }

  function addAttack() {
    character.update((c) => {
      c.attacks = [
        ...c.attacks,
        {
          id: crypto.randomUUID(),
          name: '',
          bonus: 0,
          damage: '',
          damageType: '',
          notes: ''
        }
      ];
      return c;
    });
  }

  function removeAttack(id: string) {
    character.update((c) => {
      c.attacks = c.attacks.filter((a) => a.id !== id);
      return c;
    });
  }

  function rollAttack(attack: Attack) {
    // If this is a spell attack, consume a spell slot
    let damageToRoll = attack.damage;
    let applyHalfDamage = false;
    if (attack.spellRef) {
      const spell = getSpellByName(attack.spellRef);
      if (spell && spell.level > 0) {
        const castLevel = attack.castAtLevel || spell.level;
        const hasSlot = checkAndConsumeSpellSlot(castLevel);
        if (!hasSlot) {
          toasts.add(`No level ${castLevel} spell slots available!`, 'error');
          return;
        }
        // Use scaled damage if applicable, with half damage or no damage if target succeeded on save
        const savingThrow = getSavingThrowInfo(spell);
        if (savingThrow && attack.targetSucceededSave && savingThrow.noDamageOnSave) {
          damageToRoll = '0';
        } else {
          applyHalfDamage = (savingThrow?.halfDamageOnSave && attack.targetSucceededSave) || false;
          damageToRoll = getScaledSpellDamage(attack, spell);
        }
      }
    } else {
      // For non-spell attacks, apply active state bonuses to damage notation
      if ($character.activeStates && $character.activeStates.length > 0) {
        let additionalModifier = 0;
        for (const state of $character.activeStates) {
          additionalModifier += state.damageBonus;
        }

        if (additionalModifier !== 0 && damageToRoll) {
          // Parse existing damage and add modifier
          const damageMatch = damageToRoll.match(/(\d+d\d+)([+-]\d+)?/);
          if (damageMatch) {
            const [, dice, existingMod] = damageMatch;
            const baseModifier = existingMod ? parseInt(existingMod) : 0;
            const totalModifier = baseModifier + additionalModifier;
            damageToRoll = `${dice}${totalModifier >= 0 ? '+' : ''}${totalModifier}`;
          }
        }
      }
    }

    // Build bonus breakdown for attack roll
    const bonusBreakdown: Array<{ value: number; source: string }> = [];

    // Add base attack bonus
    if (attack.bonus !== 0) {
      bonusBreakdown.push({ value: attack.bonus, source: 'base' });
    }

    // Apply active state bonuses to attack roll
    let attackBonus = attack.bonus;
    if ($character.activeStates) {
      for (const state of $character.activeStates) {
        if (state.attackBonus !== 0) {
          bonusBreakdown.push({ value: state.attackBonus, source: state.name.toLowerCase() });
          attackBonus += state.attackBonus;
        }
      }
    }

    let notation;
    if (debugForceD20Twenty) {
      notation = `1d20@20`;
    } else {
      notation = `1d20${attackBonus >= 0 ? '+' : ''}${attackBonus}`;
    }
    dispatch('roll', {
      notation,
      damageNotation: damageToRoll,
      attackName: attack.name,
      applyHalfDamage,
      bonusBreakdown
    });
  }

  function rollDamage(attack: Attack) {
    if (!attack.damage) {
      toasts.add(`${attack.name}: No damage specified`, 'error');
      return;
    }

    let damageToRoll = attack.damage;
    let applyHalfDamage = false;
    const bonusBreakdown: Array<{ value: number; source: string }> = [];

    // If this is a spell, handle slot consumption and scaling
    if (attack.spellRef) {
      const spell = getSpellByName(attack.spellRef);
      if (spell && spell.level > 0) {
        const castLevel = attack.castAtLevel || spell.level;
        const hasSlot = checkAndConsumeSpellSlot(castLevel);
        if (!hasSlot) {
          toasts.add(`No level ${castLevel} spell slots available!`, 'error');
          return;
        }
        // Use scaled damage if applicable, with half damage or no damage if target succeeded on save
        const savingThrow = getSavingThrowInfo(spell);
        if (savingThrow && attack.targetSucceededSave && savingThrow.noDamageOnSave) {
          damageToRoll = '0';
        } else {
          applyHalfDamage = (savingThrow?.halfDamageOnSave && attack.targetSucceededSave) || false;
          damageToRoll = getScaledSpellDamage(attack, spell);
        }
      }
    } else {
      // For non-spell attacks, parse the base damage and track bonuses
      const damageMatch = damageToRoll.match(/(\d+d\d+)([+-]\d+)?/);
      if (damageMatch) {
        const [, dice, existingMod] = damageMatch;
        const baseModifier = existingMod ? parseInt(existingMod) : 0;

        if (baseModifier !== 0) {
          bonusBreakdown.push({ value: baseModifier, source: 'base' });
        }

        // Apply active state bonuses
        if ($character.activeStates && $character.activeStates.length > 0) {
          let additionalModifier = 0;
          for (const state of $character.activeStates) {
            if (state.damageBonus !== 0) {
              bonusBreakdown.push({ value: state.damageBonus, source: state.name.toLowerCase() });
              additionalModifier += state.damageBonus;
            }
          }

          if (additionalModifier !== 0) {
            const totalModifier = baseModifier + additionalModifier;
            damageToRoll = `${dice}${totalModifier >= 0 ? '+' : ''}${totalModifier}`;
          }
        }
      }
    }

    dispatch('roll', {
      notation: damageToRoll,
      attackName: attack.name,
      applyHalfDamage,
      bonusBreakdown
    });
  }

  function toggleCollapse() {
    collapsedStates.update((s) => ({ ...s, attacks: !s.attacks }));
  }

  let spells: Spell[] = [];
  let spellsLoaded = false;
  onMount(async () => {
    spells = await loadSpells();
    spellsLoaded = true;
  });

  function getSpellByName(name: string) {
    return spells.find((s) => s.name === name);
  }

  function checkAndConsumeSpellSlot(level: number): boolean {
    // Initialize spell slots structure if needed
    if (!$character.classFeatures.spellSlotsByLevel) {
      $character.classFeatures.spellSlotsByLevel = {};
    }

    // Get or initialize slots for this level
    if (!$character.classFeatures.spellSlotsByLevel[level]) {
      // Default to 2 slots for any level if not configured
      $character.classFeatures.spellSlotsByLevel[level] = Array(2).fill(false);
    }

    const slots = $character.classFeatures.spellSlotsByLevel[level];
    // Find first unused slot
    const availableIndex = slots.findIndex((used) => !used);

    if (availableIndex === -1) {
      return false; // No slots available
    }

    // Mark slot as used
    character.update((c) => {
      if (!c.classFeatures.spellSlotsByLevel) {
        c.classFeatures.spellSlotsByLevel = {};
      }
      if (!c.classFeatures.spellSlotsByLevel[level]) {
        c.classFeatures.spellSlotsByLevel[level] = Array(2).fill(false);
      }
      c.classFeatures.spellSlotsByLevel[level][availableIndex] = true;
      return c;
    });

    return true;
  }

  function getScaledSpellDamage(attack: Attack, spell: Spell): string {
    let baseDamage = attack.damage;
    let additionalDice = 0;
    let additionalModifier = 0;

    // Check if spell adds spellcasting modifier to damage
    if (addsSpellcastingModifierToDamage(spell)) {
      additionalModifier += getSpellcastingModifier($character, $abilityModifiers);
    }

    // Apply active state bonuses to damage
    if ($character.activeStates) {
      for (const state of $character.activeStates) {
        additionalModifier += state.damageBonus;
      }
    }

    // Handle higher level slot scaling
    if (spell.higherLevelSlot && attack.castAtLevel) {
      const baseLevel = spell.level;
      const castLevel = attack.castAtLevel || baseLevel;
      const levelDiff = castLevel - baseLevel;

      if (levelDiff > 0) {
        // Look for common patterns in higherLevelSlot like "increases by 1d6 for each spell slot level above"
        const increaseMatch = spell.higherLevelSlot.match(
          /(\d+)d(\d+)\s+for\s+each.*?level\s+above/i
        );
        if (increaseMatch) {
          const [, increaseDice] = increaseMatch;
          additionalDice += levelDiff * parseInt(increaseDice);
        }
      }
    }

    // Handle conditional damage (e.g., Divine Smite vs Fiend/Undead)
    if (attack.targetIsFiendOrUndead && spell.description.includes('Fiend or an Undead')) {
      const bonusMatch = spell.description.match(
        /increases by (\d+)d(\d+) if.*?Fiend or.*?Undead/i
      );
      if (bonusMatch) {
        const [, bonusDice] = bonusMatch;
        additionalDice += parseInt(bonusDice);
      }
    }

    // Parse the base damage (e.g., "3d6" or "3d6+2")
    const damageMatch = baseDamage.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!damageMatch) {
      // No dice notation, just return modifier if any, otherwise "0"
      if (additionalModifier !== 0) {
        return additionalModifier >= 0 ? `${additionalModifier}` : `${additionalModifier}`;
      }
      return baseDamage || '0';
    }

    const [, numDice, dieSize, existingMod] = damageMatch;
    const totalDice = parseInt(numDice) + additionalDice;
    const baseModifier = existingMod ? parseInt(existingMod) : 0;
    const totalModifier = baseModifier + additionalModifier;

    // Build the result - always show modifier for consistency
    let result = `${totalDice}d${dieSize}`;
    if (totalModifier !== 0) {
      result += totalModifier >= 0 ? `+${totalModifier}` : `${totalModifier}`;
    }

    return result;
  }

  function getAvailableSpellLevels(spell: Spell): number[] {
    const levels: number[] = [];
    const maxLevel = 9;

    for (let level = spell.level; level <= maxLevel; level++) {
      const slots = $character.classFeatures.spellSlotsByLevel?.[level];
      if (slots && slots.length > 0) {
        levels.push(level);
      }
    }

    return levels;
  }

  function getAllSpellSlots(): { level: number; available: number; total: number }[] {
    const result: { level: number; available: number; total: number }[] = [];
    const spellSlots = $character.classFeatures.spellSlotsByLevel || {};

    for (let level = 1; level <= 9; level++) {
      const slots = spellSlots[level];
      if (slots && slots.length > 0) {
        const total = slots.length;
        const used = slots.filter((s) => s).length;
        result.push({ level, available: total - used, total });
      }
    }

    return result;
  }

  function rollSpellDamage(attack: Attack) {
    const spell = getSpellByName(attack.spellRef!);
    if (!spell) {
      rollDamage(attack);
      return;
    }

    // Check if we have spell slots available
    const castLevel = attack.castAtLevel || spell.level;
    if (castLevel > 0) {
      // Cantrips don't use slots
      const hasSlot = checkAndConsumeSpellSlot(castLevel);
      if (!hasSlot) {
        toasts.add(`No level ${castLevel} spell slots available!`, 'error');
        return;
      }
    }

    const savingThrow = getSavingThrowInfo(spell);
    let scaledDamage;
    let applyHalfDamage = false;
    if (savingThrow && attack.targetSucceededSave && savingThrow.noDamageOnSave) {
      scaledDamage = '0';
    } else {
      applyHalfDamage = (savingThrow?.halfDamageOnSave && attack.targetSucceededSave) || false;
      scaledDamage = getScaledSpellDamage(attack, spell);
    }
    dispatch('roll', { notation: scaledDamage, attackName: attack.name, applyHalfDamage });
  }

  function addActiveState() {
    character.update((c) => {
      if (!c.activeStates) {
        c.activeStates = [];
      }
      c.activeStates = [
        ...c.activeStates,
        {
          name: '',
          attackBonus: 0,
          damageBonus: 0,
          description: ''
        }
      ];
      return c;
    });
  }

  function removeActiveState(index: number) {
    character.update((c) => {
      if (c.activeStates) {
        c.activeStates = c.activeStates.filter((_, i) => i !== index);
      }
      return c;
    });
  }

  function castBuffSpell(attack: Attack) {
    const spell = getSpellByName(attack.spellRef!);
    if (!spell) {
      toasts.add('Spell not found', 'error');
      return;
    }

    // Consume spell slot if needed
    const castLevel = attack.castAtLevel || spell.level;
    if (castLevel > 0) {
      // Cantrips don't use slots
      const hasSlot = checkAndConsumeSpellSlot(castLevel);
      if (!hasSlot) {
        toasts.add(`No level ${castLevel} spell slots available!`, 'error');
        return;
      }
    }

    // Extract bonuses from the spell
    const bonuses = extractSpellEffectBonuses(spell);
    if (!bonuses) {
      toasts.add(`${spell.name} cast! Check spell description for effects.`, 'info');
      return;
    }

    // Create or update the active state
    character.update((c) => {
      if (!c.activeStates) {
        c.activeStates = [];
      }

      // Check if this spell is already active - if so, remove it first (concentration rules)
      c.activeStates = c.activeStates.filter((state) => state.name !== spell.name);

      // Add the new state
      c.activeStates = [
        ...c.activeStates,
        {
          name: spell.name,
          attackBonus: bonuses.attackBonus,
          damageBonus: bonuses.damageBonus,
          acBonus: bonuses.acBonus,
          description: bonuses.description
        }
      ];

      return c;
    });

    toasts.add(`${spell.name} cast! Effect added to Active Spell Effects.`, 'success');
  }

  $: filteredAttacks = $character.attacks
    .filter((attack) => {
      if (!$searchFilter) return true;
      const filter = $searchFilter.toLowerCase();
      return (
        attack.name.toLowerCase().includes(filter) ||
        attack.damageType.toLowerCase().includes(filter)
      );
    })
    .sort((a, b) => {
      // Attacks without spellRef come first
      if (!a.spellRef && b.spellRef) return -1;
      if (a.spellRef && !b.spellRef) return 1;
      return 0;
    });

  $: hasVisibleContent =
    !$searchFilter ||
    filteredAttacks.length > 0 ||
    'attack'.includes($searchFilter.toLowerCase()) ||
    'spell'.includes($searchFilter.toLowerCase());
</script>

<section class="attacks" class:hidden={!hasVisibleContent}>
  <SectionHeader
    title="Attacks & Spells"
    collapsed={$collapsedStates.attacks}
    ariaLabel={$collapsedStates.attacks ? 'Expand' : 'Collapse'}
    onToggle={() => collapsedStates.update((s) => ({ ...s, attacks: !s.attacks }))}
  />
  <!-- <div style="margin: 1em 0;">
	<label style="font-size: 0.95em;">
		<input type="checkbox" bind:checked={debugForceD20Twenty} />
		Debug: Force all d20 rolls to 20
	</label>
</div> -->
  {#if !$collapsedStates.attacks}
    <button on:click={addAttack} class="btn btn-secondary">Add Attack</button>

    <div class="attacks-list">
      {#each filteredAttacks as attack (attack.id)}
        <div class="attack-card">
          <div class="attack-header">
            <input
              type="text"
              bind:value={attack.name}
              placeholder="Attack name"
              class="attack-name"
            />
            {#if $isEditMode}
              <button on:click={() => removeAttack(attack.id)} class="btn-remove">×</button>
            {/if}
          </div>
          <div class="attack-details">
            {#if attack.bonus !== 0 && attack.bonus !== undefined}
              <div class="attack-field">
                <label>Bonus</label>
                <input type="number" bind:value={attack.bonus} class="attack-bonus" />
              </div>
            {/if}
            {#if attack.damage && attack.damage.trim() !== ''}
              <div class="attack-field">
                <label>Damage</label>
                <input
                  type="text"
                  bind:value={attack.damage}
                  placeholder="e.g., 2d6+3"
                  class="attack-damage"
                />
              </div>
            {/if}
            <div class="attack-field">
              <label>Type</label>
              <input
                type="text"
                bind:value={attack.damageType}
                placeholder="e.g., slashing"
                class="attack-type"
              />
            </div>
          </div>
          {#if attack.spellRef}
            {#if spells.length === 0}
              <div class="spell-info-loading">Loading spell info...</div>
            {:else}
              {@const spell = getSpellByName(attack.spellRef)}
              {#if spell}
                {#if attack.generalNotes}
                  <div class="spell-notes">
                    <h4>General Notes</h4>
                    <p>{attack.generalNotes}</p>
                  </div>
                {/if}
                <div class="spell-info">
                  <div
                    class="spell-info-header"
                    on:click={() => toggleSpellInfo(attack.id)}
                    on:keydown={(e) => e.key === 'Enter' && toggleSpellInfo(attack.id)}
                    role="button"
                    tabindex="0"
                  >
                    <h4>Spell Info</h4>
                    <button
                      class="collapse-btn-small"
                      aria-label={collapsedSpellInfo[attack.id] ? 'Expand' : 'Collapse'}
                    >
                      {collapsedSpellInfo[attack.id] ? '▼' : '▲'}
                    </button>
                  </div>
                  {#if !collapsedSpellInfo[attack.id]}
                    <ul>
                      <li><strong>Level:</strong> {spell.level}</li>
                      <li>
                        <strong>Casting Time:</strong>
                        {spell.castingTime || spell.actionType}
                      </li>
                      <li><strong>Range:</strong> {spell.range}</li>
                      <li>
                        <strong>Components:</strong>
                        {spell.components.join(', ')}{#if spell.material}
                          ({spell.material}){/if}
                      </li>
                      <li>
                        <strong>Duration:</strong>
                        {#if spell.concentration}Concentration,
                        {/if}{spell.duration}
                      </li>
                      <li><strong>Description:</strong> {spell.description}</li>
                      {#if spell.higherLevelSlot}
                        <li><strong>At Higher Levels:</strong> {spell.higherLevelSlot}</li>
                      {/if}
                    </ul>
                  {/if}
                </div>
                {@const savingThrow = getSavingThrowInfo(spell)}
                {#if savingThrow}
                  <div class="target-condition">
                    <label>
                      <input
                        type="checkbox"
                        bind:checked={attack.targetSucceededSave}
                        class="use-enabled"
                      />
                      Target succeeded on {savingThrow.ability.charAt(0).toUpperCase() +
                        savingThrow.ability.slice(1)} save
                      {#if $character.class}
                        <span class="scaled-damage" style="margin-left: 8px;">
                          (Spell Save DC: {getSpellSaveDC($character, $abilityModifiers)})
                        </span>
                      {/if}
                      {#if attack.targetSucceededSave && savingThrow.halfDamageOnSave}
                        <span class="scaled-damage">(Half damage)</span>
                      {:else if attack.targetSucceededSave && savingThrow.noDamageOnSave}
                        <span class="scaled-damage">(No damage)</span>
                      {/if}
                    </label>
                  </div>
                {/if}
                {#if spell.higherLevelSlot && spell.level > 0}
                  {@const availableLevels = getAvailableSpellLevels(spell)}
                  {#if availableLevels.length > 0}
                    <div class="spell-level-selector">
                      <label for="castLevel-{attack.id}">Cast at Level:</label>
                      <select
                        id="castLevel-{attack.id}"
                        bind:value={attack.castAtLevel}
                        class="spell-level-select use-enabled"
                      >
                        {#each availableLevels as level}
                          <option value={level}>
                            Level {level}
                          </option>
                        {/each}
                      </select>
                      {#if attack.castAtLevel && attack.castAtLevel > spell.level}
                        {@const scaledDamage = getScaledSpellDamage(attack, spell)}
                        <span class="scaled-damage">
                          {#if isHealingSpell(spell)}
                            Healing
                          {:else}
                            Damage
                          {/if}
                          {scaledDamage}</span
                        >
                      {/if}
                    </div>
                    {#if spell.description.includes('Fiend or an Undead')}
                      <div class="target-condition">
                        <label>
                          <input
                            type="checkbox"
                            bind:checked={attack.targetIsFiendOrUndead}
                            class="use-enabled"
                          />
                          Target is Fiend or Undead
                          {#if attack.targetIsFiendOrUndead}
                            {@const scaledDamage = getScaledSpellDamage(attack, spell)}
                            <span class="scaled-damage">(+1d8, total: {scaledDamage})</span>
                          {/if}
                        </label>
                      </div>
                    {/if}
                  {:else}
                    <div class="spell-level-selector">
                      <span style="color: #dc3545; font-weight: bold;"
                        >No spell slots available!</span
                      >
                    </div>
                  {/if}
                {/if}
              {:else}
                <div class="spell-info-missing">Spell info not found.</div>
              {/if}
            {/if}
          {/if}
          {#if !attack.spellRef}
            <div class="attack-notes">
              <label>Notes</label>
              <textarea
                bind:value={attack.notes}
                placeholder="e.g., DC 15 Dex save, Range 120 ft, Concentration"
                class="notes-input"
                rows="2"
              />
            </div>
          {/if}
          <div class="attack-actions">
            {#if attack.bonus !== 0 || !attack.spellRef}
              <button on:click={() => rollAttack(attack)} class="btn btn-primary"
                >Roll Attack</button
              >
            {/if}
            {#if attack.spellRef && spellsLoaded}
              {@const spell = getSpellByName(attack.spellRef)}
              {#if spell && isBuffSpell(spell)}
                <button on:click={() => castBuffSpell(attack)} class="btn btn-success"
                  >Cast Spell</button
                >
              {:else}
                <button on:click={() => rollDamage(attack)} class="btn btn-secondary">
                  {#if spell && isHealingSpell(spell)}
                    Roll Healing
                  {:else}
                    Roll Damage
                  {/if}
                </button>
              {/if}
            {:else}
              <button on:click={() => rollDamage(attack)} class="btn btn-secondary"
                >Roll Damage</button
              >
            {/if}
          </div>
        </div>
      {/each}

      {#if $character.attacks.length === 0}
        <p class="no-attacks">No attacks added yet. Click "Add Attack" to create one.</p>
      {:else if filteredAttacks.length === 0}
        <p class="no-attacks">No attacks match your search.</p>
      {/if}
    </div>

    <!-- Active Spell States Section -->
    <div class="active-states-section">
      <h3>Active Spell Effects</h3>
      <p class="section-description">
        Effects that modify attack and damage rolls (e.g., Magic Weapon, Bless)
      </p>
      <button on:click={addActiveState} class="btn btn-secondary">Add Effect</button>

      {#if $character.activeStates && $character.activeStates.length > 0}
        <div class="states-list">
          {#each $character.activeStates as state, index}
            <div class="state-card">
              <div class="state-header">
                <input
                  type="text"
                  bind:value={state.name}
                  placeholder="Effect name (e.g., Magic Weapon)"
                  class="state-name"
                />
                {#if $isEditMode}
                  <button on:click={() => removeActiveState(index)} class="btn-remove">×</button>
                {/if}
              </div>
              <div class="state-details">
                <div class="state-field">
                  <label>Attack Bonus</label>
                  <input type="number" bind:value={state.attackBonus} class="state-bonus" />
                </div>
                <div class="state-field">
                  <label>Damage Bonus</label>
                  <input type="number" bind:value={state.damageBonus} class="state-bonus" />
                </div>
              </div>
              <div class="state-description">
                <label>Description</label>
                <input
                  type="text"
                  bind:value={state.description}
                  placeholder="e.g., +1 to attack and damage rolls (Magic Weapon)"
                  class="state-desc-input"
                />
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="no-states">No active effects. Add spell effects that modify your attacks.</p>
      {/if}
    </div>
  {/if}
</section>

<style>
  .attacks {
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
    cursor: pointer;
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

  .attacks-list {
    margin-top: 15px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .attack-card {
    background-color: #f9f9f9;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 15px;
  }

  .attack-header {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }

  .attack-name {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
    font-weight: bold;
  }

  .btn-remove {
    width: 32px;
    height: 32px;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.5rem;
    line-height: 1;
    transition: background-color 0.2s;
  }

  .btn-remove:hover {
    background-color: #c82333;
  }

  .attack-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    margin-bottom: 10px;
  }

  .attack-field {
    display: flex;
    flex-direction: column;
  }

  .attack-field label {
    font-size: 0.85rem;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .attack-field input {
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
  }

  .attack-notes {
    margin-top: 10px;
  }

  .attack-notes label {
    font-size: 0.85rem;
    font-weight: bold;
    margin-bottom: 4px;
    display: block;
  }

  .notes-input {
    width: 100%;
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-family: inherit;
    resize: vertical;
    min-height: 40px;
  }

  .notes-input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .attack-bonus {
    width: 100%;
  }

  .attack-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .no-attacks {
    text-align: center;
    color: #666;
    padding: 30px;
    font-style: italic;
  }

  input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .roll-notification {
    background: #4caf50;
    color: white;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 15px;
    font-weight: bold;
    text-align: center;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .spell-info {
    margin-top: 10px;
    padding: 10px;
    background-color: #e9f5ff;
    border: 1px solid #b3e0ff;
    border-radius: 4px;
  }

  .spell-info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
  }

  .spell-info-header:hover {
    opacity: 0.8;
  }

  .collapse-btn-small {
    background: none;
    border: none;
    font-size: 0.9rem;
    cursor: pointer;
    color: #007bff;
    padding: 0;
    transition: transform 0.2s ease;
  }

  .collapse-btn-small:hover {
    transform: scale(1.1);
  }

  .spell-info h4 {
    margin: 0 0 10px 0;
    font-size: 1.1rem;
    color: #007bff;
  }

  .spell-info ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  .spell-info li {
    margin-bottom: 5px;
  }

  .spell-notes {
    margin-top: 10px;
    padding: 10px;
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    border-radius: 4px;
  }

  .spell-notes h4 {
    margin: 0 0 10px 0;
    font-size: 1.1rem;
    color: #856404;
  }

  .spell-info-loading {
    margin-top: 10px;
    padding: 10px;
    background-color: #e2e3e5;
    border: 1px solid #ced4da;
    border-radius: 4px;
    color: #495057;
    font-size: 0.9rem;
    text-align: center;
  }

  .spell-info-missing {
    margin-top: 10px;
    padding: 10px;
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    color: #721c24;
    font-size: 0.9rem;
    text-align: center;
  }

  .spell-level-selector {
    margin-top: 10px;
    padding: 10px;
    background-color: #e7f3ff;
    border: 1px solid #b3d9ff;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .target-condition {
    margin-top: 10px;
    padding: 10px;
    background-color: #fff3e0;
    border: 1px solid #ffcc80;
    border-radius: 4px;
  }

  .target-condition label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    font-weight: normal;
    cursor: pointer;
  }

  .target-condition input[type='checkbox'] {
    cursor: pointer;
    width: 16px;
    height: 16px;
  }

  .spell-level-selector label {
    font-weight: bold;
    font-size: 0.9rem;
  }

  .spell-level-select {
    padding: 5px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .scaled-damage {
    font-weight: bold;
    color: #007bff;
    font-size: 0.9rem;
  }

  .hit-dice-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }

  .hit-dice-count-input {
    width: 60px;
    padding: 5px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    text-align: center;
  }

  .hit-dice-type {
    font-size: 0.9rem;
    color: #666;
    margin-left: 5px;
  }

  .active-states-section {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 2px solid var(--border-color);
  }

  .active-states-section h3 {
    margin: 0 0 10px 0;
    color: var(--primary-color);
    font-size: 1.3rem;
  }

  .section-description {
    margin: 0 0 15px 0;
    color: #666;
    font-size: 0.9rem;
    font-style: italic;
  }

  .states-list {
    margin-top: 15px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .state-card {
    background-color: #fff9e6;
    border: 1px solid #ffd966;
    border-radius: 6px;
    padding: 15px;
  }

  .state-header {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }

  .state-name {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
    font-weight: bold;
  }

  .state-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin-bottom: 10px;
  }

  .state-field {
    display: flex;
    flex-direction: column;
  }

  .state-field label {
    font-size: 0.85rem;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .state-bonus {
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    width: 100%;
  }

  .state-description {
    margin-top: 5px;
  }

  .state-description label {
    font-size: 0.85rem;
    font-weight: bold;
    margin-bottom: 4px;
    display: block;
  }

  .state-desc-input {
    width: 100%;
    padding: 6px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .no-states {
    text-align: center;
    color: #666;
    padding: 20px;
    font-style: italic;
    margin-top: 15px;
  }
</style>
