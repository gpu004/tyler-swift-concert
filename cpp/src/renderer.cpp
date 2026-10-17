#include "escape_office/renderer.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <string>
#include <string_view>
#include <vector>

#include "escape_office/constants.hpp"
#include "escape_office/game.hpp"

namespace escape_office {
namespace {

constexpr std::uint32_t kBlack = 0xFF090D13U;
constexpr std::uint32_t kWhite = 0xFFF1F2E9U;
constexpr std::uint32_t kMuted = 0xFFAEB9B8U;
constexpr std::uint32_t kRed = 0xFFE6554FU;
constexpr std::uint32_t kGold = 0xFFF2C75CU;
constexpr std::uint32_t kTeal = 0xFF4BC5B7U;
constexpr std::uint32_t kPanel = 0xFF111A22U;
constexpr std::uint32_t kPanelLight = 0xFF24323AU;
constexpr std::uint32_t kHorizon = 0xFF171D22U;
constexpr int kHorizonY = 80;
constexpr int kLevelNameY = 162;
constexpr int kMessageY = 193;
constexpr int kHudTop = kViewHeight;
constexpr int kCrosshairSize = 5;
constexpr int kTitleScale = 3;
constexpr float kCameraDepthNear = 0.12F;
constexpr float kSpriteCullDistance = 18.0F;

std::uint32_t color(std::uint8_t red, std::uint8_t green, std::uint8_t blue) {
  return 0xFF000000U | (static_cast<std::uint32_t>(red) << 16U) |
         (static_cast<std::uint32_t>(green) << 8U) |
         static_cast<std::uint32_t>(blue);
}

std::uint32_t shade(std::uint32_t value, float factor) {
  const auto red = static_cast<std::uint8_t>(
      static_cast<float>((value >> 16U) & 0xFFU) * factor);
  const auto green = static_cast<std::uint8_t>(
      static_cast<float>((value >> 8U) & 0xFFU) * factor);
  const auto blue =
      static_cast<std::uint8_t>(static_cast<float>(value & 0xFFU) * factor);
  return color(red, green, blue);
}

std::array<std::string_view, static_cast<std::size_t>(kTextGlyphHeight)> glyph(
    char character) {
  switch (character) {
    case 'A':
      return {"01110", "10001", "10001", "11111", "10001", "10001", "10001"};
    case 'B':
      return {"11110", "10001", "10001", "11110", "10001", "10001", "11110"};
    case 'C':
      return {"01111", "10000", "10000", "10000", "10000", "10000", "01111"};
    case 'D':
      return {"11110", "10001", "10001", "10001", "10001", "10001", "11110"};
    case 'E':
      return {"11111", "10000", "10000", "11110", "10000", "10000", "11111"};
    case 'F':
      return {"11111", "10000", "10000", "11110", "10000", "10000", "10000"};
    case 'G':
      return {"01111", "10000", "10000", "10111", "10001", "10001", "01111"};
    case 'H':
      return {"10001", "10001", "10001", "11111", "10001", "10001", "10001"};
    case 'I':
      return {"11111", "00100", "00100", "00100", "00100", "00100", "11111"};
    case 'J':
      return {"00111", "00010", "00010", "00010", "00010", "10010", "01100"};
    case 'K':
      return {"10001", "10010", "10100", "11000", "10100", "10010", "10001"};
    case 'L':
      return {"10000", "10000", "10000", "10000", "10000", "10000", "11111"};
    case 'M':
      return {"10001", "11011", "10101", "10101", "10001", "10001", "10001"};
    case 'N':
      return {"10001", "11001", "11001", "10101", "10011", "10011", "10001"};
    case 'O':
      return {"01110", "10001", "10001", "10001", "10001", "10001", "01110"};
    case 'P':
      return {"11110", "10001", "10001", "11110", "10000", "10000", "10000"};
    case 'Q':
      return {"01110", "10001", "10001", "10001", "10101", "10010", "01101"};
    case 'R':
      return {"11110", "10001", "10001", "11110", "10100", "10010", "10001"};
    case 'S':
      return {"01111", "10000", "10000", "01110", "00001", "00001", "11110"};
    case 'T':
      return {"11111", "00100", "00100", "00100", "00100", "00100", "00100"};
    case 'U':
      return {"10001", "10001", "10001", "10001", "10001", "10001", "01110"};
    case 'V':
      return {"10001", "10001", "10001", "10001", "10001", "01010", "00100"};
    case 'W':
      return {"10001", "10001", "10001", "10101", "10101", "11011", "10001"};
    case 'X':
      return {"10001", "10001", "01010", "00100", "01010", "10001", "10001"};
    case 'Y':
      return {"10001", "10001", "01010", "00100", "00100", "00100", "00100"};
    case 'Z':
      return {"11111", "00001", "00010", "00100", "01000", "10000", "11111"};
    case '0':
      return {"01110", "10001", "10011", "10101", "11001", "10001", "01110"};
    case '1':
      return {"00100", "01100", "00100", "00100", "00100", "00100", "01110"};
    case '2':
      return {"01110", "10001", "00001", "00010", "00100", "01000", "11111"};
    case '3':
      return {"11110", "00001", "00001", "01110", "00001", "00001", "11110"};
    case '4':
      return {"00010", "00110", "01010", "10010", "11111", "00010", "00010"};
    case '5':
      return {"11111", "10000", "10000", "11110", "00001", "00001", "11110"};
    case '6':
      return {"01110", "10000", "10000", "11110", "10001", "10001", "01110"};
    case '7':
      return {"11111", "00001", "00010", "00100", "01000", "01000", "01000"};
    case '8':
      return {"01110", "10001", "10001", "01110", "10001", "10001", "01110"};
    case '9':
      return {"01110", "10001", "10001", "01111", "00001", "00001", "01110"};
    case ':':
      return {"00000", "00100", "00100", "00000", "00100", "00100", "00000"};
    case '.':
      return {"00000", "00000", "00000", "00000", "00000", "00110", "00110"};
    case ',':
      return {"00000", "00000", "00000", "00000", "00110", "00100", "01000"};
    case '\'':
      return {"00100", "00100", "00000", "00000", "00000", "00000", "00000"};
    case '-':
      return {"00000", "00000", "00000", "11111", "00000", "00000", "00000"};
    case '!':
      return {"00100", "00100", "00100", "00100", "00100", "00000", "00100"};
    case '+':
      return {"00000", "00100", "00100", "11111", "00100", "00100", "00000"};
    case '/':
      return {"00001", "00010", "00010", "00100", "01000", "01000", "10000"};
    default:
      return {"00000", "00000", "00000", "00000", "00000", "00000", "00000"};
  }
}

std::uint32_t wallColor(char tile, int textureX, int textureY, bool side) {
  const int x = textureX % 8;
  const int y = textureY % 8;
  const float sideShade = side ? 0.78F : 1.0F;
  std::uint32_t base = 0xFF7D8583U;
  bool accent = false;
  switch (tile) {
    case 'C':
      base = 0xFF586D83U;
      accent = y == 0 || y == 4 || (x == 1 && y > 4);
      break;
    case 'G':
      base = 0xFF84C7CDU;
      accent = x == 0 || x == 7 || y == 0 || y == 7;
      break;
    case 'W':
      base = 0xFFE5E4D9U;
      accent = (x == 1 && y == 3) || (x == 5 && y == 6) || (x == 6 && y == 2) ||
               (x == 2 && y == 4);
      break;
    case 'D':
      base = 0xFF805137U;
      accent = x == 0 || x == 7 || y == 0 || y == 7 || x == 6;
      break;
    default:
      base = 0xFF747D7BU;
      accent = x == 0 || x == 7 || y == 0 || y == 7 ||
               ((x == 3 || x == 4) && y == 3);
      break;
  }
  if (accent) {
    if (tile == 'W') {
      base = 0xFF28747CU;
    } else if (tile == 'G') {
      base = 0xFFB5E4E3U;
    } else {
      base = 0xFF313B42U;
    }
  }
  return shade(base, sideShade);
}

struct SpriteProjection {
  float depth = 0.0F;
  int screenX = 0;
  int width = 0;
  int height = 0;
  int centerY = 0;
  EnemyType enemyType = EnemyType::Intern;
  PickupType pickupType = PickupType::Coffee;
  bool isEnemy = false;
  bool corpse = false;
  bool isProjectile = false;
};

}

Renderer::Renderer()
    : pixels_(static_cast<std::size_t>(kFramebufferWidth * kFramebufferHeight),
              kBlack),
      depthBuffer_(static_cast<std::size_t>(kFramebufferWidth), 32.0F) {}

void Renderer::render(const Game& game) {
  if (game.state == ScreenState::Title) {
    renderTitle();
    return;
  }
  if (game.state == ScreenState::Win) {
    renderWin(game);
    return;
  }
  if (game.state == ScreenState::Lose) {
    renderLose(game);
    return;
  }
  renderWorld(game);
  renderSprites(game);
  renderHud(game);
  if (game.state == ScreenState::Paused) {
    rectangle(0, 0, kFramebufferWidth, kViewHeight, 0xAA080D11U);
    text(137, 68, "PAUSED", kWhite);
    text(98, 80, "PRESS ESC TO RETURN", kMuted);
  }
}

const std::vector<std::uint32_t>& Renderer::pixels() const { return pixels_; }

void Renderer::renderWorld(const Game& game) {
  for (int y = 0; y < kViewHeight; ++y) {
    for (int x = 0; x < kFramebufferWidth; ++x) {
      std::uint32_t pixelColor = kHorizon;
      if (y < kHorizonY) {
        const int ceilingPattern = ((x / 24) + (y / 12)) % 2;
        pixelColor = ceilingPattern == 0 ? 0xFF454B4CU : 0xFF3E4445U;
        if (y % 12 == 0 || x % 24 == 0) {
          pixelColor = 0xFF252D30U;
        }
      } else {
        const int carpetPattern = ((x / 5) + (y / 4)) % 2;
        pixelColor = carpetPattern == 0 ? 0xFF403D39U : 0xFF49433CU;
        if (y % 16 == 0) {
          pixelColor = 0xFF302F2D;
        }
      }
      pixel(x, y, pixelColor);
    }
  }
  const float directionX = std::cos(game.player.angle);
  const float directionY = std::sin(game.player.angle);
  const float planeX = -directionY * kCameraPlaneScale;
  const float planeY = directionX * kCameraPlaneScale;
  for (int column = 0; column < kFramebufferWidth; ++column) {
    const float cameraX = (2.0F * static_cast<float>(column) /
                           static_cast<float>(kFramebufferWidth)) -
                          1.0F;
    const float rayX = directionX + (planeX * cameraX);
    const float rayY = directionY + (planeY * cameraX);
    int mapX = static_cast<int>(std::floor(game.player.position.x));
    int mapY = static_cast<int>(std::floor(game.player.position.y));
    const float deltaX = rayX == 0.0F ? 1.0e30F : std::abs(1.0F / rayX);
    const float deltaY = rayY == 0.0F ? 1.0e30F : std::abs(1.0F / rayY);
    const int stepX = rayX < 0.0F ? -1 : 1;
    const int stepY = rayY < 0.0F ? -1 : 1;
    float sideDistanceX =
        rayX < 0.0F
            ? (game.player.position.x - static_cast<float>(mapX)) * deltaX
            : (static_cast<float>(mapX + 1) - game.player.position.x) * deltaX;
    float sideDistanceY =
        rayY < 0.0F
            ? (game.player.position.y - static_cast<float>(mapY)) * deltaY
            : (static_cast<float>(mapY + 1) - game.player.position.y) * deltaY;
    bool side = false;
    char tile = '#';
    float perpendicularDistance = 32.0F;
    for (int iteration = 0; iteration < kMapWidth * kMapHeight; ++iteration) {
      if (sideDistanceX < sideDistanceY) {
        sideDistanceX += deltaX;
        mapX += stepX;
        side = false;
      } else {
        sideDistanceY += deltaY;
        mapY += stepY;
        side = true;
      }
      tile = game.tileAt(mapX, mapY);
      const bool solid =
          tile == '#' || tile == 'C' || tile == 'G' || tile == 'W' ||
          (tile == 'D' && game.doorProgress[static_cast<std::size_t>(
                              mapY)][static_cast<std::size_t>(mapX)] < 1.0F);
      if (solid) {
        perpendicularDistance =
            std::max(kCameraDepthNear,
                     side ? sideDistanceY - deltaY : sideDistanceX - deltaX);
        break;
      }
      if (std::min(sideDistanceX, sideDistanceY) > 32.0F) {
        break;
      }
    }
    depthBuffer_[static_cast<std::size_t>(column)] = perpendicularDistance;
    const int wallHeight = static_cast<int>(static_cast<float>(kViewHeight) /
                                            perpendicularDistance);
    const int drawStart = std::max(0, (kViewHeight - wallHeight) / 2);
    const int drawEnd =
        std::min(kViewHeight - 1, (kViewHeight + wallHeight) / 2);
    const float hitX = game.player.position.x + (rayX * perpendicularDistance);
    const float hitY = game.player.position.y + (rayY * perpendicularDistance);
    float wallCoordinate = side ? hitX : hitY;
    wallCoordinate -= std::floor(wallCoordinate);
    if (side ? rayY > 0.0F : rayX < 0.0F) {
      wallCoordinate = 1.0F - wallCoordinate;
    }
    const int textureX = static_cast<int>(wallCoordinate * kWallTextureScale);
    const float shading = std::clamp(
        1.0F / (1.0F +
                std::max(0.0F, perpendicularDistance - kDistanceShadingStart) *
                    kDistanceShadingScale),
        0.38F, 1.0F);
    for (int y = drawStart; y <= drawEnd; ++y) {
      const int textureY =
          (y * static_cast<int>(kWallTextureScale)) / std::max(1, wallHeight);
      pixel(column, y,
            shade(wallColor(tile, textureX, textureY, side), shading));
    }
  }
  const int centerX = kFramebufferWidth / 2;
  const int centerY = kViewHeight / 2;
  rectangle(centerX - kCrosshairSize, centerY, kCrosshairSize * 2 + 1, 1,
            0xDD080C0EU);
  rectangle(centerX, centerY - kCrosshairSize, 1, kCrosshairSize * 2 + 1,
            0xDD080C0EU);
  rectangle(centerX - 2, centerY, 5, 1, kGold);
  rectangle(centerX, centerY - 2, 1, 5, kGold);
}

void Renderer::renderSprites(const Game& game) {
  const float directionX = std::cos(game.player.angle);
  const float directionY = std::sin(game.player.angle);
  const float planeX = -directionY * kCameraPlaneScale;
  const float planeY = directionX * kCameraPlaneScale;
  const float determinant = (planeX * directionY) - (directionX * planeY);
  std::vector<SpriteProjection> sprites;
  for (const Enemy& enemy : game.enemies) {
    const float dx = enemy.position.x - game.player.position.x;
    const float dy = enemy.position.y - game.player.position.y;
    if (std::sqrt((dx * dx) + (dy * dy)) > kSpriteCullDistance) {
      continue;
    }
    const float transformX = (directionY * dx - directionX * dy) / determinant;
    const float transformY = (-planeY * dx + planeX * dy) / determinant;
    if (transformY <= kCameraDepthNear) {
      continue;
    }
    const int screenX =
        static_cast<int>((static_cast<float>(kFramebufferWidth) / 2.0F) *
                         (1.0F + (transformX / transformY)));
    const int height = std::max(
        1, static_cast<int>(static_cast<float>(kViewHeight) / transformY *
                            (enemy.type == EnemyType::Ceo ? 1.35F : 0.72F)));
    const int width = std::max(1, height / 2);
    sprites.push_back({transformY, screenX, width, height, kViewHeight / 2,
                       enemy.type, PickupType::Coffee, true, !enemy.alive,
                       false});
  }
  for (const Pickup& pickup : game.pickups) {
    if (!pickup.active) {
      continue;
    }
    const float dx = pickup.position.x - game.player.position.x;
    const float dy = pickup.position.y - game.player.position.y;
    const float transformX = (directionY * dx - directionX * dy) / determinant;
    const float transformY = (-planeY * dx + planeX * dy) / determinant;
    if (transformY <= kCameraDepthNear) {
      continue;
    }
    const int screenX =
        static_cast<int>((static_cast<float>(kFramebufferWidth) / 2.0F) *
                         (1.0F + (transformX / transformY)));
    const int height =
        std::max(1, static_cast<int>(static_cast<float>(kViewHeight) /
                                     (transformY * 2.6F)));
    sprites.push_back({transformY, screenX, height, height, kViewHeight / 2,
                       EnemyType::Intern, pickup.type, false, false, false});
  }
  for (const Projectile& projectile : game.projectiles) {
    const float dx = projectile.position.x - game.player.position.x;
    const float dy = projectile.position.y - game.player.position.y;
    const float transformX = (directionY * dx - directionX * dy) / determinant;
    const float transformY = (-planeY * dx + planeX * dy) / determinant;
    if (!projectile.active || transformY <= kCameraDepthNear) {
      continue;
    }
    const int screenX =
        static_cast<int>((static_cast<float>(kFramebufferWidth) / 2.0F) *
                         (1.0F + (transformX / transformY)));
    const int size = std::max(2, static_cast<int>(12.0F / transformY));
    sprites.push_back({transformY, screenX, size, size, kViewHeight / 2,
                       EnemyType::Intern, PickupType::Coffee, false, false,
                       true});
  }
  std::sort(sprites.begin(), sprites.end(),
            [](const SpriteProjection& first, const SpriteProjection& second) {
              return first.depth > second.depth;
            });
  for (const SpriteProjection& sprite : sprites) {
    const int left = sprite.screenX - sprite.width / 2;
    const int top = sprite.centerY - sprite.height / 2;
    for (int stripe = 0; stripe < sprite.width; ++stripe) {
      const int screenX = left + stripe;
      if (screenX < 0 || screenX >= kFramebufferWidth ||
          sprite.depth >= depthBuffer_[static_cast<std::size_t>(screenX)]) {
        continue;
      }
      const float u = static_cast<float>(stripe) /
                      static_cast<float>(std::max(1, sprite.width));
      for (int localY = 0; localY < sprite.height; ++localY) {
        const int screenY = top + localY;
        if (screenY < 0 || screenY >= kViewHeight) {
          continue;
        }
        const float v = static_cast<float>(localY) /
                        static_cast<float>(std::max(1, sprite.height));
        if (sprite.isProjectile) {
          if ((u > 0.15F && u < 0.85F) && (v > 0.2F && v < 0.8F)) {
            pixel(screenX, screenY, 0xFFFFE8A0U);
          }
          continue;
        }
        if (sprite.isEnemy) {
          const bool isCorpse = sprite.corpse;
          const float groundY = static_cast<float>(screenY - top) /
                                static_cast<float>(std::max(1, sprite.height));
          if (isCorpse && groundY < 0.78F) {
            continue;
          }
          const float uScaled = isCorpse ? std::abs(u - 0.5F) * 2.0F : u;
          const float vScaled = isCorpse ? groundY : v;
          std::uint32_t base = 0xFF3C9A72U;
          if (sprite.enemyType == EnemyType::Manager) {
            base = 0xFF5A79A7U;
          } else if (sprite.enemyType == EnemyType::Hr) {
            base = 0xFFC66D73U;
          } else if (sprite.enemyType == EnemyType::Ceo) {
            base = 0xFF754A91U;
          }
          if (isCorpse) {
            base = 0xFF55514CU;
          }
          const bool body = uScaled > 0.17F && uScaled < 0.83F &&
                            vScaled > 0.36F && vScaled < 0.98F;
          const bool head = uScaled > 0.32F && uScaled < 0.68F &&
                            vScaled > 0.08F && vScaled < 0.4F;
          if (body) {
            std::uint32_t bodyColor = base;
            if (sprite.enemyType == EnemyType::Manager && uScaled > 0.47F &&
                uScaled < 0.55F && vScaled > 0.42F && vScaled < 0.78F) {
              bodyColor = 0xFFE5D8C5U;
            }
            if (sprite.enemyType == EnemyType::Hr && uScaled > 0.57F &&
                uScaled < 0.82F && vScaled > 0.45F && vScaled < 0.73F) {
              bodyColor = 0xFFE9D9B9U;
            }
            pixel(screenX, screenY, bodyColor);
          } else if (head) {
            pixel(screenX, screenY, isCorpse ? base : 0xFFD1A887U);
          }
        } else {
          bool visible = false;
          if (sprite.pickupType == PickupType::Coffee) {
            visible = u > 0.18F && u < 0.82F && v > 0.25F && v < 0.88F;
          } else if (sprite.pickupType == PickupType::Staples) {
            visible = u > 0.12F && u < 0.88F && v > 0.35F && v < 0.68F;
          } else if (sprite.pickupType == PickupType::Keycard) {
            visible = u > 0.05F && u < 0.95F && v > 0.32F && v < 0.68F;
          } else {
            visible = u > 0.1F && u < 0.9F && v > 0.2F && v < 0.8F &&
                      (u < 0.3F || u > 0.7F || v < 0.35F || v > 0.65F);
          }
          if (visible) {
            std::uint32_t pickupColor = 0xFF865C3EU;
            if (sprite.pickupType == PickupType::Staples) {
              pickupColor = 0xFFC1C9D0U;
            } else if (sprite.pickupType == PickupType::Keycard) {
              pickupColor = kGold;
            } else if (sprite.pickupType == PickupType::Bracelet) {
              pickupColor = 0xFFF06C9AU;
            }
            if (sprite.pickupType == PickupType::Coffee && v < 0.36F) {
              pickupColor = 0xFFF0D7A2U;
            } else if (sprite.pickupType == PickupType::Keycard && u > 0.68F &&
                       v > 0.4F && v < 0.6F) {
              pickupColor = 0xFF52616CU;
            }
            pixel(screenX, screenY, pickupColor);
          }
        }
      }
    }
  }
}

void Renderer::renderHud(const Game& game) {
  rectangle(0, kHudTop, kFramebufferWidth, kStatusBarHeight, kPanel);
  rectangle(0, kHudTop, kFramebufferWidth, 2, kPanelLight);
  rectangle(8, 169, 59, 22, kPanelLight);
  rectangle(75, 169, 64, 22, kPanelLight);
  rectangle(147, 169, 78, 22, kPanelLight);
  rectangle(235, 169, 77, 22, kPanelLight);
  text(12, 172, "HEALTH", kMuted);
  text(12, 181, std::to_string(game.player.health), kWhite);
  text(79, 172, "STAPLES", kMuted);
  text(79, 181, std::to_string(game.player.staples), kWhite);
  text(151, 172, "TIME", kMuted);
  text(151, 181, game.clockText(), game.minutesToShow() < 15 ? kRed : kGold);
  text(239, 172, "FLOOR", kMuted);
  text(239, 181, std::to_string(game.currentLevel + 1U), kWhite);
  text(10, kLevelNameY, game.levelName(), kMuted);
  if (game.player.hasKeycard) {
    rectangle(134, 174, 8, 12, kGold);
    rectangle(136, 177, 3, 2, kPanel);
  }
  text(10, kMessageY, game.statusMessage(), kTeal);
  if (game.player.staples == 0) {
    rectangle(145, 149, 30, 8, 0xFF48545CU);
    rectangle(148, 142, 24, 8, 0xFF8F9CA0U);
    rectangle(151, 144, 3, 2, 0xFFD4D8D6U);
    rectangle(158, 144, 3, 2, 0xFFD4D8D6U);
    rectangle(165, 144, 3, 2, 0xFFD4D8D6U);
  } else {
    rectangle(145, 152, 30, 7, 0xFF41352DU);
    rectangle(151, 145, 20, 9, 0xFF6C4935U);
    rectangle(147, 139, 24, 7, 0xFF987557U);
    rectangle(151, 133, 15, 6, 0xFFBC9670U);
    rectangle(147, 145, 5, 8, 0xFF342C25U);
    rectangle(164, 136, 4, 3, 0xFFD9B67EU);
  }
  if (game.player.hasKeycard) {
    text(270, 154, "KEYCARD", kGold);
  }
}

void Renderer::renderTitle() {
  fill(0xFF0D171DU);
  for (int y = 0; y < kFramebufferHeight; ++y) {
    const float factor = 0.42F + (static_cast<float>(y) / 500.0F);
    for (int x = 0; x < kFramebufferWidth; ++x) {
      if ((x + y) % 17 == 0) {
        pixel(x, y, shade(0xFF1B3438U, factor));
      }
    }
  }
  rectangle(26, 24, 268, 150, 0xE6111B22U);
  rectangle(29, 27, 262, 144, 0xFF17242BU);
  rectangle(29, 27, 262, 2, kTeal);
  text(76, 44, "ESCAPE THE", kMuted, 2);
  text(59, 66, "OFFICE", kGold, kTitleScale);
  text(73, 104, "STUCK ON 42, CONCERT AT 8 PM", kWhite);
  text(52, 119, "WASD MOVE  ARROWS TURN  SHIFT RUN", kMuted);
  text(52, 130, "SPACE FIRE  E USE  ENTER START", kMuted);
  text(89, 151, "PRESS ENTER", kTeal);
  for (int x = 0; x < 15; ++x) {
    rectangle(38 + (x * 17), 91, 9, 3, x % 3 == 0 ? kGold : kTeal);
  }
}

void Renderer::renderWin(const Game& game) {
  fill(0xFF111922U);
  rectangle(22, 22, 276, 156, 0xFF1A2A2DU);
  rectangle(25, 25, 270, 150, 0xFF23363AU);
  rectangle(25, 25, 270, 3, kGold);
  text(96, 42, "YOU MADE IT!", kGold, 2);
  text(73, 78, "ARRIVAL " + game.clockText(), kWhite);
  text(67, 93, "TIME TO SPARE " + std::to_string(game.minutesToShow()) + " MIN",
       kMuted);
  text(77, 108, "ENEMIES DEFEATED " + std::to_string(game.enemiesDefeated()),
       kMuted);
  text(102, 132, game.ratingText(), kTeal, 2);
  text(104, 157, "PRESS ENTER", kWhite);
}

void Renderer::renderLose(const Game& game) {
  fill(0xFF160F13U);
  rectangle(24, 29, 272, 142, 0xFF2B1B20U);
  rectangle(27, 32, 266, 136, 0xFF3A2329U);
  rectangle(27, 32, 266, 3, kRed);
  text(89, 53, "GAME OVER", kRed, 2);
  const std::string headline = game.clockHour() >= 20
                                   ? "THE SHOW STARTED WITHOUT YOU"
                                   : "YOU GOT PULLED INTO A MEETING";
  text(headline.size() > 28U ? 46 : 54, 85, headline, kWhite);
  text(115, 105, "TIME " + game.clockText(), kMuted);
  text(111, 120, "HEALTH " + std::to_string(game.player.health), kMuted);
  text(104, 149, "PRESS ENTER", kGold);
}

void Renderer::fill(std::uint32_t colorValue) {
  std::fill(pixels_.begin(), pixels_.end(), colorValue);
}

void Renderer::rectangle(int x, int y, int width, int height,
                         std::uint32_t colorValue) {
  for (int offsetY = 0; offsetY < height; ++offsetY) {
    for (int offsetX = 0; offsetX < width; ++offsetX) {
      pixel(x + offsetX, y + offsetY, colorValue);
    }
  }
}

void Renderer::pixel(int x, int y, std::uint32_t colorValue) {
  if (x < 0 || y < 0 || x >= kFramebufferWidth || y >= kFramebufferHeight) {
    return;
  }
  const std::size_t index = (static_cast<std::size_t>(y) *
                             static_cast<std::size_t>(kFramebufferWidth)) +
                            static_cast<std::size_t>(x);
  pixels_[index] = colorValue;
}

void Renderer::text(int x, int y, const std::string& value,
                    std::uint32_t colorValue, int scale) {
  int cursorX = x;
  for (const char rawCharacter : value) {
    const char character = rawCharacter >= 'a' && rawCharacter <= 'z'
                               ? static_cast<char>(rawCharacter - 'a' + 'A')
                               : rawCharacter;
    const auto bitmap = glyph(character);
    for (std::size_t row = 0; row < bitmap.size(); ++row) {
      for (std::size_t column = 0; column < bitmap[row].size(); ++column) {
        if (bitmap[row][column] == '1') {
          rectangle(cursorX + (static_cast<int>(column) * scale),
                    y + (static_cast<int>(row) * scale), scale, scale,
                    colorValue);
        }
      }
    }
    cursorX += kTextAdvance * scale;
  }
}

}
