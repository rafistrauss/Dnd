import type { Character, RollHistoryEntry } from './types';

const GIST_API = 'https://api.github.com/gists';

export interface GistConfig {
  token?: string;
  gistId?: string;
}

// Save character to GitHub Gist
export async function saveToGist(
  character: Character,
  token: string,
  description?: string,
  rollHistory?: RollHistoryEntry[]
): Promise<string> {
  if (!token) {
    throw new Error('GitHub token is required');
  }

  const content = JSON.stringify(character, null, 2);
  const filename = `${character.name || 'character'}_dnd.json`;

  const files: Record<string, { content: string }> = {
    [filename]: {
      content
    }
  };

  // Add roll history if provided
  if (rollHistory && rollHistory.length > 0) {
    const historyFilename = `${character.name || 'character'}_roll_history.json`;
    files[historyFilename] = {
      content: JSON.stringify(rollHistory, null, 2)
    };
  }

  const gistData = {
    description: description || `D&D Character: ${character.name}`,
    public: false,
    files
  };

  const response = await fetch(GIST_API, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(gistData)
  });

  if (!response.ok) {
    throw new Error(`Failed to create gist: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

// Update existing Gist
export async function updateGist(
  character: Character,
  token: string,
  gistId: string,
  rollHistory?: RollHistoryEntry[]
): Promise<void> {
  if (!token || !gistId) {
    throw new Error('GitHub token and Gist ID are required');
  }

  const content = JSON.stringify(character, null, 2);
  const filename = `${character.name || 'character'}_dnd.json`;

  const files: Record<string, { content: string }> = {
    [filename]: {
      content
    }
  };

  // Add roll history if provided
  if (rollHistory && rollHistory.length > 0) {
    const historyFilename = `${character.name || 'character'}_roll_history.json`;
    files[historyFilename] = {
      content: JSON.stringify(rollHistory, null, 2)
    };
  }

  const gistData = {
    files
  };

  const response = await fetch(`${GIST_API}/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(gistData)
  });

  if (!response.ok) {
    throw new Error(`Failed to update gist: ${response.statusText}`);
  }
}

// Load character from GitHub Gist
export async function loadFromGist(
  gistId: string,
  token?: string
): Promise<{ character: Character; rollHistory?: RollHistoryEntry[] }> {
  if (!gistId) {
    throw new Error('Gist ID is required');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const response = await fetch(`${GIST_API}/${gistId}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    throw new Error(`Failed to load gist: ${response.statusText}`);
  }

  const data = await response.json();

  // Get character file and optional roll history file
  const fileEntries = Object.entries(data.files);
  if (fileEntries.length === 0) {
    throw new Error('No files found in gist');
  }

  let characterContent: string | null = null;
  let rollHistoryContent: string | null = null;

  for (const [filename, fileData] of fileEntries) {
    const file: any = fileData;
    if (filename.includes('roll_history')) {
      rollHistoryContent = file.content;
    } else {
      characterContent = file.content;
    }
  }

  if (!characterContent) {
    throw new Error('No character file found in gist');
  }

  try {
    const character = JSON.parse(characterContent);

    // Migrate: ensure all attacks have IDs
    if (character.attacks && Array.isArray(character.attacks)) {
      character.attacks = character.attacks.map((attack: any) => ({
        ...attack,
        id: attack.id || crypto.randomUUID()
      }));
    }

    // Migrate: ensure classFeatures structure exists
    if (!character.classFeatures) {
      character.classFeatures = {
        features: {},
        spellSlots: [],
        preparedSpells: ''
      };
    } else {
      if (!character.classFeatures.features) {
        character.classFeatures.features = {};
      }
      if (!character.classFeatures.spellSlots) {
        character.classFeatures.spellSlots = [];
      }
      if (character.classFeatures.preparedSpells === undefined) {
        character.classFeatures.preparedSpells = '';
      }
    }

    let rollHistory: RollHistoryEntry[] | undefined = undefined;
    if (rollHistoryContent) {
      try {
        rollHistory = JSON.parse(rollHistoryContent);
      } catch (e) {
        console.error('Failed to parse roll history from gist:', e);
      }
    }

    return { character, rollHistory };
  } catch {
    throw new Error('Invalid character data in gist');
  }
}

// Store Gist config in localStorage
export function saveGistConfig(config: GistConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dnd_gist_config', JSON.stringify(config));
  }
}

export function loadGistConfig(): GistConfig {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('dnd_gist_config');
    if (saved) {
      return JSON.parse(saved);
    }
  }
  return {};
}

// List user's gists
export interface GistInfo {
  id: string;
  description: string;
  created_at: string;
  updated_at: string;
  public: boolean;
  files: Record<string, { filename: string }>;
}

export async function listUserGists(token: string, perPage: number = 30): Promise<GistInfo[]> {
  if (!token) {
    throw new Error('GitHub token is required to list gists');
  }

  const response = await fetch(`${GIST_API}?per_page=${perPage}`, {
    method: 'GET',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to list gists: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}
