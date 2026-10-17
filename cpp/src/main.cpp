#include <SDL.h>
#include <SDL_error.h>
#include <SDL_events.h>
#include <SDL_hints.h>
#include <SDL_keyboard.h>
#include <SDL_keycode.h>
#include <SDL_mouse.h>
#include <SDL_pixels.h>
#include <SDL_render.h>
#include <SDL_scancode.h>
#include <SDL_stdinc.h>
#include <SDL_video.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <exception>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

#include "escape_office/constants.hpp"
#include "escape_office/game.hpp"
#include "escape_office/renderer.hpp"

namespace {

using escape_office::Game;
using escape_office::Input;
using escape_office::Renderer;
using escape_office::ScreenState;

struct ScreenshotOptions {
  std::string path;
  std::string state = "title";
  std::size_t level = 1U;
  float seconds = 0.5F;
};

void writeLittleEndian32(std::ofstream& file, std::uint32_t value) {
  const std::array<char, 4> bytes{{
      static_cast<char>(value & 0xFFU),
      static_cast<char>((value >> 8U) & 0xFFU),
      static_cast<char>((value >> 16U) & 0xFFU),
      static_cast<char>((value >> 24U) & 0xFFU),
  }};
  file.write(bytes.data(), static_cast<std::streamsize>(bytes.size()));
}

void saveBitmap(const std::string& path,
                const std::vector<std::uint32_t>& pixels) {
  const std::filesystem::path outputPath(path);
  if (!outputPath.parent_path().empty()) {
    std::filesystem::create_directories(outputPath.parent_path());
  }
  std::ofstream file(outputPath, std::ios::binary);
  if (!file) {
    throw std::runtime_error("Could not open screenshot output");
  }
  constexpr auto pixelBytes = static_cast<std::uint32_t>(
      escape_office::kFramebufferWidth * escape_office::kFramebufferHeight * 3);
  constexpr std::uint32_t headerBytes = 54U;
  file.put('B');
  file.put('M');
  writeLittleEndian32(file, headerBytes + pixelBytes);
  writeLittleEndian32(file, 0U);
  writeLittleEndian32(file, headerBytes);
  writeLittleEndian32(file, 40U);
  writeLittleEndian32(
      file, static_cast<std::uint32_t>(escape_office::kFramebufferWidth));
  writeLittleEndian32(
      file, static_cast<std::uint32_t>(escape_office::kFramebufferHeight));
  file.put(1);
  file.put(0);
  file.put(24);
  file.put(0);
  writeLittleEndian32(file, 0U);
  writeLittleEndian32(file, pixelBytes);
  writeLittleEndian32(file, 2835U);
  writeLittleEndian32(file, 2835U);
  writeLittleEndian32(file, 0U);
  writeLittleEndian32(file, 0U);
  for (int y = escape_office::kFramebufferHeight - 1; y >= 0; --y) {
    for (int x = 0; x < escape_office::kFramebufferWidth; ++x) {
      const auto index =
          static_cast<std::size_t>(y) *
              static_cast<std::size_t>(escape_office::kFramebufferWidth) +
          static_cast<std::size_t>(x);
      const std::uint32_t pixel = pixels[index];
      file.put(static_cast<char>(pixel & 0xFFU));
      file.put(static_cast<char>((pixel >> 8U) & 0xFFU));
      file.put(static_cast<char>((pixel >> 16U) & 0xFFU));
    }
  }
  if (!file) {
    throw std::runtime_error("Could not write screenshot output");
  }
}

ScreenState parseState(const std::string& state) {
  if (state == "title") {
    return ScreenState::Title;
  }
  if (state == "play") {
    return ScreenState::Playing;
  }
  if (state == "win") {
    return ScreenState::Win;
  }
  if (state == "lose") {
    return ScreenState::Lose;
  }
  throw std::invalid_argument("State must be title, play, win, or lose");
}

ScreenshotOptions parseArguments(int argc, char** argv) {
  ScreenshotOptions options;
  for (int index = 1; index < argc; ++index) {
    const std::string_view argument(argv[index]);
    if (argument == "--screenshot" && index + 1 < argc) {
      options.path = argv[++index];
    } else if (argument == "--state" && index + 1 < argc) {
      options.state = argv[++index];
    } else if (argument == "--level" && index + 1 < argc) {
      options.level = static_cast<std::size_t>(std::stoul(argv[++index]));
    } else if (argument == "--seconds" && index + 1 < argc) {
      options.seconds = std::stof(argv[++index]);
    } else {
      throw std::invalid_argument("Invalid screenshot arguments");
    }
  }
  if (options.level < 1U || options.level > escape_office::kLevelCount ||
      options.seconds < 0.0F || options.path.empty()) {
    throw std::invalid_argument("Screenshot requires a path and valid options");
  }
  return options;
}

int runScreenshot(int argc, char** argv) {
  const ScreenshotOptions options = parseArguments(argc, argv);
  Game game;
  game.setScreenshotState(parseState(options.state), options.level - 1U);
  constexpr float fixedDelta = 1.0F / 60.0F;
  float simulated = 0.0F;
  const Input noInput;
  while (simulated < options.seconds) {
    const float delta = std::min(fixedDelta, options.seconds - simulated);
    game.update(delta, noInput);
    simulated += delta;
  }
  Renderer renderer;
  renderer.render(game);
  saveBitmap(options.path, renderer.pixels());
  return 0;
}

Input readInput(float deltaSeconds, float mouseDeltaX, bool usePressed,
                bool enterPressed, bool escapePressed) {
  const Uint8* keyboard = SDL_GetKeyboardState(nullptr);
  const auto pressed = [keyboard](SDL_Scancode key) {
    return keyboard[static_cast<int>(key)] != 0U;
  };
  Input input;
  input.forward =
      (pressed(SDL_SCANCODE_W) || pressed(SDL_SCANCODE_UP) ? 1.0F : 0.0F) -
      (pressed(SDL_SCANCODE_S) || pressed(SDL_SCANCODE_DOWN) ? 1.0F : 0.0F);
  input.strafe = (pressed(SDL_SCANCODE_D) ? 1.0F : 0.0F) -
                 (pressed(SDL_SCANCODE_A) ? 1.0F : 0.0F);
  input.turn = (pressed(SDL_SCANCODE_RIGHT) ? 1.0F : 0.0F) -
               (pressed(SDL_SCANCODE_LEFT) ? 1.0F : 0.0F);
  input.mouseTurn = deltaSeconds > 0.0F
                        ? mouseDeltaX * escape_office::kMouseSensitivity /
                              (escape_office::kPlayerTurnSpeed * deltaSeconds)
                        : 0.0F;
  input.run = pressed(SDL_SCANCODE_LSHIFT) || pressed(SDL_SCANCODE_RSHIFT);
  input.fire =
      pressed(SDL_SCANCODE_SPACE) ||
      (SDL_GetMouseState(nullptr, nullptr) & SDL_BUTTON(SDL_BUTTON_LEFT)) != 0U;
  input.use = usePressed;
  input.enter = enterPressed;
  input.escape = escapePressed;
  return input;
}

int runWindow() {
  if (SDL_Init(SDL_INIT_VIDEO) != 0) {
    std::cerr << "SDL initialization failed: " << SDL_GetError() << '\n';
    return 1;
  }
  SDL_SetHint(SDL_HINT_RENDER_SCALE_QUALITY, "0");
  SDL_Window* window =
      SDL_CreateWindow("Escape the Office", SDL_WINDOWPOS_CENTERED,
                       SDL_WINDOWPOS_CENTERED, 960, 600, SDL_WINDOW_RESIZABLE);
  if (window == nullptr) {
    std::cerr << "SDL window creation failed: " << SDL_GetError() << '\n';
    SDL_Quit();
    return 1;
  }
  SDL_Renderer* sdlRenderer =
      SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);
  if (sdlRenderer == nullptr) {
    sdlRenderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_SOFTWARE);
  }
  if (sdlRenderer == nullptr) {
    std::cerr << "SDL renderer creation failed: " << SDL_GetError() << '\n';
    SDL_DestroyWindow(window);
    SDL_Quit();
    return 1;
  }
  SDL_RenderSetLogicalSize(sdlRenderer, escape_office::kFramebufferWidth,
                           escape_office::kFramebufferHeight);
  SDL_Texture* texture = SDL_CreateTexture(
      sdlRenderer, SDL_PIXELFORMAT_ARGB8888, SDL_TEXTUREACCESS_STREAMING,
      escape_office::kFramebufferWidth, escape_office::kFramebufferHeight);
  if (texture == nullptr) {
    std::cerr << "SDL texture creation failed: " << SDL_GetError() << '\n';
    SDL_DestroyRenderer(sdlRenderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return 1;
  }
  Game game;
  Renderer renderer;
  bool running = true;
  float accumulator = 0.0F;
  auto previous = std::chrono::steady_clock::now();
  while (running) {
    bool usePressed = false;
    bool enterPressed = false;
    bool escapePressed = false;
    float mouseDeltaX = 0.0F;
    SDL_Event event{};
    while (SDL_PollEvent(&event) != 0) {
      if (event.type == SDL_QUIT) {
        running = false;
      } else if (event.type == SDL_KEYDOWN && event.key.repeat == 0U) {
        if (event.key.keysym.sym == SDLK_e) {
          usePressed = true;
        } else if (event.key.keysym.sym == SDLK_RETURN) {
          enterPressed = true;
        } else if (event.key.keysym.sym == SDLK_ESCAPE) {
          escapePressed = true;
        }
      } else if (event.type == SDL_MOUSEMOTION) {
        mouseDeltaX += static_cast<float>(event.motion.xrel);
      }
    }
    const auto current = std::chrono::steady_clock::now();
    const float frameDelta =
        std::chrono::duration<float>(current - previous).count();
    previous = current;
    accumulator += std::min(frameDelta, 0.25F);
    constexpr float fixedDelta = 1.0F / 60.0F;
    bool firstStep = true;
    while (accumulator >= fixedDelta) {
      const Input input = readInput(
          fixedDelta, firstStep ? mouseDeltaX : 0.0F, firstStep && usePressed,
          firstStep && enterPressed, firstStep && escapePressed);
      game.update(fixedDelta, input);
      accumulator -= fixedDelta;
      firstStep = false;
    }
    renderer.render(game);
    const auto& pixels = renderer.pixels();
    SDL_UpdateTexture(texture, nullptr, pixels.data(),
                      escape_office::kFramebufferWidth *
                          static_cast<int>(sizeof(std::uint32_t)));
    SDL_RenderClear(sdlRenderer);
    SDL_RenderCopy(sdlRenderer, texture, nullptr, nullptr);
    SDL_RenderPresent(sdlRenderer);
  }
  SDL_DestroyTexture(texture);
  SDL_DestroyRenderer(sdlRenderer);
  SDL_DestroyWindow(window);
  SDL_Quit();
  return 0;
}

}

int main(int argc, char** argv) {
  try {
    if (argc > 1) {
      return runScreenshot(argc, argv);
    }
    return runWindow();
  } catch (const std::exception& error) {
    std::cerr << error.what() << '\n';
    return 2;
  }
}
