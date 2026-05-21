<script lang="ts">
  import { character, getLevelUpPreview, applyLevelUp, toasts } from '$lib/stores';
  import { rollFromNotation } from '$lib/diceUtils';
  import { getClassConfig } from '$lib/classConfig';
  import type { LevelUpPreview } from '$lib/stores';

  export let isOpen = false;
  export let onClose: () => void = () => {};

  let hpGainMethod: 'average' | 'roll' | 'reuse' = 'average';
  let hpRollValue: number | null = null;
  let hpRollModifier: number = 0;
  let preview: LevelUpPreview | null = null;
  let isRolling = false;
  let storedHPAvailable: boolean = false;
  let storedHPValue: number = 0;

  $: {
    if (isOpen) {
      preview = getLevelUpPreview();
      // Check if this level was visited before
      if (preview) {
        const prevHP = $character.hpByLevel?.[preview.newLevel];
        storedHPAvailable = prevHP !== undefined && prevHP > 0;
        storedHPValue = prevHP || 0;
      }
    }
  }

  function rollForHPGain() {
    if (!$character.class) return;

    const classConfig = getClassConfig($character.class);
    if (!classConfig) return;

    isRolling = true;
    const result = rollFromNotation(classConfig.hitDice);
    hpRollValue = result.rolls[0]; // Just the die roll, not total
    hpRollModifier = preview?.conMod ?? 0;
    isRolling = false;
  }

  function handleConfirm() {
    if (!preview) return;

    if (hpGainMethod === 'roll' && hpRollValue === null) {
      toasts.add('Please roll for HP gain first', 'error');
      return;
    }

    let finalHPGain: number | undefined;
    if (hpGainMethod === 'roll') {
      finalHPGain = hpRollValue ?? undefined;
    } else if (hpGainMethod === 'reuse') {
      finalHPGain = undefined; // Signal to use stored HP
    }

    applyLevelUp(hpGainMethod, finalHPGain);
    toasts.add(`Leveled up to ${preview.newLevel}! HP restored, resources recharged.`, 'success');
    isOpen = false;
    onClose();
  }

  function handleCancel() {
    isOpen = false;
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancel();
    }
  }
</script>

{#if isOpen && preview}
  <div class="modal-overlay" on:click={handleCancel} on:keydown={handleKeydown} role="presentation">
    <div
      class="modal-content"
      on:click={(e) => e.stopPropagation()}
      on:keydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-labelledby="level-up-title"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="modal-header">
        <h2 id="level-up-title">Level Up to {preview.newLevel}</h2>
        <button class="close-btn" on:click={handleCancel} aria-label="Close level up dialog"
          >✕</button
        >
      </div>

      <div class="modal-body">
        <!-- HP Section -->
        <div class="section">
          <h3>Hit Points</h3>
          <div class="hp-preview">
            <div class="hp-row">
              <span class="label">Current Max HP:</span>
              <span class="value">{preview.maxHPCurrent}</span>
            </div>
            <div class="hp-row">
              <span class="label">Constitution Modifier:</span>
              <span class="value">{preview.conMod >= 0 ? '+' : ''}{preview.conMod}</span>
            </div>
            <div class="hp-row highlight">
              <span class="label">New Max HP:</span>
              <span class="value">{preview.maxHPAfter}</span>
            </div>
            <div class="hp-row">
              <span class="label">Current HP will be restored to:</span>
              <span class="value">{preview.maxHPAfter}</span>
            </div>
          </div>

          <div class="hp-gain-selector">
            <div class="radio-group">
              <label class="radio-label">
                <input
                  type="radio"
                  bind:group={hpGainMethod}
                  value="average"
                  disabled={isRolling}
                />
                <span>Use Average: +{preview.hpGainAverage} HP</span>
              </label>
            </div>

            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" bind:group={hpGainMethod} value="roll" disabled={isRolling} />
                <span>Roll Hit Die</span>
              </label>
              {#if hpGainMethod === 'roll'}
                <div class="roll-controls">
                  <button class="roll-btn" on:click={rollForHPGain} disabled={isRolling}>
                    {isRolling ? 'Rolling...' : '🎲 Roll'}
                  </button>
                  {#if hpRollValue !== null}
                    <span class="roll-result">
                      Roll: {hpRollValue} + {hpRollModifier} =
                      <strong>{Math.max(1, hpRollValue + hpRollModifier)} HP</strong>
                    </span>
                  {/if}
                </div>
              {/if}
            </div>

            {#if storedHPAvailable}
              <div class="radio-group">
                <label class="radio-label">
                  <input
                    type="radio"
                    bind:group={hpGainMethod}
                    value="reuse"
                    disabled={isRolling}
                  />
                  <span>Reuse Previous: {storedHPValue} HP (from level {preview.newLevel})</span>
                </label>
              </div>
            {/if}
          </div>
        </div>

        <!-- Resources Section -->
        <div class="section">
          <h3>Resources Restored</h3>
          <div class="resources">
            <div class="resource-item">
              <span class="resource-icon">✓</span>
              <span>All Spell Slots ({preview.spellSlotsRestored} total)</span>
            </div>
            <div class="resource-item">
              <span class="resource-icon">✓</span>
              <span>Hit Dice: {preview.newLevel}/{preview.newLevel}</span>
            </div>
            {#each Object.entries(preview.classFeatureCounts) as [name, { max }]}
              <div class="resource-item">
                <span class="resource-icon">✓</span>
                <span>{name}: {max}/{max}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Proficiency Bonus -->
        <div class="section info">
          <p>
            <strong>Note:</strong> Proficiency Bonus and other abilities will be updated automatically.
          </p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={handleCancel}>Cancel</button>
        <button
          class="btn btn-primary"
          on:click={handleConfirm}
          disabled={hpGainMethod === 'roll' && hpRollValue === null}
        >
          Confirm Level Up
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--card-bg);
    border-radius: 12px;
    box-shadow: 0 18px 40px rgba(17, 31, 46, 0.28);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 20px;
    background: linear-gradient(135deg, #2c5aa0 0%, #3d7bc4 100%);
    border-bottom: none;
  }

  .modal-header h2 {
    margin: 0;
    color: #fff;
    font-size: 1.5rem;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #fff;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .modal-body {
    padding: 20px;
    flex: 1;
  }

  .section {
    margin-bottom: 24px;
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .section h3 {
    margin-top: 0;
    margin-bottom: 12px;
    color: #2c5aa0;
    font-size: 1.1rem;
  }

  .section.info {
    background: #f0f4f8;
    border-left: 3px solid #2c5aa0;
    border-radius: 6px;
    padding: 12px;
  }

  .section.info p {
    margin: 0;
    font-size: 0.95rem;
  }

  .hp-preview {
    background: #f5f1e8;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .hp-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 0.95rem;
  }

  .hp-row.highlight {
    background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
    color: #fff;
    margin: 0 -12px;
    padding: 8px 12px;
    font-weight: 700;
  }

  .hp-row .label {
    font-weight: 500;
  }

  .hp-row .value {
    font-weight: 700;
  }

  .hp-gain-selector {
    margin-bottom: 12px;
  }

  .radio-group {
    margin-bottom: 12px;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 0.95rem;
  }

  .radio-label input[type='radio'] {
    cursor: pointer;
  }

  .radio-label input[type='radio']:disabled {
    cursor: not-allowed;
  }

  .roll-controls {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 8px;
    padding-left: 24px;
  }

  .roll-btn {
    padding: 6px 12px;
    background: #e74c3c;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .roll-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .roll-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .roll-result {
    font-size: 0.9rem;
    font-weight: 500;
  }

  .resources {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .resource-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: #f0f4f8;
    border-left: 3px solid #2ecc71;
    border-radius: 4px;
    font-size: 0.95rem;
  }

  .resource-icon {
    color: #2ecc71;
    font-weight: 700;
    min-width: 20px;
    text-align: center;
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    padding: 16px 20px;
    border-top: 2px solid #e8eef5;
    justify-content: flex-end;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
    color: #fff;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.85;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
  }

  .btn-secondary {
    background: #e8eef5;
    color: #2c3e50;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #d4dce6;
  }
</style>
