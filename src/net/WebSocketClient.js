// Thin wrapper over the browser WebSocket using JSON messages.
// Implements the transport interface Multiplayer expects: { id, send, onMessage, close }.

export class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.id = null; // assigned by the server on login
    this.handlers = [];
    this.closeHandlers = [];
    this.ws = null;
  }

  connect(timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (fn, arg) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn(arg);
      };
      const timer = setTimeout(() => {
        this.ws?.close();
        done(reject, new Error('timeout'));
      }, timeoutMs);
      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        return done(reject, e);
      }
      this.ws.onopen = () => done(resolve);
      this.ws.onerror = () => done(reject, new Error('unreachable'));
      this.ws.onmessage = (e) => {
        let msg;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        this.handlers.forEach((fn) => fn(msg));
      };
      this.ws.onclose = (e) => {
        done(reject, new Error('closed'));
        this.closeHandlers.forEach((fn) => fn(e));
      };
    });
  }

  get open() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  send(message) {
    if (this.open) this.ws.send(JSON.stringify(message));
  }

  onMessage(fn) {
    this.handlers.push(fn);
  }

  onClose(fn) {
    this.closeHandlers.push(fn);
  }

  // Wait for the first message matching `pred`.
  next(pred, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      const handler = (m) => {
        if (!pred(m)) return;
        clearTimeout(timer);
        this.handlers = this.handlers.filter((h) => h !== handler);
        resolve(m);
      };
      this.handlers.push(handler);
    });
  }

  close() {
    this.closeHandlers = [];
    this.ws?.close();
  }
}
