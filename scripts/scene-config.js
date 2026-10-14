import { MODULE_ID, FLAGS } from './constants.js';
import { isExplorationScene } from './turn-tracker.js';

export function registerSceneConfig() {
  Hooks.on('renderSceneConfig', injectExplorationToggle);
}

function injectExplorationToggle(app, html) {
  const scene = app.document ?? app.object;
  if (!scene) return;

  const checked = isExplorationScene(scene) ? 'checked' : '';
  const fieldName = `flags.${MODULE_ID}.${FLAGS.EXPLORATION_SCENE}`;
  const markup = `
    <fieldset>
      <legend>${game.i18n.localize('COC7EXP.SceneConfig.Legend')}</legend>
      <div class="form-group">
        <label>${game.i18n.localize('COC7EXP.SceneConfig.Toggle')}</label>
        <input type="checkbox" name="${fieldName}" ${checked}>
        <p class="hint">${game.i18n.localize('COC7EXP.SceneConfig.Hint')}</p>
      </div>
    </fieldset>
  `;

  const root = html instanceof HTMLElement ? html : html[0];
  const footer = root.querySelector('footer.sheet-footer, footer[class*="form-footer"]');
  const container = document.createElement('div');
  container.innerHTML = markup;

  if (footer) {
    footer.before(...container.children);
  } else {
    const form = root.querySelector('form');
    (form ?? root).append(...container.children);
  }

  app.setPosition?.({ height: 'auto' });
}
