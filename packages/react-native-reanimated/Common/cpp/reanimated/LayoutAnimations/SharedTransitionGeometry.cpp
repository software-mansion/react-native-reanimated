#include <react/renderer/components/view/ViewProps.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/LayoutAnimations/SharedTransitionGeometry.h>

#include <algorithm>
#include <array>

namespace reanimated {

namespace {
using css::TransformMatrix3D;

Frame interpolateFrame(const ShadowView &start, const ShadowView &target, double progress);
TransformMatrix3D::MatrixArray resolvedMatrix(const ShadowView &view);
TransformMatrix3D interpolateMatrix(
    const TransformMatrix3D::MatrixArray &start,
    const TransformMatrix3D::MatrixArray &target,
    double progress);
std::array<double, 3> transformOriginInPoints(const ShadowView &view);
double interpolate(double from, double to, double progress);
} // namespace

SharedTransitionGeometry
interpolateSharedTransitionGeometry(const ShadowView &start, const ShadowView &target, const double progress) {
  const auto matrix = interpolateMatrix(resolvedMatrix(start), resolvedMatrix(target), progress);
  const auto startOrigin = transformOriginInPoints(start);
  const auto targetOrigin = transformOriginInPoints(target);
  auto origin = folly::dynamic::array();
  for (size_t i = 0; i < startOrigin.size(); ++i) {
    origin.push_back(interpolate(startOrigin[i], targetOrigin[i], progress));
  }
  return {
      .frame = interpolateFrame(start, target, progress),
      .props = folly::dynamic::object(
          "transform", folly::dynamic::array(folly::dynamic::object("matrix", matrix.toDynamic())))(
          "transformOrigin", std::move(origin)),
  };
}

namespace {
Frame interpolateFrame(const ShadowView &start, const ShadowView &target, const double progress) {
  const auto &from = start.layoutMetrics.frame;
  const auto &to = target.layoutMetrics.frame;
  return {
      interpolate(from.origin.x, to.origin.x, progress),
      interpolate(from.origin.y, to.origin.y, progress),
      interpolate(from.size.width, to.size.width, progress),
      interpolate(from.size.height, to.size.height, progress)};
}

// Resolving the operations against the frame turns percent translates into points. The platform applies the
// transform origin.
TransformMatrix3D::MatrixArray resolvedMatrix(const ShadowView &view) {
  const auto transform =
      BaseViewProps::resolveTransform(view.layoutMetrics.frame.size, getViewProps(view).transform, TransformOrigin{});
  TransformMatrix3D::MatrixArray cells{};
  std::ranges::copy(transform.matrix, cells.begin());
  return cells;
}

// A singular matrix, for example a scale of 0, has no decomposition. Its cells are interpolated, as in
// interpolateMatrix of the gesture path.
TransformMatrix3D interpolateMatrix(
    const TransformMatrix3D::MatrixArray &start,
    const TransformMatrix3D::MatrixArray &target,
    const double progress) {
  if (progress == 0) {
    return TransformMatrix3D(start);
  }
  if (progress == 1 || start == target) {
    return TransformMatrix3D(target);
  }
  const auto from = TransformMatrix3D(start).decompose();
  const auto to = TransformMatrix3D(target).decompose();
  if (!from || !to) {
    TransformMatrix3D::MatrixArray cells{};
    for (size_t i = 0; i < cells.size(); ++i) {
      cells[i] = interpolate(start[i], target[i], progress);
    }
    return TransformMatrix3D(cells);
  }
  return TransformMatrix3D::recompose(from->interpolate(progress, *to));
}

// An unset transform origin is the center of the view, as in CSS.
std::array<double, 3> transformOriginInPoints(const ShadowView &view) {
  const auto &origin = getViewProps(view).transformOrigin;
  const auto &size = view.layoutMetrics.frame.size;
  const auto inPoints = [](const ValueUnit &value, const double length) -> double {
    if (value.unit == UnitType::Percent) {
      return length * value.value / 100;
    }
    if (value.unit == UnitType::Undefined) {
      return length * 0.5;
    }
    return value.value;
  };
  return {inPoints(origin.xy[0], size.width), inPoints(origin.xy[1], size.height), origin.z};
}

double interpolate(const double from, const double to, const double progress) {
  return from + progress * (to - from);
}
} // namespace

} // namespace reanimated
