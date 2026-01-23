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
  import SpellReorderModal from '$lib/components/SpellReorderModal.svelte';

  // Debug mode: 'normal' (random), 'd20' (force 20), 'd1' (force 1)
  let debugForceD20Mode: 'normal' | 'd20' | 'd1' = 'normal';
  import type { Attack, Spell } from '$lib/types';
  import { loadSpells } from '$lib/dndData';
  import {
    getSavingThrowInfo,
    addsSpellcastingModifierToDamage,
    isBuffSpell,
    extractSpellEffectBonuses,
    requiresSpellAttackRoll
  } from '$lib/spellUtils';
  import { getSpellSaveDC, getSpellcastingModifier } from '$lib/combatUtils';

  const dispatch = createEventDispatcher();

  // Track collapsed state for each attack's spell info (collapsed by default)
  let collapsedSpellInfo: Record<string, boolean> = {};

  // Track target selection for targetable spells (default to 'self')
  let spellTargets: Record<string, 'self' | 'other'> = {};

  // Track reorder modal state
  let showReorderModal = false;

  // Collapse spell info by default for all attacks with spellRef
  $: {
    if ($character && $character.attacks) {
      for (const attack of $character.attacks) {
        if (attack.spellRef && collapsedSpellInfo[attack.id] === undefined) {
          collapsedSpellInfo[attack.id] = true;
        }
        // Initialize spell target to 'self' if not set
        if (attack.spellRef && spellTargets[attack.id] === undefined) {
          spellTargets[attack.id] = 'self';
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

  function isTargetableSpell(spellName: string): boolean {
    const targetableSpells = ['Shield of Faith', 'Bless', 'Aid', 'Magic Weapon'];
    return targetableSpells.includes(spellName);
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

  function openReorderModal() {
    showReorderModal = true;
  }

  function closeReorderModal() {
    showReorderModal = false;
  }

  function saveReorderedAttacks(reorderedAttacks: Attack[]) {
    character.update((c) => {
      c.attacks = reorderedAttacks;
      return c;
    });
    showReorderModal = false;
    toasts.add('Attack order updated successfully!', 'success');
  }

  function rollAttack(attack: Attack) {
    // If this is a spell attack, consume a spell slot
    let damageToRoll = attack.damage;
    let applyHalfDamage = false;
    let isSpellAttack = false;

    if (attack.spellRef) {
      const spell = getSpellByName(attack.spellRef);
      if (spell) {
        isSpellAttack = requiresSpellAttackRoll(spell);

        if (spell.level > 0) {
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
            applyHalfDamage =
              (savingThrow?.halfDamageOnSave && attack.targetSucceededSave) || false;
            damageToRoll = getScaledSpellDamage(attack, spell);
          }
        }
      }
    } else {
      // For non-spell attacks, apply active state bonuses to damage notation
      if ($character.activeStates && $character.activeStates.length > 0) {
        let numericModifier = 0;
        let stringModifiers: string[] = [];
        // Only apply bonuses from states targeting self (undefined or 'self')
        for (const state of $character.activeStates) {
          if (state.target === 'other') continue; // Skip states targeting others
          if (typeof state.damageBonus === 'string') {
            stringModifiers.push(state.damageBonus);
          } else if (typeof state.damageBonus === 'number') {
            numericModifier += state.damageBonus;
          }
        }

        if ((numericModifier !== 0 || stringModifiers.length > 0) && damageToRoll) {
          // Parse existing damage and add modifier
          const damageMatch = damageToRoll.match(/(\d+d\d+)([+-]\d+)?/);
          if (damageMatch) {
            const [, dice, existingMod] = damageMatch;
            const baseModifier = existingMod ? parseInt(existingMod) : 0;
            const totalModifier = baseModifier + numericModifier;
            let newDamage = `${dice}`;
            if (totalModifier !== 0) {
              newDamage += `${totalModifier >= 0 ? '+' : ''}${totalModifier}`;
            }
            if (stringModifiers.length > 0) {
              newDamage += ' + ' + stringModifiers.join(' + ');
            }
            damageToRoll = newDamage;
          }
        }
      }
    }

    // Build bonus breakdown for attack roll
    const bonusBreakdown: Array<{ value: number; source: string }> = [];

    let attackBonus = 0;

    // For spell attacks, use proficiency + spellcasting modifier
    if (isSpellAttack) {
      const spellcastingMod = getSpellcastingModifier($character, $abilityModifiers);
      const proficiency = $character.proficiencyBonus || 0;

      bonusBreakdown.push({ value: proficiency, source: 'proficiency' });
      bonusBreakdown.push({ value: spellcastingMod, source: 'spellcasting' });
      attackBonus = proficiency + spellcastingMod;
    } else {
      // For non-spell attacks, use the base attack bonus
      if (attack.bonus !== 0) {
        bonusBreakdown.push({ value: attack.bonus, source: 'base' });
      }
      attackBonus = attack.bonus;
    }

    // Apply active state bonuses to attack roll (only from self-targeted states)
    let stringAttackBonuses: string[] = [];
    if ($character.activeStates) {
      for (const state of $character.activeStates) {
        if (state.target === 'other') continue; // Skip states targeting others
        if (typeof state.attackBonus === 'number' && state.attackBonus !== 0) {
          bonusBreakdown.push({ value: state.attackBonus, source: state.name.toLowerCase() });
          attackBonus += state.attackBonus;
        } else if (typeof state.attackBonus === 'string' && state.attackBonus) {
          stringAttackBonuses.push(state.attackBonus);
          bonusBreakdown.push({ value: state.attackBonus, source: state.name.toLowerCase() });
        }
      }
    }

    let notation = `1d20${attackBonus >= 0 ? '+' : ''}${attackBonus}`;
    // Append string bonuses like "1d4" from Bless
    if (stringAttackBonuses.length > 0) {
      notation += '+' + stringAttackBonuses.join('+');
    }
    if (debugForceD20Mode === 'd20') {
      notation += `@20`;
    } else if (debugForceD20Mode === 'd1') {
      notation += `@1`;
    }
    dispatch('roll', {
      notation,
      damageNotation: damageToRoll,
      attackName: attack.name,
      applyHalfDamage,
      bonusBreakdown,
      rollType: 'attack'
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

        // Apply active state bonuses (only from self-targeted states)
        if ($character.activeStates && $character.activeStates.length > 0) {
          let numericModifier = 0;
          let stringModifiers: string[] = [];
          for (const state of $character.activeStates) {
            if (state.target === 'other') continue; // Skip states targeting others
            if (typeof state.damageBonus === 'string') {
              stringModifiers.push(state.damageBonus);
            } else if (typeof state.damageBonus === 'number' && state.damageBonus !== 0) {
              bonusBreakdown.push({ value: state.damageBonus, source: state.name.toLowerCase() });
              numericModifier += state.damageBonus;
            }
          }

          if (numericModifier !== 0 || stringModifiers.length > 0) {
            const totalModifier = baseModifier + numericModifier;
            let newDamage = `${dice}`;
            if (totalModifier !== 0) {
              newDamage += `${totalModifier >= 0 ? '+' : ''}${totalModifier}`;
            }
            if (stringModifiers.length > 0) {
              newDamage += ' + ' + stringModifiers.join(' + ');
            }
            damageToRoll = newDamage;
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

    // Apply active state bonuses to damage (only from self-targeted states)
    if ($character.activeStates) {
      for (const state of $character.activeStates) {
        if (state.target === 'other') continue; // Skip states targeting others
        if (typeof state.damageBonus === 'number') {
          additionalModifier += state.damageBonus;
        }
        // If string, ignore here (handled elsewhere for extra dice)
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
          description: '',
          target: 'self'
        }
      ];
      return c;
    });
  }

  function removeActiveState(index: number) {
    character.update((c) => {
      if (c.activeStates) {
        // Get the state before removing it
        const stateToRemove = c.activeStates[index];

        // If it has HP bonus and targets self, restore HP
        if (stateToRemove?.hpBonus && stateToRemove.target !== 'other') {
          c.maxHP -= stateToRemove.hpBonus;
          c.currentHP = Math.max(1, Math.min(c.currentHP - stateToRemove.hpBonus, c.maxHP));
        }

        c.activeStates = c.activeStates.filter((_, i) => i !== index);
      }
      return c;
    });
  }

  function castBuffSpell(attack: Attack, target: 'self' | 'other' = 'self') {
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

    // Calculate Aid HP bonus based on cast level
    let hpBonus = bonuses.hpBonus || 0;
    let effectDescription = bonuses.description;
    if (spell.name === 'Aid' && castLevel > spell.level) {
      const levelDiff = castLevel - spell.level;
      hpBonus = 5 + levelDiff * 5;
      effectDescription = `+${hpBonus} HP (max and current) for 8 hours`;
    }

    // Spells that can target self or others
    const targetableSpells = ['Shield of Faith', 'Bless', 'Aid', 'Magic Weapon'];
    const needsTargetSelection = targetableSpells.includes(spell.name);

    // Create or update the active state
    character.update((c) => {
      if (!c.activeStates) {
        c.activeStates = [];
      }

      // Check if this spell is already active - if so, remove it first (and restore any HP changes)
      const existingState = c.activeStates.find((state) => state.name === spell.name);
      if (existingState && existingState.hpBonus && existingState.target !== 'other') {
        // Restore HP from previous cast
        c.maxHP -= existingState.hpBonus;
        c.currentHP = Math.max(1, Math.min(c.currentHP - existingState.hpBonus, c.maxHP));
      }
      c.activeStates = c.activeStates.filter((state) => state.name !== spell.name);

      // Apply HP bonus if targeting self
      if (hpBonus > 0 && target === 'self') {
        c.maxHP += hpBonus;
        c.currentHP += hpBonus;
      }

      // Add the new state
      c.activeStates = [
        ...c.activeStates,
        {
          name: spell.name,
          attackBonus: bonuses.attackBonus,
          damageBonus: bonuses.damageBonus,
          acBonus: bonuses.acBonus,
          description: effectDescription,
          target,
          hpBonus
        }
      ];

      return c;
    });

    const targetText = target === 'self' ? ' on self' : ' on other';
    toasts.add(
      `${spell.name} cast${needsTargetSelection ? targetText : ''}! Effect added to Active Spell Effects.`,
      'success'
    );
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
    <label style="font-size: 0.95em; margin-right: 1em;">
      <input type="radio" name="debug-d20" value="normal" bind:group={debugForceD20Mode} />
      Debug: Normal
    </label>
    <label style="font-size: 0.95em; margin-right: 1em;">
      <input type="radio" name="debug-d20" value="d20" bind:group={debugForceD20Mode} />
      Debug: Force D20
    </label>
    <label style="font-size: 0.95em;">
      <input type="radio" name="debug-d20" value="d1" bind:group={debugForceD20Mode} />
      Debug: Force D1
    </label>
  </div> -->
  {#if !$collapsedStates.attacks}
    {#if $isEditMode}
      <div class="edit-buttons">
        <button on:click={addAttack} class="btn btn-secondary">Add Attack</button>
        {#if $character.attacks.length > 0}
          <button on:click={openReorderModal} class="btn btn-secondary">Reorder</button>
        {/if}
      </div>
    {/if}

    <div class="attacks-list">
      {#each filteredAttacks as attack (attack.id)}
        <div class="attack-card">
          <div class="attack-header">
            {#if $isEditMode}
              <input
                type="text"
                bind:value={attack.name}
                placeholder="Attack name"
                class="attack-name"
              />
            {:else}
              <h4 class="attack-name-display">{attack.name || '(Unnamed Attack)'}</h4>
            {/if}
            {#if $isEditMode}
              <button on:click={() => removeAttack(attack.id)} class="btn-remove">×</button>
            {/if}
          </div>
          <div class="attack-details">
            {#if attack.bonus !== 0 && attack.bonus !== undefined}
              <div class="attack-field">
                <label for="attack-bonus-{attack.id}">Bonus</label>
                <input
                  id="attack-bonus-{attack.id}"
                  type="number"
                  bind:value={attack.bonus}
                  class="attack-bonus"
                />
              </div>
            {/if}
            {#if attack.damage && attack.damage.trim() !== ''}
              <div class="attack-field">
                <label for="attack-damage-{attack.id}">Damage</label>
                <input
                  id="attack-damage-{attack.id}"
                  type="text"
                  bind:value={attack.damage}
                  placeholder="e.g., 2d6+3"
                  class="attack-damage"
                />
              </div>
            {/if}
            <div class="attack-field">
              <label for="attack-type-{attack.id}">Type</label>
              <input
                id="attack-type-{attack.id}"
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
                <!-- {#if attack.generalNotes}
                  <div class="spell-notes">
                    <h4>General Notes</h4>
                    <p>{attack.generalNotes}</p>
                  </div>
                {/if} -->
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
              <label for="attack-notes-{attack.id}">Notes</label>
              <textarea
                id="attack-notes-{attack.id}"
                bind:value={attack.notes}
                placeholder="e.g., DC 15 Dex save, Range 120 ft, Concentration"
                class="notes-input"
                rows="2"
              ></textarea>
            </div>
          {/if}
          <div class="attack-actions">
            {#if attack.spellRef && spellsLoaded}
              {@const spell = getSpellByName(attack.spellRef)}
              {#if spell}
                {#if requiresSpellAttackRoll(spell)}
                  <!-- Spell requires attack roll (e.g., Guiding Bolt, Eldritch Blast) -->
                  <button on:click={() => rollAttack(attack)} class="btn btn-primary"
                    >Roll Attack</button
                  >
                {:else if isBuffSpell(spell)}
                  <!-- Buff/effect spells like Bless, Aid, Command -->
                  {#if isTargetableSpell(spell.name)}
                    <div class="buff-target-selection">
                      <div class="target-options">
                        <label class="target-option">
                          <input
                            type="radio"
                            bind:group={spellTargets[attack.id]}
                            value="self"
                            name="target-{attack.id}"
                          />
                          Self
                        </label>
                        <label class="target-option">
                          <input
                            type="radio"
                            bind:group={spellTargets[attack.id]}
                            value="other"
                            name="target-{attack.id}"
                          />
                          Other
                        </label>
                      </div>
                      <button
                        on:click={() => castBuffSpell(attack, spellTargets[attack.id])}
                        class="btn btn-info"
                      >
                        Cast {spell.name}
                      </button>
                    </div>
                  {:else}
                    <button on:click={() => castBuffSpell(attack, 'self')} class="btn btn-info"
                      >Cast Spell</button
                    >
                  {/if}
                {:else}
                  <!-- Damage/healing spells with saving throws or no attack, or control spells -->
                  {#if attack.damage && attack.damage.trim() !== ''}
                    <button
                      on:click={() => rollDamage(attack)}
                      class="btn {isHealingSpell(spell) ? 'btn-success' : 'btn-secondary'}"
                    >
                      {#if isHealingSpell(spell)}
                        Roll Healing
                      {:else}
                        Roll Damage
                      {/if}
                    </button>
                  {:else}
                    <!-- Control spells or spells without damage (e.g., Hold Person) -->
                    <button on:click={() => castBuffSpell(attack, 'self')} class="btn btn-info"
                      >Cast Spell</button
                    >
                  {/if}
                {/if}
              {/if}
            {:else if !attack.spellRef}
              <!-- Non-spell attacks always show both buttons -->
              <button on:click={() => rollAttack(attack)} class="btn btn-primary"
                >Roll Attack</button
              >
              {#if attack.damage && attack.damage.trim() !== ''}
                <button on:click={() => rollDamage(attack)} class="btn btn-secondary"
                  >Roll Damage</button
                >
              {/if}
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
                  <label for="state-attack-bonus-{index}">Attack Bonus</label>
                  <input
                    id="state-attack-bonus-{index}"
                    type="number"
                    bind:value={state.attackBonus}
                    class="state-bonus"
                  />
                </div>
                <div class="state-field">
                  <label for="state-damage-bonus-{index}">Damage Bonus</label>
                  <input
                    id="state-damage-bonus-{index}"
                    type="text"
                    bind:value={state.damageBonus}
                    class="state-bonus"
                  />
                </div>
                <div class="state-field">
                  <label for="state-target-{index}">Target</label>
                  <select id="state-target-{index}" bind:value={state.target} class="state-bonus">
                    <option value="self">Self</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div class="state-description">
                <label for="state-desc-{index}">Description</label>
                <input
                  id="state-desc-{index}"
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

<SpellReorderModal
  show={showReorderModal}
  attacks={$character.attacks}
  onSave={saveReorderedAttacks}
  onCancel={closeReorderModal}
/>

<style>
  .attacks {
    background-color: var(--card-bg);
    padding: 20px;
    border-radius: 8px;
    box-shadow: var(--shadow);
  }

  .hidden {
    display: none;
  }

  .edit-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .attacks-list {
    margin-top: 15px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    /* Max 3 columns */
    @media (min-width: 900px) {
      grid-template-columns: repeat(3, 1fr);
    }
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

  .buff-target-selection {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .target-options {
    display: flex;
    gap: 15px;
    padding: 8px 12px;
    background-color: #f0f8ff;
    border: 1px solid #b3d9ff;
    border-radius: 4px;
  }

  .target-option {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: normal;
    cursor: pointer;
    margin: 0;
  }

  .target-option input[type='radio'] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    margin: 0;
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

  .attack-name-display {
    color: var(--primary-color);
    margin: 0;
    font-size: 1.2em;
  }
</style>
