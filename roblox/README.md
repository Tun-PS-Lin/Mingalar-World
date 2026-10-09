# Mingalar World — Roblox

The Roblox version of Mingalar World. It has the same town, buildings and activities as the web version, rebuilt from Roblox parts, terrain and the default Roblox avatar.

## Open it

Open **`MingalarWorld.rbxl`** in Roblox Studio and press **Play**. The map is already built into the place file.

Before you publish:

1. **Game Settings → Avatar** → avatar type **R15**. The character editor needs R15.
2. **Game Settings → Security** → turn on **Enable Studio Access to API Services** if you want saving to work in Studio. Saving always works in a published game.

## Work on it with Rojo

```bash
rokit install                         # rojo, lune, luau-lsp (versions in rokit.toml)
rojo serve                            # live-sync src/ into an open Studio place
lune run tools/build-map.luau         # rebuild build/Map.rbxm after changing anything in src/server/World
lune run tools/test.luau              # headless tests (see below)
rojo build -o MingalarWorld.rbxl      # rebuild the place file
```

## What's in it

| | |
|---|---|
| **Avatar** | The 👕 button (or C) opens the editor: male/female body, skin tone, 8 hairstyles and hair colour, 5 tops with 5 designs, jeans/shorts/skirt, shoes, 5 hats, glasses, backpack/cape/wings, plus presets and randomise. It uses the standard blocky R15 body. Hair and hats are accessories built from parts, so no catalogue items are needed. Your look is saved. |
| **Camera** | The 🎥 button (or V) switches between first and third person. In both views your character faces where the camera looks. In third person you right-drag to orbit the camera. |
| **Minimap** | Bottom left, north at the top, follows you everywhere (including inside the office and on the raceway). The – button minimises it, or press M. |
| **Virtual Mall** | Tech floor: laptops, phones and tablets, cameras, headphones and watches, gaming and VR, desktop PCs, speakers, TVs, drones. Fashion floor: tees, hoodies and jackets, jeans, dresses and skirts, hats and sunglasses, handbags and purses, shoes, backpacks and capes, mannequins, fitting rooms. Press E at a display to browse it, add items to the cart or **try clothes on** your avatar. Checkout is a demo: no Robux are spent. |
| **Virtual Garage** | Five cars on turntables, built with *your* saved mods. Press E at a car to change its paint, finish, wheels, rim colour, spoiler, body kit, underglow, stripes, engine, tyres and nitro. |
| **Raceway** | **Race this car** puts you in the driver's seat on the circuit around the city. Other players see your car too. You race 3 laps against 3 AI rivals, with a countdown on the start lights. Controls: W/S, A/D, Space for handbrake, Shift for nitro, V to switch between chase and cockpit cameras, Q to leave. Best laps are saved. |
| **Virtual Office** | Press E at the door to fade inside. The three business corners are the Alacrity Research holographic city map, the Mingalar News studio (with a scrolling ticker) and Tun-PS-Lin's developer desk. There is also a reception desk and a lounge. |
| **Gun Range** | Pick a pistol, revolver, SMG, assault rifle, shotgun or sniper rifle, then score on pop-up dummies and bullseye boards for 60 seconds. R reloads, right-click scopes the sniper, Q leaves. Best scores are saved. |
| **Also** | Luxury Home gallery, a pool you can swim in (real terrain water), mini golf with real ball physics, a gym, a fountain plaza, a pond park, people walking the pavements, and a day/night cycle with street lights. |

### About the office links

**Roblox can't open web pages, and its rules restrict directing players to off-platform sites.** The office corners show each business's name and description. If your experience is allowed to show the addresses, set `Config.ShowExternalUrls = true` in `src/shared/Config.luau`: each corner then shows its address in a box players can copy from. Otherwise, add the links to the experience page's **Social Links** where Roblox allows that.

## How it's optimised

- **The map ships pre-built** (`build/Map.rbxm`, about 6,400 anchored parts), so servers don't spend start-up time generating it. Only terrain (ground, water, the raceway's asphalt) is painted at start, because voxels can't be saved into a model.
- **The raceway surface is terrain**: a 3,300-stud circuit with no seams on curves, costing no parts. Kerbs and barriers are merged into long segments on the straights.
- **StreamingEnabled is on**, so players only load what's around them. Teleports (into the office, onto the raceway) request streaming around the destination first.
- **Small details have collisions, queries, touch events and shadows turned off.** Only walls, floors and furniture you can bump into collide.
- **Clients do the animation**, so the server stays idle: spinning logos, the holographic city, flags, the news ticker, the golf mover, showroom turntables, gun-range targets, AI rival cars, and your race car's wheels and steering. Each of these loops skips work when the camera is far away.
- **The player's race car** is a server-built assembly owned by the driver's client. It moves smoothly and replicates to everyone else, and it is in a collision group that ignores the world.
- **The server does only what needs authority**: building the avatar (`HumanoidDescription`), saving (`DataStore`, every 2 minutes and on leave), handing out guns, spawning race cars, and walking 6 townsfolk. Every remote validates and clamps what clients send.

## Tests

`lune run tools/test.luau` runs the shared and server code outside Roblox:

- all 160 car variants (every mod value on every model), all 6 guns and all 36 avatar options build
- client input is sanitised
- the raceway keeps clear of the city wall
- a full 3-lap race runs with three AI rivals and an autopilot driver. Laps take about 41–47 s and nobody leaves the asphalt.

`lune run tools/build-map.luau` runs every world builder, so it also catches runtime errors in them. Static type-checking against the Roblox API uses luau-lsp:

```bash
rojo sourcemap default.project.json -o sourcemap.json
luau-lsp analyze --sourcemap=sourcemap.json --definitions=globalTypes.d.luau src
```

Download `globalTypes.d.luau` from the matching luau-lsp release. Studio play-testing is still the real test for camera feel, UI layout and physics.

## Layout

```
default.project.json   Rojo project (services, lighting, streaming, the pre-built map)
src/shared/            Config (layout, catalogue, cars, weapons, links), Util part builders,
                       CarModel, GunModel, TrackPath, RacePhysics
src/server/            Main.server (remotes, saving, race cars, guns, day/night), Avatar, Npcs
src/server/World/      City, Mall, Products, Garage, Office, GunRange, Track, Kit (props)
src/client/            Main.client (prompt routing, HUD), UI kit, CameraController, Minimap,
                       Customize, Shop, GarageClient, Race, Range, Golf, Activities
tools/                 build-map.luau, test.luau, inspect-place.luau (Lune scripts)
build/Map.rbxm         the pre-built map (generated)
```

## Sounds

Every sound-worthy moment is a single spot in the client code. Upload your sounds and play them with `SoundService` from those spots (shot, hit, lap, purchase, jump...). The web README lists the sounds to collect.
