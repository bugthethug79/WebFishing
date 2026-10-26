# WebFishing community server

Host your own multiplayer WebFishing server. It's **one file with no dependencies**:
players sign up with an account on *your* server, and their progress is stored here.

## Quick start

1. Install [Node.js](https://nodejs.org) 18 or newer.
2. Copy this `server/` folder to the machine that will host it.
3. Run:

   ```bash
   node server.js
   ```

The first run creates `config.json` with default settings. Edit it, then restart.
Players add your server's address in the game under **Multiplayer**.

## Configuration (`config.json`)

| Setting | Default | What it does |
| --- | --- | --- |
| `name` | `"My WebFishing Server"` | Shown in the server list |
| `motd` | `"Welcome! ..."` | Message of the day, shown in the list and on joining |
| `port` | `8787` | Port to listen on (panel hosts set this for you through `SERVER_PORT` / `PORT`) |
| `host` | `"0.0.0.0"` | Network interface (`0.0.0.0` = all) |
| `public` | `true` | `true`: anyone can join. `false`: players need the `passcode` |
| `passcode` | `""` | Required when `public` is `false` |
| `maxPlayers` | `16` | Players online at once |
| `allowRegistration` | `true` | Set `false` to stop new accounts being created |
| `admins` | `[]` | Usernames allowed to use admin chat commands |
| `allowedOrigins` | `[]` | Restrict which websites may connect (empty = any). E.g. `["https://bugthethug79.github.io"]` |
| `tls.cert`, `tls.key` | `""` | Paths to a certificate + key to serve `wss://` directly (see below) |
| `tunnel.enabled` | `false` | Start a Cloudflare Tunnel for a secure address automatically (see below) |
| `tunnel.token` | `""` | Cloudflare Tunnel token for a permanent address on your own domain |
| `chat.enabled` | `true` | Turn chat on/off |
| `chat.maxLength` | `200` | Longest chat message |
| `chat.messagesPerWindow` / `windowSeconds` | `5` / `5` | Rate limit: at most N messages per window |
| `chat.blockedWords` | `[]` | Words replaced with `***` in chat |
| `dataDir` | `"data"` | Where accounts and saves are stored |

Example private server:

```json
{
  "name": "Friends Only Lagoon",
  "motd": "Bring snacks.",
  "public": false,
  "passcode": "salmon-sunset",
  "maxPlayers": 8,
  "admins": ["yourname"]
}
```

## Letting players connect: `wss://` (important)

The game on GitHub Pages runs over **HTTPS**, and browsers only let HTTPS pages connect to
**secure** WebSockets (`wss://`). The one exception is `localhost`: you can always test on your
own computer by adding `localhost:8787` in the game.

For everyone else, pick one:

**A. Built-in Cloudflare Tunnel (easiest, free, no port forwarding, no certificate)**

Set this in `config.json` and restart:

```json
"tunnel": { "enabled": true }
```

The server downloads Cloudflare's `cloudflared` the first time (about 40 MB, stored in
`data/bin/`), starts a tunnel and prints a line like:

```
✔ Secure address ready. Players add this in Multiplayer:
    cozy-trout-sunset-lagoon.trycloudflare.com
```

Type `address` in the console to see it again. Free quick tunnels get a **new address every
restart** and have no uptime guarantee; for a permanent address see
[Permanent address with your own domain](#permanent-address-with-your-own-domain).
If `cloudflared` is already installed, the server uses that one (or set `CLOUDFLARED_PATH`).

**B. Reverse proxy with automatic HTTPS (Caddy)** on a server with a domain name:

```
fish.example.com {
  reverse_proxy localhost:8787
}
```

Players add `fish.example.com`.

**C. Built-in TLS:** get a certificate (e.g. from Let's Encrypt), then set
`"tls": { "cert": "/path/fullchain.pem", "key": "/path/privkey.pem" }`, forward the port on
your router, and players add `your-domain.com:8787`.

## Hosting on bot-hosting.net (and other Pterodactyl panel hosts)

Panel hosts only let you run a program, so use the built-in tunnel for a secure address.

1. **Create a server** in the panel using a **Node.js** egg/template (Node 18 or newer;
   22 is best).
2. **Upload** `server.js` and `package.json` from this folder (File Manager or SFTP).
3. Set the **startup / main file** to `server.js`.
4. **Start it once.** It creates `config.json`, then **stop** it.
5. **Edit `config.json`** in the File Manager: set your `name`, `motd`, and turn on the tunnel:

   ```json
   "tunnel": { "enabled": true }
   ```

   Leave `port` alone: the server uses the port the panel assigns (`SERVER_PORT`).
6. **Start it again.** The console shows `✔ Secure address ready` with an address like
   `something.trycloudflare.com`. Share that with players: they add it under **Multiplayer**.
7. Console commands (`list`, `kick`, `op`, `address`…) work in the panel console.

If the console says it couldn't get or start `cloudflared`, the host is blocking downloads or
running extra programs; ask their admins, or use a host with HTTPS built in.

## Permanent address with your own domain

Quick tunnels change address on every restart. For a fixed one like `fish.yourdomain.com`:

1. Get a domain (a cheap one is fine) and add it to a free [Cloudflare](https://dash.cloudflare.com) account.
2. In Cloudflare **Zero Trust → Networks → Tunnels**, **create a tunnel** (type *Cloudflared*)
   and copy its **token** (the long string after `--token` in the install command).
3. Under the tunnel's **Public Hostname**, add `fish.yourdomain.com` with service
   **HTTP** → `localhost:<your server's port>` (the port shown in the server's startup message).
4. Put the token in `config.json` and restart:

   ```json
   "tunnel": { "enabled": true, "token": "eyJhIjoi..." }
   ```

Players add `fish.yourdomain.com`, and it stays the same forever. Keep the token secret.

## Console commands

Type these into the terminal running the server:

| Command | |
| --- | --- |
| `list` | Who's online, and where |
| `address` | Show the tunnel address players should use |
| `say <text>` | Announce to everyone |
| `kick <name>` | Disconnect a player |
| `ban <name>` / `unban <name>` | Block / allow an account |
| `op <name>` / `deop <name>` | Grant / remove admin (saved to config.json) |
| `save` | Write data to disk now |
| `stop` | Save and shut down (Ctrl+C does the same) |

## In-game chat commands

Everyone: `/help`, `/players`. Admins: `/kick <name>`, `/ban <name>`, `/unban <name>`, `/announce <text>`.

## Data and backups

Accounts and their saves live in `data/accounts.json`. Back it up by copying the file
(ideally while the server is stopped, or right after `save`).

## Docker

```bash
docker build -t webfishing-server .
docker run -d -p 8787:8787 -v webfishing-data:/app/data -v $(pwd)/config.json:/app/config.json webfishing-server
```

## Security notes

- Passwords are hashed with scrypt and a per-account salt; login tokens are stored hashed.
- Logins are rate limited per IP, and one account can only be online once at a time.
- Each player's game sends its own save, so a determined player could edit their own
  progress. That's fine for a cozy co-op game, but don't run competitive prizes on it.
- Keep `server.js` up to date with the game. If the protocol changes, players see a clear
  "update the game or server" message.

## Writing a server in another language

The protocol is small JSON messages over a WebSocket (text frames). Clients send `info`,
`auth`, `state`, `save`, `chat` and `catch`; the server answers with `info`, `welcome` /
`error`, and relays `state`, `chat`, `catch`, `join`, `leave` and `zone`. `server.js` is
commented to serve as the reference.
