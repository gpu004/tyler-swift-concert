import {
  BODY_RADIUS,
  BRACELET_MINUTES,
  CLOCK_START_MINUTES,
  COFFEE_HEALTH,
  CONCERT_START_MINUTES,
  DOOR_OPEN_SECONDS,
  FLOOR_SEATS_MINUTES,
  FRONT_ROW_MINUTES,
  GAME_MINUTES_PER_SECOND,
  HIT_RADIUS,
  HR_PREFERRED_DISTANCE,
  KEYBOARD_COOLDOWN,
  KEYBOARD_DAMAGE,
  KEYBOARD_RANGE,
  LEVEL_SIZE,
  MELEE_RANGE,
  MEMO_RADIUS,
  MEMO_SPEED,
  MESSAGE_SECONDS,
  PICKUP_RANGE,
  PLAYER_MAX_HEALTH,
  PLAYER_MAX_STAPLES,
  PLAYER_RUN_SPEED,
  PLAYER_START_STAPLES,
  PLAYER_TURN_SPEED,
  PLAYER_WALK_SPEED,
  QUICK_SYNC_MINUTES,
  SIGHT_RANGE,
  STAPLER_COOLDOWN,
  STAPLER_DAMAGE,
  STAPLER_RANGE,
  STAPLES_AMMO,
  USE_RANGE,
} from "./config";
import { type EnemyKind, type Level, LEVELS, type PickupKind, type Tile } from "./levels";

export type Screen = "title" | "playing" | "paused" | "won" | "lost";

export type SoundCue =
  | "stapler"
  | "keyboard"
  | "hit"
  | "enemyDown"
  | "hurt"
  | "pickup"
  | "door"
  | "denied"
  | "memo"
  | "level"
  | "win"
  | "lose";

export type Rating = "Front row" | "Floor seats" | "Nosebleeds";

export interface Input {
  forward: number;
  strafe: number;
  turn: number;
  mouseTurn: number;
  run: boolean;
  fire: boolean;
  use: boolean;
  start: boolean;
  pause: boolean;
}

export interface Player {
  x: number;
  y: number;
  angle: number;
  health: number;
  staples: number;
  hasKeycard: boolean;
  cooldown: number;
  attackTimer: number;
  walkPhase: number;
}

export interface Enemy {
  readonly kind: EnemyKind;
  x: number;
  y: number;
  health: number;
  awake: boolean;
  dead: boolean;
  meleeCooldown: number;
  memoCooldown: number;
  hurtTimer: number;
  attackTimer: number;
  walkPhase: number;
}

export interface Pickup {
  readonly kind: PickupKind;
  readonly x: number;
  readonly y: number;
  taken: boolean;
}

export interface Memo {
  x: number;
  y: number;
  readonly dx: number;
  readonly dy: number;
  readonly damage: number;
  alive: boolean;
}

export interface Door {
  openness: number;
  opening: boolean;
}

export interface Game {
  screen: Screen;
  startLevel: number;
  startMinutes: number;
  levelIndex: number;
  level: Level;
  doors: Map<number, Door>;
  player: Player;
  enemies: Enemy[];
  pickups: Pickup[];
  memos: Memo[];
  minutes: number;
  kills: number;
  message: string;
  messageTimer: number;
  lossReason: string;
  damageFlash: number;
  pickupFlash: number;
  sounds: SoundCue[];
}

export interface EnemyStats {
  readonly health: number;
  readonly speed: number;
  readonly meleeDamage: number;
  readonly meleeCooldown: number;
  readonly meleeMinutes: number;
  readonly memoDamage: number;
  readonly memoCooldown: number;
  readonly keepsDistance: boolean;
  readonly hitRadius: number;
}

export const ENEMY_STATS: Readonly<Record<EnemyKind, EnemyStats>> = {
  intern: {
    health: 20,
    speed: 2.2,
    meleeDamage: 5,
    meleeCooldown: 1,
    meleeMinutes: 0,
    memoDamage: 0,
    memoCooldown: 0,
    keepsDistance: false,
    hitRadius: HIT_RADIUS,
  },
  manager: {
    health: 45,
    speed: 1.6,
    meleeDamage: 10,
    meleeCooldown: 1.5,
    meleeMinutes: QUICK_SYNC_MINUTES,
    memoDamage: 0,
    memoCooldown: 0,
    keepsDistance: false,
    hitRadius: HIT_RADIUS,
  },
  hr: {
    health: 30,
    speed: 1.4,
    meleeDamage: 0,
    meleeCooldown: 0,
    meleeMinutes: 0,
    memoDamage: 8,
    memoCooldown: 2,
    keepsDistance: true,
    hitRadius: HIT_RADIUS,
  },
  ceo: {
    health: 250,
    speed: 1.8,
    meleeDamage: 20,
    meleeCooldown: 1,
    meleeMinutes: 0,
    memoDamage: 12,
    memoCooldown: 1,
    keepsDistance: false,
    hitRadius: 0.45,
  },
};

export const ENEMY_NAMES: Readonly<Record<EnemyKind, string>> = {
  intern: "Intern",
  manager: "Middle manager",
  hr: "HR rep",
  ceo: "CEO",
};

export const emptyInput = (): Input => ({
  forward: 0,
  strafe: 0,
  turn: 0,
  mouseTurn: 0,
  run: false,
  fire: false,
  use: false,
  start: false,
  pause: false,
});

const doorKey = (x: number, y: number): number => y * LEVEL_SIZE + x;

const levelAt = (index: number): Level => {
  const level = LEVELS[index];

  if (level === undefined) {
    throw new Error(`No level ${index}`);
  }

  return level;
};

const freshPlayer = (level: Level): Player => ({
  x: level.playerX,
  y: level.playerY,
  angle: 0,
  health: PLAYER_MAX_HEALTH,
  staples: PLAYER_START_STAPLES,
  hasKeycard: false,
  cooldown: 0,
  attackTimer: 0,
  walkPhase: 0,
});

const showMessage = (game: Game, message: string): void => {
  game.message = message;
  game.messageTimer = MESSAGE_SECONDS;
};

export const loadLevel = (game: Game, index: number): void => {
  const level = levelAt(index);
  game.levelIndex = index;
  game.level = level;
  game.doors = new Map();

  for (const [y, row] of level.tiles.entries()) {
    for (const [x, tile] of row.entries()) {
      if (tile === "door") {
        game.doors.set(doorKey(x, y), { openness: 0, opening: false });
      }
    }
  }

  game.player.x = level.playerX;
  game.player.y = level.playerY;
  game.player.angle = 0;
  game.player.hasKeycard = false;
  game.player.cooldown = 0;
  game.player.attackTimer = 0;

  game.enemies = level.enemies.map((spawn) => ({
    kind: spawn.kind,
    x: spawn.x,
    y: spawn.y,
    health: ENEMY_STATS[spawn.kind].health,
    awake: false,
    dead: false,
    meleeCooldown: 0,
    memoCooldown: ENEMY_STATS[spawn.kind].memoCooldown * 0.5,
    hurtTimer: 0,
    attackTimer: 0,
    walkPhase: 0,
  }));

  game.pickups = level.pickups.map((spawn) => ({
    kind: spawn.kind,
    x: spawn.x,
    y: spawn.y,
    taken: false,
  }));
  game.memos = [];
  showMessage(game, level.name);
};

export const createGame = (startLevel = 0, startMinutes: number = CLOCK_START_MINUTES): Game => {
  const level = levelAt(startLevel);

  const game: Game = {
    screen: "title",
    startLevel,
    startMinutes,
    levelIndex: startLevel,
    level,
    doors: new Map(),
    player: freshPlayer(level),
    enemies: [],
    pickups: [],
    memos: [],
    minutes: startMinutes,
    kills: 0,
    message: "",
    messageTimer: 0,
    lossReason: "",
    damageFlash: 0,
    pickupFlash: 0,
    sounds: [],
  };

  loadLevel(game, startLevel);

  return game;
};

const startRun = (game: Game): void => {
  game.player = freshPlayer(levelAt(game.startLevel));
  game.minutes = game.startMinutes;
  game.kills = 0;
  game.lossReason = "";
  game.damageFlash = 0;
  game.pickupFlash = 0;
  loadLevel(game, game.startLevel);
  game.screen = "playing";
};

export const tileAt = (game: Game, x: number, y: number): Tile => {
  const row = game.level.tiles[Math.floor(y)];

  return row?.[Math.floor(x)] ?? "concrete";
};

export const doorAt = (game: Game, x: number, y: number): Door | undefined =>
  game.doors.get(doorKey(Math.floor(x), Math.floor(y)));

export const isSolid = (game: Game, x: number, y: number): boolean => {
  const tile = tileAt(game, x, y);

  if (tile === "floor") {
    return false;
  }

  if (tile === "door") {
    return (doorAt(game, x, y)?.openness ?? 0) < 1;
  }

  return true;
};

export const canOccupy = (game: Game, x: number, y: number, radius: number): boolean =>
  !isSolid(game, x - radius, y - radius) &&
  !isSolid(game, x + radius, y - radius) &&
  !isSolid(game, x - radius, y + radius) &&
  !isSolid(game, x + radius, y + radius);

interface Body {
  x: number;
  y: number;
}

export const moveBody = (game: Game, body: Body, dx: number, dy: number): void => {
  if (canOccupy(game, body.x + dx, body.y, BODY_RADIUS)) {
    body.x += dx;
  }

  if (canOccupy(game, body.x, body.y + dy, BODY_RADIUS)) {
    body.y += dy;
  }
};

export const castRay = (
  game: Game,
  originX: number,
  originY: number,
  angle: number,
  maxDistance: number,
): number => {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  let mapX = Math.floor(originX);
  let mapY = Math.floor(originY);
  const deltaX = dirX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dirX);
  const deltaY = dirY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dirY);
  const stepX = dirX < 0 ? -1 : 1;
  const stepY = dirY < 0 ? -1 : 1;
  let sideX = dirX < 0 ? (originX - mapX) * deltaX : (mapX + 1 - originX) * deltaX;
  let sideY = dirY < 0 ? (originY - mapY) * deltaY : (mapY + 1 - originY) * deltaY;
  let distance = 0;

  while (distance < maxDistance) {
    if (sideX < sideY) {
      distance = sideX;
      sideX += deltaX;
      mapX += stepX;
    } else {
      distance = sideY;
      sideY += deltaY;
      mapY += stepY;
    }

    if (isSolid(game, mapX + 0.5, mapY + 0.5)) {
      return Math.min(distance, maxDistance);
    }
  }

  return maxDistance;
};

export const hasLineOfSight = (
  game: Game,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): boolean => {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  const steps = Math.ceil(distance / 0.1);

  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;

    if (isSolid(game, fromX + (toX - fromX) * t, fromY + (toY - fromY) * t)) {
      return false;
    }
  }

  return true;
};

export const formatClock = (minutes: number): string => {
  const whole = Math.floor(minutes);
  const hour = Math.floor(whole / 60) % 12;
  const minute = whole % 60;

  return `${hour === 0 ? 12 : hour}:${minute.toString().padStart(2, "0")} PM`;
};

export const minutesLeft = (game: Game): number => CONCERT_START_MINUTES - game.minutes;

export const ratingFor = (spareMinutes: number): Rating => {
  if (spareMinutes >= FRONT_ROW_MINUTES) {
    return "Front row";
  }

  if (spareMinutes >= FLOOR_SEATS_MINUTES) {
    return "Floor seats";
  }

  return "Nosebleeds";
};

const lose = (game: Game, reason: string): void => {
  game.screen = "lost";
  game.lossReason = reason;
  game.sounds.push("lose");
};

export const hurtPlayer = (game: Game, damage: number): void => {
  game.player.health = Math.max(0, game.player.health - damage);
  game.damageFlash = 0.35;
  game.sounds.push("hurt");
};

export const damageEnemy = (game: Game, enemy: Enemy, damage: number): void => {
  if (enemy.dead) {
    return;
  }

  enemy.health -= damage;
  enemy.hurtTimer = 0.2;
  enemy.awake = true;

  if (enemy.health <= 0) {
    enemy.health = 0;
    enemy.dead = true;
    game.kills += 1;
    game.sounds.push("enemyDown");
    showMessage(game, `${ENEMY_NAMES[enemy.kind]} is out of office.`);

    return;
  }

  game.sounds.push("hit");
};

const fireStapler = (game: Game): void => {
  const { player } = game;
  const dirX = Math.cos(player.angle);
  const dirY = Math.sin(player.angle);
  const wallDistance = castRay(game, player.x, player.y, player.angle, STAPLER_RANGE);
  let target: Enemy | null = null;
  let targetDistance = wallDistance;

  for (const enemy of game.enemies) {
    if (enemy.dead) {
      continue;
    }

    const offsetX = enemy.x - player.x;
    const offsetY = enemy.y - player.y;
    const along = offsetX * dirX + offsetY * dirY;
    const across = Math.abs(offsetY * dirX - offsetX * dirY);

    if (along > 0 && along < targetDistance && across < ENEMY_STATS[enemy.kind].hitRadius) {
      target = enemy;
      targetDistance = along;
    }
  }

  player.staples -= 1;
  player.cooldown = STAPLER_COOLDOWN;
  player.attackTimer = 0.15;
  game.sounds.push("stapler");

  if (target !== null) {
    damageEnemy(game, target, STAPLER_DAMAGE);
  }
};

const swingKeyboard = (game: Game): void => {
  const { player } = game;
  let target: Enemy | null = null;
  let targetDistance = KEYBOARD_RANGE;

  for (const enemy of game.enemies) {
    if (enemy.dead) {
      continue;
    }

    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    const bearing = Math.atan2(enemy.y - player.y, enemy.x - player.x) - player.angle;
    const facing = Math.abs(Math.atan2(Math.sin(bearing), Math.cos(bearing)));

    if (distance <= targetDistance && facing < 0.7) {
      target = enemy;
      targetDistance = distance;
    }
  }

  player.cooldown = KEYBOARD_COOLDOWN;
  player.attackTimer = 0.25;
  game.sounds.push("keyboard");

  if (target !== null) {
    damageEnemy(game, target, KEYBOARD_DAMAGE);
  }
};

const completeLevel = (game: Game): void => {
  if (game.levelIndex + 1 < LEVELS.length) {
    loadLevel(game, game.levelIndex + 1);
    game.sounds.push("level");

    return;
  }

  game.screen = "won";
  game.sounds.push("win");
};

const useAhead = (game: Game): void => {
  const { player } = game;
  const dirX = Math.cos(player.angle);
  const dirY = Math.sin(player.angle);

  for (let distance = 0.1; distance <= USE_RANGE; distance += 0.05) {
    const x = player.x + dirX * distance;
    const y = player.y + dirY * distance;
    const tile = tileAt(game, x, y);

    if (tile === "door") {
      const door = doorAt(game, x, y);

      if (door !== undefined && !door.opening) {
        door.opening = true;
        game.sounds.push("door");

        return;
      }

      if (door !== undefined && door.openness < 1) {
        return;
      }

      continue;
    }

    if (tile === "exit") {
      if (player.hasKeycard) {
        completeLevel(game);

        return;
      }

      showMessage(game, "Need the keycard");
      game.sounds.push("denied");

      return;
    }

    if (tile !== "floor") {
      return;
    }
  }
};

const collectPickups = (game: Game): void => {
  const { player } = game;

  for (const pickup of game.pickups) {
    if (pickup.taken || Math.hypot(pickup.x - player.x, pickup.y - player.y) > PICKUP_RANGE) {
      continue;
    }

    switch (pickup.kind) {
      case "coffee":
        if (player.health >= PLAYER_MAX_HEALTH) {
          continue;
        }

        player.health = Math.min(PLAYER_MAX_HEALTH, player.health + COFFEE_HEALTH);
        showMessage(game, "Oat milk latte. +25 health");
        break;
      case "staples":
        if (player.staples >= PLAYER_MAX_STAPLES) {
          continue;
        }

        player.staples = Math.min(PLAYER_MAX_STAPLES, player.staples + STAPLES_AMMO);
        showMessage(game, "Box of staples. +20");
        break;
      case "keycard":
        player.hasKeycard = true;
        showMessage(game, `Keycard! The ${game.level.exitName} is unlocked.`);
        break;
      case "bracelet":
        game.minutes -= BRACELET_MINUTES;
        showMessage(game, "Friendship bracelet! -10 minutes");
        break;
    }

    pickup.taken = true;
    game.pickupFlash = 0.25;
    game.sounds.push("pickup");
  }
};

export const buildFlowField = (game: Game): Int16Array => {
  const field = new Int16Array(LEVEL_SIZE * LEVEL_SIZE).fill(-1);
  const startX = Math.floor(game.player.x);
  const startY = Math.floor(game.player.y);
  const queue = [doorKey(startX, startY)];
  field[doorKey(startX, startY)] = 0;

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head] ?? 0;
    const x = current % LEVEL_SIZE;
    const y = Math.floor(current / LEVEL_SIZE);
    const distance = field[current] ?? 0;

    for (const [nextX, nextY] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const) {
      if (nextX < 0 || nextY < 0 || nextX >= LEVEL_SIZE || nextY >= LEVEL_SIZE) {
        continue;
      }

      const next = doorKey(nextX, nextY);

      if (field[next] !== -1 || isSolid(game, nextX + 0.5, nextY + 0.5)) {
        continue;
      }

      field[next] = distance + 1;
      queue.push(next);
    }
  }

  return field;
};

const flowDirection = (field: Int16Array, enemy: Enemy): readonly [number, number] => {
  const x = Math.floor(enemy.x);
  const y = Math.floor(enemy.y);
  const here = field[doorKey(x, y)] ?? -1;
  let bestX = x;
  let bestY = y;
  let best = here < 0 ? Number.POSITIVE_INFINITY : here;

  for (const [nextX, nextY] of [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ] as const) {
    if (nextX < 0 || nextY < 0 || nextX >= LEVEL_SIZE || nextY >= LEVEL_SIZE) {
      continue;
    }

    const value = field[doorKey(nextX, nextY)] ?? -1;

    if (value >= 0 && value < best) {
      best = value;
      bestX = nextX;
      bestY = nextY;
    }
  }

  const dx = bestX + 0.5 - enemy.x;
  const dy = bestY + 0.5 - enemy.y;
  const length = Math.hypot(dx, dy);

  return length < 0.001 ? [0, 0] : [dx / length, dy / length];
};

const updateEnemies = (game: Game, dt: number): void => {
  const { player } = game;
  const field = buildFlowField(game);

  for (const enemy of game.enemies) {
    if (enemy.dead) {
      continue;
    }

    const stats = ENEMY_STATS[enemy.kind];
    enemy.meleeCooldown = Math.max(0, enemy.meleeCooldown - dt);
    enemy.memoCooldown = Math.max(0, enemy.memoCooldown - dt);
    enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
    const offsetX = player.x - enemy.x;
    const offsetY = player.y - enemy.y;
    const distance = Math.hypot(offsetX, offsetY);

    const sees =
      distance < SIGHT_RANGE && hasLineOfSight(game, enemy.x, enemy.y, player.x, player.y);

    if (!enemy.awake) {
      enemy.awake = sees;
    }

    if (!enemy.awake) {
      continue;
    }

    let moveX = 0;
    let moveY = 0;

    if (sees && stats.keepsDistance && distance < HR_PREFERRED_DISTANCE - 0.5) {
      moveX = -offsetX / distance;
      moveY = -offsetY / distance;
    } else if (sees && stats.keepsDistance && distance < HR_PREFERRED_DISTANCE + 0.5) {
      moveX = 0;
      moveY = 0;
    } else if (sees && distance > MELEE_RANGE * 0.8) {
      moveX = offsetX / distance;
      moveY = offsetY / distance;
    } else if (!sees) {
      [moveX, moveY] = flowDirection(field, enemy);
    }

    if (moveX !== 0 || moveY !== 0) {
      moveBody(game, enemy, moveX * stats.speed * dt, moveY * stats.speed * dt);
      enemy.walkPhase += dt * stats.speed * 2;
    }

    if (stats.meleeDamage > 0 && distance <= MELEE_RANGE && enemy.meleeCooldown <= 0) {
      enemy.meleeCooldown = stats.meleeCooldown;
      enemy.attackTimer = 0.3;
      hurtPlayer(game, stats.meleeDamage);

      if (stats.meleeMinutes > 0) {
        game.minutes += stats.meleeMinutes;
        showMessage(game, `"Got a minute for a quick sync?" +${stats.meleeMinutes} min`);
      }
    }

    if (stats.memoDamage > 0 && sees && enemy.memoCooldown <= 0 && distance > MELEE_RANGE) {
      enemy.memoCooldown = stats.memoCooldown;
      enemy.attackTimer = 0.3;
      game.memos.push({
        x: enemy.x,
        y: enemy.y,
        dx: (offsetX / distance) * MEMO_SPEED,
        dy: (offsetY / distance) * MEMO_SPEED,
        damage: stats.memoDamage,
        alive: true,
      });
      game.sounds.push("memo");
    }
  }
};

const updateMemos = (game: Game, dt: number): void => {
  for (const memo of game.memos) {
    memo.x += memo.dx * dt;
    memo.y += memo.dy * dt;

    if (isSolid(game, memo.x, memo.y)) {
      memo.alive = false;
      continue;
    }

    if (Math.hypot(memo.x - game.player.x, memo.y - game.player.y) < MEMO_RADIUS + BODY_RADIUS) {
      memo.alive = false;
      hurtPlayer(game, memo.damage);
    }
  }

  game.memos = game.memos.filter((memo) => memo.alive);
};

const updateDoors = (game: Game, dt: number): void => {
  for (const door of game.doors.values()) {
    if (door.opening && door.openness < 1) {
      door.openness = Math.min(1, door.openness + dt / DOOR_OPEN_SECONDS);
    }
  }
};

const updatePlayer = (game: Game, input: Input, dt: number): void => {
  const { player } = game;
  player.angle += input.turn * PLAYER_TURN_SPEED * dt + input.mouseTurn;
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.attackTimer = Math.max(0, player.attackTimer - dt);
  const dirX = Math.cos(player.angle);
  const dirY = Math.sin(player.angle);
  let moveX = dirX * input.forward - dirY * input.strafe;
  let moveY = dirY * input.forward + dirX * input.strafe;
  const length = Math.hypot(moveX, moveY);

  if (length > 1) {
    moveX /= length;
    moveY /= length;
  }

  const speed = input.run ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;

  if (length > 0) {
    moveBody(game, player, moveX * speed * dt, moveY * speed * dt);
    player.walkPhase += dt * speed * 2.2;
  }

  if (input.use) {
    useAhead(game);
  }

  if (input.fire && player.cooldown <= 0) {
    if (player.staples > 0) {
      fireStapler(game);
    } else {
      swingKeyboard(game);
    }
  }
};

export const update = (game: Game, input: Input, dt: number): void => {
  game.damageFlash = Math.max(0, game.damageFlash - dt);
  game.pickupFlash = Math.max(0, game.pickupFlash - dt);

  if (game.screen === "title" || game.screen === "won" || game.screen === "lost") {
    if (input.start) {
      startRun(game);
    }

    return;
  }

  if (game.screen === "paused") {
    if (input.start) {
      game.screen = "playing";
    }

    return;
  }

  if (input.pause) {
    game.screen = "paused";

    return;
  }

  game.messageTimer = Math.max(0, game.messageTimer - dt);
  game.minutes += dt * GAME_MINUTES_PER_SECOND;
  updateDoors(game, dt);
  updatePlayer(game, input, dt);

  if (game.screen !== "playing") {
    return;
  }

  collectPickups(game);
  updateEnemies(game, dt);
  updateMemos(game, dt);

  if (game.player.health <= 0) {
    lose(game, "You got pulled into a meeting.");

    return;
  }

  if (game.minutes >= CONCERT_START_MINUTES) {
    lose(game, "The show started without you.");
  }
};
