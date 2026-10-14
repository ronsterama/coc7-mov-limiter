/**
 * CoC7 Movement — combat-governor.js (formerly the Movement Governor's movement.js)
 * Core enforcement logic.
 *
 * Rules applied when the "restrictMovement" setting is ON:
 *   - Only enforced while a combat encounter is active (combat.started) and
 *     only for tokens that are actually in that combat's turn order — a
 *     "turn" only exists for combatants in the tracker.
 *   - Each combatant's allowance resets to 0 distance the moment their turn
 *     starts (combatTurn / combatRound / combatStart).
 *   - Distance moved this turn is measured with the scene's own grid
 *     (works for square, hex and gridless scenes) and accumulates across
 *     multiple partial drags within the same turn.
 *   - Walking cap = MOV. Running cap = MOV x runMultiplier (default 5,
 *     per CoC7 core rules). A move that pushes the running total over the
 *     walking cap gets a one-time "breaks into a run" chat flavour message.
 *   - A move that would exceed the running cap is either blocked outright
 *     (default) or allowed with a GM warning, per the "blockOverage" setting.
 *   - The GM is exempt by default (see "exemptGM" setting) so NPCs/monsters
 *     and manual repositioning are never restricted.
 *
 * Separately, purely cosmetic: Foundry's own core "movement history" feature
 * (TokenDocument#movementHistory, cleared via TokenDocument#clearMovementHistory())
 * draws a faded path trail on the canvas for a token's moves during combat.
 * Core is supposed to clear every combatant's trail when a new turn starts
 * (Combat#_clearMovementHistoryOnStartTurn), but that isn't always reliable
 * depending on how turns are advanced. When "clearMovementHistory" is ON
 * (default), this module explicitly clears every combatant's trail itself on
 * combatStart/combatTurn/combatRound, independent of the "restrictMovement"
 * setting above — this is unrelated to the MOV cap, just canvas tidiness.
 *
 * Assumption: the scene's grid distance unit is the same unit CoC7's MOV
 * score is expressed in at your table (e.g. both in meters, or both in
 * yards). If your scene grid uses a different unit than MOV, adjust the
 * run multiplier / MOV values accordingly, or convert on the scene.
 */
import { MODULE_ID } from "./constants.js";

function getMoveDistance(fromX, fromY, toX, toY) {
  const p0 = { x: fromX, y: fromY };
  const p1 = { x: toX, y: toY };

  if (canvas.grid?.measurePath) {
    // Foundry v12+
    return canvas.grid.measurePath([p0, p1]).distance;
  }
  if (canvas.grid?.measureDistance) {
    // Older API fallback
    return canvas.grid.measureDistance(p0, p1);
  }
  // Last-resort straight-line fallback, converted to grid units
  const pixelDist = Math.hypot(toX - fromX, toY - fromY);
  return (pixelDist / canvas.grid.size) * canvas.grid.distance;
}

function getMov(actor) {
  const mov = actor?.system?.attribs?.mov?.value;
  return typeof mov === "number" ? mov : 8; // CoC7 default human MOV
}

function resetCombatantTurnFlags(combat) {
  const tokenDoc = combat?.combatant?.token;
  if (tokenDoc) {
    tokenDoc.unsetFlag(MODULE_ID, "distanceThisTurn").catch(() => {});
    tokenDoc.unsetFlag(MODULE_ID, "runNotified").catch(() => {});
  }

  // Cosmetic: wipe every combatant's movement-path trail, not just the
  // combatant whose turn is starting — otherwise stale trails from
  // combatants earlier in the order keep cluttering the canvas.
  if (!game.settings.get(MODULE_ID, "clearMovementHistory")) return;
  for (const c of combat?.combatants ?? []) {
    const t = c.token;
    if (typeof t?.clearMovementHistory === "function") {
      t.clearMovementHistory().catch(() => {});
    }
  }
}

function onPreUpdateToken(tokenDoc, changes, _options, userId) {
  if (!game.settings.get(MODULE_ID, "restrictMovement")) return true;
  if (!("x" in changes) && !("y" in changes)) return true; // not a position change

  const combat = game.combat;
  if (!combat || !combat.started) return true; // combat-only enforcement

  const combatant = combat.combatants.find((c) => c.tokenId === tokenDoc.id);
  if (!combatant) return true; // not in this combat's turn order — no "turn" to cap

  const updatingUser = game.users.get(userId);
  if (game.settings.get(MODULE_ID, "exemptGM") && updatingUser?.isGM) return true;

  const actor = tokenDoc.actor;
  if (!actor) return true;

  const fromX = tokenDoc.x;
  const fromY = tokenDoc.y;
  const toX = changes.x ?? fromX;
  const toY = changes.y ?? fromY;
  const segment = getMoveDistance(fromX, fromY, toX, toY);

  const mov = getMov(actor);
  const runMultiplier = game.settings.get(MODULE_ID, "runMultiplier");
  const walkCap = mov;
  const runCap = mov * runMultiplier;

  const prevDistance = tokenDoc.getFlag(MODULE_ID, "distanceThisTurn") ?? 0;
  const newDistance = prevDistance + segment;
  const units = canvas.scene?.grid?.units || "";

  if (newDistance > runCap) {
    const blockOverage = game.settings.get(MODULE_ID, "blockOverage");
    const msg = `${tokenDoc.name} can't move further this turn — MOV ${mov}, running cap ${runCap}${
      units ? " " + units : ""
    } (already moved ${prevDistance.toFixed(1)}, this move would total ${newDistance.toFixed(1)}).`;

    if (blockOverage) {
      ui.notifications.warn(msg);
      return false; // reject the update entirely
    }
    ChatMessage.create({
      content: `⚠️ ${msg} (allowed anyway — "Block moves beyond the run cap" is off)`,
      whisper: ChatMessage.getWhisperRecipients("GM").map((u) => u.id)
    });
  } else if (newDistance > walkCap && !tokenDoc.getFlag(MODULE_ID, "runNotified")) {
    changes.flags = foundry.utils.mergeObject(changes.flags ?? {}, {
      [MODULE_ID]: { runNotified: true }
    });
    ChatMessage.create({
      content: `🏃 ${tokenDoc.name} breaks into a run this turn (MOV × ${runMultiplier} = ${runCap}${
        units ? " " + units : ""
      }).`,
      speaker: { alias: tokenDoc.name }
    });
  }

  changes.flags = foundry.utils.mergeObject(changes.flags ?? {}, {
    [MODULE_ID]: { distanceThisTurn: newDistance }
  });
  return true;
}

export function registerCombatGovernor() {
  Hooks.on("combatStart", (combat) => resetCombatantTurnFlags(combat));
  Hooks.on("combatTurn", (combat) => resetCombatantTurnFlags(combat));
  Hooks.on("combatRound", (combat) => resetCombatantTurnFlags(combat));
  Hooks.on("preUpdateToken", onPreUpdateToken);
}
