# Escape the Office (C++)

A self-contained DOOM-style office raycaster built with C++20, SDL2, and
procedural graphics.

## Build and run

Install the system dependencies with `sudo apt install libsdl2-dev cmake`,
then build and launch:

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/escape_office
```

WASD or arrows move, A/D strafe, left/right turn, Shift runs, Space or left
click fires, E uses doors and exits, Enter starts or restarts, and Esc pauses.

Run `scripts/check.sh` for formatting, build, clang-tidy, tests, and headless
screenshots.
