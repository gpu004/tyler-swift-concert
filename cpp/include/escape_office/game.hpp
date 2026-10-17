#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <string>
#include <string_view>
#include <vector>

#include "escape_office/constants.hpp"

namespace escape_office {

struct Vec2 {
  float x = 0.0F;
  float y = 0.0F;
};

enum class ScreenState : std::uint8_t { Title, Playing, Win, Lose, Paused };

enum class EnemyType : std::uint8_t { Intern, Manager, Hr, Ceo };

enum class PickupType : std::uint8_t { Coffee, Staples, Keycard, Bracelet };

struct Player {
  Vec2 position;
  float angle = 0.0F;
  int health = kMaxHealth;
  int staples = kStartingStaples;
  bool hasKeycard = false;
  float weaponCooldown = 0.0F;
};

struct Enemy {
  EnemyType type = EnemyType::Intern;
  Vec2 position;
  int health = 0;
  int maxHealth = 0;
  float speed = 0.0F;
  float attackCooldown = 0.0F;
  float projectileCooldown = 0.0F;
  bool awake = false;
  bool alive = true;
};

struct Pickup {
  PickupType type = PickupType::Coffee;
  Vec2 position;
  bool active = true;
};

struct Projectile {
  Vec2 position;
  Vec2 velocity;
  int damage = 0;
  bool active = true;
};

struct Input {
  float forward = 0.0F;
  float strafe = 0.0F;
  float turn = 0.0F;
  float mouseTurn = 0.0F;
  bool run = false;
  bool fire = false;
  bool use = false;
  bool enter = false;
  bool escape = false;
};

using Map = std::array<std::array<char, static_cast<std::size_t>(kMapWidth)>,
                       static_cast<std::size_t>(kMapHeight)>;

struct LevelDefinition {
  std::string_view name;
  std::array<std::string_view, static_cast<std::size_t>(kMapHeight)> rows;
};

class Game {
 public:
  Game();

  void update(float deltaSeconds, const Input& input);
  void start();
  void startLevel(std::size_t levelIndex);
  void setScreenshotState(ScreenState screen, std::size_t levelIndex);
  void use();
  void fire();
  void damagePlayer(int amount, bool quickSync = false);

  [[nodiscard]] char tileAt(int x, int y) const;
  [[nodiscard]] bool isBlocked(float x, float y,
                               float radius = kPlayerRadius) const;
  [[nodiscard]] bool hasLineOfSight(Vec2 from, Vec2 to) const;
  [[nodiscard]] float raycastDistance(float angle,
                                      float maxDistance = 32.0F) const;
  [[nodiscard]] int clockHour() const;
  [[nodiscard]] int clockMinute() const;
  [[nodiscard]] int minutesToShow() const;
  [[nodiscard]] std::string clockText() const;
  [[nodiscard]] std::string ratingText() const;
  [[nodiscard]] std::string levelName() const;
  [[nodiscard]] std::string statusMessage() const;
  [[nodiscard]] int enemiesDefeated() const;

  ScreenState state = ScreenState::Title;
  Player player;
  Map map{};
  std::vector<Enemy> enemies;
  std::vector<Pickup> pickups;
  std::vector<Projectile> projectiles;
  std::array<std::array<float, static_cast<std::size_t>(kMapWidth)>,
             static_cast<std::size_t>(kMapHeight)>
      doorProgress{};
  std::size_t currentLevel = 0;
  float introTimer = 0.0F;
  float elapsedRealSeconds = 0.0F;
  float spareSeconds = 0.0F;
  std::string message;

 private:
  void updatePlayer(float deltaSeconds, const Input& input);
  void updateEnemies(float deltaSeconds);
  void updateProjectiles(float deltaSeconds);
  void collectPickups();
  void openNearbyDoor();
  [[nodiscard]] bool isSolidTile(int x, int y) const;
  [[nodiscard]] bool canOccupy(float x, float y, float radius) const;
  void loadLevel(std::size_t levelIndex);
  void resolveEnemyAttack(Enemy& enemy);
  void spawnProjectile(const Enemy& enemy, int damage);
  void finishLevel();
  void setLoseMessage();

  double clockSeconds_ = static_cast<double>(kStartingClockSeconds);
  int defeatedEnemies_ = 0;
  float messageTimer_ = 0.0F;
  std::string levelName_;
};

[[nodiscard]] const std::array<LevelDefinition, kLevelCount>&
levelDefinitions();

}
