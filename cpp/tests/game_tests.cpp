#include <array>
#include <cmath>
#include <cstddef>
#include <cstdlib>
#include <iostream>
#include <string_view>

#include "escape_office/constants.hpp"
#include "escape_office/game.hpp"

namespace {

using escape_office::Enemy;
using escape_office::EnemyType;
using escape_office::Game;
using escape_office::Input;
using escape_office::ScreenState;
using escape_office::Vec2;

int failures = 0;

void expect(bool condition, std::string_view description) {
  if (!condition) {
    std::cerr << "FAIL: " << description << '\n';
    ++failures;
  }
}

Vec2 findTile(const Game& game, char tile) {
  for (int y = 0; y < escape_office::kMapHeight; ++y) {
    for (int x = 0; x < escape_office::kMapWidth; ++x) {
      if (game.tileAt(x, y) == tile) {
        return {static_cast<float>(x) + 0.5F, static_cast<float>(y) + 0.5F};
      }
    }
  }
  return {-1.0F, -1.0F};
}

void testLevelMaps() {
  const auto& definitions = escape_office::levelDefinitions();
  expect(definitions.size() == escape_office::kLevelCount,
         "three maps are embedded");
  for (const auto& level : definitions) {
    expect(level.rows.size() ==
               static_cast<std::size_t>(escape_office::kMapHeight),
           "each map has 24 rows");
    int playerCount = 0;
    int exitCount = 0;
    for (std::size_t y = 0; y < level.rows.size(); ++y) {
      const std::string_view row = level.rows[y];
      expect(row.size() == static_cast<std::size_t>(escape_office::kMapWidth),
             "each map row has 24 columns");
      for (std::size_t x = 0; x < row.size(); ++x) {
        playerCount += row[x] == 'P' ? 1 : 0;
        exitCount += row[x] == 'E' ? 1 : 0;
        const bool border = x == 0U || y == 0U || x + 1U == row.size() ||
                            y + 1U == level.rows.size();
        if (border && row[x] != '#' && row[x] != 'E') {
          expect(false, "map border is closed except at the exit");
        }
      }
    }
    expect(playerCount == 1, "each map has exactly one player start");
    expect(exitCount == 1, "each map has exactly one exit");
  }
}

void testClockAndRating() {
  Game game;
  expect(game.clockText() == "6:30 PM", "clock starts at 6:30 PM");
  game.start();
  game.damagePlayer(10, true);
  expect(game.clockText() == "6:35 PM", "quick sync adds five minutes");
  game.start();
  game.player.position = {3.5F, 14.5F};
  const Input noInput;
  game.update(0.01F, noInput);
  expect(game.clockText() == "6:20 PM",
         "friendship bracelet removes ten minutes");
  game.start();
  game.update(360.0F, noInput);
  expect(game.state == ScreenState::Lose,
         "clock reaches loss after 360 seconds");
  expect(game.clockText() == "8:00 PM", "clock loss is shown at 8:00 PM");
  game.spareSeconds = 20.0F * 60.0F;
  expect(game.ratingText() == "FRONT ROW", "rating has front row threshold");
  game.spareSeconds = 5.0F * 60.0F;
  expect(game.ratingText() == "FLOOR SEATS",
         "rating has floor seats threshold");
  game.spareSeconds = (5.0F * 60.0F) - 1.0F;
  expect(game.ratingText() == "NOSEBLEEDS", "rating falls below floor seats");
}

void testCollisionAndDoors() {
  Game game;
  game.start();
  expect(game.isBlocked(0.5F, 1.5F), "player cannot enter a concrete wall");
  expect(game.isBlocked(7.5F, 1.5F), "player cannot enter a cubicle partition");
  expect(game.isBlocked(14.5F, 9.5F), "player cannot enter glass");
  Input moveForward;
  moveForward.forward = 1.0F;
  game.player.position = {6.5F, 1.5F};
  game.player.angle = 0.0F;
  game.update(0.5F, moveForward);
  expect(game.player.position.x < 7.0F,
         "player movement stops at a cubicle partition");
  game.player.position = {13.5F, 9.5F};
  game.player.angle = 0.0F;
  game.update(0.5F, moveForward);
  expect(game.player.position.x < 14.0F, "player movement stops at glass");
  const Vec2 door = findTile(game, 'D');
  expect(door.x >= 0.0F, "map contains a door");
  game.player.position = {door.x - 1.0F, door.y};
  game.player.angle = 0.0F;
  game.update(0.5F, moveForward);
  expect(game.player.position.x < door.x,
         "player movement stops at a closed door");
  game.use();
  expect(game.isBlocked(door.x, door.y), "door remains blocked while sliding");
  const Input noInput;
  game.update(0.5F, noInput);
  expect(!game.isBlocked(door.x, door.y), "opened door becomes passable");
  game.update(0.5F, moveForward);
  expect(game.player.position.x > door.x + 0.4F,
         "player can pass through an opened door");
}

void testExitAndCombat() {
  Game game;
  game.start();
  const Vec2 exit = findTile(game, 'E');
  game.player.position = exit;
  game.use();
  expect(game.state == ScreenState::Playing && game.currentLevel == 0U,
         "exit without a keycard does not end the level");
  expect(game.statusMessage() == "NEED THE KEYCARD",
         "locked exit reports the keycard hint");
  game.player.hasKeycard = true;
  game.use();
  expect(game.state == ScreenState::Playing && game.currentLevel == 1U,
         "keycard advances to the next level");
  game.player.position = {1.5F, 1.5F};
  game.player.angle = 0.0F;
  game.player.staples = 50;
  for (auto& row : game.map) {
    row.fill('.');
  }
  game.enemies.clear();
  Enemy target;
  target.type = EnemyType::Intern;
  target.position = {4.5F, 1.5F};
  target.health = 20;
  target.maxHealth = 20;
  target.alive = true;
  game.enemies.push_back(target);
  game.fire();
  expect(game.enemies.front().health == 5, "stapler hitscan deals 15 damage");
  expect(game.player.staples == 49, "stapler consumes one staple");
  game.enemies.front().position = {2.25F, 1.5F};
  game.enemies.front().health = 20;
  game.player.staples = 0;
  game.player.weaponCooldown = 0.0F;
  game.fire();
  expect(game.enemies.front().health == 12,
         "empty stapler falls back to melee");
  expect(game.player.staples == 0, "keyboard melee consumes no staples");
}

void testRaycastDistance() {
  Game game;
  for (auto& row : game.map) {
    row.fill('.');
  }
  game.map[2U][4U] = '#';
  game.player.position = {1.5F, 2.5F};
  expect(std::abs(game.raycastDistance(0.0F) - 2.5F) < 0.001F,
         "DDA raycast reports the wall distance");
}

}

int main() {
  testLevelMaps();
  testClockAndRating();
  testCollisionAndDoors();
  testExitAndCombat();
  testRaycastDistance();
  if (failures != 0) {
    std::cerr << failures << " test(s) failed\n";
    return EXIT_FAILURE;
  }
  std::cout << "All Escape the Office tests passed\n";
  return EXIT_SUCCESS;
}
