#pragma once

#include <reanimated/NativeAnimations/NativeAnimationIdentity.h>

#include <react/renderer/graphics/Transform.h>

#include <variant>
#include <vector>

namespace reanimated::native_animation {

struct AnimationPoint {
  double x{0};
  double y{0};
};

struct AnimationSize {
  double width{0};
  double height{0};
};

/// Channels are in the range [0, 1].
struct AnimationColor {
  double red{0};
  double green{0};
  double blue{0};
  double alpha{0};
};

enum class TransformOperationKind : uint8_t {
  TranslateX,
  TranslateY,
  /// One factor for the three axes.
  Scale,
  ScaleX,
  ScaleY,
  RotateX,
  RotateY,
  RotateZ,
  Perspective,
};

/// A translation and a perspective are in points. A rotation is in radians and keeps its turns.
struct AnimationTransformOperation {
  TransformOperationKind kind;
  double value{0};
};

/// The operations of a style transform in the order of its array. Each operation of a track moves on its own
/// scalar, so the path of the matrix is the product of the operations at each time.
struct AnimationTransform {
  std::vector<AnimationTransformOperation> operations;
};

using AnimationValue = std::variant<double, AnimationPoint, AnimationSize, AnimationColor, AnimationTransform>;

/// The value that the view shows when the host admits the command.
struct CurrentVisualValue {};

/// The current visual value when the command replaces an active track on the target, else `otherwise`.
/// Only the host knows at admission if the earlier track still plays.
struct VisualValueIfInterrupting {
  AnimationValue otherwise;
};

using AnimationStart = std::variant<AnimationValue, CurrentVisualValue, VisualValueIfInterrupting>;

/// The tolerance of the semantic contract for a final host value.
inline constexpr double ENDPOINT_TOLERANCE = 0.01;

/// The tolerance for a matrix cell that is not a translation, and for an angle and a scale factor.
inline constexpr double MATRIX_CELL_TOLERANCE = 0.0001;

/// True when each component of the two values differs by at most `ENDPOINT_TOLERANCE`. Two transforms need
/// the same operation kinds; an angle and a scale factor can differ by at most `MATRIX_CELL_TOLERANCE`.
bool isSameValue(const AnimationValue &lhs, const AnimationValue &rhs);

bool hasSameOperationKinds(const AnimationTransform &lhs, const AnimationTransform &rhs);

/// The matrix that React Native gives a style transform with these operations and no transform origin.
facebook::react::Transform matrixOf(const AnimationTransform &transform);

/// True when the translation cells differ by at most `ENDPOINT_TOLERANCE` and each other cell by at most
/// `MATRIX_CELL_TOLERANCE`.
bool isSameMatrix(const facebook::react::Transform &lhs, const facebook::react::Transform &rhs);

bool valueMatchesTarget(const AnimationValue &value, AnimationTarget target);
bool isFinite(const AnimationValue &value);

} // namespace reanimated::native_animation
