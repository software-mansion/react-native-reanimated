#include <reanimated/CSS/common/vectors.h>

namespace reanimated::css {

double &Vector3D::operator[](const size_t idx) {
  return vec[idx];
}

const double &Vector3D::operator[](const size_t idx) const {
  return vec[idx];
}

Vector3D &Vector3D::operator*=(const double scalar) {
  vec[0] *= scalar;
  vec[1] *= scalar;
  vec[2] *= scalar;
  return *this;
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const Vector3D &vector) {
  os << "Vector3D(" << vector.vec[0] << ", " << vector.vec[1] << ", "
     << vector.vec[2] << ")";
  return os;
}

#endif // NDEBUG

double Vector3D::length() const {
  return std::hypot(vec[0], vec[1], vec[2]);
}

void Vector3D::scaleToLength(double targetLength) {
  double currentLength = length();
  if (currentLength != 0) {
    double factor = targetLength / currentLength;
    vec[0] *= factor;
    vec[1] *= factor;
    vec[2] *= factor;
  }
}

void Vector3D::normalize() {
  scaleToLength(1);
}

double Vector3D::dot(const Vector3D &other) const {
  return vec[0] * other.vec[0] + vec[1] * other.vec[1] + vec[2] * other.vec[2];
}

Vector3D Vector3D::cross(const Vector3D &other) const {
  return Vector3D{
      vec[1] * other.vec[2] - vec[2] * other.vec[1],
      vec[2] * other.vec[0] - vec[0] * other.vec[2],
      vec[0] * other.vec[1] - vec[1] * other.vec[0]};
}

Vector3D Vector3D::addScaled(const Vector3D &other, const double scale) const {
  return Vector3D{
      vec[0] + scale * other.vec[0],
      vec[1] + scale * other.vec[1],
      vec[2] + scale * other.vec[2]};
}

Vector3D Vector3D::interpolate(const double progress, const Vector3D &other)
    const {
  return Vector3D{
      vec[0] + progress * (other.vec[0] - vec[0]),
      vec[1] + progress * (other.vec[1] - vec[1]),
      vec[2] + progress * (other.vec[2] - vec[2])};
}

double &Vector4D::operator[](const size_t idx) {
  return vec[idx];
}

const double &Vector4D::operator[](const size_t idx) const {
  return vec[idx];
}

Vector4D Vector4D::interpolate(const double progress, const Vector4D &other)
    const {
  return Vector4D{
      vec[0] + progress * (other.vec[0] - vec[0]),
      vec[1] + progress * (other.vec[1] - vec[1]),
      vec[2] + progress * (other.vec[2] - vec[2]),
      vec[3] + progress * (other.vec[3] - vec[3])};
}

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const Vector4D &vector) {
  os << "Vector4D(" << vector.vec[0] << ", " << vector.vec[1] << ", "
     << vector.vec[2] << ", " << vector.vec[3] << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
