/**
 * Command History System for Undo/Redo
 * 
 * Manages a stack of commands that modify the funnel state.
 * Each command can be executed and undone.
 */

import { Funnel } from '@/types/funnel';

export interface Command {
  id: string;
  description: string;
  previousState: Funnel;
  newState: Funnel;
  timestamp: number;
}

export interface CommandHistory {
  past: Command[];
  future: Command[];
}

export const createCommandHistory = (): CommandHistory => ({
  past: [],
  future: [],
});

/**
 * Add a command to history, clearing the future stack
 */
export const pushCommand = (history: CommandHistory, command: Command): CommandHistory => ({
  past: [...history.past, command],
  future: [],
});

/**
 * Undo the last command
 */
export const undo = (history: CommandHistory): CommandHistory => {
  if (history.past.length === 0) return history;

  const command = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    future: [...history.future, command],
  };
};

/**
 * Redo the last undone command
 */
export const redo = (history: CommandHistory): CommandHistory => {
  if (history.future.length === 0) return history;

  const command = history.future[history.future.length - 1];
  return {
    past: [...history.past, command],
    future: history.future.slice(0, -1),
  };
};

/**
 * Check if undo is available
 */
export const canUndo = (history: CommandHistory): boolean => history.past.length > 0;

/**
 * Check if redo is available
 */
export const canRedo = (history: CommandHistory): boolean => history.future.length > 0;

/**
 * Get the last command for description
 */
export const getLastCommand = (history: CommandHistory): Command | null => {
  return history.past[history.past.length - 1] ?? null;
};

/**
 * Clear history (on new document, etc)
 */
export const clearHistory = (): CommandHistory => createCommandHistory();

/**
 * Limit history to max 50 commands (memory management)
 */
export const trimHistory = (history: CommandHistory, maxSize: number = 50): CommandHistory => ({
  past: history.past.length > maxSize ? history.past.slice(-maxSize) : history.past,
  future: history.future,
});
