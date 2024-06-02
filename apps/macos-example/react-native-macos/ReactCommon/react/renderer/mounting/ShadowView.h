/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/renderer/core/EventEmitter.h>
#include <react/renderer/core/LayoutMetrics.h>
#include <react/renderer/core/Props.h>
#include <react/renderer/core/ReactPrimitives.h>
#include <react/renderer/core/ShadowNode.h>
#include <react/renderer/debug/flags.h>
#include <react/utils/hash_combine.h>

namespace facebook::react {

/*
 * Describes a view that can be mounted.
 * This is exposed to the mounting layer.
 */
struct ShadowView final {
  ShadowView() = default;
  ShadowView(const ShadowView& shadowView) = default;
  ShadowView(ShadowView&& shadowView) noexcept = default;

  /*
   * Constructs a `ShadowView` from given `ShadowNode`.
   */
  explicit ShadowView(const ShadowNode& shadowNode);

  ShadowView& operator=(const ShadowView& other) = default;
  ShadowView& operator=(ShadowView&& other) = default;

  bool operator==(const ShadowView& rhs) const;
  bool operator!=(const ShadowView& rhs) const;

  ComponentName componentName{};
  ComponentHandle componentHandle{};
  SurfaceId surfaceId{};
  Tag tag{};
  ShadowNodeTraits traits{};
  Props::Shared props{};
  EventEmitter::Shared eventEmitter{};
  LayoutMetrics layoutMetrics{EmptyLayoutMetrics};
  State::Shared state{};
};

#if RN_DEBUG_STRING_CONVERTIBLE

std::string getDebugName(const ShadowView& object);
std::vector<DebugStringConvertibleObject> getDebugProps(
    const ShadowView& object,
    DebugStringConvertibleOptions options);

#endif

/*
 * Describes pair of a `ShadowView` and a `ShadowNode`.
 * This is not exposed to the mounting layer.
 *
 */
struct ShadowViewNodePair final {
  using NonOwningList = std::vector<ShadowViewNodePair*>;
  using OwningList = std::vector<ShadowViewNodePair>;

  ShadowView shadowView;
  const ShadowNode* shadowNode;
  bool flattened{false};
  bool isConcreteView{true};
  Point contextOrigin{0, 0};

  size_t mountIndex{0};

  /**
   * This is nullptr unless `inOtherTree` is set to true.
   * We rely on this only for marginal cases. TODO: could we
   * rely on this more heavily to simplify the diffing algorithm
   * overall?
   */
  mutable const ShadowViewNodePair* otherTreePair{nullptr};

  /*
   * The stored pointer to `ShadowNode` represents an identity of the pair.
   */
  bool operator==(const ShadowViewNodePair& rhs) const;
  bool operator!=(const ShadowViewNodePair& rhs) const;

  bool inOtherTree() const {
    return this->otherTreePair != nullptr;
  }
};

/*
 * Describes pair of a `ShadowView` and a `ShadowNode`.
 * This is not exposed to the mounting layer.
 *
 */
struct ShadowViewNodePairLegacy final {
  using OwningList = std::vector<ShadowViewNodePairLegacy>;

  ShadowView shadowView;
  const ShadowNode* shadowNode;
  bool flattened{false};
  bool isConcreteView{true};

  size_t mountIndex{0};

  bool inOtherTree{false};

  /*
   * The stored pointer to `ShadowNode` represents an identity of the pair.
   */
  bool operator==(const ShadowViewNodePairLegacy& rhs) const;
  bool operator!=(const ShadowViewNodePairLegacy& rhs) const;
};

} // namespace facebook::react

namespace std {

template <>
struct hash<facebook::react::ShadowView> {
  size_t operator()(const facebook::react::ShadowView& shadowView) const {
    return facebook::react::hash_combine(
        0,
        shadowView.surfaceId,
        shadowView.componentHandle,
        shadowView.tag,
        shadowView.props,
        shadowView.eventEmitter,
        shadowView.layoutMetrics,
        shadowView.state);
  }
};

} // namespace std
