
export type DiceType = number;

export interface RollResult {
  id: string;
  diceType: DiceType;
  count: number;
  modifier: number;
  results: number[];
  total: number;
  timestamp: number;
}

export interface DicePreset {
  type: number;
  label: string;
  icon: string;
}
