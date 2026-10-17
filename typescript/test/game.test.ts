import { describe, expect, it } from "vitest";
import { CLOCK_START_MINUTES, CONCERT_START_MINUTES, LEVEL_SIZE } from "../src/config";
import {
  castRay,
  createGame,
  emptyInput,
  formatClock,
  type Game,
  type Input,
  isSolid,
  ratingFor,
  update,
} from "../src/game";
import { LEVEL_SOURCES, LEVELS, parseLevel } from "../src/levels";

const playing = (level = 0): Game => {
  const game = createGame(level);
  update(game, { ...emptyInput(), start: true }, 0);

  return game;
};

const step = (game: Game, input: Input, seconds: number): void => {
  const frames = Math.round(seconds * 60);

  for (let frame = 0; frame < frames; frame += 1) {
    update(game, input, 1 / 60);
  }
};

const removeEnemies = (game: Game): void => {
  game.enemies = [];
};

const nextToExit = (game: Game): void => {
  game.player.x = 22.2;
  game.player.y = 22.5;
  game.player.angle = 0;
};

const facingIntern = (game: Game, distance: number): void => {
  game.enemies = game.enemies.filter((enemy) => enemy.kind === "intern").slice(0, 1);
  const [intern] = game.enemies;
  game.player.x = (intern?.x ?? 0) - distance;
  game.player.y = intern?.y ?? 0;
  game.player.angle = 0;
};

describe("levels", () => {
  it("parses every level to a closed 24x24 grid with one start and one exit", () => {
    for (const source of LEVEL_SOURCES) {
      const level = parseLevel(source);
      const symbols = source.rows.join("");
      expect(level.tiles).toHaveLength(LEVEL_SIZE);
      expect(level.tiles.every((row) => row.length === LEVEL_SIZE)).toBe(true);
      expect([...symbols].filter((symbol) => symbol === "P")).toHaveLength(1);
      expect([...symbols].filter((symbol) => symbol === "E")).toHaveLength(1);
      expect(level.pickups.some((pickup) => pickup.kind === "keycard")).toBe(true);

      for (const [y, row] of level.tiles.entries()) {
        for (const [x, tile] of row.entries()) {
          if (x === 0 || y === 0 || x === LEVEL_SIZE - 1 || y === LEVEL_SIZE - 1) {
            expect(tile).not.toBe("floor");
            expect(tile).not.toBe("door");
          }
        }
      }
    }
  });

  it("rejects malformed rows", () => {
    expect(() => parseLevel({ name: "bad", exitName: "exit", rows: ["###"] })).toThrow();
  });

  it("puts the CEO only on the last level", () => {
    expect(LEVELS.map((level) => level.enemies.some((enemy) => enemy.kind === "ceo"))).toEqual([
      false,
      false,
      true,
    ]);
  });
});

describe("clock", () => {
  it("formats the start and concert times", () => {
    expect(formatClock(CLOCK_START_MINUTES)).toBe("6:30 PM");
    expect(formatClock(CONCERT_START_MINUTES)).toBe("8:00 PM");
    expect(formatClock(19 * 60 + 5.9)).toBe("7:05 PM");
  });

  it("loses at 8:00 PM after 360 real seconds", () => {
    const game = playing();
    removeEnemies(game);
    step(game, emptyInput(), 359);
    expect(game.screen).toBe("playing");
    step(game, emptyInput(), 2);
    expect(game.screen).toBe("lost");
    expect(game.lossReason).toBe("The show started without you.");
  });

  it("takes 10 minutes off for a friendship bracelet", () => {
    const game = playing();
    removeEnemies(game);
    const bracelet = game.pickups.find((pickup) => pickup.kind === "bracelet");
    expect(bracelet).toBeDefined();
    game.player.x = bracelet?.x ?? 0;
    game.player.y = bracelet?.y ?? 0;
    const before = game.minutes;
    update(game, emptyInput(), 0);
    expect(game.minutes).toBeCloseTo(before - 10);
  });

  it("adds 5 minutes and 10 damage for a quick sync", () => {
    const game = playing();
    game.enemies = game.enemies.filter((enemy) => enemy.kind === "manager").slice(0, 1);
    const [manager] = game.enemies;
    expect(manager).toBeDefined();
    game.player.x = (manager?.x ?? 0) + 0.6;
    game.player.y = manager?.y ?? 0;
    const before = game.minutes;
    update(game, emptyInput(), 0);
    expect(game.player.health).toBe(90);
    expect(game.minutes).toBeCloseTo(before + 5);
  });
});

describe("rating", () => {
  it("uses the spare-minute thresholds", () => {
    expect(ratingFor(20)).toBe("Front row");
    expect(ratingFor(19.9)).toBe("Floor seats");
    expect(ratingFor(5)).toBe("Floor seats");
    expect(ratingFor(4.9)).toBe("Nosebleeds");
  });
});

describe("movement and doors", () => {
  it("does not walk through walls", () => {
    const game = playing();
    removeEnemies(game);
    game.player.angle = Math.PI;
    step(game, { ...emptyInput(), forward: 1 }, 2);
    expect(game.player.x).toBeGreaterThan(1.24);
  });

  it("opens a door with E and passes once it has slid open", () => {
    const game = playing();
    removeEnemies(game);
    game.player.x = 11.5;
    game.player.y = 3.5;
    game.player.angle = 0;
    expect(isSolid(game, 13.5, 3.5)).toBe(true);
    step(game, { ...emptyInput(), forward: 1 }, 1);
    expect(game.player.x).toBeLessThan(13);
    update(game, { ...emptyInput(), use: true }, 1 / 60);
    step(game, emptyInput(), 0.25);
    expect(isSolid(game, 13.5, 3.5)).toBe(true);
    step(game, emptyInput(), 0.3);
    expect(isSolid(game, 13.5, 3.5)).toBe(false);
    step(game, { ...emptyInput(), forward: 1 }, 1);
    expect(game.player.x).toBeGreaterThan(14);
  });

  it("blocks movement through glass", () => {
    const game = playing();
    removeEnemies(game);
    game.player.x = 15.5;
    game.player.y = 10.5;
    game.player.angle = -Math.PI / 2;
    step(game, { ...emptyInput(), forward: 1 }, 2);
    expect(game.player.y).toBeGreaterThan(10.2);
  });
});

describe("exit", () => {
  it("does not end the level without the keycard", () => {
    const game = playing();
    removeEnemies(game);
    nextToExit(game);
    update(game, { ...emptyInput(), use: true }, 1 / 60);
    expect(game.levelIndex).toBe(0);
    expect(game.message).toBe("Need the keycard");
  });

  it("moves to the next level with the keycard and wins after the last one", () => {
    const game = playing();
    removeEnemies(game);
    nextToExit(game);
    game.player.hasKeycard = true;
    update(game, { ...emptyInput(), use: true }, 1 / 60);
    expect(game.levelIndex).toBe(1);
    expect(game.player.hasKeycard).toBe(false);

    const final = playing(2);
    removeEnemies(final);
    final.player.x = 11.5;
    final.player.y = 22.5;
    final.player.angle = Math.PI / 2;
    final.player.hasKeycard = true;
    update(final, { ...emptyInput(), use: true }, 1 / 60);
    expect(final.screen).toBe("won");
  });
});

describe("weapons", () => {
  it("staples an enemy for 15 damage and uses one staple", () => {
    const game = playing();
    facingIntern(game, 2);
    update(game, { ...emptyInput(), fire: true }, 0);
    expect(game.player.staples).toBe(49);
    expect(game.enemies[0]?.health).toBe(5);
  });

  it("falls back to the keyboard at zero staples", () => {
    const game = playing();
    facingIntern(game, 0.95);
    game.player.staples = 0;
    update(game, { ...emptyInput(), fire: true }, 0);
    expect(game.player.staples).toBe(0);
    expect(game.enemies[0]?.health).toBe(12);
  });

  it("keyboard does not reach far enemies", () => {
    const game = playing();
    facingIntern(game, 2);
    game.player.staples = 0;
    update(game, { ...emptyInput(), fire: true }, 0);
    expect(game.enemies[0]?.health).toBe(20);
  });
});

describe("raycasting", () => {
  it("measures the distance to a known wall", () => {
    const game = playing();
    expect(castRay(game, 1.5, 1.5, Math.PI, 16)).toBeCloseTo(0.5);
    expect(castRay(game, 1.5, 1.5, 0, 16)).toBeCloseTo(5.5);
    expect(castRay(game, 1.5, 1.5, Math.PI / 2, 16)).toBeCloseTo(4.5);
  });
});
