import { MODULE_ID } from "./constants.js";
import { registerSettings } from "./settings.js";
import { registerCombatGovernor } from "./combat-governor.js";
import { registerSceneConfig } from "./scene-config.js";
import { registerSceneControls } from "./scene-controls.js";
import { registerMovementGuard } from "./exploration-guard.js";
import { registerSocketListener } from "./socket.js";
import { refreshExplorationHud, registerHudAutoOpen } from "./ui/exploration-hud.js";

Hooks.once("init", () => {
  registerSettings();
  registerCombatGovernor();
  registerSceneConfig();
  registerSceneControls();
  registerMovementGuard();
  registerHudAutoOpen();
});

Hooks.once("ready", () => {
  registerSocketListener();

  const restricted = game.settings.get(MODULE_ID, "restrictMovement");
  console.log(`${MODULE_ID} | Ready. Combat movement is currently ${restricted ? "RESTRICTED" : "FREE"}.`);

  if (game.system.id !== "CoC7") {
    console.warn(
      `${MODULE_ID} | Built for the CoC7 system; detected system is "${game.system.id}". MOV lookups (system.attribs.mov.value) may not resolve correctly on this system.`
    );
  }
});

Hooks.on("updateScene", refreshExplorationHud);
Hooks.on("updateToken", refreshExplorationHud);
Hooks.on("canvasReady", refreshExplorationHud);
Hooks.on("userConnected", refreshExplorationHud);
