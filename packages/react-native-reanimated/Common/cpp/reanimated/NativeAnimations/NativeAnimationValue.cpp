#include <reanimated/NativeAnimations/NativeAnimationValue.h>

#include <algorithm>
#include <cmath>
#include <cstdint>

namespace reanimated::native_animation {

namespace {

struct FiniteVisitor {
  bool operator()(const double value) const {
    return std::isfinite(value);
  }
  bool operator()(const AnimationPoint &point) const {
    return std::isfinite(point.x) && std::isfinite(point.y);
  }
  bool operator()(const AnimationSize &size) const {
    return std::isfinite(size.width) && std::isfinite(size.height);
  }
  bool operator()(const AnimationColor &color) const {
    return std::isfinite(color.red) && std::isfinite(color.green) && std::isfinite(color.blue) &&
        std::isfinite(color.alpha);
  }
};

bool isClose(const double lhs, const double rhs, const double tolerance = ENDPOINT_TOLERANCE) {
  return std::abs(lhs - rhs) <= tolerance;
}

bool isLength(const TransformOperationKind kind) {
  return kind == TransformOperationKind::TranslateX || kind == TransformOperationKind::TranslateY ||
      kind == TransformOperationKind::Perspective;
}

facebook::react::Transform matrixOf(const AnimationTransformOperation &operation) {
  using facebook::react::Transform;
  const auto value = static_cast<facebook::react::Float>(operation.value);
  switch (operation.kind) {
    case TransformOperationKind::TranslateX:
      return Transform::Translate(value, 0, 0);
    case TransformOperationKind::TranslateY:
      return Transform::Translate(0, value, 0);
    case TransformOperationKind::Scale:
      return Transform::Scale(value, value, value);
    case TransformOperationKind::ScaleX:
      return Transform::Scale(value, 1, 1);
    case TransformOperationKind::ScaleY:
      return Transform::Scale(1, value, 1);
    case TransformOperationKind::RotateX:
      return Transform::RotateX(value);
    case TransformOperationKind::RotateY:
      return Transform::RotateY(value);
    case TransformOperationKind::RotateZ:
      return Transform::RotateZ(value);
    case TransformOperationKind::Perspective:
      return Transform::Perspective(value);
  }
}

struct SameValueVisitor {
  bool operator()(const double lhs, const double rhs) const {
    return isClose(lhs, rhs);
  }
  bool operator()(const AnimationPoint &lhs, const AnimationPoint &rhs) const {
    return isClose(lhs.x, rhs.x) && isClose(lhs.y, rhs.y);
  }
  bool operator()(const AnimationSize &lhs, const AnimationSize &rhs) const {
    return isClose(lhs.width, rhs.width) && isClose(lhs.height, rhs.height);
  }
  bool operator()(const AnimationColor &lhs, const AnimationColor &rhs) const {
    return isClose(lhs.red, rhs.red) && isClose(lhs.green, rhs.green) && isClose(lhs.blue, rhs.blue) &&
        isClose(lhs.alpha, rhs.alpha);
  }
  template <typename Lhs, typename Rhs>
  bool operator()(const Lhs &, const Rhs &) const {
    return false;
  }
};

/// A translation cell has the tolerance of a length.
bool isSameCell(const facebook::react::Transform &lhs, const facebook::react::Transform &rhs, const size_t cell) {
  constexpr size_t firstTranslationCell = 12;
  constexpr size_t lastTranslationCell = 14;
  const bool isTranslation = cell >= firstTranslationCell && cell <= lastTranslationCell;
  return isClose(lhs.matrix[cell], rhs.matrix[cell], isTranslation ? ENDPOINT_TOLERANCE : MATRIX_CELL_TOLERANCE);
}

} // namespace

bool isSameValue(const AnimationValue &lhs, const AnimationValue &rhs) {
  return std::visit(SameValueVisitor{}, lhs, rhs);
}

bool isSameOperationValue(const TransformOperationKind kind, const double lhs, const double rhs) {
  return isClose(lhs, rhs, isLength(kind) ? ENDPOINT_TOLERANCE : MATRIX_CELL_TOLERANCE);
}

facebook::react::Transform matrixOf(const AnimationTransform &transform) {
  facebook::react::Transform matrix;
  for (const auto &operation : transform.operations) {
    matrix = matrix * matrixOf(operation);
  }
  return matrix;
}

bool isSameMatrix(const facebook::react::Transform &lhs, const facebook::react::Transform &rhs) {
  for (size_t cell = 0; cell < lhs.matrix.size(); ++cell) {
    if (!isSameCell(lhs, rhs, cell)) {
      return false;
    }
  }
  return true;
}

bool isSameAffine2DMatrix(const facebook::react::Transform &lhs, const facebook::react::Transform &rhs) {
  return std::ranges::all_of(AFFINE_2D_MATRIX_CELLS, [&](const size_t cell) { return isSameCell(lhs, rhs, cell); });
}

bool hasSizeDependentTransform(const facebook::react::ViewProps &viewProps) {
  using namespace facebook::react;
  return viewProps.transformOrigin.isSet() ||
      std::ranges::any_of(viewProps.transform.operations, [](const TransformOperation &operation) {
           return operation.x.unit == UnitType::Percent || operation.y.unit == UnitType::Percent;
         });
}

bool valueMatchesTarget(const AnimationValue &value, const AnimationTarget target) {
  switch (target) {
    case AnimationTarget::Position:
      return std::holds_alternative<AnimationPoint>(value);
    case AnimationTarget::Size:
    case AnimationTarget::ShadowOffset:
      return std::holds_alternative<AnimationSize>(value);
    case AnimationTarget::BackgroundColor:
    case AnimationTarget::BorderColor:
    case AnimationTarget::ShadowColor:
      return std::holds_alternative<AnimationColor>(value);
    case AnimationTarget::Opacity:
    case AnimationTarget::PositionX:
    case AnimationTarget::PositionY:
    case AnimationTarget::Width:
    case AnimationTarget::Height:
    case AnimationTarget::BorderRadius:
    case AnimationTarget::ShadowOpacity:
    case AnimationTarget::ShadowRadius:
      return std::holds_alternative<double>(value);
    case AnimationTarget::Transform:
      return false;
  }
  return false;
}

bool isFinite(const AnimationValue &value) {
  return std::visit(FiniteVisitor{}, value);
}

double packedColorOf(const AnimationColor &color) {
  const auto toByte = [](const double channel) {
    return static_cast<uint32_t>(std::lround(std::clamp(channel, 0.0, 1.0) * 255.0));
  };
  const uint32_t packed =
      (toByte(color.alpha) << 24) | (toByte(color.red) << 16) | (toByte(color.green) << 8) | toByte(color.blue);
  return static_cast<double>(packed);
}

} // namespace reanimated::native_animation
