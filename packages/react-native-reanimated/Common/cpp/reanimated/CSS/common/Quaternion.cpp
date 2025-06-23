#include <reanimated/CSS/common/Quaternion.h>

namespace reanimated::css {

bool Quaternion::operator==(const Quaternion &other) const {
  return x == other.x && y == other.y && z == other.z && w == other.w;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const Quaternion &quaternion) {
  os << "Quaternion(" << quaternion.x << ", " << quaternion.y << ", "
     << quaternion.z << ", " << quaternion.w << ")";
  return os;
}

#endif // NDEBUG

Quaternion Quaternion::interpolate(const double t, const Quaternion &other)
    const {
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

} // namespace reanimated::css
