#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <array>
#include <cmath>
#include <iostream>
#include <string>
#include <unordered_map>

namespace reanimated {

struct Vector3D {
  std::array<double, 3> vec;

  Vector3D() : vec({0, 0, 0}) {}
  explicit Vector3D(double x, double y, double z) : vec({x, y, z}) {}
  explicit Vector3D(std::array<double, 3> vec) : vec(vec) {}

  double &operator[](size_t idx);
  const double &operator[](size_t idx) const;
  Vector3D &operator*=(double scalar);
  friend std::ostream &operator<<(std::ostream &os, const Vector3D &vector);

  double length() const;
  void scaleToLength(double targetLength);
  void normalize();
  double dot(const Vector3D &other) const;
  Vector3D cross(const Vector3D &other) const;
  Vector3D addScaled(const Vector3D &other, double scale) const;
  Vector3D interpolate(double progress, const Vector3D &other) const;
};

struct Vector4D {
  std::array<double, 4> vec;

  Vector4D() : vec({0, 0, 0, 0}) {}
  explicit Vector4D(double x, double y, double z, double w)
      : vec({x, y, z, w}) {}
  explicit Vector4D(std::array<double, 4> vec) : vec(vec) {}

  double &operator[](size_t idx);
  const double &operator[](size_t idx) const;
  friend std::ostream &operator<<(std::ostream &os, const Vector4D &vector);

  Vector4D interpolate(double progress, const Vector4D &other) const;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
