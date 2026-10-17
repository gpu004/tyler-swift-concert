import type { Assets, Picture, SpriteName, WallTexture } from "./assets";
import { FIELD_OF_VIEW, VIEW_HEIGHT, VIEW_WIDTH } from "./config";
import { doorAt, type Enemy, type Game, tileAt } from "./game";
import type { Tile } from "./levels";

const PROJECTION = VIEW_WIDTH / 2 / Math.tan(FIELD_OF_VIEW / 2);
const HORIZON = VIEW_HEIGHT / 2;
const FOG_DISTANCE = 14;
const MAX_STEPS = 64;

export interface Frame {
  readonly pixels: Uint32Array;
  readonly depth: Float64Array;
}

export const createFrame = (pixels: Uint32Array): Frame => ({
  pixels,
  depth: new Float64Array(VIEW_WIDTH),
});

const shade = (color: number, factor: number): number => {
  const red = Math.floor((color & 0xff) * factor);
  const green = Math.floor(((color >>> 8) & 0xff) * factor);
  const blue = Math.floor(((color >>> 16) & 0xff) * factor);

  return (0xff_00_00_00 | (blue << 16) | (green << 8) | red) >>> 0;
};

const tint = (color: number, amount: number): number => {
  const red = Math.min(255, Math.floor((color & 0xff) * (1 - amount) + 255 * amount));
  const green = Math.floor(((color >>> 8) & 0xff) * (1 - amount));
  const blue = Math.floor(((color >>> 16) & 0xff) * (1 - amount));

  return (0xff_00_00_00 | (blue << 16) | (green << 8) | red) >>> 0;
};

const fog = (distance: number): number => Math.max(0.22, 1 - distance / FOG_DISTANCE);

const sample = (picture: Picture, u: number, v: number): number => {
  const x = Math.min(picture.width - 1, Math.max(0, Math.floor(u * picture.width)));
  const y = Math.min(picture.height - 1, Math.max(0, Math.floor(v * picture.height)));

  return picture.pixels[y * picture.width + x] ?? 0;
};

const wallTextureFor = (game: Game, tile: Tile): WallTexture => {
  switch (tile) {
    case "exit":
      return game.level.exitName === "elevator" ? "elevator" : "street";
    case "floor":
      return "concrete";
    default:
      return tile;
  }
};

const drawFloorAndCeiling = (game: Game, assets: Assets, frame: Frame): void => {
  const { player } = game;
  const dirX = Math.cos(player.angle);
  const dirY = Math.sin(player.angle);
  const planeLength = Math.tan(FIELD_OF_VIEW / 2);
  const planeX = -dirY * planeLength;
  const planeY = dirX * planeLength;
  const leftX = dirX - planeX;
  const leftY = dirY - planeY;
  const rightX = dirX + planeX;
  const rightY = dirY + planeY;

  for (let y = Math.floor(HORIZON) + 1; y < VIEW_HEIGHT; y += 1) {
    const rowDistance = (0.5 * PROJECTION) / (y - HORIZON);
    const light = fog(rowDistance);
    const stepX = (rowDistance * (rightX - leftX)) / VIEW_WIDTH;
    const stepY = (rowDistance * (rightY - leftY)) / VIEW_WIDTH;
    let worldX = player.x + rowDistance * leftX;
    let worldY = player.y + rowDistance * leftY;
    const ceilingRow = VIEW_HEIGHT - 1 - y;

    for (let x = 0; x < VIEW_WIDTH; x += 1) {
      const u = worldX - Math.floor(worldX);
      const v = worldY - Math.floor(worldY);
      frame.pixels[y * VIEW_WIDTH + x] = shade(sample(assets.carpet, u, v), light);
      frame.pixels[ceilingRow * VIEW_WIDTH + x] = shade(sample(assets.ceiling, u, v), light * 0.9);
      worldX += stepX;
      worldY += stepY;
    }
  }
};

const drawWalls = (game: Game, assets: Assets, frame: Frame): void => {
  const { player } = game;
  const dirX = Math.cos(player.angle);
  const dirY = Math.sin(player.angle);
  const planeLength = Math.tan(FIELD_OF_VIEW / 2);
  const planeX = -dirY * planeLength;
  const planeY = dirX * planeLength;

  for (let column = 0; column < VIEW_WIDTH; column += 1) {
    const camera = (2 * column) / VIEW_WIDTH - 1;
    const rayX = dirX + planeX * camera;
    const rayY = dirY + planeY * camera;
    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);
    const deltaX = rayX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / rayX);
    const deltaY = rayY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / rayY);
    const stepX = rayX < 0 ? -1 : 1;
    const stepY = rayY < 0 ? -1 : 1;
    let sideX = rayX < 0 ? (player.x - mapX) * deltaX : (mapX + 1 - player.x) * deltaX;
    let sideY = rayY < 0 ? (player.y - mapY) * deltaY : (mapY + 1 - player.y) * deltaY;
    let distance = FOG_DISTANCE * 4;
    let tile: Tile = "concrete";
    let u = 0;
    let vertical = false;

    for (let steps = 0; steps < MAX_STEPS; steps += 1) {
      if (sideX < sideY) {
        distance = sideX;
        sideX += deltaX;
        mapX += stepX;
        vertical = false;
      } else {
        distance = sideY;
        sideY += deltaY;
        mapY += stepY;
        vertical = true;
      }

      tile = tileAt(game, mapX + 0.5, mapY + 0.5);

      if (tile === "floor") {
        continue;
      }

      const hit = vertical ? player.x + distance * rayX : player.y + distance * rayY;
      u = hit - Math.floor(hit);

      if (tile === "door") {
        const openness = doorAt(game, mapX + 0.5, mapY + 0.5)?.openness ?? 0;

        if (u < openness) {
          continue;
        }

        u -= openness;
      }

      break;
    }

    if (vertical ? rayY > 0 : rayX < 0) {
      u = 1 - u;
    }

    frame.depth[column] = distance;
    const texture = assets.walls.get(wallTextureFor(game, tile));

    if (texture === undefined) {
      continue;
    }

    const height = PROJECTION / distance;
    const top = HORIZON - height / 2;
    const light = fog(distance) * (vertical ? 0.8 : 1);
    const start = Math.max(0, Math.ceil(top));
    const end = Math.min(VIEW_HEIGHT, Math.ceil(top + height));

    for (let y = start; y < end; y += 1) {
      frame.pixels[y * VIEW_WIDTH + column] = shade(sample(texture, u, (y - top) / height), light);
    }
  }
};

interface Billboard {
  readonly x: number;
  readonly y: number;
  readonly sprite: SpriteName;
  readonly size: number;
  readonly lift: number;
  readonly hurt: number;
}

const enemySprite = (enemy: Enemy): SpriteName => {
  if (enemy.dead) {
    return `${enemy.kind}-dead`;
  }

  if (enemy.attackTimer > 0) {
    return `${enemy.kind}-attack`;
  }

  return Math.floor(enemy.walkPhase) % 2 === 0 ? `${enemy.kind}-walk0` : `${enemy.kind}-walk1`;
};

const collectBillboards = (game: Game): Billboard[] => {
  const billboards: Billboard[] = [];

  for (const enemy of game.enemies) {
    billboards.push({
      x: enemy.x,
      y: enemy.y,
      sprite: enemySprite(enemy),
      size: enemy.kind === "ceo" ? 1.2 : 1,
      lift: 0,
      hurt: enemy.hurtTimer > 0 ? 0.55 : 0,
    });
  }

  for (const pickup of game.pickups) {
    if (!pickup.taken) {
      billboards.push({
        x: pickup.x,
        y: pickup.y,
        sprite: pickup.kind,
        size: 0.4,
        lift: 0,
        hurt: 0,
      });
    }
  }

  for (const memo of game.memos) {
    billboards.push({ x: memo.x, y: memo.y, sprite: "memo", size: 0.3, lift: 0.35, hurt: 0 });
  }

  return billboards;
};

const drawBillboards = (game: Game, assets: Assets, frame: Frame): void => {
  const { player } = game;
  const dirX = Math.cos(player.angle);
  const dirY = Math.sin(player.angle);
  const planeLength = Math.tan(FIELD_OF_VIEW / 2);
  const planeX = -dirY * planeLength;
  const planeY = dirX * planeLength;
  const inverse = 1 / (planeX * dirY - dirX * planeY);

  const visible = collectBillboards(game).flatMap((billboard) => {
    const relativeX = billboard.x - player.x;
    const relativeY = billboard.y - player.y;
    const depth = inverse * (-planeY * relativeX + planeX * relativeY);
    const across = inverse * (dirY * relativeX - dirX * relativeY);

    return depth > 0.1 ? [{ billboard, depth, across }] : [];
  });

  visible.sort((left, right) => right.depth - left.depth);

  for (const { billboard, depth, across } of visible) {
    const picture = assets.sprites.get(billboard.sprite);

    if (picture === undefined) {
      continue;
    }

    const screenX = (VIEW_WIDTH / 2) * (1 + across / depth);
    const scale = PROJECTION / depth;
    const size = scale * billboard.size;
    const floor = HORIZON + scale * 0.5 - scale * billboard.lift;
    const top = floor - size;
    const left = screenX - size / 2;
    const light = fog(depth);
    const startX = Math.max(0, Math.ceil(left));
    const endX = Math.min(VIEW_WIDTH, Math.ceil(left + size));
    const startY = Math.max(0, Math.ceil(top));
    const endY = Math.min(VIEW_HEIGHT, Math.ceil(floor));

    for (let x = startX; x < endX; x += 1) {
      if (depth >= (frame.depth[x] ?? 0)) {
        continue;
      }

      const u = (x - left) / size;

      for (let y = startY; y < endY; y += 1) {
        const color = sample(picture, u, (y - top) / size);

        if (color >>> 24 < 128) {
          continue;
        }

        const lit = shade(color, light);
        frame.pixels[y * VIEW_WIDTH + x] = billboard.hurt > 0 ? tint(lit, billboard.hurt) : lit;
      }
    }
  }
};

export const renderView = (game: Game, assets: Assets, frame: Frame): void => {
  drawFloorAndCeiling(game, assets, frame);
  drawWalls(game, assets, frame);
  drawBillboards(game, assets, frame);
};
