#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "escape_office/game.hpp"

namespace escape_office {

class Renderer {
 public:
  Renderer();

  void render(const Game& game);
  [[nodiscard]] const std::vector<std::uint32_t>& pixels() const;

 private:
  void renderWorld(const Game& game);
  void renderSprites(const Game& game);
  void renderHud(const Game& game);
  void renderTitle();
  void renderWin(const Game& game);
  void renderLose(const Game& game);
  void fill(std::uint32_t color);
  void rectangle(int x, int y, int width, int height, std::uint32_t color);
  void pixel(int x, int y, std::uint32_t color);
  void text(int x, int y, const std::string& value, std::uint32_t color,
            int scale = 1);
  std::vector<std::uint32_t> pixels_;
  std::vector<float> depthBuffer_;
};

}
