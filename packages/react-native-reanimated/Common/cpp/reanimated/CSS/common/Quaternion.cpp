#pragma once

#include <reanimated/CSS/common/Quaternion.h>

namespace reanimated {

Quaternion Quaternion::slerp(const Quaternion &other, double t) {
  const double kEpsilon = 1e-5;
  Quaternion copy = *this;

  double cosHalfAngle =
      copy.x * other.x + copy.y * other.y + copy.z * other.z + copy.w * other.w;

  if (cosHalfAngle < 0.0) {
    copy.x = -copy.x;
    copy.y = -copy.y;
    copy.z = -copy.z;
    copy.w = -copy.w;
    cosHalfAngle = -cosHalfAngle;
  }

  if (cosHalfAngle > 1)
    cosHalfAngle = 1;

  double sinHalfAngle = std::sqrt(1.0 - cosHalfAngle * cosHalfAngle);
  if (sinHalfAngle < kEpsilon) {
    // Quaternions share common axis and angle.
    return *this;
  }

  double halfAngle = std::acos(cosHalfAngle);
  double scale = std::sin((1 - t) * halfAngle) / sinHalfAngle;
  double invscale = std::sin(t * halfAngle) / sinHalfAngle;

  return {
      copy.x * scale + other.x * invscale,
      copy.y * scale + other.y * invscale,
      copy.z * scale + other.z * invscale,
      copy.w * scale + other.w * invscale};
}

Quaternion Quaternion::accumulate(const Quaternion &other) {
  return {
      w * other.x + x * other.w + y * other.z - z * other.y,
      w * other.y - x * other.z + y * other.w + z * other.x,
      w * other.z + x * other.y - y * other.x + z * other.w,
      w * other.w - x * other.x - y * other.y - z * other.z};
}

Quaternion Quaternion::interpolate(const Quaternion &other, double progress) {
  return slerp(other, progress);
}

} // namespace reanimated
