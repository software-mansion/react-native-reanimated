#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/interpolation/transforms/operations/skew.h>

#include <algorithm>
#include <cmath>
#include <iomanip>
#include <limits>
#include <sstream>

#include <string>

namespace reanimated::css {

namespace {
folly::dynamic preciseAngle(double radians) {
  std::ostringstream stream;
  stream << std::fixed << std::setprecision(std::numeric_limits<double>::max_digits10) << radians << "rad";
  return stream.str();
}
} // namespace

template <TransformOp TOperation>
SkewOperationBase<TOperation>::SkewOperationBase(const std::string &value)
    : TransformOperationBase<TOperation, CSSAngle>(CSSAngle(value)) {}

template struct SkewOperationBase<TransformOp::SkewX>;
template struct SkewOperationBase<TransformOp::SkewY>;

SkewAngles SkewAngles::interpolate(double progress, const SkewAngles &to) const {
  return {x.interpolate(progress, to.x), y.interpolate(progress, to.y)};
}

SkewOperation::SkewOperation(SkewAngles angles) : TransformOperation(TransformOp::Skew), value(angles) {}

SkewOperation::SkewOperation(const folly::dynamic &angles)
    : SkewOperation(SkewAngles{CSSAngle(angles.at(0)), CSSAngle(angles.at(1))}) {}

SkewOperation::SkewOperation(jsi::Runtime &rt, const jsi::Value &angles)
    : SkewOperation(SkewAngles{
          CSSAngle(rt, angles.asObject(rt).asArray(rt).getValueAtIndex(rt, 0)),
          CSSAngle(rt, angles.asObject(rt).asArray(rt).getValueAtIndex(rt, 1))}) {}

TransformMatrix::Shared SkewOperation::toMatrix(bool force3D) const {
  if (force3D) {
    auto matrix = std::make_shared<TransformMatrix3D>();
    (*matrix)[1] = std::tan(value.y.value);
    (*matrix)[4] = std::tan(value.x.value);
    return matrix;
  }
  auto matrix = std::make_shared<TransformMatrix2D>();
  (*matrix)[1] = std::tan(value.y.value);
  (*matrix)[3] = std::tan(value.x.value);
  return matrix;
}

folly::dynamic SkewOperation::valueToDynamic() const {
  return folly::dynamic::array(preciseAngle(value.x.value), preciseAngle(value.y.value));
}

bool SkewOperation::areValuesEqual(const StyleOperation &other) const {
  return typeid(*this) == typeid(other) && value == static_cast<const SkewOperation &>(other).value;
}

std::optional<folly::dynamic> lowerSkewTransforms(const folly::dynamic &transforms) {
  if (!transforms.isArray() || !std::any_of(transforms.begin(), transforms.end(), [](const auto &operation) {
        return operation.isObject() && operation.count("skew");
      })) {
    return std::nullopt;
  }
  folly::dynamic result = folly::dynamic::array;
  for (const auto &transform : transforms) {
    if (!transform.isObject() || !transform.count("skew")) {
      result.push_back(transform);
      continue;
    }
    const SkewOperation skew(transform.at("skew"));
    const double x = std::tan(skew.value.x.value);
    const double y = std::tan(skew.value.y.value);
    const double scaleX = std::hypot(1.0, y);
    // QR factorization, including zero and negative determinants. No matrix
    // operation is emitted because Fabric rejects matrices with siblings.
    result.push_back(folly::dynamic::object("rotate", preciseAngle(std::atan(y))));
    result.push_back(folly::dynamic::object("scaleX", scaleX));
    result.push_back(folly::dynamic::object("scaleY", (1 - x * y) / scaleX));
    result.push_back(folly::dynamic::object("skewX", preciseAngle(std::atan((x + y) / (1 + y * y)))));
  }
  return result;
}

folly::dynamic lowerSkewProps(const folly::dynamic &props) {
  auto result = props;
  if (auto transform = result.get_ptr("transform")) {
    if (auto lowered = lowerSkewTransforms(*transform)) {
      *transform = std::move(*lowered);
    }
  }
  return result;
}

} // namespace reanimated::css
