<script lang="ts">
  export let title: string;
  export let collapsed: boolean;
  export let ariaLabel: string = '';
  export let onToggle: () => void;
</script>

<div
  class="section-header"
  role="button"
  tabindex="0"
  aria-expanded={!collapsed}
  aria-label={ariaLabel}
  on:click={onToggle}
  on:keydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onToggle();
    }
  }}
>
  <h2>{title}</h2>
  <span class="collapse-btn">{collapsed ? '▼' : '▲'}</span>
</div>

<style>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--primary-color);
  border-bottom: 2px solid var(--border-color);
  cursor: pointer;
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

h2 {
  margin: 0;
}
</style>
