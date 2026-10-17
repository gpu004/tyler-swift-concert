# tyler-swift-concert

A DOOM-style FPS where you escape a corporate office to make it on time to a Taylor Swift concert.

It's 6:30 PM, you're stuck on floor 42, and the show starts at 8:00 PM. Fight through interns, managers, HR reps and the CEO across three floors, grab the keycard on each, and reach the exit before the clock runs out. Arrive with 20+ minutes to spare for front row seats.

The same game is implemented twice, from the shared spec in [DESIGN.md](DESIGN.md):

| Folder | Stack | Runs in |
| --- | --- | --- |
| [`typescript/`](typescript/) | TypeScript, Vite, canvas raycaster, Web Audio, anti-slop oxlint rules | Browser only |
| [`cpp/`](cpp/) | C++20, CMake, SDL2 | Native desktop |

All textures and sprites are generated procedurally; there are no image assets.

## TypeScript (browser)

```sh
cd typescript
npm ci
npm run dev
```

Open the printed URL, click the canvas to capture the mouse, press Enter. `?level=2` or `?level=3` starts on a later floor.

`npm run verify` runs oxlint (with vendored [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) rules), oxfmt, tsc, vitest and the Vite build.

## C++ (native)

```sh
sudo apt install libsdl2-dev cmake
cd cpp
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/escape_office
```

`cpp/scripts/check.sh` runs clang-format, the build with `-Werror`, clang-tidy, the tests and headless screenshot smoke runs.

## Controls

| Key | Action |
| --- | --- |
| W/S or Up/Down | Move |
| A/D | Strafe |
| Left/Right or mouse | Turn |
| Shift | Run |
| Space or left click | Fire stapler (keyboard melee when out of staples) |
| E | Open doors, use exit |
| Enter | Start / resume |
| Esc or P | Pause |
