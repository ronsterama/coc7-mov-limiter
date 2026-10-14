import { SOCKET_NAME, SOCKET_ACTIONS, YOUR_TURN_HOOK } from './constants.js';
import * as Tracker from './turn-tracker.js';

/**
 * Scene flags can only be written by users with permission on the Scene
 * (normally the GM). Players relay turn-queue requests (Start/Next/Reset/End)
 * to a connected GM's client over the socket; the GM's client performs the
 * write and the resulting Scene/Token update replicates to everyone the
 * normal Foundry way. Per-move budget spends don't need this relay -
 * movement-guard.js folds those into the player's own token update instead.
 */
export function registerSocketListener() {
  game.socket.on(SOCKET_NAME, async (payload = {}) => {
    if (payload.type === 'notify') {
      handleNotify(payload);
      return;
    }

    if (!game.user.isGM) return;
    if (!isFirstActiveGM()) return;

    const scene = game.scenes.get(payload.sceneId);
    if (!scene) return;

    await runAction(payload.action, scene, payload.userId);
  });

  Hooks.on('userConnected', onUserConnected);
}

/** If the active player in any exploration disconnects, skip their stalled turn. */
async function onUserConnected(user, connected) {
  if (connected) return;
  if (!game.user.isGM || !isFirstActiveGM()) return;

  for (const scene of game.scenes) {
    if (!Tracker.isExplorationScene(scene)) continue;
    if (Tracker.getActiveUserId(scene) !== user.id) continue;

    await Tracker.removeFromQueue(scene, user.id);
    notifyActiveUser(scene);
  }
}

/** Shows the "it's your turn" toast on the targeted player's own client, and auto-opens their HUD. */
function handleNotify({ userId, message } = {}) {
  if (!userId || game.user.id !== userId) return;
  ui.notifications.info(message);
  Hooks.callAll(YOUR_TURN_HOOK);
}

async function runAction(action, scene, requesterId) {
  switch (action) {
    case SOCKET_ACTIONS.START:
      await Tracker.startExploration(scene);
      return notifyActiveUser(scene);
    case SOCKET_ACTIONS.NEXT_TURN:
      if (!canRequestNextTurn(scene, requesterId)) return;
      await Tracker.nextTurn(scene);
      return notifyActiveUser(scene);
    case SOCKET_ACTIONS.RESET:
      return Tracker.resetQueue(scene);
    case SOCKET_ACTIONS.END:
      return Tracker.endExploration(scene);
    default:
      console.warn(`${SOCKET_NAME} | Unknown action`, action);
  }
}

/**
 * Pings the new active player so they notice their turn even with the HUD
 * closed: a whispered chat message (persists, highlights the Chat tab) plus
 * a live toast if they're currently connected.
 */
function notifyActiveUser(scene) {
  const userId = Tracker.getActiveUserId(scene);
  if (!userId) return;

  const message = game.i18n.localize('COC7EXP.Hud.YourTurnChat');
  ChatMessage.create({
    content: `<p>${message}</p>`,
    whisper: [userId],
    speaker: { alias: game.i18n.localize('COC7EXP.Hud.Title') }
  });
  game.socket.emit(SOCKET_NAME, { type: 'notify', userId, message });
}

/**
 * A relayed "end turn" only counts from the player whose turn it actually is
 * (or the GM's own client, which calls runAction directly with no requesterId).
 * Guards against a stale HUD, or a raced double-click, skipping someone else's turn.
 */
function canRequestNextTurn(scene, requesterId) {
  if (!requesterId || game.users.get(requesterId)?.isGM) return true;
  return Tracker.getActiveUserId(scene) === requesterId;
}

/** Ensures only one connected GM client acts on relayed requests. */
function isFirstActiveGM() {
  const activeGMs = game.users.filter((u) => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id));
  return activeGMs[0]?.id === game.user.id;
}

/**
 * Executes a turn-queue action: directly if this client is the acting GM,
 * otherwise relayed over the socket to a connected GM.
 */
export async function requestAction(action, scene) {
  if (game.user.isGM && isFirstActiveGM()) {
    return runAction(action, scene);
  }
  if (!game.users.some((u) => u.isGM && u.active)) {
    ui.notifications?.warn(game.i18n.localize('COC7EXP.NoGMOnline'));
    return;
  }
  game.socket.emit(SOCKET_NAME, { action, sceneId: scene.id, userId: game.user.id });
}
