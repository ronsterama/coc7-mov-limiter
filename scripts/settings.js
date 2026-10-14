import { MODULE_ID, DEFAULT_MOVE_MULTIPLIER } from "./constants.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, "restrictMovement", {
    name: "Restrict movement to CoC7 rules",
    hint:
      "OFF = tokens move freely, normal Foundry behaviour. ON = during an active combat encounter, each token's movement is capped at its MOV characteristic when walking, and MOV × the run multiplier below when running — moves beyond that cap are stopped.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      ui.notifications.info(
        `CoC7 Movement Governor: movement is now ${value ? "RESTRICTED to CoC7 MOV rules" : "FREE"}.`
      );
    }
  });

  game.settings.register(MODULE_ID, "runMultiplier", {
    name: "Running multiplier",
    hint:
      "CoC7 core rules: a full round of running covers MOV × 5. Change this if your table uses different house-rule numbers.",
    scope: "world",
    config: true,
    type: Number,
    default: 5,
    range: { min: 1, max: 10, step: 0.5 }
  });

  game.settings.register(MODULE_ID, "exemptGM", {
    name: "Exempt GM-controlled moves",
    hint:
      "ON = the GM can always move any token freely (NPCs, monsters, staging), regardless of the setting above. Only non-GM users are capped.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "clearMovementHistory", {
    name: "Clear movement trails each turn",
    hint:
      "Purely cosmetic, unrelated to the MOV cap above: wipes Foundry's own faded movement-path trail for every combatant when a turn or round changes, so stale trails from earlier combatants don't clutter the canvas. Safe to leave on even with movement restriction OFF.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "blockOverage", {
    name: "Block moves beyond the run cap",
    hint:
      "ON = a move that would exceed MOV × multiplier this turn is rejected and the token stays put. OFF = the move is allowed anyway, but a warning is whispered to the GM.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "moveMultiplier", {
    name: "COC7EXP.Settings.MoveMultiplier.Name",
    hint: "COC7EXP.Settings.MoveMultiplier.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: DEFAULT_MOVE_MULTIPLIER,
    range: { min: 0.5, max: 10, step: 0.5 }
  });
}

/** How many times a token's Move stat it may travel per turn on an Exploration Scene. */
export function getMoveMultiplier() {
  const value = Number(game.settings.get(MODULE_ID, "moveMultiplier"));
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MOVE_MULTIPLIER;
}
