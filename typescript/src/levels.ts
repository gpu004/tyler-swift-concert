import { LEVEL_SIZE } from "./config";

export type Tile = "concrete" | "cubicle" | "glass" | "whiteboard" | "door" | "exit" | "floor";

export type EnemyKind = "intern" | "manager" | "hr" | "ceo";

export type PickupKind = "coffee" | "staples" | "keycard" | "bracelet";

export interface Spawn<Kind> {
  readonly kind: Kind;
  readonly x: number;
  readonly y: number;
}

export interface Level {
  readonly name: string;
  readonly exitName: string;
  readonly tiles: readonly (readonly Tile[])[];
  readonly playerX: number;
  readonly playerY: number;
  readonly enemies: readonly Spawn<EnemyKind>[];
  readonly pickups: readonly Spawn<PickupKind>[];
}

export interface LevelSource {
  readonly name: string;
  readonly exitName: string;
  readonly rows: readonly string[];
}

export const LEVEL_SOURCES: readonly LevelSource[] = [
  {
    name: "Floor 42: Open Plan",
    exitName: "elevator",
    rows: [
      "########################",
      "#P.....C.....#.....c...#",
      "#......C..i..#.........#",
      "#..CCC.C.....D....m....#",
      "#......CCCC..#.........#",
      "#..s.........####D######",
      "#CCCC..CCCC..#.........#",
      "#......C.....#..i...s..#",
      "#..i...C..c..#.........#",
      "#......C.....GGGGG..GGG#",
      "###D####.....#.........#",
      "#......#..m..#....h....#",
      "#..c...#.....#.........#",
      "#......D.....D.........#",
      "#..f...#.....#....k....#",
      "########.....#.........#",
      "#WWWW........####D######",
      "#............#.........#",
      "#..i....CC...#..m......#",
      "#.......CC...#.........#",
      "#..s....CC...D.....c...#",
      "#............#.........#",
      "#.....h......#.........E",
      "########################",
    ],
  },
  {
    name: "Floor 21: Meeting Rooms",
    exitName: "elevator",
    rows: [
      "########################",
      "#P..#......h.....#.....#",
      "#...D............D..s..#",
      "#...#..CC....CC..#.....#",
      "##D##..CC.m..CC..###D###",
      "#......CC....CC..#.....#",
      "#..c.............#..m..#",
      "#WWWWWWWW..WWWWWW#.....#",
      "#.....#......#...#.....#",
      "#..i..D..s...D.h.D..c..#",
      "#.....#......#...#.....#",
      "###D###GGGGGG#####GGG###",
      "#......................#",
      "#..m.......f.......i...#",
      "#......................#",
      "#GGG####D#####D####GGGG#",
      "#......#.....#.....#...#",
      "#..h...#..m..#..c..D...#",
      "#......#.....#.....#.k.#",
      "#..s...D.....#.....#...#",
      "#......#.....D..i..#...#",
      "####D###.....#.....##D##",
      "#..............h......E#",
      "########################",
    ],
  },
  {
    name: "Lobby: The Corner Office",
    exitName: "revolving door",
    rows: [
      "########################",
      "#P.......#.......#.....#",
      "#........D...i...D..c..#",
      "#..s.....#.......#.....#",
      "####D#####GGGDGGG###D###",
      "#......................#",
      "#..i..CC........CC..m..#",
      "#.....CC...f....CC.....#",
      "#......................#",
      "#WWWWWWWWWW..WWWWWWWWWW#",
      "#....#..............#..#",
      "#.h..D......h.......D.s#",
      "#....#..............#..#",
      "###D##GGGG#DD#GGGG####D#",
      "#......#........#......#",
      "#..c...#...b....#...m..#",
      "#......D........D......#",
      "#..m...#........#..h...#",
      "#......#...k....#......#",
      "####D#######D#######D###",
      "#.......s......c.......#",
      "#..i.......h.......i...#",
      "#......................#",
      "###########E############",
    ],
  },
];

const tileFor = (symbol: string): Tile => {
  switch (symbol) {
    case "#":
      return "concrete";
    case "C":
      return "cubicle";
    case "G":
      return "glass";
    case "W":
      return "whiteboard";
    case "D":
      return "door";
    case "E":
      return "exit";
    default:
      return "floor";
  }
};

const enemyFor = (symbol: string): EnemyKind | null => {
  switch (symbol) {
    case "i":
      return "intern";
    case "m":
      return "manager";
    case "h":
      return "hr";
    case "b":
      return "ceo";
    default:
      return null;
  }
};

const pickupFor = (symbol: string): PickupKind | null => {
  switch (symbol) {
    case "c":
      return "coffee";
    case "s":
      return "staples";
    case "k":
      return "keycard";
    case "f":
      return "bracelet";
    default:
      return null;
  }
};

const KNOWN_SYMBOLS = new Set([
  "#",
  "C",
  "G",
  "W",
  "D",
  "E",
  ".",
  "P",
  "i",
  "m",
  "h",
  "b",
  "c",
  "s",
  "k",
  "f",
]);

export const parseLevel = (source: LevelSource): Level => {
  if (source.rows.length !== LEVEL_SIZE) {
    throw new Error(`${source.name}: expected ${LEVEL_SIZE} rows, got ${source.rows.length}`);
  }

  const tiles: Tile[][] = [];
  const enemies: Spawn<EnemyKind>[] = [];
  const pickups: Spawn<PickupKind>[] = [];
  let playerX = -1;
  let playerY = -1;

  for (const [y, row] of source.rows.entries()) {
    if (row.length !== LEVEL_SIZE) {
      throw new Error(`${source.name}: row ${y} has ${row.length} columns`);
    }

    const tileRow: Tile[] = [];

    for (const [x, symbol] of [...row].entries()) {
      if (!KNOWN_SYMBOLS.has(symbol)) {
        throw new Error(`${source.name}: unknown symbol "${symbol}" at ${x},${y}`);
      }

      tileRow.push(tileFor(symbol));
      const enemy = enemyFor(symbol);
      const pickup = pickupFor(symbol);

      if (enemy !== null) {
        enemies.push({ kind: enemy, x: x + 0.5, y: y + 0.5 });
      }

      if (pickup !== null) {
        pickups.push({ kind: pickup, x: x + 0.5, y: y + 0.5 });
      }

      if (symbol === "P") {
        playerX = x + 0.5;
        playerY = y + 0.5;
      }
    }

    tiles.push(tileRow);
  }

  if (playerX < 0) {
    throw new Error(`${source.name}: missing player start`);
  }

  return {
    name: source.name,
    exitName: source.exitName,
    tiles,
    playerX,
    playerY,
    enemies,
    pickups,
  };
};

export const LEVELS: readonly Level[] = LEVEL_SOURCES.map(parseLevel);
