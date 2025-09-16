#pragma once

#include <array>
#include <cmath>
#include <string>
#include <unordered_map>

#ifndef NDEBUG
#include <iostream>
#endif // NDEBUG

namespace reanimated::css {

struct Vector2D {
  std::array<double, 2> vec;

  Vector2D() : vec({0, 0}) {}
  explicit Vector2D(double x, double y) : vec({x, y}) {}
  explicit Vector2D(std::array<double, 2> vec) : vec(vec) {}

  // Inline simple operations
  inline double &operator[](size_t idx) {
    return vec[idx];
  }
  inline const double &operator[](size_t idx) const {
    return vec[idx];
  }

  inline Vector2D &operator*=(double scalar) {
    vec[0] *= scalar;
    vec[1] *= scalar;
    return *this;
  }

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const Vector2D &vector);
#endif // NDEBUG

  // Inline simple operations
  inline double length() const {
    return std::hypot(vec[0], vec[1]);
  }

  inline double dot(const Vector2D &other) const {
    return vec[0] * other.vec[0] + vec[1] * other.vec[1];
  }

  inline double cross(const Vector2D &other) const {
    return vec[0] * other.vec[1] - vec[1] * other.vec[0];
  }

  inline Vector2D addScaled(const Vector2D &other, double scale) const {
    return Vector2D{
        vec[0] + scale * other.vec[0], vec[1] + scale * other.vec[1]};
  }

  inline Vector2D interpolate(double progress, const Vector2D &other) const {
    return Vector2D{
        vec[0] + progress * (other.vec[0] - vec[0]),
        vec[1] + progress * (other.vec[1] - vec[1])};
  }

  void scaleToLength(double targetLength);
  void normalize();
};

struct Vector3D {
  std::array<double, 3> vec;

  Vector3D() : vec({0, 0, 0}) {}
  explicit Vector3D(double x, double y, double z) : vec({x, y, z}) {}
  explicit Vector3D(std::array<double, 3> vec) : vec(vec) {}

  // Inline simple operations
  inline double &operator[](size_t idx) {
    return vec[idx];
  }
  inline const double &operator[](size_t idx) const {
    return vec[idx];
  }

  inline Vector3D &operator*=(double scalar) {
    vec[0] *= scalar;
    vec[1] *= scalar;
    vec[2] *= scalar;
    return *this;
  }

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const Vector3D &vector);
#endif // NDEBUG

  // Inline simple operations
  inline double length() const {
    return std::hypot(vec[0], vec[1], vec[2]);
  }

  inline double dot(const Vector3D &other) const {
    return vec[0] * other.vec[0] + vec[1] * other.vec[1] +
        vec[2] * other.vec[2];
  }

  inline Vector3D cross(const Vector3D &other) const {
    return Vector3D{
        vec[1] * other.vec[2] - vec[2] * other.vec[1],
        vec[2] * other.vec[0] - vec[0] * other.vec[2],
        vec[0] * other.vec[1] - vec[1] * other.vec[0]};
  }

  inline Vector3D addScaled(const Vector3D &other, double scale) const {
    return Vector3D{
        vec[0] + scale * other.vec[0],
        vec[1] + scale * other.vec[1],
        vec[2] + scale * other.vec[2]};
  }

  inline Vector3D interpolate(double progress, const Vector3D &other) const {
    return Vector3D{
        vec[0] + progress * (other.vec[0] - vec[0]),
        vec[1] + progress * (other.vec[1] - vec[1]),
        vec[2] + progress * (other.vec[2] - vec[2])};
  }

  void scaleToLength(double targetLength);
  void normalize();
};

struct Vector4D {
  std::array<double, 4> vec;

  Vector4D() : vec({0, 0, 0, 0}) {}
  explicit Vector4D(double x, double y, double z, double w)
      : vec({x, y, z, w}) {}
  explicit Vector4D(std::array<double, 4> vec) : vec(vec) {}

  // Inline simple operations
  inline double &operator[](size_t idx) {
    return vec[idx];
  }
  inline const double &operator[](size_t idx) const {
    return vec[idx];
  }

#ifndef NDEBUG
  friend std::ostream &operator<<(std::ostream &os, const Vector4D &vector);
#endif // NDEBUG

  inline Vector4D interpolate(double progress, const Vector4D &other) const {
    return Vector4D{
        vec[0] + progress * (other.vec[0] - vec[0]),
        vec[1] + progress * (other.vec[1] - vec[1]),
        vec[2] + progress * (other.vec[2] - vec[2]),
        vec[3] + progress * (other.vec[3] - vec[3])};
  }
};

} // namespace reanimated::css
