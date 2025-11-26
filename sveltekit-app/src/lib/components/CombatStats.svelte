<script lang="ts">
	import { character } from '$lib/stores';

	function adjustHP(amount: number) {
		character.update(c => {
			c.currentHP = Math.max(0, Math.min(c.maxHP, c.currentHP + amount));
			return c;
		});
	}
</script>

<section class="combat-stats">
	<h2>Combat Stats</h2>
	<div class="stats-grid">
		<div class="stat-box">
			<label for="armorClass">Armor Class</label>
			<input
				type="number"
				id="armorClass"
				bind:value={$character.armorClass}
				class="stat-input"
			/>
		</div>
		<div class="stat-box">
			<label for="initiative">Initiative</label>
			<input
				type="number"
				id="initiative"
				bind:value={$character.initiative}
				class="stat-input"
			/>
		</div>
		<div class="stat-box">
			<label for="speed">Speed</label>
			<input type="text" id="speed" bind:value={$character.speed} class="stat-input" />
		</div>
	</div>

	<div class="hp-section">
		<h3>Hit Points</h3>
		<div class="hp-display">
			<div class="hp-inputs">
				<input
					type="number"
					bind:value={$character.currentHP}
					class="hp-current"
					min="0"
					max={$character.maxHP}
				/>
				<span class="hp-separator">/</span>
				<input type="number" bind:value={$character.maxHP} class="hp-max" min="0" />
			</div>
			<div class="hp-controls">
				<button class="hp-btn" on:click={() => adjustHP(-1)}>−</button>
				<button class="hp-btn" on:click={() => adjustHP(1)}>+</button>
				<button class="hp-btn" on:click={() => adjustHP(-5)}>−5</button>
				<button class="hp-btn" on:click={() => adjustHP(5)}>+5</button>
			</div>
		</div>
		<div class="temp-hp">
			<label for="tempHP">Temp HP</label>
			<input type="number" id="tempHP" bind:value={$character.tempHP} min="0" />
		</div>
	</div>

	<div class="hit-dice-section">
		<h3>Hit Dice</h3>
		<div class="hit-dice-display">
			<input
				type="number"
				bind:value={$character.hitDice.current}
				class="hit-dice-input"
				min="0"
				max={$character.hitDice.max}
			/>
			<span>/</span>
			<input
				type="number"
				bind:value={$character.hitDice.max}
				class="hit-dice-input"
				min="0"
			/>
		</div>
	</div>
</section>

<style>
	.combat-stats {
		background-color: var(--card-bg);
		padding: 20px;
		border-radius: 8px;
		box-shadow: var(--shadow);
	}

	h2 {
		margin-top: 0;
		color: var(--primary-color);
		border-bottom: 2px solid var(--border-color);
		padding-bottom: 10px;
	}

	h3 {
		margin-top: 0;
		margin-bottom: 10px;
		color: var(--text-color);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 15px;
		margin-bottom: 20px;
	}

	.stat-box {
		display: flex;
		flex-direction: column;
	}

	label {
		font-weight: bold;
		margin-bottom: 5px;
		font-size: 0.9rem;
	}

	.stat-input {
		padding: 8px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-size: 1rem;
		text-align: center;
	}

	.hp-section {
		background-color: #f9f9f9;
		padding: 15px;
		border-radius: 6px;
		margin-bottom: 15px;
	}

	.hp-display {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.hp-inputs {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.hp-current,
	.hp-max {
		padding: 10px;
		border: 2px solid var(--border-color);
		border-radius: 4px;
		font-size: 1.2rem;
		font-weight: bold;
		text-align: center;
		width: 70px;
	}

	.hp-current {
		border-color: var(--primary-color);
	}

	.hp-separator {
		font-size: 1.5rem;
		font-weight: bold;
	}

	.hp-controls {
		display: flex;
		gap: 5px;
	}

	.hp-btn {
		padding: 8px 12px;
		background-color: var(--secondary-color);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
		transition: background-color 0.2s;
	}

	.hp-btn:hover {
		background-color: #b89872;
	}

	.temp-hp {
		margin-top: 10px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.temp-hp input {
		width: 80px;
		padding: 6px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
	}

	.hit-dice-section {
		background-color: #f9f9f9;
		padding: 15px;
		border-radius: 6px;
	}

	.hit-dice-display {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.hit-dice-input {
		width: 60px;
		padding: 6px;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		text-align: center;
	}

	input:focus {
		outline: none;
		border-color: var(--primary-color);
	}
</style>
