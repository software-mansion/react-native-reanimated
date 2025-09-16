#include <reanimated/CSS/common/transforms/vectors.h>

namespace reanimated::css {

// Vector2D

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const Vector2D &vector) {
  os << "Vector2D(" << vector.vec[0] << ", " << vector.vec[1] << ")";
  return os;
}

#endif // NDEBUG

void Vector2D::scaleToLength(double targetLength) {
  double currentLength = length();
  if (currentLength != 0) {
    double factor = targetLength / currentLength;
    vec[0] *= factor;
    vec[1] *= factor;
  }
}

void Vector2D::normalize() {
  scaleToLength(1);
}

// Vector3D

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const Vector3D &vector) {
  os << "Vector3D(" << vector.vec[0] << ", " << vector.vec[1] << ", "
     << vector.vec[2] << ")";
  return os;
}

#endif // NDEBUG

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

// Vector4D

#ifndef NDEBUG

std::ostream &operator<<(std::ostream &os, const Vector4D &vector) {
  os << "Vector4D(" << vector.vec[0] << ", " << vector.vec[1] << ", "
     << vector.vec[2] << ", " << vector.vec[3] << ")";
  return os;
}

#endif // NDEBUG

} // namespace reanimated::css
