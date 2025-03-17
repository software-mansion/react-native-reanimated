#pragma once

#include <array>
#include <cmath>
#include <string>
#include <unordered_map>

#ifndef NDEBUG
#include <iostream>
#endif // NDEBUG

namespace reanimated::css {

struct Vector3D {
  std::array<double, 3> vec;

  Vector3D() : vec({0, 0, 0}) {}
  explicit Vector3D(double x, double y, double z) : vec({x, y, z}) {}
  explicit Vector3D(std::array<double, 3> vec) : vec(vec) {}

  double &operator[](size_t idx);
  const double &operator[](size_t idx) const;
  Vector3D &operator*=(double scalar);

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const Vector3D &vector);
#endif // NDEBUG

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

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const Vector4D &vector);
#endif // NDEBUG

  Vector4D interpolate(double progress, const Vector4D &other) const;
};

} // namespace reanimated::css
