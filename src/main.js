import { Game } from './Game.js';

const game = new Game(document.getElementById('app'), document.getElementById('hud'));
game.start();

// Handy for poking at things from the browser console during development.
window.game = game;
