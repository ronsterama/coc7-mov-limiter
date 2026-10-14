import { MODULE_ID, SOCKET_ACTIONS, YOUR_TURN_HOOK, defaultTurnState } from '../constants.js';
import * as Tracker from '../turn-tracker.js';
import { requestAction } from '../socket.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ExplorationHud extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'coc7-exploration-hud',
    tag: 'div',
    window: {
      title: 'COC7EXP.Hud.Title',
      icon: 'fa-solid fa-person-hiking',
      resizable: true
    },
    position: { width: 320, height: 'auto' },
    actions: {
      start: ExplorationHud.#onStart,
      next: ExplorationHud.#onNext,
      reset: ExplorationHud.#onReset,
      end: ExplorationHud.#onEnd
    }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/exploration-hud.hbs` }
  };

  async _prepareContext() {
    const scene = canvas.scene;
    const isExploration = Boolean(scene) && Tracker.isExplorationScene(scene);
    const state = scene ? Tracker.getTurnState(scene) : defaultTurnState();

    const players = state.order.map((userId, index) => {
      const user = game.users.get(userId);
      const tokens = scene ? Tracker.getUserTokens(scene, userId) : [];
      const budgets = tokens.map((t) => Tracker.getTokenBudget(t)).filter(Boolean);
      const max = budgets[0]?.max ?? 0;
      const remaining = budgets.reduce((sum, b) => sum + b.remaining, 0) / (budgets.length || 1);
      return {
        userId,
        name: user?.name ?? userId,
        color: user?.color ?? '#ffffff',
        isActive: index === state.activeIndex,
        max,
        remaining: Math.round(remaining * 100) / 100
      };
    });

    const activeUserId = state.active ? state.order[state.activeIndex] : null;

    return {
      hasScene: Boolean(scene),
      isExploration,
      isGM: game.user.isGM,
      active: state.active,
      players,
      hasQueue: players.length > 0,
      isMyTurn: Boolean(activeUserId) && activeUserId === game.user.id
    };
  }

  static #onStart() {
    if (!canvas.scene) return;
    requestAction(SOCKET_ACTIONS.START, canvas.scene);
  }

  static #onNext() {
    if (!canvas.scene) return;
    requestAction(SOCKET_ACTIONS.NEXT_TURN, canvas.scene);
  }

  static #onReset() {
    if (!canvas.scene) return;
    requestAction(SOCKET_ACTIONS.RESET, canvas.scene);
  }

  static #onEnd() {
    if (!canvas.scene) return;
    requestAction(SOCKET_ACTIONS.END, canvas.scene);
  }
}

let instance = null;

export function getExplorationHud() {
  instance ??= new ExplorationHud();
  return instance;
}

export function toggleExplorationHud() {
  const hud = getExplorationHud();
  if (hud.rendered) hud.close();
  else hud.render({ force: true });
}

export function refreshExplorationHud() {
  if (instance?.rendered) instance.render();
}

/** Auto-opens (or brings forward) this client's HUD when it becomes this player's turn. */
export function registerHudAutoOpen() {
  Hooks.on(YOUR_TURN_HOOK, () => {
    getExplorationHud().render({ force: true });
  });
}
