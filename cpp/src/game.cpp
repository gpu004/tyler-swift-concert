#include "escape_office/game.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <limits>
#include <string>
#include <string_view>
#include <vector>

#include "escape_office/constants.hpp"

namespace escape_office {
namespace {

constexpr std::array<LevelDefinition, kLevelCount> kLevels{
    {{"Floor 42: Open Plan",
      {"########################", "#P.....C.....#.....c...#",
       "#......C..i..#.........#", "#..CCC.C.....D....m....#",
       "#......CCCC..#.........#", "#..s.........####D######",
       "#CCCC..CCCC..#.........#", "#......C.....#..i...s..#",
       "#..i...C..c..#.........#", "#......C.....GGGGG..GGG#",
       "###D####.....#.........#", "#......#..m..#....h....#",
       "#..c...#.....#.........#", "#......D.....D.........#",
       "#..f...#.....#....k....#", "########.....#.........#",
       "#WWWW........####D######", "#............#.........#",
       "#..i....CC...#..m......#", "#.......CC...#.........#",
       "#..s....CC...D.....c...#", "#............#.........#",
       "#.....h......#.........E", "########################"}},
     {"Floor 21: Meeting Rooms",
      {"########################", "#P..#......h.....#.....#",
       "#...D............D..s..#", "#...#..CC....CC..#.....#",
       "##D##..CC.m..CC..###D###", "#......CC....CC..#.....#",
       "#..c.............#..m..#", "#WWWWWWWW..WWWWWW#.....#",
       "#.....#......#...#.....#", "#..i..D..s...D.h.D..c..#",
       "#.....#......#...#.....#", "###D###GGGGGG#####GGG###",
       "#......................#", "#..m.......f.......i...#",
       "#......................#", "#GGG####D#####D####GGGG#",
       "#......#.....#.....#...#", "#..h...#..m..#..c..D...#",
       "#......#.....#.....#.k.#", "#..s...D.....#.....#...#",
       "#......#.....D..i..#...#", "####D###.....#.....##D##",
       "#..............h......E#", "########################"}},
     {"Lobby: The Corner Office",
      {"########################", "#P.......#.......#.....#",
       "#........D...i...D..c..#", "#..s.....#.......#.....#",
       "####D#####GGGDGGG###D###", "#......................#",
       "#..i..CC........CC..m..#", "#.....CC...f....CC.....#",
       "#......................#", "#WWWWWWWWWW..WWWWWWWWWW#",
       "#....#..............#..#", "#.h..D......h.......D.s#",
       "#....#..............#..#", "###D##GGGG#DD#GGGG####D#",
       "#......#........#......#", "#..c...#...b....#...m..#",
       "#......D........D......#", "#..m...#........#..h...#",
       "#......#...k....#......#", "####D#######D#######D###",
       "#.......s......c.......#", "#..i.......h.......i...#",
       "#......................#", "###########E############"}}}};

Enemy makeEnemy(EnemyType type, Vec2 position) {
  Enemy enemy;
  enemy.type = type;
  enemy.position = position;
  switch (type) {
    case EnemyType::Intern:
      enemy.health = 20;
      enemy.speed = 2.2F;
      break;
    case EnemyType::Manager:
      enemy.health = 45;
      enemy.speed = 1.6F;
      break;
    case EnemyType::Hr:
      enemy.health = 30;
      enemy.speed = 1.4F;
      break;
    case EnemyType::Ceo:
      enemy.health = 250;
      enemy.speed = 1.8F;
      break;
  }
  enemy.maxHealth = enemy.health;
  return enemy;
}

float distance(Vec2 first, Vec2 second) {
  const float dx = first.x - second.x;
  const float dy = first.y - second.y;
  return std::sqrt((dx * dx) + (dy * dy));
}

Vec2 tileCenter(int x, int y) {
  return {static_cast<float>(x) + 0.5F, static_cast<float>(y) + 0.5F};
}

}

const std::array<LevelDefinition, kLevelCount>& levelDefinitions() {
  return kLevels;
}

Game::Game() {
  map.fill({});
  doorProgress.fill({});
}

void Game::start() {
  player = {};
  player.health = kMaxHealth;
  player.staples = kStartingStaples;
  clockSeconds_ = static_cast<double>(kStartingClockSeconds);
  elapsedRealSeconds = 0.0F;
  defeatedEnemies_ = 0;
  startLevel(0U);
}

void Game::startLevel(std::size_t levelIndex) {
  if (levelIndex >= kLevelCount) {
    return;
  }
  currentLevel = levelIndex;
  loadLevel(levelIndex);
  state = ScreenState::Playing;
  introTimer = kIntroDuration;
  messageTimer_ = kIntroDuration;
  message = levelName_;
  player.angle = 0.0F;
  player.hasKeycard = false;
  player.weaponCooldown = 0.0F;
  projectiles.clear();
}

void Game::setScreenshotState(ScreenState screen, std::size_t levelIndex) {
  if (levelIndex >= kLevelCount) {
    levelIndex = 0U;
  }
  currentLevel = levelIndex;
  loadLevel(levelIndex);
  player.health = kMaxHealth;
  player.staples = kStartingStaples;
  player.angle = 0.0F;
  player.hasKeycard = screen == ScreenState::Win;
  clockSeconds_ = static_cast<double>(kStartingClockSeconds) +
                  (static_cast<double>(elapsedRealSeconds) *
                   static_cast<double>(kGameSecondsPerRealSecond));
  if (screen == ScreenState::Lose) {
    player.health = 0;
    clockSeconds_ = static_cast<double>(kShowStartSeconds);
  }
  state = screen;
  introTimer = 0.0F;
  messageTimer_ = 0.0F;
  message.clear();
  if (screen == ScreenState::Win) {
    spareSeconds = kFrontRowMinutes * 60.0F;
  }
}

void Game::update(float deltaSeconds, const Input& input) {
  if (deltaSeconds <= 0.0F) {
    return;
  }
  if (state == ScreenState::Title) {
    if (input.enter) {
      start();
    }
    return;
  }
  if (state == ScreenState::Win || state == ScreenState::Lose) {
    if (input.enter) {
      start();
    }
    return;
  }
  if (input.escape && state == ScreenState::Playing) {
    state = ScreenState::Paused;
    return;
  }
  if (state == ScreenState::Paused) {
    if (input.escape || input.enter) {
      state = ScreenState::Playing;
    }
    return;
  }
  elapsedRealSeconds += deltaSeconds;
  clockSeconds_ += static_cast<double>(deltaSeconds) *
                   static_cast<double>(kGameSecondsPerRealSecond);
  if (clockSeconds_ >= static_cast<double>(kShowStartSeconds)) {
    state = ScreenState::Lose;
    message = "THE SHOW STARTED WITHOUT YOU";
    return;
  }
  introTimer = std::max(0.0F, introTimer - deltaSeconds);
  messageTimer_ = std::max(0.0F, messageTimer_ - deltaSeconds);
  for (auto& row : doorProgress) {
    for (float& progress : row) {
      if (progress > 0.0F && progress < 1.0F) {
        progress =
            std::min(1.0F, progress + (deltaSeconds / kDoorSlideDuration));
      }
    }
  }
  if (messageTimer_ <= 0.0F && introTimer <= 0.0F) {
    message.clear();
  }
  player.weaponCooldown = std::max(0.0F, player.weaponCooldown - deltaSeconds);
  updatePlayer(deltaSeconds, input);
  if (input.use) {
    use();
  }
  if (input.fire) {
    fire();
  }
  updateEnemies(deltaSeconds);
  updateProjectiles(deltaSeconds);
  collectPickups();
  if (player.health <= kHealthClockLoss) {
    setLoseMessage();
  }
}

void Game::updatePlayer(float deltaSeconds, const Input& input) {
  player.angle +=
      ((input.turn + input.mouseTurn) * kPlayerTurnSpeed) * deltaSeconds;
  while (player.angle < 0.0F) {
    player.angle += 2.0F * kPi;
  }
  while (player.angle >= 2.0F * kPi) {
    player.angle -= 2.0F * kPi;
  }
  const float speed = input.run ? kPlayerRunSpeed : kPlayerWalkSpeed;
  const float forwardX = std::cos(player.angle);
  const float forwardY = std::sin(player.angle);
  const float strafeX = -forwardY;
  const float strafeY = forwardX;
  float moveX = ((forwardX * input.forward) + (strafeX * input.strafe)) * speed;
  float moveY = ((forwardY * input.forward) + (strafeY * input.strafe)) * speed;
  const float magnitude = std::sqrt((moveX * moveX) + (moveY * moveY));
  if (magnitude > speed) {
    moveX *= speed / magnitude;
    moveY *= speed / magnitude;
  }
  const float nextX = player.position.x + (moveX * deltaSeconds);
  const float nextY = player.position.y + (moveY * deltaSeconds);
  if (canOccupy(nextX, player.position.y, kPlayerRadius)) {
    player.position.x = nextX;
  }
  if (canOccupy(player.position.x, nextY, kPlayerRadius)) {
    player.position.y = nextY;
  }
}

void Game::updateEnemies(float deltaSeconds) {
  for (Enemy& enemy : enemies) {
    if (!enemy.alive) {
      continue;
    }
    enemy.attackCooldown = std::max(0.0F, enemy.attackCooldown - deltaSeconds);
    enemy.projectileCooldown =
        std::max(0.0F, enemy.projectileCooldown - deltaSeconds);
    const float playerDistance = distance(enemy.position, player.position);
    if (!enemy.awake && playerDistance <= kEnemySightDistance &&
        hasLineOfSight(enemy.position, player.position)) {
      enemy.awake = true;
    }
    if (!enemy.awake) {
      continue;
    }
    const bool ranged =
        enemy.type == EnemyType::Hr || enemy.type == EnemyType::Ceo;
    const float keepAway = enemy.type == EnemyType::Hr ? 4.0F : 0.0F;
    if (playerDistance > (ranged ? keepAway : kEnemyMeleeRange)) {
      const float dx = player.position.x - enemy.position.x;
      const float dy = player.position.y - enemy.position.y;
      const float directionX = dx / playerDistance;
      const float directionY = dy / playerDistance;
      const float desiredDistance =
          ranged ? std::max(0.0F, playerDistance - keepAway) : playerDistance;
      const float step = std::min(enemy.speed * deltaSeconds, desiredDistance);
      const float nextX = enemy.position.x + (directionX * step);
      const float nextY = enemy.position.y + (directionY * step);
      if (canOccupy(nextX, enemy.position.y, kEntityRadius)) {
        enemy.position.x = nextX;
      }
      if (canOccupy(enemy.position.x, nextY, kEntityRadius)) {
        enemy.position.y = nextY;
      }
    }
    const float updatedDistance = distance(enemy.position, player.position);
    if (enemy.type == EnemyType::Intern || enemy.type == EnemyType::Manager ||
        enemy.type == EnemyType::Ceo) {
      if (updatedDistance <= kEnemyMeleeRange && enemy.attackCooldown <= 0.0F) {
        resolveEnemyAttack(enemy);
      }
    }
    if (ranged && updatedDistance <= kEnemySightDistance &&
        hasLineOfSight(enemy.position, player.position) &&
        enemy.projectileCooldown <= 0.0F) {
      const int damage = enemy.type == EnemyType::Ceo ? 12 : 8;
      spawnProjectile(enemy, damage);
      enemy.projectileCooldown = enemy.type == EnemyType::Ceo ? 1.0F : 2.0F;
    }
  }
}

void Game::updateProjectiles(float deltaSeconds) {
  for (Projectile& projectile : projectiles) {
    if (!projectile.active) {
      continue;
    }
    projectile.position.x += projectile.velocity.x * deltaSeconds;
    projectile.position.y += projectile.velocity.y * deltaSeconds;
    const int tileX = static_cast<int>(std::floor(projectile.position.x));
    const int tileY = static_cast<int>(std::floor(projectile.position.y));
    if (isSolidTile(tileX, tileY)) {
      projectile.active = false;
      continue;
    }
    if (distance(projectile.position, player.position) <=
        kPlayerRadius + 0.08F) {
      damagePlayer(projectile.damage);
      projectile.active = false;
    }
  }
  std::erase_if(projectiles, [](const Projectile& projectile) {
    return !projectile.active;
  });
}

void Game::collectPickups() {
  for (Pickup& pickup : pickups) {
    if (!pickup.active ||
        distance(pickup.position, player.position) > kPickupRadius) {
      continue;
    }
    switch (pickup.type) {
      case PickupType::Coffee:
        if (player.health >= kMaxHealth) {
          continue;
        }
        player.health = std::min(kMaxHealth, player.health + kCoffeeHealth);
        message = "COFFEE +25 HEALTH";
        break;
      case PickupType::Staples:
        if (player.staples >= kMaxStaples) {
          continue;
        }
        player.staples =
            std::min(kMaxStaples, player.staples + kStaplePickupCount);
        message = "STAPLES +20";
        break;
      case PickupType::Keycard:
        if (player.hasKeycard) {
          continue;
        }
        player.hasKeycard = true;
        message = "KEYCARD ACQUIRED";
        break;
      case PickupType::Bracelet:
        clockSeconds_ -= static_cast<double>(kBraceletSeconds);
        message = "FRIENDSHIP BRACELET -10 MIN";
        break;
    }
    messageTimer_ = 2.5F;
    pickup.active = false;
  }
}

void Game::openNearbyDoor() {
  for (int y = 0; y < kMapHeight; ++y) {
    for (int x = 0; x < kMapWidth; ++x) {
      if (tileAt(x, y) != 'D' || doorProgress[static_cast<std::size_t>(
                                     y)][static_cast<std::size_t>(x)] >= 1.0F) {
        continue;
      }
      if (distance(player.position, tileCenter(x, y)) <= kUseRadius) {
        doorProgress[static_cast<std::size_t>(y)][static_cast<std::size_t>(x)] =
            0.0001F;
        message = "DOOR OPEN";
        messageTimer_ = 1.5F;
        return;
      }
    }
  }
}

void Game::use() {
  for (int y = 0; y < kMapHeight; ++y) {
    for (int x = 0; x < kMapWidth; ++x) {
      const char tile = tileAt(x, y);
      if (tile == 'E' &&
          distance(player.position, tileCenter(x, y)) <= kUseRadius) {
        if (!player.hasKeycard) {
          message = "NEED THE KEYCARD";
          messageTimer_ = 2.0F;
          return;
        }
        finishLevel();
        return;
      }
    }
  }
  openNearbyDoor();
}

void Game::fire() {
  if (state != ScreenState::Playing || player.weaponCooldown > 0.0F) {
    return;
  }
  const bool stapler = player.staples > 0;
  const float range = stapler ? kStaplerRangeTiles : kKeyboardRangeTiles;
  player.weaponCooldown = stapler ? kStaplerCooldown : kKeyboardCooldown;
  if (stapler) {
    --player.staples;
  }
  const Vec2 direction{std::cos(player.angle), std::sin(player.angle)};
  float nearestDistance = range;
  Enemy* target = nullptr;
  for (Enemy& enemy : enemies) {
    if (!enemy.alive) {
      continue;
    }
    const float dx = enemy.position.x - player.position.x;
    const float dy = enemy.position.y - player.position.y;
    const float along = (dx * direction.x) + (dy * direction.y);
    const float perpendicular =
        std::abs((dx * direction.y) - (dy * direction.x));
    if (along <= 0.0F || along >= nearestDistance ||
        perpendicular > kEntityRadius ||
        !hasLineOfSight(player.position,
                        {player.position.x + (direction.x * along),
                         player.position.y + (direction.y * along)})) {
      continue;
    }
    nearestDistance = along;
    target = &enemy;
  }
  if (target != nullptr) {
    target->health -= stapler ? kStaplerDamage : 8;
    if (target->health <= 0) {
      target->alive = false;
      ++defeatedEnemies_;
    }
  }
}

void Game::damagePlayer(int amount, bool quickSync) {
  player.health = std::max(0, player.health - amount);
  if (quickSync) {
    clockSeconds_ += static_cast<double>(kQuickSyncSeconds);
    message = "QUICK SYNC +5 MIN";
    messageTimer_ = 2.0F;
  }
  if (player.health <= 0) {
    setLoseMessage();
  }
}

char Game::tileAt(int x, int y) const {
  if (x < 0 || y < 0 || x >= kMapWidth || y >= kMapHeight) {
    return '#';
  }
  return map[static_cast<std::size_t>(y)][static_cast<std::size_t>(x)];
}

bool Game::isBlocked(float x, float y, float radius) const {
  return !canOccupy(x, y, radius);
}

bool Game::hasLineOfSight(Vec2 from, Vec2 to) const {
  const float dx = to.x - from.x;
  const float dy = to.y - from.y;
  const float length = std::sqrt((dx * dx) + (dy * dy));
  if (length <= std::numeric_limits<float>::epsilon()) {
    return true;
  }
  const float stepLength = 0.08F;
  const int steps = static_cast<int>(std::ceil(length / stepLength));
  for (int step = 1; step < steps; ++step) {
    const float fraction = static_cast<float>(step) / static_cast<float>(steps);
    const int x = static_cast<int>(std::floor(from.x + (dx * fraction)));
    const int y = static_cast<int>(std::floor(from.y + (dy * fraction)));
    if (isSolidTile(x, y)) {
      return false;
    }
  }
  return true;
}

float Game::raycastDistance(float angle, float maxDistance) const {
  const float directionX = std::cos(angle);
  const float directionY = std::sin(angle);
  int mapX = static_cast<int>(std::floor(player.position.x));
  int mapY = static_cast<int>(std::floor(player.position.y));
  const float deltaX =
      directionX == 0.0F ? 1.0e30F : std::abs(1.0F / directionX);
  const float deltaY =
      directionY == 0.0F ? 1.0e30F : std::abs(1.0F / directionY);
  const int stepX = directionX < 0.0F ? -1 : 1;
  const int stepY = directionY < 0.0F ? -1 : 1;
  float sideDistanceX =
      directionX < 0.0F
          ? (player.position.x - static_cast<float>(mapX)) * deltaX
          : (static_cast<float>(mapX + 1) - player.position.x) * deltaX;
  float sideDistanceY =
      directionY < 0.0F
          ? (player.position.y - static_cast<float>(mapY)) * deltaY
          : (static_cast<float>(mapY + 1) - player.position.y) * deltaY;
  float hitDistance = maxDistance;
  for (int iteration = 0; iteration < kMapWidth * kMapHeight; ++iteration) {
    bool sideX = false;
    if (sideDistanceX < sideDistanceY) {
      sideDistanceX += deltaX;
      mapX += stepX;
      sideX = true;
    } else {
      sideDistanceY += deltaY;
      mapY += stepY;
    }
    if (isSolidTile(mapX, mapY)) {
      hitDistance = sideX ? sideDistanceX - deltaX : sideDistanceY - deltaY;
      break;
    }
    if (std::min(sideDistanceX, sideDistanceY) > maxDistance) {
      break;
    }
  }
  return std::min(hitDistance, maxDistance);
}

int Game::clockHour() const {
  const int seconds = static_cast<int>(clockSeconds_) % (24 * 60 * 60);
  return seconds / 3600;
}

int Game::clockMinute() const {
  const int seconds = static_cast<int>(clockSeconds_) % (60 * 60);
  return seconds / 60;
}

int Game::minutesToShow() const {
  return static_cast<int>(std::ceil(
      (static_cast<double>(kShowStartSeconds) - clockSeconds_) / 60.0));
}

std::string Game::clockText() const {
  const int hour24 = clockHour();
  const int hour12 = ((hour24 + 11) % 12) + 1;
  const int minutes = clockMinute();
  const std::string minuteText =
      minutes < 10 ? "0" + std::to_string(minutes) : std::to_string(minutes);
  return std::to_string(hour12) + ":" + minuteText + " PM";
}

std::string Game::ratingText() const {
  if (spareSeconds >= kFrontRowMinutes * 60.0F) {
    return "FRONT ROW";
  }
  if (spareSeconds >= kFloorSeatsMinutes * 60.0F) {
    return "FLOOR SEATS";
  }
  return "NOSEBLEEDS";
}

std::string Game::levelName() const { return levelName_; }

std::string Game::statusMessage() const {
  if (!message.empty()) {
    return message;
  }
  if (introTimer > 0.0F) {
    return levelName_;
  }
  return {};
}

int Game::enemiesDefeated() const { return defeatedEnemies_; }

bool Game::isSolidTile(int x, int y) const {
  const char tile = tileAt(x, y);
  if (tile == '#' || tile == 'C' || tile == 'G' || tile == 'W') {
    return true;
  }
  if (tile == 'D') {
    return doorProgress[static_cast<std::size_t>(y)]
                       [static_cast<std::size_t>(x)] < 1.0F;
  }
  return false;
}

bool Game::canOccupy(float x, float y, float radius) const {
  const std::array<Vec2, 8> offsets{{
      {-radius, -radius},
      {0.0F, -radius},
      {radius, -radius},
      {-radius, 0.0F},
      {radius, 0.0F},
      {-radius, radius},
      {0.0F, radius},
      {radius, radius},
  }};
  return std::ranges::all_of(offsets, [this, x, y](const Vec2& offset) {
    const int tileX = static_cast<int>(std::floor(x + offset.x));
    const int tileY = static_cast<int>(std::floor(y + offset.y));
    return !isSolidTile(tileX, tileY);
  });
}

void Game::loadLevel(std::size_t levelIndex) {
  const LevelDefinition& definition = kLevels[levelIndex];
  levelName_ = definition.name;
  enemies.clear();
  pickups.clear();
  projectiles.clear();
  doorProgress.fill({});
  for (int y = 0; y < kMapHeight; ++y) {
    const std::string_view row = definition.rows[static_cast<std::size_t>(y)];
    for (int x = 0; x < kMapWidth; ++x) {
      char& tile =
          map[static_cast<std::size_t>(y)][static_cast<std::size_t>(x)];
      tile = row[static_cast<std::size_t>(x)];
      const Vec2 position = tileCenter(x, y);
      switch (tile) {
        case 'P':
          player.position = position;
          tile = '.';
          break;
        case 'i':
          enemies.push_back(makeEnemy(EnemyType::Intern, position));
          tile = '.';
          break;
        case 'm':
          enemies.push_back(makeEnemy(EnemyType::Manager, position));
          tile = '.';
          break;
        case 'h':
          enemies.push_back(makeEnemy(EnemyType::Hr, position));
          tile = '.';
          break;
        case 'b':
          enemies.push_back(makeEnemy(EnemyType::Ceo, position));
          tile = '.';
          break;
        case 'c':
          pickups.push_back({PickupType::Coffee, position, true});
          tile = '.';
          break;
        case 's':
          pickups.push_back({PickupType::Staples, position, true});
          tile = '.';
          break;
        case 'k':
          pickups.push_back({PickupType::Keycard, position, true});
          tile = '.';
          break;
        case 'f':
          pickups.push_back({PickupType::Bracelet, position, true});
          tile = '.';
          break;
        default:
          break;
      }
    }
  }
}

void Game::resolveEnemyAttack(Enemy& enemy) {
  switch (enemy.type) {
    case EnemyType::Intern:
      damagePlayer(5);
      enemy.attackCooldown = 1.0F;
      break;
    case EnemyType::Manager:
      damagePlayer(10, true);
      enemy.attackCooldown = 1.5F;
      break;
    case EnemyType::Ceo:
      damagePlayer(20);
      enemy.attackCooldown = 1.0F;
      break;
    case EnemyType::Hr:
      break;
  }
}

void Game::spawnProjectile(const Enemy& enemy, int damage) {
  const float dx = player.position.x - enemy.position.x;
  const float dy = player.position.y - enemy.position.y;
  const float length = std::sqrt((dx * dx) + (dy * dy));
  if (length <= std::numeric_limits<float>::epsilon()) {
    return;
  }
  projectiles.push_back({enemy.position,
                         {(dx / length) * kEnemyProjectileSpeed,
                          (dy / length) * kEnemyProjectileSpeed},
                         damage,
                         true});
}

void Game::finishLevel() {
  if (currentLevel + 1U >= kLevelCount) {
    spareSeconds = static_cast<float>(static_cast<double>(kShowStartSeconds) -
                                      clockSeconds_);
    state = ScreenState::Win;
    message.clear();
    return;
  }
  startLevel(currentLevel + 1U);
}

void Game::setLoseMessage() {
  player.health = 0;
  state = ScreenState::Lose;
  message = "YOU GOT PULLED INTO A MEETING. GAME OVER.";
}

}
