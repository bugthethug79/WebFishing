// Development transport: connects game tabs in the SAME browser on the same computer
// using BroadcastChannel. It exists to exercise the multiplayer code paths before a
// real server exists (open the game twice with ?lan in the URL).
//
// Any transport implements the same tiny interface, so a WebSocket client can replace it:
//   id: string                       this connection's peer id
//   send(message: object): void      broadcast to everyone else
//   onMessage(fn(message)): void     messages from others ({ from, type, ... })
//   close(): void

export class BroadcastClient {
  constructor(channel = 'webfishing-lan') {
    // Per-tab id: tabs share one save (and profile id), so they need their own.
    this.id = `tab-${Math.random().toString(36).slice(2, 10)}`;
    this.channel = new BroadcastChannel(channel);
    this.handlers = [];
    this.channel.onmessage = (e) => {
      if (e.data?.from !== this.id) this.handlers.forEach((fn) => fn(e.data));
    };
    window.addEventListener('pagehide', () => this.close());
  }

  send(message) {
    this.channel.postMessage({ ...message, from: this.id });
  }

  onMessage(fn) {
    this.handlers.push(fn);
  }

  close() {
    if (!this.channel) return;
    this.send({ type: 'bye' });
    this.channel.close();
    this.channel = null;
  }
}
