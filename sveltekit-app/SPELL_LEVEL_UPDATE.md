# Manual Update Required for Spell Level Selector

Due to whitespace formatting issues, please manually add the following code to `Attacks.svelte`:

## 1. After the spell info `</ul>` and `</div>` tags (around line 193), add:

```svelte
{#if spell.higherLevelSlot && spell.level > 0}
	<div class="spell-level-selector">
		<label for="spellLevel-{attack.id}">Cast at Level:</label>
		<select 
			id="spellLevel-{attack.id}" 
			class="spell-level-select"
			on:change={(e) => {
				character.update(c => {
					const idx = c.attacks.findIndex(a => a.id === attack.id);
					if (idx >= 0) {
						c.attacks[idx].castAtLevel = parseInt((e.target as HTMLSelectElement).value);
					}
					return c;
				});
			}}
			value={attack.castAtLevel || spell.level}
		>
			{#each Array.from({length: 10 - spell.level}, (_, i) => spell.level + i) as level}
				<option value={level}>{level}</option>
			{/each}
		</select>
		{@const scaledDamage = getScaledSpellDamage(attack, spell)}
		{#if scaledDamage !== attack.damage}
			<span class="scaled-damage">Damage: {scaledDamage}</span>
		{/if}
	</div>
{/if}
```

## 2. In the attack-actions div (around line 217), change:

FROM:
```svelte
<button on:click={() => rollDamage(attack)} class="btn btn-secondary">Roll Damage</button>
```

TO:
```svelte
<button 
	on:click={() => attack.spellRef ? rollSpellDamage(attack) : rollDamage(attack)} 
	class="btn btn-secondary"
>
	Roll Damage
</button>
```

All styles and functions have already been added. Only these two template changes are needed.
