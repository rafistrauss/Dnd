<script lang="ts">
  import { onMount } from 'svelte';

  let logs: Array<{ type: string; message: string; timestamp: string }> = [];
  let isVisible = false;
  let isMinimized = false;

  onMount(() => {
    // Capture console.log
    const originalLog = console.log;
    console.log = function(...args) {
      addLog('log', args);
      originalLog.apply(console, args);
    };

    // Capture console.error
    const originalError = console.error;
    console.error = function(...args) {
      addLog('error', args);
      originalError.apply(console, args);
    };

    // Capture console.warn
    const originalWarn = console.warn;
    console.warn = function(...args) {
      addLog('warn', args);
      originalWarn.apply(console, args);
    };

    // Capture console.info
    const originalInfo = console.info;
    console.info = function(...args) {
      addLog('info', args);
      originalInfo.apply(console, args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      addLog('error', [`Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`]);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      addLog('error', [`Unhandled Promise Rejection: ${event.reason}`]);
    });

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  });

  function addLog(type: string, args: any[]) {
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    const timestamp = new Date().toLocaleTimeString();
    logs = [...logs, { type, message, timestamp }];
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs = logs.slice(-100);
    }
  }

  function clearLogs() {
    logs = [];
  }

  function toggleVisibility() {
    isVisible = !isVisible;
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
  }
</script>

<div class="console-viewer">
  {#if !isVisible}
    <button class="console-toggle" on:click={toggleVisibility}>
      🐛 Console ({logs.length})
    </button>
  {/if}

  {#if isVisible}
    <div class="console-panel" class:minimized={isMinimized}>
      <div class="console-header">
        <span class="console-title">🐛 Console Logs ({logs.length})</span>
        <div class="console-controls">
          <button on:click={toggleMinimize} class="control-btn">
            {isMinimized ? '▲' : '▼'}
          </button>
          <button on:click={clearLogs} class="control-btn">
            🗑️
          </button>
          <button on:click={toggleVisibility} class="control-btn">
            ✕
          </button>
        </div>
      </div>
      
      {#if !isMinimized}
        <div class="console-content">
          {#if logs.length === 0}
            <div class="no-logs">No console messages yet</div>
          {:else}
            {#each logs as log}
              <div class="log-entry {log.type}">
                <span class="log-timestamp">{log.timestamp}</span>
                <span class="log-type">[{log.type.toUpperCase()}]</span>
                <span class="log-message">{log.message}</span>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .console-viewer {
    position: fixed;
    z-index: 9999;
  }

  .console-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #2d2d2d;
    color: #fff;
    border: 2px solid #4CAF50;
    border-radius: 25px;
    padding: 12px 20px;
    font-size: 16px;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    transition: all 0.3s;
  }

  .console-toggle:hover {
    background: #3d3d3d;
    box-shadow: 0 6px 12px rgba(0,0,0,0.4);
  }

  .console-toggle:active {
    transform: scale(0.95);
  }

  .console-panel {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 90vw;
    max-width: 600px;
    max-height: 70vh;
    background: #1e1e1e;
    border: 2px solid #4CAF50;
    border-radius: 8px;
    box-shadow: 0 8px 16px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .console-panel.minimized {
    max-height: 50px;
  }

  .console-header {
    background: #2d2d2d;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #4CAF50;
  }

  .console-title {
    color: #fff;
    font-weight: bold;
    font-size: 16px;
  }

  .console-controls {
    display: flex;
    gap: 8px;
  }

  .control-btn {
    background: transparent;
    border: 1px solid #666;
    color: #fff;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .control-btn:hover {
    background: #3d3d3d;
    border-color: #4CAF50;
  }

  .control-btn:active {
    transform: scale(0.9);
  }

  .console-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    background: #1e1e1e;
    font-family: 'Courier New', monospace;
    font-size: 13px;
  }

  .no-logs {
    color: #888;
    text-align: center;
    padding: 20px;
    font-style: italic;
  }

  .log-entry {
    padding: 8px 12px;
    margin-bottom: 4px;
    border-left: 3px solid #666;
    background: #2d2d2d;
    border-radius: 4px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .log-entry.log {
    border-left-color: #2196F3;
    background: #1a2332;
  }

  .log-entry.error {
    border-left-color: #f44336;
    background: #321a1a;
  }

  .log-entry.warn {
    border-left-color: #ff9800;
    background: #332a1a;
  }

  .log-entry.info {
    border-left-color: #4CAF50;
    background: #1a2d1a;
  }

  .log-timestamp {
    color: #888;
    font-size: 11px;
    margin-right: 8px;
  }

  .log-type {
    color: #4CAF50;
    font-weight: bold;
    margin-right: 8px;
    font-size: 11px;
  }

  .log-entry.error .log-type {
    color: #f44336;
  }

  .log-entry.warn .log-type {
    color: #ff9800;
  }

  .log-entry.info .log-type {
    color: #2196F3;
  }

  .log-message {
    color: #e0e0e0;
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .console-toggle {
      bottom: 10px;
      right: 10px;
      padding: 10px 16px;
      font-size: 14px;
    }

    .console-panel {
      bottom: 10px;
      right: 10px;
      left: 10px;
      width: auto;
      max-width: none;
      max-height: 60vh;
    }

    .console-header {
      padding: 10px 12px;
    }

    .console-title {
      font-size: 14px;
    }

    .control-btn {
      padding: 4px 8px;
      font-size: 12px;
    }

    .console-content {
      font-size: 12px;
      padding: 8px;
    }

    .log-entry {
      padding: 6px 10px;
    }
  }
</style>
