import { MODULE_ID, FLAGS } from './constants.js';
import { isExplorationScene, getTurnState, getActiveUserId, getTokenBudget } from './turn-tracker.js';

const EPSILON = 1e-6;

export function registerMovementGuard() {
  Hooks.on('preUpdateToken', onPreUpdateToken);
}

function isOwnedByQueuedPlayer(document, state) {
  return state.order.some((userId) => document.actor?.testUserPermission(game.users.get(userId), 'OWNER'));
}

/** Grid-aware distance between two points, with fallbacks for older grid APIs. */
function measureDistance(origin, destination) {
  try {
    if (canvas.grid?.measurePath) {
      return canvas.grid.measurePath([origin, destination]).distance;
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | measurePath failed, falling back`, err);
  }
  try {
    if (canvas.grid?.measureDistance) {
      return canvas.grid.measureDistance(origin, destination);
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | measureDistance failed, falling back`, err);
  }
  const pixels = Math.hypot(destination.x - origin.x, destination.y - origin.y);
  const gridSize = canvas.grid?.size || canvas.scene?.grid?.size || 100;
  const gridDistance = canvas.grid?.distance || canvas.scene?.grid?.distance || 1;
  return (pixels / gridSize) * gridDistance;
}

/**
 * Synchronous by design: preUpdateToken only cancels the update if the hook
 * returns `false` synchronously (an async handler's eventual return is
 * invisible to Foundry's Hooks.call, so this must never be `async`).
 */
function onPreUpdateToken(document, changes) {
  if (changes.x === undefined && changes.y === undefined) return; // Not a position change.
  if (game.user.isGM) return; // Keeper moves are never restricted, on any token.

  // A token in a running combat follows the combat Governor's rules instead;
  // the exploration queue must never block a combatant mid-fight.
  const combat = game.combat;
  if (combat?.started && combat.combatants.some((c) => c.tokenId === document.id)) return;

  const scene = document.parent;
  if (!scene || !isExplorationScene(scene)) return;

  const state = getTurnState(scene);
  if (!state.active) return; // Exploration not started: no restriction yet.

  const activeUserId = getActiveUserId(scene);
  if (!activeUserId) return;

  if (!isOwnedByQueuedPlayer(document, state)) return; // GM/NPC token: unrestricted.

  const activeUser = game.users.get(activeUserId);
  const isActivePlayersToken = document.actor?.testUserPermission(activeUser, 'OWNER');

  if (!isActivePlayersToken) {
    ui.notifications.warn(game.i18n.format('COC7EXP.NotYourTurn', { name: activeUser.name }));
    return false;
  }

  const budget = getTokenBudget(document);
  if (!budget) return false;

  const origin = { x: document.x, y: document.y };
  const destination = { x: changes.x ?? document.x, y: changes.y ?? document.y };
  const distance = measureDistance(origin, destination);

  if (distance > budget.remaining + EPSILON) {
    const remaining = Math.round(budget.remaining * 100) / 100;
    ui.notifications.warn(game.i18n.format('COC7EXP.MovementExceeded', { remaining }));
    return false;
  }

  // Fold the spend into this same update so it's atomic with the move itself
  // (no separate write, no GM relay needed for the hot path).
  foundry.utils.setProperty(changes, `flags.${MODULE_ID}.${FLAGS.TOKEN_BUDGET}.remaining`, Math.max(0, budget.remaining - distance));
}
