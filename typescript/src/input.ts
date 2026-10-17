import type { Input } from "./game";

const MOUSE_SENSITIVITY = 0.0025;

export interface Controls {
  readonly poll: () => Input;
  readonly isLocked: () => boolean;
}

const axis = (
  keys: ReadonlySet<string>,
  positive: readonly string[],
  negative: readonly string[],
): number =>
  (positive.some((key) => keys.has(key)) ? 1 : 0) - (negative.some((key) => keys.has(key)) ? 1 : 0);

export const createControls = (canvas: HTMLCanvasElement, onGesture: () => void): Controls => {
  const held = new Set<string>();
  const pressed = new Set<string>();
  let mouseX = 0;
  let mouseDown = false;
  let clicked = false;
  let lostLock = false;

  window.addEventListener("keydown", (event) => {
    if (!event.repeat) {
      pressed.add(event.code);
    }

    held.add(event.code);
    onGesture();

    if (event.code === "Space" || event.code.startsWith("Arrow")) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    held.delete(event.code);
  });

  window.addEventListener("blur", () => {
    held.clear();
    mouseDown = false;
  });

  canvas.addEventListener("mousedown", (event) => {
    onGesture();

    if (document.pointerLockElement !== canvas) {
      void canvas.requestPointerLock();

      return;
    }

    if (event.button === 0) {
      mouseDown = true;
      clicked = true;
    }
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      mouseDown = false;
    }
  });

  document.addEventListener("mousemove", (event) => {
    if (document.pointerLockElement === canvas) {
      mouseX += event.movementX;
    }
  });

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== canvas) {
      lostLock = true;
      mouseDown = false;
    }
  });

  const poll = (): Input => {
    const input: Input = {
      forward: axis(held, ["KeyW", "ArrowUp"], ["KeyS", "ArrowDown"]),
      strafe: axis(held, ["KeyD"], ["KeyA"]),
      turn: axis(held, ["ArrowRight"], ["ArrowLeft"]),
      mouseTurn: mouseX * MOUSE_SENSITIVITY,
      run: held.has("ShiftLeft") || held.has("ShiftRight"),
      fire: held.has("Space") || pressed.has("Space") || mouseDown || clicked,
      use: pressed.has("KeyE"),
      start: pressed.has("Enter") || pressed.has("NumpadEnter"),
      pause: pressed.has("Escape") || pressed.has("KeyP") || lostLock,
    };

    pressed.clear();
    clicked = false;
    mouseX = 0;
    lostLock = false;

    return input;
  };

  return { poll, isLocked: () => document.pointerLockElement === canvas };
};
