#pragma once

#include <cstddef>
#include <cstdint>
#include <numbers>

namespace escape_office {

inline constexpr int kFramebufferWidth = 320;
inline constexpr int kFramebufferHeight = 200;
inline constexpr int kViewHeight = 160;
inline constexpr int kStatusBarHeight = 40;
inline constexpr int kTextGlyphWidth = 5;
inline constexpr int kTextGlyphHeight = 7;
inline constexpr int kTextAdvance = 6;
inline constexpr int kMapWidth = 24;
inline constexpr int kMapHeight = 24;
inline constexpr int kMaxHealth = 100;
inline constexpr int kMaxStaples = 200;
inline constexpr int kStartingStaples = 50;
inline constexpr int kEnemyWakeDistance = 12;
inline constexpr int kStaplerDamage = 15;
inline constexpr int kStaplerRange = 16;
inline constexpr int kCoffeeHealth = 25;
inline constexpr int kStaplePickupCount = 20;
inline constexpr int kKeycardRangeTenths = 15;
inline constexpr int kPickupRangeTenths = 5;
inline constexpr int kCollisionRadiusHundredths = 25;
inline constexpr int kPlayerWalkSpeedTenths = 30;
inline constexpr int kPlayerRunSpeedTenths = 50;
inline constexpr int kPlayerTurnSpeedTenths = 25;
inline constexpr int kGameSecondsPerRealSecond = 15;
inline constexpr int kStartingClockSeconds = 18 * 60 * 60 + 30 * 60;
inline constexpr int kShowStartSeconds = 20 * 60 * 60;
inline constexpr int kQuickSyncSeconds = 5 * 60;
inline constexpr int kBraceletSeconds = 10 * 60;
inline constexpr int kStaplerCooldownMilliseconds = 350;
inline constexpr int kKeyboardCooldownMilliseconds = 500;
inline constexpr int kDoorSlideMilliseconds = 500;
inline constexpr int kLevelIntroMilliseconds = 3000;
inline constexpr int kHealthClockLoss = 0;
inline constexpr float kPi = std::numbers::pi_v<float>;
inline constexpr float kPlayerRadius = 0.25F;
inline constexpr float kEntityRadius = 0.28F;
inline constexpr float kPickupRadius = 0.5F;
inline constexpr float kUseRadius = 1.5F;
inline constexpr float kPlayerWalkSpeed = 3.0F;
inline constexpr float kPlayerRunSpeed = 5.0F;
inline constexpr float kPlayerTurnSpeed = 2.5F;
inline constexpr float kStaplerRangeTiles = 16.0F;
inline constexpr float kKeyboardRangeTiles = 1.0F;
inline constexpr float kStaplerCooldown = 0.35F;
inline constexpr float kKeyboardCooldown = 0.5F;
inline constexpr float kDoorSlideDuration = 0.5F;
inline constexpr float kIntroDuration = 3.0F;
inline constexpr float kEnemySightDistance = 12.0F;
inline constexpr float kEnemyMeleeRange = 0.9F;
inline constexpr float kEnemyProjectileSpeed = 6.0F;
inline constexpr float kDistanceShadingStart = 3.0F;
inline constexpr float kDistanceShadingScale = 0.045F;
inline constexpr float kFrontRowMinutes = 20.0F;
inline constexpr float kFloorSeatsMinutes = 5.0F;
inline constexpr float kCameraPlaneScale = 0.66F;
inline constexpr float kVerticalFieldOfViewScale = 0.72F;
inline constexpr float kSpriteDepthOffset = 0.1F;
inline constexpr float kFloorPatternScale = 8.0F;
inline constexpr float kWallTextureScale = 8.0F;
inline constexpr float kMouseSensitivity = 0.0075F;
inline constexpr std::size_t kLevelCount = 3;

}
