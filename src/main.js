import { Game } from './Game.js';
import { LocalStorageBackend } from './save/storage.js';
import { loadSave } from './save/SaveManager.js';

// Load the save first so the game can build the right zone straight away.
const backend = new LocalStorageBackend();
loadSave(backend).then((saveData) => {
  const game = new Game(document.getElementById('app'), document.getElementById('hud'), { saveData, backend });
  game.start();

  // Handy for poking at things from the browser console during development.
  window.game = game;
});
