// Dice rolling utilities

export interface RollResult {
  total: number;
  rolls: number[];
  modifier: number;
  notation: string;
}

export function parseDiceNotation(notation: string): {
  count: number;
  sides: number;
  modifier: number;
} {
  const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/i);
  if (!match) {
    return { count: 1, sides: 20, modifier: 0 };
  }

  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  return { count, sides, modifier };
}

export function rollDice(count: number, sides: number, modifier: number = 0): RollResult {
  const rolls: number[] = [];

  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }

  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

  return {
    total,
    rolls,
    modifier,
    notation: `${count}d${sides}${modifier >= 0 ? '+' : ''}${modifier !== 0 ? modifier : ''}`
  };
}

export function rollFromNotation(notation: string): RollResult {
  const { count, sides, modifier } = parseDiceNotation(notation);
  return rollDice(count, sides, modifier);
}
