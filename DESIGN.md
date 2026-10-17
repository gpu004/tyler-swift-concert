# Game design: Escape the Office

Both versions (`typescript/` and `cpp/`) implement this spec. Gameplay, numbers and maps must match.

## Premise

It is 6:30 PM on a Friday. You are stuck on floor 42 of Synergy Corp, and the Taylor Swift concert starts at 8:00 PM. Fight your way through the open plan, the meeting rooms and the lobby, past interns, middle managers, HR and the CEO, and get out before the show starts.

## Clock

- The in-game clock starts at 6:30 PM. One real second is 15 in-game seconds, so the player has 360 real seconds (90 in-game minutes) for all three levels.
- The clock shows on the HUD as `h:mm PM`.
- At 8:00 PM the game is lost: "The show started without you."
- Getting hit by a middle manager's "quick sync" adds 5 in-game minutes.
- A friendship bracelet (`f`) takes 10 in-game minutes off the clock.

## Player

- 100 health (max 100), 50 staples (max 200), starts facing east.
- Moves at 3.0 tiles/s (5.0 with Shift), turns at 2.5 rad/s with the keyboard. Collision radius 0.25 tiles.
- Weapon: stapler. Hitscan, 1 staple per shot, 15 damage, 0.35 s cooldown, range 16 tiles. With 0 staples the player swings a keyboard: melee, range 1.0 tile, 8 damage, 0.5 s cooldown.
- Health 0: "You got pulled into a meeting. Game over."

## Controls

- W/S or Up/Down: move. A/D: strafe. Left/Right: turn. Mouse: turn (browser uses pointer lock).
- Space or left click: fire. E: use (open a door, use the exit). Shift: run.
- Enter: start or restart from the title, win and lose screens. Esc: pause (browser).

## Map tiles

Maps are 24x24, row 0 at the top, x is the column, y is the row. The player and entities spawn at the tile centre (x + 0.5, y + 0.5).

| Tile | Meaning |
| --- | --- |
| `#` | Concrete wall (grey) |
| `C` | Cubicle partition (blue-grey fabric) |
| `G` | Glass wall (light cyan, blocks movement and shots) |
| `W` | Whiteboard wall (white with marker scribbles) |
| `D` | Door (wood). Opens when the player presses E within 1.5 tiles, slides open over 0.5 s, stays open. Enemies can't open doors. |
| `E` | Exit: elevator on levels 1 and 2, revolving door to the street on level 3. Needs the level's keycard. Pressing E within 1.5 tiles with the keycard ends the level. Without it the HUD shows "Need the keycard". |
| `.` | Floor |
| `P` | Player start |
| `i` `m` `h` `b` | Enemies (below) |
| `c` `s` `k` `f` | Pickups (below) |

## Enemies

Enemies wake up when they can see the player (clear line of sight within 12 tiles), then chase. They move only on floor tiles and through open doors, with the same 0.25 radius collision.

| Tile | Enemy | Health | Speed (tiles/s) | Attack |
| --- | --- | --- | --- | --- |
| `i` | Intern | 20 | 2.2 | Melee, range 0.9, 5 damage, 1.0 s cooldown |
| `m` | Middle manager | 45 | 1.6 | Melee "quick sync", range 0.9, 10 damage plus 5 in-game minutes, 1.5 s cooldown |
| `h` | HR rep | 30 | 1.4 | Ranged: throws a memo projectile (speed 6 tiles/s, 8 damage) every 2.0 s when in sight, keeps about 4 tiles away |
| `b` | CEO (level 3 boss) | 250 | 1.8 | Throws a memo every 1.0 s (12 damage) and does melee for 20 damage, 1.0 s cooldown |

Dead enemies leave a flat corpse sprite and no longer block movement.

## Pickups

Pickups are taken when the player comes within 0.5 tiles.

| Tile | Pickup | Effect |
| --- | --- | --- |
| `c` | Coffee | +25 health (not taken at full health) |
| `s` | Staples | +20 staples |
| `k` | Keycard | Unlocks this level's exit |
| `f` | Friendship bracelet | -10 in-game minutes |

## Screens

- Title screen: game name "Escape the Office", the premise in one line, controls, "Press Enter".
- Level intro text in the HUD message line for 3 s: the level name.
- Win screen: "You made it!", arrival time, time to spare, enemies defeated, and a rating: at least 20 minutes to spare "Front row", at least 5 "Floor seats", otherwise "Nosebleeds".
- Lose screens: the clock and health messages above.

## HUD

DOOM-style status bar along the bottom: health, staples, keycard icon when held, the clock (red when less than 15 in-game minutes are left), level name, and a message line for pickups and hints. A crosshair in the centre, and the stapler or keyboard sprite at the bottom.

## Rendering

- Grid raycaster (DDA) with textured walls, flat floor and ceiling colours (carpet and ceiling tiles), distance shading, and billboard sprites sorted back to front with a per-column depth buffer.
- Textures and sprites are generated in code (no image assets), so both versions stay self-contained.
- Internal resolution 320x200, scaled up to the window.

## Levels

### Level 1: Floor 42: Open Plan

```text
########################
#P.....C.....#.....c...#
#......C..i..#.........#
#..CCC.C.....D....m....#
#......CCCC..#.........#
#..s.........####D######
#CCCC..CCCC..#.........#
#......C.....#..i...s..#
#..i...C..c..#.........#
#......C.....GGGGG..GGG#
###D####.....#.........#
#......#..m..#....h....#
#..c...#.....#.........#
#......D.....D.........#
#..f...#.....#....k....#
########.....#.........#
#WWWW........####D######
#............#.........#
#..i....CC...#..m......#
#.......CC...#.........#
#..s....CC...D.....c...#
#............#.........#
#.....h......#.........E
########################
```

### Level 2: Floor 21: Meeting Rooms

```text
########################
#P..#......h.....#.....#
#...D............D..s..#
#...#..CC....CC..#.....#
##D##..CC.m..CC..###D###
#......CC....CC..#.....#
#..c.............#..m..#
#WWWWWWWW..WWWWWW#.....#
#.....#......#...#.....#
#..i..D..s...D.h.D..c..#
#.....#......#...#.....#
###D###GGGGGG#####GGG###
#......................#
#..m.......f.......i...#
#......................#
#GGG####D#####D####GGGG#
#......#.....#.....#...#
#..h...#..m..#..c..D...#
#......#.....#.....#.k.#
#..s...D.....#.....#...#
#......#.....D..i..#...#
####D###.....#.....##D##
#..............h......E#
########################
```

### Level 3: Lobby: The Corner Office

```text
########################
#P.......#.......#.....#
#........D...i...D..c..#
#..s.....#.......#.....#
####D#####GGGDGGG###D###
#......................#
#..i..CC........CC..m..#
#.....CC...f....CC.....#
#......................#
#WWWWWWWWWW..WWWWWWWWWW#
#....#..............#..#
#.h..D......h.......D.s#
#....#..............#..#
###D##GGGG#DD#GGGG####D#
#......#........#......#
#..c...#...b....#...m..#
#......D........D......#
#..m...#........#..h...#
#......#...k....#......#
####D#######D#######D###
#.......s......c.......#
#..i.......h.......i...#
#......................#
###########E############
```
