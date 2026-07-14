<script lang="ts">
  import { character, collapsedStates, searchFilter } from '$lib/stores';
  import SectionHeader from '$lib/components/SectionHeader.svelte';
  import TooltipInfo from '$lib/components/TooltipInfo.svelte';

  function toggleCollapse() {
    collapsedStates.update((s: any) => ({ ...s, conditions: !s.conditions }));
  }

  const CONDITIONS: { name: string; icon: string; description: string }[] = [
    { name: 'Blinded', icon: '🙈', description: "Can't see, auto-fails sight checks. Attacks against have advantage; its attacks have disadvantage." },
    { name: 'Charmed', icon: '💗', description: "Can't attack the charmer; charmer has advantage on social checks with it." },
    { name: 'Deafened', icon: '🔇', description: "Can't hear and auto-fails hearing checks." },
    { name: 'Frightened', icon: '😨', description: 'Disadvantage on checks and attacks while source is in line of sight; can’t willingly move closer.' },
    { name: 'Grappled', icon: '✊', description: 'Speed becomes 0; ends if grappler is incapacitated or moved away.' },
    { name: 'Incapacitated', icon: '💫', description: "Can't take actions, bonus actions, or reactions." },
    { name: 'Invisible', icon: '👻', description: 'Heavily obscured. Attacks against have disadvantage; its attacks have advantage.' },
    { name: 'Paralyzed', icon: '🥶', description: 'Incapacitated, can’t move/speak. Auto-fails STR/DEX saves. Attacks have advantage; hits within 5 ft are crits.' },
    { name: 'Petrified', icon: '🗿', description: 'Turned to solid substance; incapacitated, resistant to all damage, immune to poison/disease.' },
    { name: 'Poisoned', icon: '🤢', description: 'Disadvantage on attack rolls and ability checks.' },
    { name: 'Prone', icon: '🛌', description: 'Disadvantage on attacks. Melee attacks against have advantage; ranged have disadvantage. Costs half speed to stand.' },
    { name: 'Restrained', icon: '🕸️', description: 'Speed 0; disadvantage on attacks and DEX saves. Attacks against have advantage.' },
    { name: 'Stunned', icon: '😵', description: 'Incapacitated, can’t move. Auto-fails STR/DEX saves. Attacks against have advantage.' },
    { name: 'Unconscious', icon: '😴', description: 'Incapacitated, prone, drops everything. Auto-fails STR/DEX saves. Hits within 5 ft are crits.' }
  ];

  function isActive(name: string): boolean {
    return ($character.conditions ?? []).includes(name);
  }

  function toggle(name: string) {
    character.update((c) => {
      const current = c.conditions ?? [];
      const conditions = current.includes(name)
        ? current.filter((x) => x !== name)
        : [...current, name];
      return { ...c, conditions };
    });
  }

  function setExhaustion(level: number) {
    character.update((c) => ({ ...c, exhaustionLevel: Math.max(0, Math.min(6, level)) }));
  }

  function clearAll() {
    character.update((c) => ({ ...c, conditions: [], exhaustionLevel: 0 }));
  }

  $: exhaustion = $character.exhaustionLevel ?? 0;
  $: activeCount = ($character.conditions?.length ?? 0) + (exhaustion > 0 ? 1 : 0);

  const EXHAUSTION_EFFECTS = [
    'No exhaustion',
    'Disadvantage on ability checks',
    'Speed halved',
    'Disadvantage on attack rolls and saving throws',
    'Hit point maximum halved',
    'Speed reduced to 0',
    'Death'
  ];

  $: hasVisibleContent =
    !$searchFilter ||
    'condition'.includes($searchFilter.toLowerCase()) ||
    'exhaustion'.includes($searchFilter.toLowerCase()) ||
    CONDITIONS.some((c) => c.name.toLowerCase().includes($searchFilter.toLowerCase()));
</script>

<section class="conditions" class:hidden={!hasVisibleContent}>
  <SectionHeader
    title={activeCount > 0 ? `Conditions (${activeCount})` : 'Conditions'}
    collapsed={$collapsedStates.conditions}
    ariaLabel={$collapsedStates.conditions ? 'Expand' : 'Collapse'}
    onToggle={toggleCollapse}
  />
  {#if !$collapsedStates.conditions}
    <div class="conditions-body">
      <div class="chips">
        {#each CONDITIONS as { name, icon, description }}
          <button class="chip" class:active={isActive(name)} on:click={() => toggle(name)}>
            <span class="chip-icon">{icon}</span>
            <span class="chip-name">{name}</span>
            <TooltipInfo tooltipContent={description} ariaLabel={`${name} details`} />
          </button>
        {/each}
      </div>

      <div class="exhaustion">
        <div class="exhaustion-header">
          <span class="exhaustion-title">Exhaustion</span>
          <TooltipInfo
            tooltipContent="Exhaustion is measured in levels 1-6. Effects are cumulative. A long rest reduces exhaustion by 1 (if food and drink are available)."
            ariaLabel="Exhaustion details"
          />
        </div>
        <div class="exhaustion-levels">
          {#each [0, 1, 2, 3, 4, 5, 6] as level}
            <button
              class="level-btn"
              class:active={exhaustion === level}
              class:danger={level >= 4 && exhaustion === level}
              on:click={() => setExhaustion(level)}
            >
              {level}
            </button>
          {/each}
        </div>
        <p class="exhaustion-effect">{EXHAUSTION_EFFECTS[exhaustion]}</p>
      </div>

      {#if activeCount > 0}
        <button class="clear-btn" on:click={clearAll}>Clear All</button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .conditions {
    background-color: var(--card-bg);
    padding: 20px;
    border-radius: 8px;
    box-shadow: var(--shadow);
  }

  .hidden {
    display: none;
  }

  .conditions-body {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin-top: 16px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 20px;
    border: 2px solid var(--border-color);
    background: var(--card-bg-secondary, var(--card-bg));
    color: var(--text-color);
    cursor: pointer;
    font-size: 0.9rem;
    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  }

  .chip:hover {
    border-color: var(--primary-color);
  }

  .chip.active {
    background: rgba(200, 60, 60, 0.15);
    border-color: #c83c3c;
    font-weight: 600;
  }

  .chip-icon {
    font-size: 1rem;
    line-height: 1;
  }

  .exhaustion {
    border-top: 1px solid var(--border-color);
    padding-top: 14px;
  }

  .exhaustion-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  .exhaustion-title {
    font-weight: 600;
    color: var(--primary-color);
  }

  .exhaustion-levels {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .level-btn {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: 2px solid var(--border-color);
    background: var(--card-bg);
    color: var(--text-color);
    cursor: pointer;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .level-btn:hover {
    border-color: var(--primary-color);
  }

  .level-btn.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  .level-btn.danger {
    background: #c83c3c;
    border-color: #c83c3c;
  }

  .exhaustion-effect {
    margin: 8px 0 0;
    font-size: 0.85rem;
    color: var(--secondary-color, #888);
    font-style: italic;
  }

  .clear-btn {
    align-self: flex-start;
    padding: 8px 14px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background: transparent;
    color: var(--text-color);
    cursor: pointer;
    font-size: 0.85rem;
  }

  .clear-btn:hover {
    background: var(--border-color);
  }
</style>
