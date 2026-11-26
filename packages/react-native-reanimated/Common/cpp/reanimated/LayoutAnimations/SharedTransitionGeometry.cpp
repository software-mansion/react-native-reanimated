#include <react/renderer/components/text/ParagraphShadowNode.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/Compat/ReactNativeVersionCompat.h>
#include <reanimated/Compat/ReactNativeView.h>
#include <reanimated/LayoutAnimations/SharedTransitionGeometry.h>

#include <algorithm>
#include <array>
#include <cmath>

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
bool isText(const ShadowView &view);
Float fontSizeOf(const TextAttributes &attributes);
Float drawnFontSize(const ShadowView &text);
} // namespace

SharedTransitionGeometry interpolateSharedTransitionGeometry(
    const ShadowView &start,
    const ShadowView &target,
    const double progress,
    const Float baseOpacity) {
  const auto matrix = interpolateMatrix(resolvedMatrix(start), resolvedMatrix(target), progress);
  const auto startOrigin = transformOriginInPoints(start);
  const auto targetOrigin = transformOriginInPoints(target);
  auto origin = folly::dynamic::array();
  for (size_t i = 0; i < startOrigin.size(); ++i) {
    origin.push_back(interpolate(startOrigin[i], targetOrigin[i], progress));
  }
  folly::dynamic props =
      folly::dynamic::object("transform", folly::dynamic::array(folly::dynamic::object("matrix", matrix.toDynamic())))(
          "transformOrigin", std::move(origin));
  const auto startOpacity = getViewProps(start).opacity;
  const auto targetOpacity = getViewProps(target).opacity;
  if (startOpacity != targetOpacity || baseOpacity != targetOpacity) {
    props["opacity"] = std::clamp(interpolate(startOpacity, targetOpacity, progress), 0.0, 1.0);
  }
  return {.frame = interpolateFrame(start, target, progress), .props = std::move(props)};
}

std::optional<Float> textFontSizeAt(const ShadowView &start, const ShadowView &target, const double progress) {
  if (!isText(target)) {
    return std::nullopt;
  }
  const auto startFontSize = drawnFontSize(isText(start) ? start : target);
  const auto targetFontSize = fontSizeOf(std::static_pointer_cast<const ParagraphProps>(target.props)->textAttributes);
  return interpolate(startFontSize, targetFontSize, progress);
}

std::optional<double> sizeProgress(const ShadowView &start, const ShadowView &target, const Frame &frame) {
  const auto &from = start.layoutMetrics.frame.size;
  const auto &to = target.layoutMetrics.frame.size;
  const bool byWidth = std::abs(to.width - from.width) >= std::abs(to.height - from.height);
  const auto current = byWidth ? frame.width : frame.height;
  const auto startSize = byWidth ? from.width : from.height;
  const auto change = (byWidth ? to.width : to.height) - startSize;
  if (!current || std::abs(change) < 0.5 / target.layoutMetrics.pointScaleFactor) {
    return std::nullopt;
  }
  return (*current - startSize) / change;
}

State::Shared textStateWithFontSize(const ShadowView &text, const Float fontSize) {
#if REACT_NATIVE_VERSION_MINOR < 89
  // Before React Native 0.89, the paragraph state has no layout size on iOS and its prepared layout has no point
  // scale factor on Android.
  return nullptr;
#else
  if (!isText(text)) {
    return nullptr;
  }
  const auto ownFontSize = drawnFontSize(text);
  if (ownFontSize <= 0 || fontSize == ownFontSize) {
    return nullptr;
  }
  const auto scale = fontSize / ownFontSize;
  const auto scaleSizes = [scale](TextAttributes &attributes) {
    attributes.fontSize *= scale;
    attributes.lineHeight *= scale;
    attributes.letterSpacing *= scale;
  };
  const auto &state = static_cast<const ParagraphShadowNode::ConcreteState &>(*text.state);
  auto data = state.getData();
  auto baseAttributes = data.attributedString.getBaseTextAttributes();
  scaleSizes(baseAttributes);
  data.attributedString.setBaseTextAttributes(baseAttributes);
  for (auto &fragment : data.attributedString.getFragments()) {
    scaleSizes(fragment.textAttributes);
  }
#ifdef ANDROID
  // With prepared text layouts, Android draws the prepared layout of the state, not its attributed string.
  if (const auto textLayoutManager = data.layoutManager.lock();
      textLayoutManager && data.measuredLayout.preparedTextLayout) {
    auto constraints = data.measuredLayout.layoutConstraints;
    constraints.minimumSize.width *= scale;
    constraints.minimumSize.height *= scale;
    constraints.maximumSize.width *= scale;
    constraints.maximumSize.height *= scale;
    const TextLayoutContext context{
        .pointScaleFactor = data.measuredLayout.pointScaleFactor, .surfaceId = text.surfaceId};
    data.measuredLayout.preparedTextLayout =
        TextLayoutManagerExtended(*textLayoutManager)
            .prepareLayout(data.attributedString, data.paragraphAttributes, context, constraints);
  }
#else
  // iOS lays the text out in this size, so it keeps its line breaks.
  data.layoutSize.width *= scale;
  data.layoutSize.height *= scale;
#endif
  return std::make_shared<const ParagraphShadowNode::ConcreteState>(
      std::make_shared<const ParagraphState>(std::move(data)), state);
#endif
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

bool isText(const ShadowView &view) {
  return view.componentHandle == ParagraphShadowNode::Handle() && view.state;
}

Float fontSizeOf(const TextAttributes &attributes) {
  return std::isnan(attributes.fontSize) ? TextAttributes::defaultTextAttributes().fontSize : attributes.fontSize;
}

// The base attributes of the attributed string hold the font size of the paragraph.
Float drawnFontSize(const ShadowView &text) {
  return fontSizeOf(static_cast<const ParagraphShadowNode::ConcreteState &>(*text.state)
                        .getData()
                        .attributedString.getBaseTextAttributes());
}
} // namespace

} // namespace reanimated
