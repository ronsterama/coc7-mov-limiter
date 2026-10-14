export const MODULE_ID = 'coc7-mov-limiter';

export const FLAGS = {
  EXPLORATION_SCENE: 'isExplorationScene',
  TURN_STATE: 'turnState',
  TOKEN_BUDGET: 'movementBudget'
};

export const SOCKET_NAME = `module.${MODULE_ID}`;

// Fired locally (Hooks.callAll, no socket involved) on the newly-active
// player's own client once they've been notified, so the HUD can auto-open.
export const YOUR_TURN_HOOK = `${MODULE_ID}.yourTurn`;

export const SOCKET_ACTIONS = {
  START: 'start',
  NEXT_TURN: 'nextTurn',
  RESET: 'reset',
  END: 'end'
};

// "Move x 2" per the CoC7 rules used for this module. Default for the
// world-configurable moveMultiplier setting (see settings.js).
export const DEFAULT_MOVE_MULTIPLIER = 2;

// Same fallback the combat Governor uses for actors with no resolvable MOV.
export const MOVE_DEFAULT = 8;

export function defaultTurnState() {
  return {
    active: false,
    order: [],
    activeIndex: 0
  };
}
