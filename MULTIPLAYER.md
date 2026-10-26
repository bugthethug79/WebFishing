# Multiplayer plan

Groundwork for online play landed in Milestone 8. This doc covers what's ready,
what's still needed, and the decisions to make before building it.

## What's already in place

| Piece | Where | Why it matters |
| --- | --- | --- |
| Player profile (stable id + display name) | `src/save/Profile.js` | Name tags now; accounts later |
| Versioned save format with migrations | `src/save/SaveManager.js` | Same JSON can be stored on a server ("cloud saves") |
| Pluggable save storage | `src/save/storage.js` | Swap `LocalStorageBackend` for a server backend without touching the game |
| Shared world clock + deterministic weather | `src/environment/TimeOfDay.js`, `Weather.js` | Everyone sees the same time of day and weather with no server sync |
| Deterministic world generation | `src/world/zones/*` (seeded) | Every client builds identical islands and lakes |
| `Avatar` split from the local `Player` | `src/player/Avatar.js` | Remote players reuse the exact same character + animation |
| Player snapshots | `Player.getSnapshot()`, `Game.localSnapshot()` | Small JSON of position / pose / gear / bobber, sent ~10x a second |
| Transport-agnostic session | `src/net/Multiplayer.js` | Handles join/leave, smoothing, zones, catch announcements |
| Remote players | `src/net/RemotePlayer.js` | Interpolated avatar, bobber + line, name tag |
| Test transport between tabs | `src/net/BroadcastClient.js` | Open the game twice with `?lan` to see each other (same browser only) |

### Try the test mode

Open `http://localhost:5173/?lan` (or the GitHub Pages URL with `?lan`) in two tabs of the
same browser. Each tab shows the other player, their bobber when they cast, and
announces their catches. This is **not** online multiplayer: it only links tabs on one computer,
and both tabs share one save.

## What online play still needs

GitHub Pages only serves static files, so online play needs a small realtime server
somewhere. The game only needs a transport with this interface (see `BroadcastClient`):

```js
client.id                  // this connection's id
client.send(message)       // broadcast to the room
client.onMessage(fn)       // messages from others: { from, type, ... }
client.close()
```

A `WebSocketClient` implementing that, plus a server that relays messages within a room,
is enough for the first version.

### Hosting options

| Option | Good for | Notes |
| --- | --- | --- |
| **Cloudflare Durable Objects / PartyKit** | Rooms of players, low latency | JavaScript server, WebSockets built in, generous free tier. **Recommended** for rooms. |
| **Supabase Realtime** | Rooms + accounts + cloud saves in one place | Broadcast channels, auth and a Postgres DB. Good if we want logins. |
| Firebase Realtime Database | Quick prototypes | Easy, but a less natural fit for frequent position updates. |
| Node + `ws` on Render / Fly.io | Full control | We run and maintain a server ourselves. |
| WebRTC peer-to-peer | No relay costs | Still needs a signalling server; NAT problems for some players. |

## Decisions needed before the multiplayer milestone

1. **Hosting:** which option above (recommendation: Cloudflare/PartyKit for rooms; add
   Supabase later if we want accounts).
2. **How people meet:** one shared public island per zone, or private rooms with invite codes,
   or both?
3. **Saves:** keep saves local per browser, or add accounts + cloud saves?
4. **Chat:** text chat, quick emotes only (safer and simpler), or none at first?
5. **Room size:** suggested 8-12 players per zone.
6. **Trust:** cozy co-op can trust clients (each player rolls their own fish). Competitive
   features (leaderboards, trading) would need server-side checks.

## Proposed scope for the multiplayer milestone

- WebSocket transport + room server (per zone, invite codes)
- Lobby / join flow on the title screen, player list in the pause menu
- Others hold up their catches above their heads (not just a toast)
- Emotes (wave, cheer) and optional chat
- Server-provided clock offset so time-of-day can't drift between clients
- Reconnect handling and a small "connection" indicator
