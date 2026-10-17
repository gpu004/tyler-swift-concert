import type { EnemyKind, PickupKind, Tile } from "./levels";

export const TEXTURE_SIZE = 64;

export interface Picture {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint32Array;
}

export type WallTexture = Exclude<Tile, "floor" | "exit"> | "elevator" | "street";

export type EnemyPose = "walk0" | "walk1" | "attack" | "dead";

export type SpriteName = `${EnemyKind}-${EnemyPose}` | PickupKind | "memo";

export interface Assets {
  readonly walls: ReadonlyMap<WallTexture, Picture>;
  readonly carpet: Picture;
  readonly ceiling: Picture;
  readonly sprites: ReadonlyMap<SpriteName, Picture>;
}

type Painter = (context: OffscreenCanvasRenderingContext2D, random: () => number) => void;

const seeded = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const paint = (width: number, height: number, seed: number, painter: Painter): Picture => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("2D canvas is not available");
  }

  context.imageSmoothingEnabled = false;
  painter(context, seeded(seed));
  const data = context.getImageData(0, 0, width, height).data;

  return { width, height, pixels: new Uint32Array(data.buffer) };
};

const noise = (
  context: OffscreenCanvasRenderingContext2D,
  random: () => number,
  count: number,
  colors: readonly string[],
): void => {
  for (let index = 0; index < count; index += 1) {
    context.fillStyle = colors[Math.floor(random() * colors.length)] ?? "#000";
    context.fillRect(
      Math.floor(random() * TEXTURE_SIZE),
      Math.floor(random() * TEXTURE_SIZE),
      1,
      1,
    );
  }
};

const paintConcrete: Painter = (context, random) => {
  context.fillStyle = "#77736d";
  context.fillRect(0, 0, 64, 64);
  noise(context, random, 900, ["#6a665f", "#848079", "#8d8982", "#5f5b55"]);
  context.fillStyle = "#57534d";
  context.fillRect(0, 31, 64, 2);
  context.fillRect(31, 0, 2, 31);
  context.fillRect(15, 33, 2, 31);
  context.fillRect(47, 33, 2, 31);
  context.fillStyle = "#3d4a5c";
  context.fillRect(0, 58, 64, 6);
};

const paintCubicle: Painter = (context, random) => {
  context.fillStyle = "#4f6378";
  context.fillRect(0, 0, 64, 64);

  for (let y = 6; y < 64; y += 2) {
    context.fillStyle = y % 4 === 0 ? "#4a5d71" : "#556a80";
    context.fillRect(0, y, 64, 1);
  }

  noise(context, random, 500, ["#5c7389", "#44566a", "#61788f"]);
  context.fillStyle = "#c9ccd1";
  context.fillRect(0, 0, 64, 6);
  context.fillStyle = "#9da2a8";
  context.fillRect(0, 5, 64, 1);
  context.fillRect(0, 0, 2, 64);
  context.fillRect(62, 0, 2, 64);
  context.fillStyle = "#f7e36d";
  context.fillRect(40, 18, 10, 10);
  context.fillStyle = "#f29bc1";
  context.fillRect(14, 26, 9, 9);
  context.fillStyle = "#333";
  context.fillRect(42, 21, 6, 1);
  context.fillRect(42, 24, 4, 1);
  context.fillRect(16, 29, 5, 1);
};

const paintGlass: Painter = (context) => {
  const gradient = context.createLinearGradient(0, 0, 64, 64);
  gradient.addColorStop(0, "#9fd8e6");
  gradient.addColorStop(1, "#5aa4bb");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = "rgba(255,255,255,0.45)";

  for (const offset of [6, 14, 40]) {
    context.beginPath();
    context.moveTo(offset, 64);
    context.lineTo(offset + 18, 0);
    context.lineTo(offset + 22, 0);
    context.lineTo(offset + 4, 64);
    context.fill();
  }

  context.fillStyle = "#2f3b45";
  context.fillRect(0, 0, 64, 3);
  context.fillRect(0, 61, 64, 3);
  context.fillRect(0, 0, 3, 64);
  context.fillRect(61, 0, 3, 64);
  context.fillStyle = "#e4007c";
  context.fillRect(3, 36, 58, 3);
};

const paintWhiteboard: Painter = (context, random) => {
  context.fillStyle = "#8a8f96";
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = "#f4f6f8";
  context.fillRect(3, 6, 58, 44);
  noise(context, random, 60, ["#e3e6ea"]);
  context.fillStyle = "#b0b5bb";
  context.fillRect(3, 50, 58, 3);
  context.font = "bold 9px monospace";
  context.fillStyle = "#1f4fbf";
  context.fillText("Q3 OKRs", 6, 16);
  context.fillStyle = "#c62828";
  context.fillText("SYNERGY", 6, 27);
  context.strokeStyle = "#2e7d32";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(6, 46);
  context.lineTo(18, 40);
  context.lineTo(28, 43);
  context.lineTo(40, 32);
  context.stroke();
  context.fillStyle = "#d81b60";
  context.font = "bold 8px monospace";
  context.fillText("8PM!", 38, 46);
  context.fillStyle = "#c62828";
  context.fillRect(10, 52, 6, 2);
  context.fillStyle = "#1f4fbf";
  context.fillRect(18, 52, 6, 2);
};

const paintDoor: Painter = (context, random) => {
  context.fillStyle = "#7a4a26";
  context.fillRect(0, 0, 64, 64);

  for (let x = 0; x < 64; x += 1) {
    if (random() < 0.35) {
      context.fillStyle = random() < 0.5 ? "#6b3f1f" : "#8a5a33";
      context.fillRect(x, 0, 1, 64);
    }
  }

  context.fillStyle = "#4b2c14";
  context.fillRect(0, 0, 64, 3);
  context.fillRect(0, 0, 3, 64);
  context.fillRect(61, 0, 3, 64);
  context.fillStyle = "#a9d6e5";
  context.fillRect(24, 10, 16, 20);
  context.fillStyle = "#4b2c14";
  context.fillRect(31, 10, 2, 20);
  context.fillStyle = "#e0c25a";
  context.fillRect(50, 34, 6, 3);
  context.fillRect(50, 34, 2, 6);
};

const paintElevator: Painter = (context) => {
  context.fillStyle = "#5b5f66";
  context.fillRect(0, 0, 64, 64);
  const gradient = context.createLinearGradient(6, 0, 58, 0);
  gradient.addColorStop(0, "#9aa1aa");
  gradient.addColorStop(0.5, "#d7dce2");
  gradient.addColorStop(1, "#8f969f");
  context.fillStyle = gradient;
  context.fillRect(6, 14, 52, 50);
  context.fillStyle = "#3b3f45";
  context.fillRect(31, 14, 2, 50);
  context.fillStyle = "#111";
  context.fillRect(18, 2, 28, 10);
  context.fillStyle = "#ff8f00";
  context.font = "bold 9px monospace";
  context.fillText("EXIT", 21, 10);
  context.fillStyle = "#2ecc71";
  context.beginPath();
  context.moveTo(54, 26);
  context.lineTo(60, 34);
  context.lineTo(48, 34);
  context.fill();
};

const paintStreet: Painter = (context, random) => {
  context.fillStyle = "#1b2233";
  context.fillRect(0, 0, 64, 64);

  for (let index = 0; index < 18; index += 1) {
    context.fillStyle = ["#ffd54f", "#f48fb1", "#80deea"][index % 3] ?? "#fff";
    context.fillRect(Math.floor(random() * 56) + 4, Math.floor(random() * 30) + 14, 2, 2);
  }

  context.strokeStyle = "#c0c6cf";
  context.lineWidth = 3;
  context.strokeRect(4, 12, 56, 52);
  context.beginPath();
  context.moveTo(32, 12);
  context.lineTo(32, 64);
  context.stroke();
  context.fillStyle = "#e4007c";
  context.fillRect(4, 1, 56, 10);
  context.fillStyle = "#fff";
  context.font = "bold 8px monospace";
  context.fillText("STREET", 16, 9);
};

const paintCarpet: Painter = (context, random) => {
  context.fillStyle = "#2c3a4d";
  context.fillRect(0, 0, 64, 64);
  noise(context, random, 1400, ["#25313f", "#33445a", "#3a4d63", "#283547"]);
  context.fillStyle = "#26323f";
  context.fillRect(0, 0, 64, 1);
  context.fillRect(0, 0, 1, 64);
};

const paintCeiling: Painter = (context, random) => {
  context.fillStyle = "#cfcbc0";
  context.fillRect(0, 0, 64, 64);
  noise(context, random, 500, ["#c4c0b5", "#d8d4ca", "#bdb9ae"]);
  context.fillStyle = "#9c988e";
  context.fillRect(0, 0, 64, 2);
  context.fillRect(0, 0, 2, 64);
  context.fillRect(0, 31, 64, 2);
  context.fillRect(31, 0, 2, 64);
  context.fillStyle = "#fffbe8";
  context.fillRect(6, 6, 20, 20);
  context.fillStyle = "#f1ecd4";
  context.fillRect(6, 15, 20, 2);
};

interface Outfit {
  readonly skin: string;
  readonly hair: string;
  readonly top: string;
  readonly legs: string;
  readonly accent: string;
  readonly width: number;
}

const OUTFITS: Readonly<Record<EnemyKind, Outfit>> = {
  intern: {
    skin: "#f1c27d",
    hair: "#5a3825",
    top: "#43a047",
    legs: "#37474f",
    accent: "#ffeb3b",
    width: 1,
  },
  manager: {
    skin: "#e0ac69",
    hair: "#3e2723",
    top: "#eceff1",
    legs: "#263238",
    accent: "#d32f2f",
    width: 1.1,
  },
  hr: {
    skin: "#c68642",
    hair: "#1b1b1b",
    top: "#7b1fa2",
    legs: "#4a148c",
    accent: "#fff8e1",
    width: 1,
  },
  ceo: {
    skin: "#f5d0a9",
    hair: "#bdbdbd",
    top: "#212121",
    legs: "#111111",
    accent: "#ffc107",
    width: 1.25,
  },
};

const paintPerson = (kind: EnemyKind, pose: EnemyPose): Painter => {
  const outfit = OUTFITS[kind];

  return (context) => {
    const center = 32;
    const body = 12 * outfit.width;

    if (pose === "dead") {
      context.fillStyle = "rgba(0,0,0,0.35)";
      context.fillRect(6, 56, 52, 6);
      context.fillStyle = outfit.legs;
      context.fillRect(34, 50, 24, 8);
      context.fillStyle = outfit.top;
      context.fillRect(14, 48, 22, 10);
      context.fillStyle = outfit.accent;
      context.fillRect(18, 52, 14, 2);
      context.fillStyle = outfit.skin;
      context.fillRect(4, 48, 10, 9);
      context.fillStyle = "#222";
      context.fillRect(6, 51, 2, 1);
      context.fillRect(10, 51, 2, 1);
      context.fillStyle = "#fff";
      context.fillRect(40, 44, 12, 6);
      context.fillStyle = "#555";
      context.fillRect(42, 46, 8, 1);

      return;
    }

    const stride = pose === "walk1" ? 3 : -3;
    context.fillStyle = "rgba(0,0,0,0.3)";
    context.beginPath();
    context.ellipse(center, 62, body, 2, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = outfit.legs;
    context.fillRect(center - 7 + stride, 42, 6, 20);
    context.fillRect(center + 1 - stride, 42, 6, 20);
    context.fillStyle = "#111";
    context.fillRect(center - 8 + stride, 60, 8, 3);
    context.fillRect(center + 1 - stride, 60, 8, 3);
    context.fillStyle = outfit.top;
    context.fillRect(center - body, 20, body * 2, 24);

    if (kind === "manager" || kind === "ceo") {
      context.fillStyle = outfit.accent;
      context.fillRect(center - 2, 20, 4, 3);
      context.beginPath();
      context.moveTo(center - 2, 23);
      context.lineTo(center + 2, 23);
      context.lineTo(center + 3, 36);
      context.lineTo(center, 39);
      context.lineTo(center - 3, 36);
      context.fill();
    }

    if (kind === "ceo") {
      context.fillStyle = "#fafafa";
      context.fillRect(center - 5, 20, 3, 8);
      context.fillRect(center + 2, 20, 3, 8);
    }

    if (kind === "intern") {
      context.fillStyle = outfit.accent;
      context.fillRect(center - 5, 20, 2, 12);
      context.fillRect(center + 3, 20, 2, 12);
      context.fillRect(center - 3, 31, 6, 7);
      context.fillStyle = "#1565c0";
      context.fillRect(center - 2, 33, 4, 3);
    }

    const armY = pose === "attack" ? 14 : 22;
    context.fillStyle = outfit.top;
    context.fillRect(center - body - 5, armY, 5, 18);
    context.fillRect(center + body, armY, 5, 18);
    context.fillStyle = outfit.skin;
    context.fillRect(center - body - 5, armY + 16, 5, 4);
    context.fillRect(center + body, armY + 16, 5, 4);

    if (kind === "hr") {
      context.fillStyle = "#8d6e63";
      context.fillRect(center + body + 2, armY + 8, 10, 13);
      context.fillStyle = outfit.accent;
      context.fillRect(center + body + 3, armY + 10, 8, 10);
      context.fillStyle = "#9e9e9e";
      context.fillRect(center + body + 4, armY + 12, 6, 1);
      context.fillRect(center + body + 4, armY + 15, 6, 1);
    }

    if (kind === "manager") {
      context.fillStyle = "#fff";
      context.fillRect(center - body - 9, armY + 12, 6, 7);
      context.fillStyle = "#6d4c41";
      context.fillRect(center - body - 8, armY + 13, 4, 2);
    }

    context.fillStyle = outfit.skin;
    context.fillRect(center - 7, 4, 14, 16);
    context.fillStyle = outfit.hair;
    context.fillRect(center - 8, 2, 16, 5);

    if (kind === "hr") {
      context.fillRect(center - 9, 2, 3, 16);
      context.fillRect(center + 6, 2, 3, 16);
    }

    if (kind === "ceo") {
      context.fillStyle = "#212121";
      context.fillRect(center - 6, 9, 5, 3);
      context.fillRect(center + 1, 9, 5, 3);
      context.fillRect(center - 1, 10, 2, 1);
    } else {
      context.fillStyle = "#fff";
      context.fillRect(center - 5, 9, 4, 3);
      context.fillRect(center + 1, 9, 4, 3);
      context.fillStyle = "#222";
      context.fillRect(center - 3, 10, 2, 2);
      context.fillRect(center + 2, 10, 2, 2);
    }

    context.fillStyle = pose === "attack" ? "#7b1f1f" : "#8d5524";
    context.fillRect(center - 3, 15, 6, pose === "attack" ? 3 : 1);
  };
};

const PICKUP_PAINTERS: Readonly<Record<PickupKind, Painter>> = {
  coffee: (context) => {
    context.fillStyle = "rgba(0,0,0,0.3)";
    context.fillRect(18, 60, 28, 3);
    context.fillStyle = "#fafafa";
    context.beginPath();
    context.moveTo(20, 28);
    context.lineTo(44, 28);
    context.lineTo(41, 61);
    context.lineTo(23, 61);
    context.fill();
    context.fillStyle = "#6d4c41";
    context.fillRect(19, 24, 26, 5);
    context.fillStyle = "#2e7d32";
    context.beginPath();
    context.arc(32, 44, 6, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.7)";
    context.beginPath();
    context.moveTo(28, 20);
    context.quadraticCurveTo(24, 14, 30, 8);
    context.moveTo(36, 20);
    context.quadraticCurveTo(32, 14, 38, 8);
    context.stroke();
  },
  staples: (context) => {
    context.fillStyle = "rgba(0,0,0,0.3)";
    context.fillRect(10, 59, 44, 4);
    context.fillStyle = "#1565c0";
    context.fillRect(10, 36, 44, 24);
    context.fillStyle = "#0d47a1";
    context.fillRect(10, 36, 44, 5);
    context.fillStyle = "#fff";
    context.font = "bold 9px monospace";
    context.fillText("STAPLE", 14, 52);
    context.fillStyle = "#b0bec5";
    context.fillRect(16, 30, 32, 6);
  },
  keycard: (context) => {
    context.fillStyle = "rgba(0,0,0,0.3)";
    context.fillRect(14, 59, 36, 4);
    context.fillStyle = "#e4007c";
    context.fillRect(14, 30, 36, 28);
    context.fillStyle = "#fff";
    context.fillRect(18, 34, 12, 14);
    context.fillStyle = "#f8bbd0";
    context.fillRect(33, 36, 13, 3);
    context.fillRect(33, 42, 10, 3);
    context.fillStyle = "#ffd54f";
    context.fillRect(18, 51, 8, 4);
    context.strokeStyle = "#90a4ae";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(32, 30);
    context.lineTo(26, 12);
    context.lineTo(38, 12);
    context.closePath();
    context.stroke();
  },
  bracelet: (context) => {
    const colors = ["#e91e63", "#ffeb3b", "#03a9f4", "#8bc34a", "#ff9800", "#9c27b0", "#ffffff"];
    context.fillStyle = "rgba(0,0,0,0.3)";
    context.fillRect(14, 59, 36, 4);

    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2;
      context.fillStyle = colors[index % colors.length] ?? "#fff";
      context.beginPath();
      context.arc(32 + Math.cos(angle) * 15, 44 + Math.sin(angle) * 11, 4, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = "#fff";
    context.font = "bold 8px monospace";
    context.fillText("1989", 23, 47);
  },
};

const paintMemo: Painter = (context) => {
  context.fillStyle = "#fffde7";
  context.beginPath();
  context.moveTo(14, 18);
  context.lineTo(50, 12);
  context.lineTo(54, 46);
  context.lineTo(18, 52);
  context.fill();
  context.fillStyle = "#90a4ae";
  context.fillRect(22, 24, 24, 2);
  context.fillRect(22, 30, 22, 2);
  context.fillRect(22, 36, 18, 2);
  context.fillStyle = "#d32f2f";
  context.font = "bold 8px monospace";
  context.fillText("MEMO", 24, 22);
};

const ENEMY_KINDS: readonly EnemyKind[] = ["intern", "manager", "hr", "ceo"];
const POSES: readonly EnemyPose[] = ["walk0", "walk1", "attack", "dead"];
const PICKUP_KINDS: readonly PickupKind[] = ["coffee", "staples", "keycard", "bracelet"];

export const createAssets = (): Assets => {
  const walls = new Map<WallTexture, Picture>([
    ["concrete", paint(64, 64, 1, paintConcrete)],
    ["cubicle", paint(64, 64, 2, paintCubicle)],
    ["glass", paint(64, 64, 3, paintGlass)],
    ["whiteboard", paint(64, 64, 4, paintWhiteboard)],
    ["door", paint(64, 64, 5, paintDoor)],
    ["elevator", paint(64, 64, 6, paintElevator)],
    ["street", paint(64, 64, 7, paintStreet)],
  ]);

  const sprites = new Map<SpriteName, Picture>();

  for (const kind of ENEMY_KINDS) {
    for (const pose of POSES) {
      sprites.set(`${kind}-${pose}`, paint(64, 64, 10, paintPerson(kind, pose)));
    }
  }

  for (const kind of PICKUP_KINDS) {
    sprites.set(kind, paint(64, 64, 20, PICKUP_PAINTERS[kind]));
  }

  sprites.set("memo", paint(64, 64, 30, paintMemo));

  return {
    walls,
    carpet: paint(64, 64, 8, paintCarpet),
    ceiling: paint(64, 64, 9, paintCeiling),
    sprites,
  };
};
