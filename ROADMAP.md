# WebFishing Roadmap

A cozy, vibrant, low-poly open-world fishing game with a top-down 3D camera
(Cubic Castles style). Built step by step, one self-contained milestone at a time.
Each milestone should leave the game in a playable, polished state.

## ✅ Milestone 1: Foundation (done)
- [x] Vite + three.js project scaffold, modular folder structure
- [x] Renderer, bright daytime lighting, soft shadows that follow the player, fog
- [x] Starter island: faceted terrain with grass, beach and sea floor (single source of truth in `island.js`)
- [x] Animated low-poly water with shoreline foam
- [x] Props: wooden dock, fishing hut, round trees, palms, rocks, flowers and grass tufts
- [x] Chibi low-poly player with walk / run / idle animation
- [x] Camera-relative WASD movement, collision with props and buildings, can't walk into water
- [x] Top-down follow camera: smooth follow, scroll zoom, Q/E rotate in 45° steps
- [x] Minimal HUD (title + controls hint)

## ✅ Milestone 2: Core fishing loop (done)
- [x] Fishing rod held by the player, with charge / cast / hold / reel / cheer poses
- [x] Cast: hold to charge (ping-pong power meter), release to throw; aim by turning; only valid over water
- [x] Sagging line + bobber that floats on the waves; camera drifts toward the bobber
- [x] Waiting phase with nibbles, then a bite (bobber dips, splash, bouncing "!")
- [x] Reeling minigame: hold to reel, watch the tension bar, fish thrashes in bursts
- [x] Catch reveal: fish leaps out and is held overhead, catch card with rarity + size
- [x] Ripple and splash effects; friendly messages for misses, early pulls and snapped lines
- [x] Placeholder species table (7 fish, 4 rarities; deeper water favours rarer fish)

## ✅ Milestone 3: Fish & collection (done)
- [x] Fish data: 17 species, 4 rarities, size/weight, flavour text, base price (for the shop later)
- [x] Habitats by water depth (Shallows / Open Water / Deep Water); deeper casts favour rarer fish
- [x] Procedural low-poly fish models: 8 body shapes, two-tone bellies, stripes, puffer spikes, glowing angler lure
- [x] Bucket (20 slots): view catches, release fish; full bucket releases new catches automatically
- [x] Journal: every species with silhouettes + habitat tips until discovered, then catch count and records
- [x] Catch card badges: NEW! and New record!, weight, journal note
- [x] HUD buttons (B / J), menus pause gameplay and only open between casts
- [x] Time-of-day / weather conditions for fish (done in Milestone 6)

## ✅ Milestone 4: UI & feel (done)
- [x] Title screen ("click to start", also unlocks audio) with a slow camera orbit
- [x] Area banner on arrival ("Sunny Isle")
- [x] Pause / settings menu (Esc or ⚙️): volume sliders, shadows, resolution, controls hint; settings saved
- [x] Interaction system: "F" prompt bubbles + typewriter dialogue box; signpost with tips, locked hut door
- [x] Aim marker + habitat label while charging a cast; camera frames the cast range
- [x] All audio synthesised in code (no files): fishing SFX, footsteps per surface, UI sounds
- [x] Ambience: waves that swell louder near the shore, birdsong inland
- [x] Procedural lo-fi music loop

## ✅ Milestone 5: Economy & progression (done)
- [x] HUD money (with +/- popups) and current bait (click or R to switch)
- [x] Marina the shopkeeper NPC on the hut porch: waves, turns to face you, intro + greetings
- [x] Sell fish (price scales with size), sell all with a confirm step; bucket shows each fish's worth
- [x] 4 rods with stats: cast distance, reel speed, tension control, luck (each has its own look)
- [x] 3 baits bought in packs, used one per cast: faster bites, rare boost, legendary boost
- [x] 6 hats (bucket, straw, beanie, captain, fish, crown), shown on the player
- [x] Character model reworked for NPCs: looks, hair, swappable hats

## ✅ Milestone 6: World expansion (done)
- [x] Zone architecture: `Island` shape class + data-driven zone definitions (`world/zones/`)
- [x] Pine Lake: an inverted "island" (lake in a forested valley) with jetty, campsite, campfire, tent
- [x] Travel: rowboat at each dock, travel menu with per-zone discovery counts, fade transition
- [x] 8 new freshwater fish (24 total); fish tied to zones, some only at night or in the rain
- [x] Day/night cycle (12-minute day): keyframed sun/moon, sky and fog; HUD clock
- [x] Night life: lamp posts, glowing hut window, flickering campfire light, fireflies, crickets, softer music
- [x] Weather: clear / cloudy / rain with rain streaks, water ripples, rain ambience, darker light; rain makes fish bite sooner
- [x] Static prop batching: ~700 draw calls down to ~150-200 per frame
- [ ] More zones (river, pier town...): add a file in `world/zones/` and list it in `zones/index.js`

## ✅ Milestone 7: Life & juice (done)
- [x] Fish shadows under the water; casting near one draws it to your bobber for a quicker bite
- [x] Crabs scuttling on Sunny Isle's beach, frogs hopping at Pine Lake; both flee, frogs dive in
- [x] Gulls circling Sunny Isle, songbirds crossing the lake; they leave at night and in heavy rain
- [x] Pooled particle system: footstep dust (sand / running), sparkles on rare + legendary catches
- [x] Camera shake on hook, line snap and legendary catches
- [x] Wind sway shader for trees, palms, pines, grass and flowers (stronger in bad weather), baked into the static batches
- [x] Gull cries by day, frog croaks at night

## Milestone 8: Persistence
- [ ] Save / load (localStorage)
- [x] Settings persistence (done early in Milestone 4)

## Later / maybe
- [ ] Multiplayer
- [ ] Mobile / touch controls
