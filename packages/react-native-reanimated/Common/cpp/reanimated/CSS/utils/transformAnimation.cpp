#include <reanimated/CSS/utils/transformAnimation.h>

#include <reanimated/CSS/InterpolatorRegistry.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/interpolation/transforms/TransformsStyleInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>
#include <reanimated/CSS/interpolation/transforms/operations/scale.h>
#include <reanimated/CSS/interpolation/transforms/operations/translate.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/utils/interpolators.h>

#include <array>
#include <optional>
#include <utility>
#include <vector>

namespace reanimated::css {

namespace {

// Drives a single PropertyInterpolator::interpolate call to a fixed point on
// the from-to curve. The progress provider API is built for keyframed
// animations spanning multiple offsets; transitions only ever have a single
// keyframe pair, so both methods return the same value.
class FixedProgressProvider final : public KeyframeProgressProvider {
 public:
  explicit FixedProgressProvider(const double progress) : progress_(progress) {}

  double getGlobalProgress() const override {
    return progress_;
  }

  double getKeyframeProgress(const double fromOffset, const double toOffset) const override {
    if (toOffset == fromOffset) {
      return 0;
    }
    return (progress_ - fromOffset) / (toOffset - fromOffset);
  }

 private:
  const double progress_;
};

// CSS spec maps translate-percent to "self width" for X, "self height" for Y.
// Mirrors the relative-property config registered for `transform` in
// InterpolatorRegistry.cpp.
const std::string *dimensionPropertyForTranslate(const std::string &operationName) {
  static const std::string kWidth = "width";
  static const std::string kHeight = "height";
  if (operationName == "translateX") {
    return &kWidth;
  }
  if (operationName == "translateY") {
    return &kHeight;
  }
  return nullptr;
}

// Percent translates in transition endpoints are routed to the loop, but they
// can still surface here through a missing endpoint whose view-style fallback
// contains a percent translate. Core Animation can't resolve those, so
// substitute an absolute value computed against the live frame dimension -
// the same source the loop side reads, just resolved once at run time.
folly::dynamic resolveTranslatePercentInPlace(
    folly::dynamic operation,
    const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  if (!operation.isObject() || operation.size() != 1) {
    return operation;
  }
  const auto &item = *operation.items().begin();
  const auto &name = item.first.getString();
  const auto &value = item.second;
  if (!value.isString()) {
    return operation;
  }
  const auto *dimensionProp = dimensionPropertyForTranslate(name);
  if (dimensionProp == nullptr) {
    return operation;
  }
  const auto &str = value.getString();
  if (str.empty() || str.back() != '%') {
    return operation;
  }
  const double percent = std::stod(str.substr(0, str.size() - 1)) / 100.0;
  const jsi::Value dimensionValue = viewStylesRepository->getNodeProp(shadowNode, *dimensionProp);
  const double resolved = dimensionValue.isNumber() ? percent * dimensionValue.getNumber() : 0.0;
  return folly::dynamic::object(name, resolved);
}

TransformOperations parseResolvedOperations(
    const folly::dynamic &value,
    const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  TransformOperations result;
  result.reserve(value.size());
  for (const auto &operation : value) {
    result.emplace_back(
        TransformOperation::fromDynamic(resolveTranslatePercentInPlace(operation, shadowNode, viewStylesRepository)));
  }
  return result;
}

std::shared_ptr<TransformsStyleInterpolator> createTransformInterpolator(
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  // The "transform" factory always produces a TransformsStyleInterpolator
  // (the transforms(...) record in InterpolatorRegistry).
  return std::static_pointer_cast<TransformsStyleInterpolator>(
      createPropertyInterpolator("transform", {}, getComponentInterpolators(componentName), viewStylesRepository));
}

folly::dynamic interpolateAt(
    const std::shared_ptr<PropertyInterpolator> &interpolator,
    const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
    const double easedProgress) {
  const auto progressProvider = std::make_shared<FixedProgressProvider>(easedProgress);
  return interpolator->interpolate(shadowNode, progressProvider, 0.0);
}

TransformMatrixArray matrixToArray(const TransformMatrix3D &matrix) {
  TransformMatrixArray result;
  for (size_t i = 0; i < result.size(); ++i) {
    result[i] = matrix[i];
  }
  return result;
}

// Identity matrix translated by `offset` - the building block for baking a
// transform-origin into the composed matrices and per-operation stack.
TransformMatrix3D translationMatrix(const std::array<double, 3> &offset) {
  TransformMatrix3D matrix;
  matrix.translate3d(Vector3D(offset[0], offset[1], offset[2]));
  return matrix;
}

template <typename TOperation>
double operationValue(const StyleOperation &operation) {
  return static_cast<const TOperation &>(operation).value.value;
}

TransformMatrixArray operationMatrix(const StyleOperation &operation) {
  const auto matrix = static_cast<const TransformOperation &>(operation).toMatrix(/* force3D */ true);
  return matrixToArray(static_cast<const TransformMatrix3D &>(*matrix));
}

// Appends the segments for one interpolation pair. Returns false only for
// matrix operations, which appear in paired output solely as the pairing's
// whole-list fallback marker - the whole transition then animates as composed
// matrices.
bool appendFunctionSegments(
    std::vector<TransformSegment> &segments,
    const StyleOperation &fromOperation,
    const StyleOperation &toOperation) {
  switch (static_cast<TransformOp>(fromOperation.type)) {
    case TransformOp::Rotate:
      segments.push_back(
          TransformScalarSegment{
              TransformFunctionType::RotateZ,
              operationValue<RotateOperation>(fromOperation),
              operationValue<RotateOperation>(toOperation)});
      return true;
    case TransformOp::RotateZ:
      segments.push_back(
          TransformScalarSegment{
              TransformFunctionType::RotateZ,
              operationValue<RotateZOperation>(fromOperation),
              operationValue<RotateZOperation>(toOperation)});
      return true;
    case TransformOp::RotateX:
      segments.push_back(
          TransformScalarSegment{
              TransformFunctionType::RotateX,
              operationValue<RotateXOperation>(fromOperation),
              operationValue<RotateXOperation>(toOperation)});
      return true;
    case TransformOp::RotateY:
      segments.push_back(
          TransformScalarSegment{
              TransformFunctionType::RotateY,
              operationValue<RotateYOperation>(fromOperation),
              operationValue<RotateYOperation>(toOperation)});
      return true;
    case TransformOp::Scale:
      // Uniform scale must keep the z axis (RN renders {scale: v} as
      // diag(v, v, v)) - the renderer maps it to the 3-component
      // kCAValueFunctionScale.
      segments.push_back(
          TransformScalarSegment{
              TransformFunctionType::Scale,
              operationValue<ScaleOperation>(fromOperation),
              operationValue<ScaleOperation>(toOperation)});
      return true;
    case TransformOp::ScaleX:
      segments.push_back(
          TransformScalarSegment{
              TransformFunctionType::ScaleX,
              operationValue<ScaleXOperation>(fromOperation),
              operationValue<ScaleXOperation>(toOperation)});
      return true;
    case TransformOp::ScaleY:
      segments.push_back(
          TransformScalarSegment{
              TransformFunctionType::ScaleY,
              operationValue<ScaleYOperation>(fromOperation),
              operationValue<ScaleYOperation>(toOperation)});
      return true;
    case TransformOp::TranslateX:
      segments.push_back(
          TransformScalarSegment{
              TransformFunctionType::TranslateX,
              operationValue<TranslateXOperation>(fromOperation),
              operationValue<TranslateXOperation>(toOperation)});
      return true;
    case TransformOp::TranslateY:
      segments.push_back(
          TransformScalarSegment{
              TransformFunctionType::TranslateY,
              operationValue<TranslateYOperation>(fromOperation),
              operationValue<TranslateYOperation>(toOperation)});
      return true;
    case TransformOp::SkewX:
    case TransformOp::SkewY:
    case TransformOp::Perspective:
      // No CAValueFunction exists for these - their endpoint matrices animate
      // additively in place, keeping the rest of the list per-operation.
      segments.push_back(TransformMatrixSegment{operationMatrix(fromOperation), operationMatrix(toOperation)});
      return true;
    case TransformOp::Matrix:
      return false;
  }
  return false;
}

bool buildFunctionSegments(
    std::vector<TransformSegment> &segments,
    const StyleOperations &fromOperations,
    const StyleOperations &toOperations) {
  segments.reserve(fromOperations.size());
  for (size_t i = 0; i < fromOperations.size(); ++i) {
    // Paired operations always have matching types (conversions applied by
    // the pairing) - bail to matrices if that invariant ever breaks.
    if (fromOperations[i]->type != toOperations[i]->type ||
        !appendFunctionSegments(segments, *fromOperations[i], *toOperations[i])) {
      segments.clear();
      return false;
    }
  }
  return true;
}

// True when any transform operation can't be expressed in the additive
// CAValueFunction stack: percent translates (need per-frame dimension
// resolution) or perspective (non-affine m34 term).
bool transformOperationsRoutable(const TransformOperations &operations) {
  for (const auto &operation : operations) {
    if (operation->shouldResolve() || static_cast<TransformOp>(operation->type) == TransformOp::Perspective) {
      return false;
    }
  }
  return true;
}

// Parses a transform endpoint array; nullopt means parse failure or an
// unroutable operation. A null endpoint is the "none" default - an empty
// (and therefore routable) operation list.
std::optional<bool> transformEndpointRoutable(const folly::dynamic &value) {
  if (value.isNull()) {
    return true;
  }
  if (!value.isArray()) {
    return std::nullopt;
  }
  // Parse failures (unknown operation, malformed value) make the value
  // unroutable rather than throwing; the loop side surfaces such errors.
  try {
    TransformOperations operations;
    operations.reserve(value.size());
    for (const auto &operation : value) {
      operations.emplace_back(TransformOperation::fromDynamic(operation));
    }
    return transformOperationsRoutable(operations);
  } catch (...) {
    return std::nullopt;
  }
}

} // namespace

bool isTransformRoutable(const folly::dynamic &fromValue, const folly::dynamic &toValue) {
  const auto fromRoutable = transformEndpointRoutable(fromValue);
  const auto toRoutable = transformEndpointRoutable(toValue);
  return fromRoutable.value_or(false) && toRoutable.value_or(false);
}

TransformAnimationPlan buildTransformAnimationPlan(
    const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const folly::dynamic &fromValue,
    const folly::dynamic &toValue) {
  auto fromOperations = parseResolvedOperations(fromValue, shadowNode, viewStylesRepository);
  auto toOperations = parseResolvedOperations(toValue, shadowNode, viewStylesRepository);

  // A transform-origin moves the pivot away from the layer center. RN bakes it
  // as Translate(+offset) * M * Translate(-offset) (BaseViewProps::resolveTransform);
  // we apply the same bake to the composed matrices and, on the per-operation
  // path, bracket the stack with the matching translate segments. The offset is
  // resolved against the current frame once per transition (unlike the loop, a
  // mid-transition resize is not re-baked - the same trade-off as percent translates).
  const auto originOffset = viewStylesRepository->getTransformOriginOffset(shadowNode);
  std::optional<TransformMatrix3D> originPositive;
  std::optional<TransformMatrix3D> originNegative;
  if (originOffset) {
    originPositive = translationMatrix(*originOffset);
    originNegative = translationMatrix({-(*originOffset)[0], -(*originOffset)[1], -(*originOffset)[2]});
  }
  const auto bakeOrigin = [&](const TransformMatrix3D &matrix) -> TransformMatrixArray {
    return originOffset ? matrixToArray(*originPositive * matrix * *originNegative) : matrixToArray(matrix);
  };

  TransformAnimationPlan plan;
  plan.targetMatrix = bakeOrigin(matrixFromOperations3D(toOperations));

  const auto interpolator = createTransformInterpolator(componentName, viewStylesRepository);
  const auto interpolationPair = interpolator->createInterpolationPair(
      StyleOperations(fromOperations.begin(), fromOperations.end()),
      StyleOperations(toOperations.begin(), toOperations.end()));

  if (interpolationPair.has_value() &&
      buildFunctionSegments(plan.segments, interpolationPair->first, interpolationPair->second)) {
    if (!originOffset) {
      return plan;
    }
    const auto &offset = *originOffset;
    if (offset[2] == 0.0) {
      // Bracket the additive stack with the origin translate so the operations
      // pivot about the origin, matching the baked targetMatrix above. The
      // bracket uses value-function translate segments (matrix segments do not
      // compose reliably in CA's additive stack); empirically the stack composes
      // them so that the leading segment is the OUTER (post-rotation) factor, so
      // a leading T(+offset) and a trailing T(-offset) render as
      // Translate(+offset) * M * Translate(-offset).
      plan.segments.insert(
          plan.segments.begin(), TransformScalarSegment{TransformFunctionType::TranslateY, offset[1], offset[1]});
      plan.segments.insert(
          plan.segments.begin(), TransformScalarSegment{TransformFunctionType::TranslateX, offset[0], offset[0]});
      plan.segments.push_back(TransformScalarSegment{TransformFunctionType::TranslateX, -offset[0], -offset[0]});
      plan.segments.push_back(TransformScalarSegment{TransformFunctionType::TranslateY, -offset[1], -offset[1]});
      return plan;
    }
    // A z-origin can't ride the value-function translate bracket; drop to the
    // baked-matrix fallback below, which carries the full 3D offset.
    plan.segments.clear();
  }

  plan.fromMatrix = bakeOrigin(matrixFromOperations3D(fromOperations));
  return plan;
}

std::pair<folly::dynamic, folly::dynamic> resolveTransformEndpoints(
    const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    folly::dynamic fromValue,
    folly::dynamic toValue) {
  // Empty arrays parse to the same "missing" state as null inside the
  // interpolator (parseStyleOperations returns nullopt for both).
  const auto isMissing = [](const folly::dynamic &value) {
    return value.isNull() || (value.isArray() && value.empty());
  };
  const auto fromMissing = isMissing(fromValue);
  const auto toMissing = isMissing(toValue);
  if (!fromMissing && !toMissing) {
    return {std::move(fromValue), std::move(toValue)};
  }
  const auto interpolator = createTransformInterpolator(componentName, viewStylesRepository);
  interpolator->updateKeyframes(fromValue, toValue);
  if (fromMissing) {
    fromValue = interpolateAt(interpolator, shadowNode, 0.0);
  }
  if (toMissing) {
    toValue = interpolateAt(interpolator, shadowNode, 1.0);
  }
  return {std::move(fromValue), std::move(toValue)};
}

folly::dynamic interpolateTransformValueAt(
    const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const folly::dynamic &fromValue,
    const folly::dynamic &toValue,
    const double easedProgress) {
  const auto interpolator = createTransformInterpolator(componentName, viewStylesRepository);
  interpolator->updateKeyframes(fromValue, toValue);
  return interpolateAt(interpolator, shadowNode, easedProgress);
}

} // namespace reanimated::css
