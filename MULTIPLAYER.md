# Multiplayer

WebFishing multiplayer is **optional and community-hosted**: anyone can run a server with
the single file in [`server/`](server/README.md), and players join from the game's
**Multiplayer** menu. Solo play keeps its own local save.

## How it works

- **Servers** are one Node.js file with no dependencies (`node server.js`). A `config.json`
  sets the name, message of the day, public/private (passcode), player limit, admins and chat rules.
- **Accounts live on each server.** Players register a username and password per server, and
  their progress (money, gear, bucket, journal, position) is saved there. Solo progress is separate.
- **In game:** see other players with name tags, their bobbers and the fish they hold up;
  press **T** to chat (speech bubbles appear over heads); hold **Tab** for the player list.
- **Shared world:** time of day and weather come from the server's clock, so everyone sees
  the same sunset and rain. Positions are relayed only to players in the same zone.
- **Resilient:** the game reconnects automatically if the connection drops; "remember me"
  keeps you logged in per server.

See [`server/README.md`](server/README.md) for hosting, configuration, `wss://` setup and moderation.

## Code map

| Piece | Where |
| --- | --- |
| Server (WebSocket, accounts, chat, moderation, relays) | `server/server.js` |
| Protocol version + address handling | `src/net/protocol.js` |
| Connection + login + reconnect, server-side saves | `src/net/OnlineSession.js`, `src/net/WebSocketClient.js` |
| Saved servers and remembered logins | `src/net/serverList.js` |
| Session: remote players, roster, chat/catch relay | `src/net/Multiplayer.js`, `src/net/RemotePlayer.js` |
| UI: server browser, chat, player list, reconnect overlay | `src/ui/ServerBrowser.js`, `Chat.js`, `PlayerList.js`, `ConnectionOverlay.js` |
| Tab-to-tab test transport (`?lan`) | `src/net/BroadcastClient.js` |

## Proximity voice chat (planned discussion)

Doable with WebRTC: microphone audio goes directly between nearby players, the game server
only relays the connection setup messages, and each voice plays through a positional audio
panner on that player's avatar (quieter with distance, from the right direction).

Things to decide together:
- **Connectivity:** some home networks need a TURN relay server (bandwidth costs); a config
  option could let server owners add one.
- **Scale:** direct connections suit ~8-10 players in earshot; beyond that an SFU media server is needed.
- **Safety:** push-to-talk, per-player mute, a server option to disable voice, mic permission prompts.

## Ideas for later

- Emotes (wave, cheer) and simple gestures
- Trading fish between players, co-op fishing events
- An optional public server directory (would need one central listing service)
- Cloud saves that follow an account across servers
