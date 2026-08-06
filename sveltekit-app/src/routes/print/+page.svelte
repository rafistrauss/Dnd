<script lang="ts">
  import { character, abilityModifiers, calculateModifier } from '$lib/stores';
  import { SKILL_ABILITIES } from '$lib/types';
  import type { SkillName } from '$lib/types';

  const abilities = [
    { key: 'strength' as const, label: 'Strength', short: 'STR' },
    { key: 'dexterity' as const, label: 'Dexterity', short: 'DEX' },
    { key: 'constitution' as const, label: 'Constitution', short: 'CON' },
    { key: 'intelligence' as const, label: 'Intelligence', short: 'INT' },
    { key: 'wisdom' as const, label: 'Wisdom', short: 'WIS' },
    { key: 'charisma' as const, label: 'Charisma', short: 'CHA' }
  ];

  const skills: { key: SkillName; label: string }[] = [
    { key: 'acrobatics', label: 'Acrobatics' },
    { key: 'animalHandling', label: 'Animal Handling' },
    { key: 'arcana', label: 'Arcana' },
    { key: 'athletics', label: 'Athletics' },
    { key: 'deception', label: 'Deception' },
    { key: 'history', label: 'History' },
    { key: 'insight', label: 'Insight' },
    { key: 'intimidation', label: 'Intimidation' },
    { key: 'investigation', label: 'Investigation' },
    { key: 'medicine', label: 'Medicine' },
    { key: 'nature', label: 'Nature' },
    { key: 'perception', label: 'Perception' },
    { key: 'performance', label: 'Performance' },
    { key: 'persuasion', label: 'Persuasion' },
    { key: 'religion', label: 'Religion' },
    { key: 'sleightOfHand', label: 'Sleight of Hand' },
    { key: 'stealth', label: 'Stealth' },
    { key: 'survival', label: 'Survival' }
  ];

  function fmt(n: number): string {
    return n >= 0 ? `+${n}` : `${n}`;
  }

  function skillMod(key: SkillName): number {
    const ability = SKILL_ABILITIES[key];
    const abilityMod = $abilityModifiers[ability];
    const prof = $character.skillProficiencies[key] ? $character.proficiencyBonus : 0;
    return abilityMod + prof;
  }

  function saveMod(key: keyof typeof $character.saveProficiencies): number {
    const abilityMod = $abilityModifiers[key];
    const prof = $character.saveProficiencies[key] ? $character.proficiencyBonus : 0;
    return abilityMod + prof;
  }

  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
</script>

<svelte:head>
  <title>{$character.name || 'Character'} — D&D Character Sheet</title>
</svelte:head>

<div class="sheet">
  <!-- Print button (hidden when printing) -->
  <div class="print-controls no-print">
    <a href="/" class="btn-back">← Back to Sheet</a>
    <button class="btn-print" onclick={() => window.print()}>🖨 Print / Save PDF</button>
  </div>

  <!-- ===== PAGE 1 ===== -->
  <div class="page">
    <!-- Header -->
    <header class="char-header">
      <div class="char-title">
        <h1>{$character.name || 'Unnamed Character'}</h1>
        <div class="char-meta">
          <span>{capitalize($character.class)}{$character.subclass ? ` (${capitalize($character.subclass)})` : ''} · Level {$character.level}</span>
          <span>{$character.race}</span>
          <span>{$character.background}</span>
          <span>{$character.alignment}</span>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat-box">
          <span class="stat-val">{$character.proficiencyBonus >= 0 ? '+' : ''}{$character.proficiencyBonus}</span>
          <span class="stat-label">Prof. Bonus</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{$character.inspiration ? '★' : '☆'}</span>
          <span class="stat-label">Inspiration</span>
        </div>
      </div>
    </header>

    <div class="columns">
      <!-- Left column: abilities + saves + skills -->
      <div class="col-left">
        <!-- Ability Scores -->
        <section class="abilities-section">
          {#each abilities as { key, label, short }}
            <div class="ability-block">
              <div class="ability-label">{short}</div>
              <div class="ability-score">{$character.abilities[key]}</div>
              <div class="ability-mod">{fmt($abilityModifiers[key])}</div>
            </div>
          {/each}
        </section>

        <!-- Saving Throws -->
        <section class="box-section">
          <h3 class="section-title">Saving Throws</h3>
          {#each abilities as { key, label }}
            <div class="row-item">
              <span class="prof-dot" class:filled={$character.saveProficiencies[key]}>
                {$character.saveProficiencies[key] ? '●' : '○'}
              </span>
              <span class="row-val">{fmt(saveMod(key))}</span>
              <span class="row-label">{label}</span>
            </div>
          {/each}
        </section>

        <!-- Skills -->
        <section class="box-section">
          <h3 class="section-title">Skills</h3>
          {#each skills as { key, label }}
            <div class="row-item">
              <span class="prof-dot" class:filled={$character.skillProficiencies[key]}>
                {$character.skillProficiencies[key] ? '●' : '○'}
              </span>
              <span class="row-val">{fmt(skillMod(key))}</span>
              <span class="row-label">{label}</span>
              <span class="row-ability">({SKILL_ABILITIES[key].substring(0, 3).toUpperCase()})</span>
            </div>
          {/each}
        </section>
      </div>

      <!-- Middle column: combat + attacks -->
      <div class="col-mid">
        <!-- Combat Stats -->
        <section class="combat-row">
          <div class="combat-box">
            <span class="combat-val">{$character.armorClass}</span>
            <span class="combat-label">Armor Class</span>
            {#if $character.armorName}<span class="combat-sub">{$character.armorName}</span>{/if}
          </div>
          <div class="combat-box">
            <span class="combat-val">{fmt($character.initiative)}</span>
            <span class="combat-label">Initiative</span>
          </div>
          <div class="combat-box">
            <span class="combat-val">{$character.speed}</span>
            <span class="combat-label">Speed</span>
          </div>
        </section>

        <section class="hp-row">
          <div class="hp-box">
            <span class="combat-label">Max HP</span>
            <span class="combat-val">{$character.maxHP}</span>
          </div>
          <div class="hp-box">
            <span class="combat-label">Current HP</span>
            <span class="combat-val hp-current">{$character.currentHP}</span>
          </div>
          <div class="hp-box">
            <span class="combat-label">Temp HP</span>
            <span class="combat-val">{$character.tempHP || '—'}</span>
          </div>
        </section>

        <div class="hit-dice-row">
          <div class="hit-dice-box">
            <span class="combat-label">Hit Dice</span>
            <span class="combat-val">{$character.hitDice.current}/{$character.hitDice.max}d{$character.class ? ({ barbarian: 12, fighter: 10, paladin: 10, ranger: 10, rogue: 8, monk: 8, cleric: 8, druid: 8, bard: 8, warlock: 8, wizard: 6, sorcerer: 6 }[$character.class.toLowerCase()] ?? 8) : 8}</span>
          </div>
          {#if $character.exhaustionLevel && $character.exhaustionLevel > 0}
            <div class="hit-dice-box">
              <span class="combat-label">Exhaustion</span>
              <span class="combat-val">{$character.exhaustionLevel}/6</span>
            </div>
          {/if}
        </div>

        <!-- Attacks & Spells -->
        <section class="box-section attacks-section">
          <h3 class="section-title">Attacks & Spells</h3>
          <table class="attacks-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Atk Bonus</th>
                <th>Damage</th>
                <th>Type</th>
                <th>Mastery</th>
              </tr>
            </thead>
            <tbody>
              {#each $character.attacks as atk}
                <tr>
                  <td>{atk.name}</td>
                  <td class="center">{atk.bonus !== 0 ? fmt(atk.bonus) : '—'}</td>
                  <td class="center">{atk.damage || '—'}</td>
                  <td>{atk.damageType || '—'}</td>
                  <td>{atk.mastery || '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if $character.attacks.some(a => a.notes)}
            <div class="attack-notes">
              {#each $character.attacks.filter(a => a.notes) as atk}
                <div class="attack-note-line"><strong>{atk.name}:</strong> {atk.notes}</div>
              {/each}
            </div>
          {/if}
        </section>

        <!-- Equipment -->
        <section class="box-section">
          <h3 class="section-title">Equipment</h3>
          <p class="text-block">{$character.equipment || '—'}</p>
        </section>

        <!-- Money -->
        {#if $character.money}
          <section class="box-section money-section">
            <h3 class="section-title">Currency</h3>
            <div class="money-row">
              <div class="coin-box"><span class="coin-val">{$character.money.pp}</span><span class="coin-label">PP</span></div>
              <div class="coin-box"><span class="coin-val">{$character.money.gp}</span><span class="coin-label">GP</span></div>
              <div class="coin-box"><span class="coin-val">{$character.money.ep}</span><span class="coin-label">EP</span></div>
              <div class="coin-box"><span class="coin-val">{$character.money.sp}</span><span class="coin-label">SP</span></div>
              <div class="coin-box"><span class="coin-val">{$character.money.cp}</span><span class="coin-label">CP</span></div>
            </div>
          </section>
        {/if}
      </div>

      <!-- Right column: features + notes -->
      <div class="col-right">
        <!-- Features & Traits -->
        <section class="box-section features-section">
          <h3 class="section-title">Features & Traits</h3>
          <div class="text-block preformatted">{$character.features || '—'}</div>
        </section>

        <!-- Notes -->
        <section class="box-section">
          <h3 class="section-title">Notes</h3>
          <p class="text-block">{$character.notes || '—'}</p>
        </section>

        <!-- Conditions -->
        {#if $character.conditions && $character.conditions.length > 0}
          <section class="box-section">
            <h3 class="section-title">Conditions</h3>
            <div class="tags">
              {#each $character.conditions as cond}
                <span class="tag">{cond}</span>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Active Effects -->
        {#if $character.activeStates && $character.activeStates.length > 0}
          <section class="box-section">
            <h3 class="section-title">Active Effects</h3>
            <div class="tags">
              {#each $character.activeStates as state}
                <span class="tag tag-effect">{state.name}</span>
              {/each}
            </div>
          </section>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  /* ---- Reset & base ---- */
  :global(body) {
    margin: 0;
    background: #f0ece4;
    font-family: 'Georgia', serif;
    color: #1a1a1a;
  }

  .sheet {
    max-width: 1100px;
    margin: 0 auto;
    padding: 12px;
  }

  /* ---- Print controls ---- */
  .print-controls {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .btn-back {
    text-decoration: none;
    padding: 8px 16px;
    background: #555;
    color: white;
    border-radius: 4px;
    font-family: sans-serif;
    font-size: 0.9rem;
  }

  .btn-print {
    padding: 8px 20px;
    background: #7b3f00;
    color: white;
    border: none;
    border-radius: 4px;
    font-family: sans-serif;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .btn-print:hover {
    background: #5a2e00;
  }

  /* ---- Page ---- */
  .page {
    background: #fff;
    border: 2px solid #7b3f00;
    border-radius: 6px;
    padding: 20px 24px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  }

  /* ---- Header ---- */
  .char-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #7b3f00;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }

  h1 {
    margin: 0 0 4px;
    font-size: 1.8rem;
    color: #7b3f00;
  }

  .char-meta {
    display: flex;
    gap: 16px;
    font-size: 0.85rem;
    color: #444;
    flex-wrap: wrap;
  }

  .char-meta span::after {
    content: '·';
    margin-left: 16px;
    color: #999;
  }

  .char-meta span:last-child::after {
    content: '';
  }

  .header-stats {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
  }

  .stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #7b3f00;
    color: white;
    padding: 8px 14px;
    border-radius: 6px;
    min-width: 64px;
  }

  .stat-val {
    font-size: 1.3rem;
    font-weight: bold;
  }

  .stat-label {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.9;
  }

  /* ---- Column layout ---- */
  .columns {
    display: grid;
    grid-template-columns: 200px 1fr 1fr;
    gap: 16px;
    align-items: start;
  }

  /* ---- Ability Scores ---- */
  .abilities-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .ability-block {
    display: grid;
    grid-template-columns: 36px 36px 36px;
    align-items: center;
    gap: 4px;
    background: #fdf6ec;
    border: 1px solid #c9a87a;
    border-radius: 6px;
    padding: 5px 8px;
  }

  .ability-label {
    font-size: 0.7rem;
    font-weight: bold;
    color: #7b3f00;
    text-transform: uppercase;
  }

  .ability-score {
    font-size: 1.1rem;
    font-weight: bold;
    text-align: center;
  }

  .ability-mod {
    font-size: 1rem;
    font-weight: bold;
    color: #7b3f00;
    text-align: center;
    background: #7b3f00;
    color: white;
    border-radius: 4px;
    padding: 2px 4px;
  }

  /* ---- Section box ---- */
  .box-section {
    border: 1px solid #c9a87a;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 10px;
    background: #fdf6ec;
  }

  .section-title {
    margin: 0 0 6px;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #7b3f00;
    border-bottom: 1px solid #c9a87a;
    padding-bottom: 3px;
  }

  /* ---- Rows (saves, skills) ---- */
  .row-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78rem;
    padding: 1px 0;
  }

  .prof-dot {
    font-size: 0.7rem;
    color: #999;
    flex-shrink: 0;
  }

  .prof-dot.filled {
    color: #7b3f00;
  }

  .row-val {
    font-weight: bold;
    min-width: 28px;
    text-align: right;
    font-size: 0.82rem;
  }

  .row-label {
    flex: 1;
  }

  .row-ability {
    color: #888;
    font-size: 0.68rem;
  }

  /* ---- Combat stats ---- */
  .combat-row, .hp-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }

  .combat-box, .hp-box {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #fdf6ec;
    border: 1px solid #c9a87a;
    border-radius: 6px;
    padding: 6px 4px;
  }

  .combat-val {
    font-size: 1.4rem;
    font-weight: bold;
    color: #1a1a1a;
  }

  .hp-current {
    color: #c0392b;
  }

  .combat-label {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #7b3f00;
  }

  .combat-sub {
    font-size: 0.65rem;
    color: #666;
  }

  .hit-dice-row {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }

  .hit-dice-box {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #fdf6ec;
    border: 1px solid #c9a87a;
    border-radius: 6px;
    padding: 5px 4px;
  }

  /* ---- Attacks table ---- */
  .attacks-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;
  }

  .attacks-table th {
    background: #7b3f00;
    color: white;
    padding: 3px 6px;
    text-align: left;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .attacks-table td {
    padding: 3px 6px;
    border-bottom: 1px solid #e8d5b5;
  }

  .attacks-table tr:last-child td {
    border-bottom: none;
  }

  .center {
    text-align: center;
  }

  .attack-notes {
    margin-top: 6px;
    font-size: 0.72rem;
    color: #444;
    border-top: 1px solid #e8d5b5;
    padding-top: 5px;
  }

  .attack-note-line {
    margin-bottom: 2px;
    line-height: 1.4;
  }

  /* ---- Text blocks ---- */
  .text-block {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.5;
    color: #1a1a1a;
  }

  .preformatted {
    white-space: pre-wrap;
  }

  /* ---- Money ---- */
  .money-row {
    display: flex;
    gap: 8px;
    justify-content: space-around;
  }

  .coin-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .coin-val {
    font-size: 1rem;
    font-weight: bold;
  }

  .coin-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: #7b3f00;
  }

  /* ---- Tags ---- */
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag {
    background: #f0e0c8;
    border: 1px solid #c9a87a;
    border-radius: 10px;
    padding: 2px 8px;
    font-size: 0.72rem;
  }

  .tag-effect {
    background: #d4eaff;
    border-color: #7ab0d4;
  }

  /* ---- Print styles ---- */
  @media print {
    :global(body) {
      background: white;
    }

    .no-print {
      display: none !important;
    }

    .sheet {
      max-width: 100%;
      padding: 0;
    }

    .page {
      border: none;
      box-shadow: none;
      padding: 8mm 10mm;
    }

    .columns {
      grid-template-columns: 185px 1fr 1fr;
    }
  }

  @page {
    size: letter;
    margin: 10mm;
  }
</style>
