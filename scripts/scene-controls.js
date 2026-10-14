import { toggleExplorationHud } from './ui/exploration-hud.js';

export function registerSceneControls() {
  Hooks.on('getSceneControlButtons', (controls) => {
    const tokenControl = controls.tokens;
    if (!tokenControl) return;
    tokenControl.tools.explorationHud = {
      name: 'explorationHud',
      title: 'COC7EXP.Hud.ToggleTitle',
      icon: 'fa-solid fa-person-hiking',
      order: Object.keys(tokenControl.tools).length,
      button: true,
      visible: true,
      onChange: () => toggleExplorationHud()
    };
  });
}
