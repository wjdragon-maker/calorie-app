export enum EntryType {
  FOOD = 'FOOD',
  EXERCISE = 'EXERCISE',
  UNKNOWN = 'UNKNOWN'
}

export interface CalorieEntry {
  id: string;
  timestamp: number;
  type: EntryType;
  item: string;
  calories: number;
  quantity: string;
  originalText: string;
}

export interface UserStats {
  weight: number; // kg
  age: number;
  gender: 'male' | 'female';
  tdee: number; // Total Daily Energy Expenditure
  targetDeficit: number;
  dailyBudget: number; // tdee - targetDeficit
}

// Schema for Gemini response
export interface GeminiParseResult {
  entryType: EntryType;
  item: string;
  calories: number;
  quantity: string;
}