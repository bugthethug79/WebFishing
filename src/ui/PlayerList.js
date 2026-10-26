// Hold Tab to see who's online on the server and where they are.

import { el } from './format.js';
import { ZONES_BY_ID } from '../world/zones/index.js';

export class PlayerList {
  constructor(root) {
    this.el = el('<div class="player-list"><div class="pl-title"></div><div class="pl-rows"></div></div>');
    root.appendChild(this.el);
  }

  // players: [{ name, zone, self }]
  show(serverName, players) {
    this.el.querySelector('.pl-title').textContent = `${serverName} · ${players.length} online`;
    this.el.querySelector('.pl-rows').replaceChildren(
      ...players.map((p) => {
        const row = el('<div class="pl-row"><span class="pl-name"></span><span class="pl-zone"></span></div>');
        row.querySelector('.pl-name').textContent = p.self ? `${p.name} (you)` : p.name;
        row.querySelector('.pl-zone').textContent = ZONES_BY_ID[p.zone]?.name ?? '…';
        return row;
      }),
    );
    this.el.classList.add('visible');
  }

  hide() {
    this.el.classList.remove('visible');
  }
}
