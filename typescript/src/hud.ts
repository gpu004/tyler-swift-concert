import {
  CLOCK_WARNING_MINUTES,
  PLAYER_MAX_HEALTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  STATUS_BAR_TOP,
} from "./config";
import { formatClock, type Game, minutesLeft, ratingFor } from "./game";
import { LEVELS } from "./levels";

type Context = CanvasRenderingContext2D;

const PINK = "#ff4fa3";
const GOLD = "#ffd54f";
const RED = "#e53935";
const PANEL = "#2a2430";
const BAR_HEIGHT = SCREEN_HEIGHT - STATUS_BAR_TOP;
const VIEW_CENTER_X = SCREEN_WIDTH / 2;
const VIEW_CENTER_Y = STATUS_BAR_TOP / 2;

const text = (
  context: Context,
  value: string,
  x: number,
  y: number,
  font: string,
  color: string,
): void => {
  context.font = font;
  context.fillStyle = "#000";
  context.fillText(value, x + 2, y + 2);
  context.fillStyle = color;
  context.fillText(value, x, y);
};

const centered = (
  context: Context,
  value: string,
  y: number,
  font: string,
  color: string,
): void => {
  context.textAlign = "center";
  text(context, value, SCREEN_WIDTH / 2, y, font, color);
  context.textAlign = "left";
};

const drawStapler = (context: Context, game: Game): void => {
  const { player } = game;
  const bobX = Math.sin(player.walkPhase) * 10;
  const bobY = Math.abs(Math.cos(player.walkPhase)) * 8;
  const recoil = player.attackTimer > 0 ? 18 : 0;
  const x = VIEW_CENTER_X + 40 + bobX;
  const y = STATUS_BAR_TOP - 110 + bobY + recoil;
  context.save();
  context.translate(x, y);
  context.rotate(-0.12);
  context.fillStyle = "#3a3a3a";
  context.fillRect(-90, 70, 190, 40);
  context.fillStyle = "#c62828";
  context.beginPath();
  context.moveTo(-95, 70);
  context.lineTo(95, 40 + recoil * 0.8);
  context.lineTo(105, 58 + recoil * 0.8);
  context.lineTo(-95, 88);
  context.fill();
  context.fillStyle = "#8e0000";
  context.fillRect(-95, 84, 200, 8);
  context.fillStyle = "#cfd8dc";
  context.fillRect(70, 58, 30, 6);
  context.fillStyle = "#f1c27d";
  context.beginPath();
  context.ellipse(-20, 60 + recoil * 0.5, 55, 26, -0.2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#e0ac69";
  context.fillRect(-70, 72, 60, 50);
  context.fillStyle = "#ff4fa3";
  context.fillRect(-72, 96, 64, 8);
  context.fillStyle = "#ffeb3b";
  context.fillRect(-60, 96, 8, 8);
  context.fillStyle = "#03a9f4";
  context.fillRect(-40, 96, 8, 8);
  context.restore();

  if (player.attackTimer > 0.08) {
    context.fillStyle = "rgba(255,255,255,0.9)";
    context.fillRect(VIEW_CENTER_X - 10, VIEW_CENTER_Y - 2, 20, 4);
    context.fillRect(VIEW_CENTER_X - 10, VIEW_CENTER_Y - 2, 4, 10);
    context.fillRect(VIEW_CENTER_X + 6, VIEW_CENTER_Y - 2, 4, 10);
  }
};

const drawKeyboard = (context: Context, game: Game): void => {
  const { player } = game;
  const swing = player.attackTimer > 0 ? -60 : 0;
  const bob = Math.abs(Math.cos(player.walkPhase)) * 8;
  context.save();
  context.translate(VIEW_CENTER_X + 120, STATUS_BAR_TOP - 40 + bob);
  context.rotate(-0.5 + (swing * Math.PI) / 360);
  context.fillStyle = "#263238";
  context.fillRect(-160, -40, 240, 70);

  for (let row = 0; row < 4; row += 1) {
    for (let key = 0; key < 14; key += 1) {
      context.fillStyle = (row + key) % 7 === 0 ? PINK : "#cfd8dc";
      context.fillRect(-152 + key * 16.5, -32 + row * 15, 13, 11);
    }
  }

  context.restore();
};

const drawFace = (context: Context, game: Game, x: number, y: number): void => {
  const health = game.player.health / PLAYER_MAX_HEALTH;
  const look = Math.round(Math.sin(performance.now() / 700) * 3);
  context.fillStyle = "#1a141e";
  context.fillRect(x, y, 84, BAR_HEIGHT - 12);
  context.fillStyle = health > 0.3 ? "#f1c27d" : "#e5a46a";
  context.fillRect(x + 16, y + 14, 52, 58);
  context.fillStyle = "#8d5524";
  context.fillRect(x + 12, y + 6, 60, 14);
  context.fillRect(x + 12, y + 6, 8, 40);
  context.fillRect(x + 64, y + 6, 8, 40);
  context.fillStyle = "#fff";
  context.fillRect(x + 26 + look, y + 32, 10, 8);
  context.fillRect(x + 48 + look, y + 32, 10, 8);
  context.fillStyle = "#222";
  context.fillRect(x + 29 + look, y + 34, 5, 5);
  context.fillRect(x + 51 + look, y + 34, 5, 5);

  if (game.damageFlash > 0 || health <= 0.3) {
    context.fillStyle = "#7b1f1f";
    context.fillRect(x + 32, y + 56, 20, 8);
  } else if (health > 0.6) {
    context.fillStyle = "#7b1f1f";
    context.fillRect(x + 30, y + 56, 24, 4);
    context.fillRect(x + 28, y + 53, 4, 4);
    context.fillRect(x + 52, y + 53, 4, 4);
  } else {
    context.fillStyle = "#7b1f1f";
    context.fillRect(x + 30, y + 57, 24, 3);
  }

  if (health <= 0.6) {
    context.fillStyle = "#c62828";
    context.fillRect(x + 20, y + 44, 6, 3);
  }

  if (health <= 0.3) {
    context.fillStyle = "#4fc3f7";
    context.fillRect(x + 62, y + 24, 4, 8);
  }
};

const panel = (
  context: Context,
  label: string,
  value: string,
  x: number,
  width: number,
  color: string,
): void => {
  context.fillStyle = PANEL;
  context.fillRect(x, STATUS_BAR_TOP + 6, width, BAR_HEIGHT - 12);
  context.strokeStyle = "#4a3f52";
  context.lineWidth = 2;
  context.strokeRect(x, STATUS_BAR_TOP + 6, width, BAR_HEIGHT - 12);
  context.textAlign = "center";
  text(context, value, x + width / 2, STATUS_BAR_TOP + 52, "bold 34px monospace", color);
  text(context, label, x + width / 2, STATUS_BAR_TOP + 78, "bold 13px monospace", "#bdb3c7");
  context.textAlign = "left";
};

const drawStatusBar = (context: Context, game: Game): void => {
  const { player } = game;
  const left = minutesLeft(game);
  const gradient = context.createLinearGradient(0, STATUS_BAR_TOP, 0, SCREEN_HEIGHT);
  gradient.addColorStop(0, "#3d3346");
  gradient.addColorStop(1, "#1e1824");
  context.fillStyle = gradient;
  context.fillRect(0, STATUS_BAR_TOP, SCREEN_WIDTH, BAR_HEIGHT);
  context.fillStyle = PINK;
  context.fillRect(0, STATUS_BAR_TOP, SCREEN_WIDTH, 3);
  panel(context, "HEALTH", `${Math.ceil(player.health)}%`, 8, 150, player.health > 30 ? GOLD : RED);
  panel(context, player.staples > 0 ? "STAPLES" : "KEYBOARD", `${player.staples}`, 166, 150, GOLD);
  panel(
    context,
    "KEYCARD",
    player.hasKeycard ? "YES" : "--",
    324,
    120,
    player.hasKeycard ? PINK : "#6d6175",
  );
  drawFace(context, game, 452, STATUS_BAR_TOP + 6);
  panel(
    context,
    "CLOCK",
    formatClock(game.minutes),
    544,
    220,
    left < CLOCK_WARNING_MINUTES ? RED : "#7cf29c",
  );
  panel(
    context,
    `FLOOR ${game.levelIndex + 1}/${LEVELS.length}`,
    `${game.kills}`,
    772,
    180,
    "#9ad0ff",
  );
  text(context, "KO", 790, STATUS_BAR_TOP + 52, "bold 13px monospace", "#bdb3c7");
};

const drawOverlayFlashes = (context: Context, game: Game): void => {
  if (game.damageFlash > 0) {
    context.fillStyle = `rgba(229,57,53,${(game.damageFlash * 0.9).toFixed(3)})`;
    context.fillRect(0, 0, SCREEN_WIDTH, STATUS_BAR_TOP);
  }

  if (game.pickupFlash > 0) {
    context.fillStyle = `rgba(255,213,79,${(game.pickupFlash * 0.8).toFixed(3)})`;
    context.fillRect(0, 0, SCREEN_WIDTH, STATUS_BAR_TOP);
  }
};

const drawCrosshair = (context: Context): void => {
  context.fillStyle = "rgba(255,255,255,0.8)";
  context.fillRect(VIEW_CENTER_X - 12, VIEW_CENTER_Y - 1, 8, 2);
  context.fillRect(VIEW_CENTER_X + 4, VIEW_CENTER_Y - 1, 8, 2);
  context.fillRect(VIEW_CENTER_X - 1, VIEW_CENTER_Y - 12, 2, 8);
  context.fillRect(VIEW_CENTER_X - 1, VIEW_CENTER_Y + 4, 2, 8);
};

export const drawPlayHud = (context: Context, game: Game, locked: boolean): void => {
  drawOverlayFlashes(context, game);
  drawCrosshair(context);

  if (game.player.staples > 0) {
    drawStapler(context, game);
  } else {
    drawKeyboard(context, game);
  }

  if (game.messageTimer > 0) {
    centered(context, game.message, 44, "bold 24px monospace", GOLD);
  }

  if (!locked && game.screen === "playing") {
    centered(
      context,
      "Click to capture the mouse",
      STATUS_BAR_TOP - 16,
      "bold 16px monospace",
      "#ffffffaa",
    );
  }

  drawStatusBar(context, game);
};

const backdrop = (context: Context, hue: string): void => {
  const gradient = context.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
  gradient.addColorStop(0, hue);
  gradient.addColorStop(1, "#0b0710");
  context.fillStyle = gradient;
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  const time = performance.now() / 1000;

  for (let beam = 0; beam < 5; beam += 1) {
    const sway = Math.sin(time * 0.7 + beam * 1.3) * 120;
    context.fillStyle = beam % 2 === 0 ? "rgba(255,79,163,0.10)" : "rgba(124,242,255,0.08)";
    context.beginPath();
    context.moveTo(120 + beam * 180, SCREEN_HEIGHT);
    context.lineTo(60 + beam * 180 + sway, 0);
    context.lineTo(180 + beam * 180 + sway, 0);
    context.fill();
  }

  for (let star = 0; star < 60; star += 1) {
    const twinkle = (Math.sin(time * 3 + star) + 1) / 2;
    context.fillStyle = `rgba(255,255,255,${(0.2 + twinkle * 0.6).toFixed(2)})`;
    context.fillRect((star * 157) % SCREEN_WIDTH, (star * 71) % 320, 2, 2);
  }
};

const drawSkyline = (context: Context): void => {
  context.fillStyle = "#140f1c";

  for (let building = 0; building < 16; building += 1) {
    const height = 80 + ((building * 53) % 130);
    context.fillRect(building * 62, SCREEN_HEIGHT - height, 56, height);
  }

  context.fillStyle = "#ffd54f55";

  for (let window = 0; window < 90; window += 1) {
    const x = (window * 37) % SCREEN_WIDTH;
    const y = SCREEN_HEIGHT - 20 - ((window * 29) % 150);
    context.fillRect(x, y, 6, 8);
  }
};

const drawTitle = (context: Context): void => {
  backdrop(context, "#3a1047");
  drawSkyline(context);
  centered(context, "ESCAPE THE OFFICE", 150, "bold 72px monospace", PINK);
  centered(
    context,
    "Friday, 6:30 PM. Floor 42 of Synergy Corp.",
    210,
    "bold 22px monospace",
    "#fff",
  );
  centered(
    context,
    "The Taylor Swift concert starts at 8:00 PM. Get out.",
    242,
    "bold 22px monospace",
    GOLD,
  );
  centered(context, "WASD move   Mouse/Arrows turn   Shift run", 310, "18px monospace", "#d6cce0");
  centered(
    context,
    "Click/Space staple   E open doors & exits   Esc pause",
    338,
    "18px monospace",
    "#d6cce0",
  );
  centered(
    context,
    "Find the keycard on each floor to unlock the exit.",
    366,
    "18px monospace",
    "#d6cce0",
  );

  if (Math.floor(performance.now() / 500) % 2 === 0) {
    centered(context, "PRESS ENTER", 440, "bold 34px monospace", "#7cf29c");
  }
};

const drawWin = (context: Context, game: Game): void => {
  const spare = Math.max(0, minutesLeft(game));
  backdrop(context, "#4a0f3a");
  drawSkyline(context);
  centered(context, "YOU MADE IT!", 140, "bold 80px monospace", PINK);
  centered(context, `Arrived at ${formatClock(game.minutes)}`, 220, "bold 28px monospace", "#fff");
  centered(context, `${Math.floor(spare)} minutes to spare`, 262, "bold 28px monospace", "#fff");
  centered(context, `Coworkers defeated: ${game.kills}`, 304, "bold 24px monospace", "#d6cce0");
  centered(context, `Your seats: ${ratingFor(spare)}`, 372, "bold 40px monospace", GOLD);
  centered(context, "Press Enter to clock in again", 460, "bold 22px monospace", "#7cf29c");
};

const drawLose = (context: Context, game: Game): void => {
  backdrop(context, "#3b0d0d");
  centered(context, "GAME OVER", 160, "bold 80px monospace", RED);
  centered(context, game.lossReason, 240, "bold 30px monospace", "#fff");
  centered(
    context,
    `Clock: ${formatClock(game.minutes)}   Floor ${game.levelIndex + 1}`,
    290,
    "bold 22px monospace",
    "#d6cce0",
  );
  centered(context, "Press Enter to try again", 420, "bold 26px monospace", "#7cf29c");
};

const drawPaused = (context: Context): void => {
  context.fillStyle = "rgba(10,6,16,0.65)";
  context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  centered(context, "PAUSED", 220, "bold 64px monospace", GOLD);
  centered(
    context,
    "The clock is not running. Taylor is waiting.",
    270,
    "bold 20px monospace",
    "#fff",
  );
  centered(
    context,
    "Press Enter to resume, then click to capture the mouse",
    310,
    "bold 18px monospace",
    "#d6cce0",
  );
};

export const drawScreen = (context: Context, game: Game): void => {
  switch (game.screen) {
    case "title":
      drawTitle(context);
      break;
    case "won":
      drawWin(context, game);
      break;
    case "lost":
      drawLose(context, game);
      break;
    case "paused":
      drawPaused(context);
      break;
    case "playing":
      break;
  }
};
