// Utilities for importing content from D&D 5e Wikidot
// Note: This uses a CORS proxy to fetch content from wikidot.com
// Users can also manually paste content if the fetch fails

export interface WikidotSpell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  source: string;
}

export interface WikidotFeat {
  name: string;
  prerequisite?: string;
  description: string;
  source: string;
}

export interface WikidotAttack {
  name: string;
  type: string;
  damage: string;
  damageType: string;
  description: string;
  source: string;
}

const CORS_PROXIES = ['https://api.codetabs.com/v1/proxy?quest=', 'https://corsproxy.org/?'];

/**
 * Attempts to fetch content from wikidot using CORS proxies
 */
export async function fetchWikidotPage(url: string): Promise<string> {
  // Validate URL
  if (!url.includes('dnd5e.wikidot.com')) {
    throw new Error('URL must be from dnd5e.wikidot.com');
  }

  // Try each proxy in order
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url), {
        headers: {
          Accept: 'text/html'
        }
      });

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn(`Proxy ${proxy} failed:`, error);
      continue;
    }
  }

  throw new Error('Unable to fetch content. Please try manual import instead.');
}

/**
 * Parse spell information from wikidot HTML
 */
export function parseSpell(html: string, url: string): WikidotSpell {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract spell name from title or page content
  const title = doc.querySelector('title')?.textContent?.split(' - ')[0]?.trim() || '';
  const name = title.replace('Spell:', '').trim();

  // Try to find the main content div
  const content = doc.querySelector('#page-content') || doc.body;
  const text = content.textContent || '';

  // Parse spell details using common patterns
  const levelMatch = text.match(/(\d+)(?:st|nd|rd|th)-level/i) || text.match(/Level[:\s]+(\d+)/i);
  const level = levelMatch ? parseInt(levelMatch[1]) : 0;

  const schoolMatch = text.match(/(?:level\s+)?(\w+)(?:\s+\(ritual\))?/i);
  const school = schoolMatch ? schoolMatch[1] : 'Unknown';

  const castingTimeMatch = text.match(/Casting Time[:\s]+([^\n]+)/i);
  const castingTime = castingTimeMatch ? castingTimeMatch[1].trim() : '';

  const rangeMatch = text.match(/Range[:\s]+([^\n]+)/i);
  const range = rangeMatch ? rangeMatch[1].trim() : '';

  const componentsMatch = text.match(/Components?[:\s]+([^\n]+)/i);
  const components = componentsMatch ? componentsMatch[1].trim() : '';

  const durationMatch = text.match(/Duration[:\s]+([^\n]+)/i);
  const duration = durationMatch ? durationMatch[1].trim() : '';

  // Get description (everything after the stats)
  const descMatch = text.split(/Duration[:\s]+[^\n]+/i);
  const description = descMatch[1]?.trim().substring(0, 500) || 'See source for full description';

  return {
    name,
    level,
    school,
    castingTime,
    range,
    components,
    duration,
    description,
    source: url
  };
}

/**
 * Parse feat information from wikidot HTML
 */
export function parseFeat(html: string, url: string): WikidotFeat {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const title = doc.querySelector('title')?.textContent?.split(' - ')[0]?.trim() || '';
  const name = title.replace('Feat:', '').trim();

  const content = doc.querySelector('#page-content') || doc.body;
  const text = content.textContent || '';

  const prerequisiteMatch = text.match(/Prerequisite[:\s]+([^\n]+)/i);
  const prerequisite = prerequisiteMatch ? prerequisiteMatch[1].trim() : undefined;

  // Get description
  const descStart = prerequisite ? text.indexOf(prerequisite) + prerequisite.length : 0;
  const description =
    text.substring(descStart).trim().substring(0, 500) || 'See source for full description';

  return {
    name,
    prerequisite,
    description,
    source: url
  };
}

/**
 * Parse weapon/attack from wikidot HTML
 */
export function parseAttack(html: string, url: string): WikidotAttack {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const title = doc.querySelector('title')?.textContent?.split(' - ')[0]?.trim() || '';
  const name = title.replace('Weapon:', '').trim();

  const content = doc.querySelector('#page-content') || doc.body;
  const text = content.textContent || '';

  // Try to extract damage dice
  const damageMatch = text.match(/(\d+d\d+(?:\s*\+\s*\d+)?)/i);
  const damage = damageMatch ? damageMatch[1] : '1d6';

  // Try to extract damage type
  const typeMatch = text.match(
    /(slashing|piercing|bludgeoning|fire|cold|lightning|acid|poison|radiant|necrotic|force|psychic)/i
  );
  const damageType = typeMatch ? typeMatch[1] : 'slashing';

  // Determine weapon type
  const weaponType = text.toLowerCase().includes('ranged') ? 'ranged' : 'melee';

  return {
    name,
    type: weaponType,
    damage,
    damageType,
    description: text.substring(0, 200),
    source: url
  };
}

/**
 * Detect the type of content from the URL
 */
export function detectContentType(url: string): 'spell' | 'feat' | 'weapon' | 'unknown' {
  if (url.includes('spell:')) return 'spell';
  if (url.includes('feat:')) return 'feat';
  if (url.includes('weapon:')) return 'weapon';
  return 'unknown';
}

/**
 * Parse content from pasted HTML (manual mode)
 */
export function parseFromManualInput(
  html: string,
  url: string
): WikidotSpell | WikidotFeat | WikidotAttack {
  const contentType = detectContentType(url);

  if (contentType === 'unknown') {
    throw new Error(
      'Unable to determine content type from URL. URL must contain spell:, feat:, or weapon:'
    );
  }

  switch (contentType) {
    case 'spell':
      return parseSpell(html, url);
    case 'feat':
      return parseFeat(html, url);
    case 'weapon':
      return parseAttack(html, url);
    default:
      throw new Error('Unsupported content type');
  }
}

/**
 * Main import function that handles fetching and parsing
 */
export async function importFromWikidot(
  url: string
): Promise<WikidotSpell | WikidotFeat | WikidotAttack> {
  const contentType = detectContentType(url);

  if (contentType === 'unknown') {
    throw new Error(
      'Unable to determine content type from URL. URL must contain spell:, feat:, or weapon:'
    );
  }

  const html = await fetchWikidotPage(url);

  switch (contentType) {
    case 'spell':
      return parseSpell(html, url);
    case 'feat':
      return parseFeat(html, url);
    case 'weapon':
      return parseAttack(html, url);
    default:
      throw new Error('Unsupported content type');
  }
}
