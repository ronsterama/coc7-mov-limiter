import { MODULE_ID, FLAGS, MOVE_DEFAULT, defaultTurnState } from './constants.js';
import { getMoveMultiplier } from './settings.js';

/** Whether a scene has been flagged by the GM as an exploration scene. */
export function isExplorationScene(scene) {
  return Boolean(scene?.getFlag(MODULE_ID, FLAGS.EXPLORATION_SCENE));
}

/** Current turn-queue state for a scene (who's in the queue, whose turn it is). */
export function getTurnState(scene) {
  return foundry.utils.mergeObject(defaultTurnState(), scene?.getFlag(MODULE_ID, FLAGS.TURN_STATE) ?? {}, { inplace: false });
}

async function setTurnState(scene, state) {
  return scene.setFlag(MODULE_ID, FLAGS.TURN_STATE, state);
}

/** Connected, non-GM users who own at least one token on this scene. */
export function getEligiblePlayers(scene) {
  return game.users.filter((user) => {
    if (user.isGM || !user.active) return false;
    return scene.tokens.some((token) => token.actor?.testUserPermission(user, 'OWNER'));
  });
}

/** Tokens on the scene owned by the given user. */
export function getUserTokens(scene, userId) {
  const user = game.users.get(userId);
  if (!user) return [];
  return scene.tokens.filter((token) => token.actor?.testUserPermission(user, 'OWNER'));
}

/**
 * CoC7 exposes actor.rawMov (resolves "auto" MOV from characteristics) for
 * characters/NPCs, but creatures/vehicles instead use system.stats.mov.
 * Falls back to MOVE_DEFAULT, matching the table's other CoC7 module.
 */
export function getActorMove(actor) {
  if (!actor) return 0;
  const raw = actor.rawMov ?? actor.system?.attribs?.mov?.value ?? actor.system?.stats?.mov;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, value) : MOVE_DEFAULT;
}

/** Reads a token's current movement budget flag ({max, remaining}), or null if unset. */
export function getTokenBudget(token) {
  return token?.getFlag(MODULE_ID, FLAGS.TOKEN_BUDGET) ?? null;
}

/** Resets the movement budget flag on every token the given user owns on the scene. */
async function resetTokenBudgets(scene, userId) {
  const tokens = getUserTokens(scene, userId);
  if (tokens.length === 0) return;
  const multiplier = getMoveMultiplier();
  const updates = tokens.map((token) => {
    const max = getActorMove(token.actor) * multiplier;
    return { _id: token.id, [`flags.${MODULE_ID}.${FLAGS.TOKEN_BUDGET}`]: { max, remaining: max } };
  });
  return scene.updateEmbeddedDocuments('Token', updates);
}

export async function startExploration(scene) {
  const order = getEligiblePlayers(scene).map((u) => u.id);
  const state = { active: order.length > 0, order, activeIndex: 0 };
  if (order.length > 0) await resetTokenBudgets(scene, order[0]);
  return setTurnState(scene, state);
}

export async function nextTurn(scene) {
  const state = getTurnState(scene);
  if (!state.active || state.order.length === 0) return state;
  state.activeIndex = (state.activeIndex + 1) % state.order.length;
  await resetTokenBudgets(scene, state.order[state.activeIndex]);
  return setTurnState(scene, state);
}

export async function resetQueue(scene) {
  return setTurnState(scene, defaultTurnState());
}

export async function endExploration(scene) {
  const state = getTurnState(scene);
  state.active = false;
  return setTurnState(scene, state);
}

export function getActiveUserId(scene) {
  const state = getTurnState(scene);
  if (!state.active || state.order.length === 0) return null;
  return state.order[state.activeIndex];
}

/**
 * Drops a user from the turn queue (e.g. on disconnect) without a full
 * Reset. If they were the active player, whoever was next in line becomes
 * active and gets their budget reset; if they were the last one left,
 * exploration ends. Returns the resulting state, or the unchanged state if
 * the user wasn't queued.
 */
export async function removeFromQueue(scene, userId) {
  const state = getTurnState(scene);
  const idx = state.order.indexOf(userId);
  if (!state.active || idx === -1) return state;

  const wasActive = idx === state.activeIndex;
  const order = state.order.filter((id) => id !== userId);

  if (order.length === 0) {
    const cleared = defaultTurnState();
    await setTurnState(scene, cleared);
    return cleared;
  }

  const activeIndex = wasActive
    ? idx % order.length
    : (idx < state.activeIndex ? state.activeIndex - 1 : state.activeIndex);

  if (wasActive) await resetTokenBudgets(scene, order[activeIndex]);
  const newState = { active: true, order, activeIndex };
  await setTurnState(scene, newState);
  return newState;
}
