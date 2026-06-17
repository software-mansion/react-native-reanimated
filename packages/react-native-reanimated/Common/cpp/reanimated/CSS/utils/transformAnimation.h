#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <folly/dynamic.h>
#include <react/renderer/core/ShadowNode.h>

#include <array>
#include <cstdint>
#include <memory>
#include <string>
#include <utility>
#include <variant>
#include <vector>

namespace reanimated::css {

using TransformMatrixArray = std::array<double, 16>;

/// Transform functions expressible as a CAValueFunction-driven animation on
/// the renderer side. Scale is the uniform variant - it scales all three axes
/// (matching RN's diag(v, v, v) for the `scale` style operation), unlike
/// ScaleX/ScaleY.
enum class TransformFunctionType : uint8_t {
  RotateX,
  RotateY,
  RotateZ,
  Scale,
  ScaleX,
  ScaleY,
  TranslateX,
  TranslateY,
};

/// One per-function animation of a transform transition: the value
/// interpolates from -> to and a CAValueFunction turns it into a matrix
/// (radians for rotations, points for translations, factors for scales).
struct TransformScalarSegment {
  TransformFunctionType type;
  double fromValue;
  double toValue;
};

/// Segment for operations without a CAValueFunction (skew, perspective): the
/// operation's own endpoint matrices animate additively in place within the
/// stack. Core Animation interpolates the pair in decomposed (shear / m34)
/// space - same endpoints as the loop's per-op angle/distance interpolation,
/// marginally different path.
struct TransformMatrixSegment {
  TransformMatrixArray fromMatrix;
  TransformMatrixArray toMatrix;
};

using TransformSegment = std::variant<TransformScalarSegment, TransformMatrixSegment>;

/// How the renderer should animate a transform transition.
/// - segments non-empty: a stack of additive per-operation animations over a
///   non-additive identity base, in declaration order. This preserves arbitrary
///   operation order, duplicates, and multi-turn rotations, matching the loop's
///   per-operation interpolation.
/// - segments empty: a single fromMatrix -> targetMatrix animation using Core
///   Animation's decomposed matrix interpolation. Used exactly where the loop
///   also falls back to matrix interpolation (matrix values, incompatible or
///   reordered lists).
/// targetMatrix is always the final value committed to the layer model.
struct TransformAnimationPlan {
  std::vector<TransformSegment> segments;
  TransformMatrixArray fromMatrix{};
  TransformMatrixArray targetMatrix{};
};

/// Value-level routing gate for `transform`, consulted after the name + easing
/// gate. The proxy converts the jsi endpoints to dynamics before calling this.
/// Returns false (= run on the loop) when either endpoint fails to parse, holds
/// a percent translate (interpolates in percent space, stays responsive to
/// resize), or a Perspective op (non-affine, can't compose in the additive
/// value-function stack). A transform-origin is baked into the plan at transition
/// start (see buildTransformAnimationPlan), so it animates natively and no longer
/// forces the loop.
bool isTransformRoutable(const folly::dynamic &fromValue, const folly::dynamic &toValue);

/// Builds the renderer-side animation plan for a transform transition. Pairs
/// the endpoint operation lists with the loop's own pairing logic
/// (TransformsStyleInterpolator::createInterpolationPair); when every pair is
/// expressible as a CAValueFunction the plan carries per-function segments in
/// declaration order, otherwise it carries the composed endpoint matrices.
/// Endpoints must be materialized (see resolveTransformEndpoints).
TransformAnimationPlan buildTransformAnimationPlan(
    const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const folly::dynamic &fromValue,
    const folly::dynamic &toValue);

/// Replaces null/empty endpoints with the concrete operation lists the
/// interpolator resolves them to (view style fallback -> identity padding),
/// evaluated once at run time, so plan building and later in-flight
/// re-derivation work with materialized values.
std::pair<folly::dynamic, folly::dynamic> resolveTransformEndpoints(
    const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    folly::dynamic fromValue,
    folly::dynamic toValue);

/// Evaluates a single point on the from-to transform curve and returns it as an
/// operations array (the loop's per-frame output format). Used to continue an
/// interrupted platform transform transition from its exact in-flight value -
/// reading the presentation-layer matrix instead would collapse rotation count.
folly::dynamic interpolateTransformValueAt(
    const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
    const std::string &componentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const folly::dynamic &fromValue,
    const folly::dynamic &toValue,
    double easedProgress);

} // namespace reanimated::css
