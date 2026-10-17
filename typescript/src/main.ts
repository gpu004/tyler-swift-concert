import { createAssets } from "./assets";
import { createAudio } from "./audio";
import {
  CLOCK_START_MINUTES,
  MAX_FRAME_SECONDS,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  STATUS_BAR_TOP,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from "./config";
import { createGame, update } from "./game";
import { drawPlayHud, drawScreen } from "./hud";
import { createControls } from "./input";
import { LEVELS } from "./levels";
import { createFrame, renderView } from "./render";

const startLevelFrom = (params: URLSearchParams): number => {
  const level = Number.parseInt(params.get("level") ?? "1", 10);

  return Number.isInteger(level) ? Math.min(LEVELS.length, Math.max(1, level)) - 1 : 0;
};

const startMinutesFrom = (params: URLSearchParams): number => {
  const match = /^(\d{1,2}):(\d{2})$/u.exec(params.get("clock") ?? "");

  if (match === null) {
    return CLOCK_START_MINUTES;
  }

  return Number.parseInt(match[1] ?? "18", 10) * 60 + Number.parseInt(match[2] ?? "30", 10);
};

const canvasById = (id: string): HTMLCanvasElement => {
  const element = document.getElementById(id);

  if (!(element instanceof HTMLCanvasElement)) {
    throw new Error(`Missing canvas #${id}`);
  }

  return element;
};

const context2d = (
  canvas: HTMLCanvasElement | OffscreenCanvas,
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D => {
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("2D canvas is not available");
  }

  return context;
};

const start = (): void => {
  const canvas = canvasById("game");
  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;
  const screen = canvas.getContext("2d");

  if (screen === null) {
    throw new Error("2D canvas is not available");
  }

  const view = new OffscreenCanvas(VIEW_WIDTH, VIEW_HEIGHT);
  const viewContext = context2d(view);
  const image = new ImageData(VIEW_WIDTH, VIEW_HEIGHT);
  const frame = createFrame(new Uint32Array(image.data.buffer));
  const assets = createAssets();
  const audio = createAudio();
  const params = new URLSearchParams(window.location.search);
  const game = createGame(startLevelFrom(params), startMinutesFrom(params));
  const controls = createControls(canvas, audio.resume);
  let last = performance.now();

  const tick = (now: number): void => {
    const dt = Math.min(MAX_FRAME_SECONDS, (now - last) / 1000);
    last = now;
    update(game, controls.poll(), dt);

    for (const cue of game.sounds) {
      audio.play(cue);
    }

    game.sounds.length = 0;

    if (game.screen === "playing" || game.screen === "paused") {
      renderView(game, assets, frame);
      viewContext.putImageData(image, 0, 0);
      screen.imageSmoothingEnabled = false;
      screen.drawImage(view, 0, 0, SCREEN_WIDTH, STATUS_BAR_TOP);
      drawPlayHud(screen, game, controls.isLocked());
    }

    drawScreen(screen, game);
    window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
};

start();
