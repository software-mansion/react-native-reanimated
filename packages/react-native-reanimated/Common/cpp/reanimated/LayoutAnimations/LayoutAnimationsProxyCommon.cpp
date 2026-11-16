#ifdef ANDROID
#include <ReactCommon/CallInvoker.h>
#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/renderer/core/DynamicPropsUtilities.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#endif
#include <folly/dynamic.h>
#include <jsi/JSIDynamic.h>
#include <react/debug/react_native_assert.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>
#include <reanimated/LayoutAnimations/SharedTransitionGeometry.h>
#include <reanimated/LayoutAnimations/SharedTransitionValuesFactory.h>

#include <algorithm>
#include <cstring>
#include <iterator>
#include <memory>
#include <optional>
#include <type_traits>
#include <unordered_set>
#include <utility>
#include <variant>

namespace reanimated {

void assertUpdatesRegistryUnlocked() {
  react_native_assert(
      !UpdatesRegistryManager::isLockedByCurrentThread() &&
      "A layout animations proxy was entered with the registry lock held");
}

namespace {
constexpr auto kContentOpacity = "contentOpacity";
constexpr auto kGeometryProgress = "sharedTransitionGeometryProgress";

ShadowView withProps(ShadowView view, const Props::Shared &props) {
  view.props = props;
  return view;
}

jsi::Object withoutProperty(jsi::Runtime &runtime, const jsi::Object &object, const std::string &excluded) {
  jsi::Object copy(runtime);
  const auto names = object.getPropertyNames(runtime);
  for (size_t i = 0; i < names.size(runtime); i++) {
    const auto name = names.getValueAtIndex(runtime, i).getString(runtime);
    if (name.utf8(runtime) != excluded) {
      copy.setProperty(
          runtime,
          jsi::PropNameID::forString(runtime, name),
          object.getProperty(runtime, jsi::PropNameID::forString(runtime, name)));
    }
  }
  return copy;
}
} // namespace

#ifdef ANDROID
namespace {
const ShadowNode *findShadowNode(const ShadowNode &node, const Tag tag) {
  if (node.getTag() == tag) {
    return &node;
  }
  for (const auto &child : node.getChildren()) {
    if (const auto *result = findShadowNode(*child, tag)) {
      return result;
    }
  }
  return nullptr;
}

bool continuesSentFrame(const LayoutAnimation &animation, const UpdateValues &frame) {
  const auto &sentFrame = animation.sentFrame;
  if (!sentFrame || sentFrame->base != frame.base) {
    return false;
  }
  const auto names = sentFrame->style.keys();
  return std::all_of(
      names.begin(), names.end(), [&frame](const folly::dynamic &name) { return frame.style.count(name) > 0; });
}

folly::dynamic changedRawProps(const SentFrame &sentFrame, const folly::dynamic &style) {
  folly::dynamic changedProps = folly::dynamic::object();
  for (const auto &[name, value] : style.items()) {
    const auto *valueOnScreen = sentFrame.style.get_ptr(name);
    if (!valueOnScreen) {
      valueOnScreen = sentFrame.base->rawProps.get_ptr(name);
    }
    if (!valueOnScreen || *valueOnScreen != value) {
      changedProps[name] = value;
    }
  }
  return changedProps;
}

// A null raw value does not give the default value of each prop, for example of `role`. Then the result of a clone
// depends on the props that it starts from.
bool hasNullValue(const folly::dynamic &props) {
  const auto values = props.values();
  return std::any_of(values.begin(), values.end(), [](const folly::dynamic &value) { return value.isNull(); });
}
} // namespace
#endif

std::optional<facebook::react::SurfaceId> LayoutAnimationsProxyCommon::onTransitionProgress(
    int /*tag*/,
    double /*progress*/,
    bool /*isClosing*/,
    bool /*isGoingForward*/) {
  return std::nullopt;
}

std::optional<facebook::react::SurfaceId> LayoutAnimationsProxyCommon::onGestureCancel(int /*tag*/) {
  return std::nullopt;
}

void LayoutAnimationsProxyCommon::startSurface(
    const facebook::react::ShadowTree &shadowTree,
    std::weak_ptr<const facebook::react::MountingOverrideDelegate> mountingOverrideDelegate) {
  const auto mountingCoordinator = shadowTree.getMountingCoordinator();
  const auto baseRevision = mountingCoordinator->getBaseRevision();
  if (baseRevision.rootShadowNode) {
    const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
    const auto &size = baseRevision.rootShadowNode->getLayoutMetrics().frame.size;
    window_ = {size.width, size.height};
  }
  mountingCoordinator->setMountingOverrideDelegate(std::move(mountingOverrideDelegate));
}

void LayoutAnimationsProxyCommon::surfaceDidUnmount() {
  cancelAllLayoutAnimations();
}

void LayoutAnimationsProxyCommon::clearSurfaceState() const {
  layoutAnimationOperations_.clear();
  pendingLayoutAnimations_.clear();
  updateMap_.clear();
  layoutAnimations_.clear();
  completedAnimations_.clear();
}

std::optional<SurfaceId> LayoutAnimationsProxyCommon::progressLayoutAnimation(
    const int tag,
    const jsi::Object &newStyle) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (newStyle.hasProperty(uiRuntime_, kGeometryProgress)) {
    return progressSharedTransitionGeometry(tag, newStyle);
  }
  const auto layoutAnimationIt = layoutAnimations_.find(tag);
  if (layoutAnimationIt == layoutAnimations_.end()) {
    return {};
  }

  auto &layoutAnimation = layoutAnimationIt->second;
  const bool animatesOpacity = newStyle.hasProperty(uiRuntime_, "opacity");
  const bool animatesContentOpacity = newStyle.hasProperty(uiRuntime_, kContentOpacity);
  if (animatesContentOpacity) {
    layoutAnimation.contentOpacity = std::clamp(newStyle.getProperty(uiRuntime_, kContentOpacity).asNumber(), 0.0, 1.0);
  }
  const auto viewStyle = animatesContentOpacity ? withoutProperty(uiRuntime_, newStyle, kContentOpacity)
                                                : jsi::Value(uiRuntime_, newStyle).asObject(uiRuntime_);

#ifdef ANDROID
  auto style = jsi::dynamicFromValue(uiRuntime_, jsi::Value(uiRuntime_, viewStyle));
  if (layoutAnimation.opacity && !animatesOpacity) {
    style["opacity"] = *layoutAnimation.opacity;
  }
  updateMap_.insert_or_assign(
      tag,
      UpdateValues{layoutAnimation.framePropsBase(), std::move(style), Frame(uiRuntime_, viewStyle), animatesOpacity});
#else
  auto rawProps = std::make_shared<RawProps>(uiRuntime_, jsi::Value(uiRuntime_, viewStyle));
  if (layoutAnimation.opacity && !animatesOpacity) {
    auto props = (folly::dynamic)*rawProps;
    props["opacity"] = *layoutAnimation.opacity;
    rawProps = std::make_shared<RawProps>(std::move(props));
  }
  const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
  const auto &frameProps = layoutAnimation.framePropsBase();
  auto newProps = componentDescriptorRegistry_->at(layoutAnimation.finalView.componentHandle)
                      .cloneProps(propsParserContext, frameProps, std::move(*rawProps));
  updateMap_.insert_or_assign(tag, UpdateValues{newProps, Frame(uiRuntime_, viewStyle), animatesOpacity});
#endif

  return surfaceId_;
}

// A built-in shared transition gets its frame and transform in the same update as its style. A completed carrier that
// waits to land gets the frames too.
std::optional<SurfaceId> LayoutAnimationsProxyCommon::progressSharedTransitionGeometry(
    const Tag tag,
    const jsi::Object &newStyle) const {
  LayoutAnimation *animation = nullptr;
  if (const auto it = layoutAnimations_.find(tag); it != layoutAnimations_.end()) {
    animation = &it->second;
  } else if (const auto it = completedAnimations_.find(tag);
             it != completedAnimations_.end() && !it->second.shouldRemove && it->second.animation.geometryProgress) {
    animation = &it->second.animation;
  }
  if (!animation || hasPendingLayoutAnimation(tag)) {
    return {};
  }
  auto style = jsi::dynamicFromValue(uiRuntime_, jsi::Value(uiRuntime_, newStyle));
  animation->geometryProgress = style[kGeometryProgress].asDouble();
  style.erase(kGeometryProgress);
  if (const auto contentOpacity = style.find(kContentOpacity); contentOpacity != style.items().end()) {
    animation->contentOpacity = std::clamp(contentOpacity->second.asDouble(), 0.0, 1.0);
    style.erase(contentOpacity);
  }
  const bool animatesOpacity = style.count("opacity") > 0;
  if (animation->opacity && !animatesOpacity) {
    style["opacity"] = *animation->opacity;
  }
  auto geometry =
      interpolateSharedTransitionGeometry(animation->startView, animation->finalView, *animation->geometryProgress);
  style.update(geometry.props);
  updateMap_.insert_or_assign(
      tag, frameValues(*animation, animation->framePropsBase(), std::move(style), geometry.frame, animatesOpacity));
  return surfaceId_;
}

// Without a frame that waits for a pull, the frame on screen is the base.
void LayoutAnimationsProxyCommon::writeSharedTransitionGeometry(const Tag tag, LayoutAnimation &animation) const {
  react_native_assert(animation.geometryProgress && "The animation does not interpolate the geometry");
  auto geometry =
      interpolateSharedTransitionGeometry(animation.startView, animation.finalView, *animation.geometryProgress);
  const auto pending = updateMap_.find(tag);
#ifdef ANDROID
  if (pending != updateMap_.end()) {
    pending->second.style.update(geometry.props);
    pending->second.frame = geometry.frame;
    return;
  }
  if (const auto &sentFrame = animation.sentFrame) {
    auto style = sentFrame->style;
    style.update(geometry.props);
    updateMap_.insert_or_assign(tag, UpdateValues{sentFrame->base, std::move(style), geometry.frame, false});
    return;
  }
  updateMap_.insert_or_assign(
      tag, UpdateValues{animation.currentView.props, std::move(geometry.props), geometry.frame, false});
#else
  const bool hasPendingFrame = pending != updateMap_.end() && pending->second.newProps;
  updateMap_.insert_or_assign(
      tag,
      frameValues(
          animation,
          hasPendingFrame ? pending->second.newProps : animation.currentView.props,
          std::move(geometry.props),
          geometry.frame,
          hasPendingFrame && pending->second.animatesOpacity));
#endif
}

UpdateValues LayoutAnimationsProxyCommon::frameValues(
    [[maybe_unused]] const LayoutAnimation &animation,
    const Props::Shared &base,
    folly::dynamic style,
    const Frame &frame,
    const bool animatesOpacity) const {
#ifdef ANDROID
  return UpdateValues{base, std::move(style), frame, animatesOpacity};
#else
  const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
  auto props = componentDescriptorRegistry_->at(animation.finalView.componentHandle)
                   .cloneProps(propsParserContext, base, RawProps(std::move(style)));
  return UpdateValues{std::move(props), frame, animatesOpacity};
#endif
}

void LayoutAnimationsProxyCommon::transferConfigFromNativeID(const std::string &nativeIdString, const int tag) const {
  if (nativeIdString.empty() || nativeIdString.length() > 9) {
    return;
  }

  auto nativeId = 0;
  for (const auto character : nativeIdString) {
    if (character < '0' || character > '9') {
      return;
    }
    nativeId = nativeId * 10 + character - '0';
  }

  layoutAnimationsManager_->transferConfigFromNativeID(nativeId, tag);
}

void LayoutAnimationsProxyCommon::enqueueLayoutAnimation(ManagedLayoutAnimationStart start) const {
  react_native_assert(start.config && "layout animation config is null");
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto tag = start.tag;
  const auto type = start.type;
  if (const auto pendingIt = pendingLayoutAnimations_.find(tag);
      pendingIt != pendingLayoutAnimations_.end() && pendingIt->second.type == type) {
    auto &pending = std::get<ManagedLayoutAnimationStart>(layoutAnimationOperations_[pendingIt->second.operationIndex]);
    start.before = std::move(pending.before);
    pending = std::move(start);
    return;
  }
  layoutAnimationOperations_.push_back(std::move(start));
  pendingLayoutAnimations_.insert_or_assign(tag, PendingLayoutAnimation{type, layoutAnimationOperations_.size() - 1});
}

void LayoutAnimationsProxyCommon::enqueueLayoutAnimation(ProgressLayoutAnimationStart start) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto tag = start.tag;
  layoutAnimationOperations_.push_back(std::move(start));
  pendingLayoutAnimations_.try_emplace(
      tag,
      PendingLayoutAnimation{
          LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS, layoutAnimationOperations_.size() - 1});
}

void LayoutAnimationsProxyCommon::flushLayoutAnimationOperations(std::unique_lock<std::recursive_mutex> &lock) const {
  react_native_assert(
      lock.owns_lock() && lock.mutex() == &mutex && "flushLayoutAnimationOperations requires the proxy lock");
  if (!worklets::isOnUIThread(uiScheduler_)) {
    if (!layoutAnimationOperations_.empty()) {
      requestLayoutAnimationFlush_(surfaceId_);
    }
    return;
  }
  flushLayoutAnimationOperationsLocked();
}

// iOS, and Android with accumulated raw props, write the props of an Insert to the view. The shadow props of a view
// that only moves lack the values that were written synchronously.
Props::Shared LayoutAnimationsProxyCommon::propsOfMountedView(const ShadowView &view) const {
#ifdef __APPLE__
  if (readMountedViewProps_) {
    if (auto mountedProps = readMountedViewProps_(view.tag)) {
      return mountedProps;
    }
  }
#elif defined(ANDROID)
  if (readSynchronousProps_) {
    if (const auto synchronousProps = readSynchronousProps_(view.tag); !synchronousProps.empty()) {
      return mergeSynchronousProps(view, synchronousProps);
    }
  }
#endif
  return view.props;
}

Props::Shared LayoutAnimationsProxyCommon::mergeSynchronousProps(const ShadowView &view, const folly::dynamic &props)
    const {
  auto rawProps = props;
#ifdef RN_SERIALIZABLE_STATE
  rawProps = folly::dynamic::merge(view.props->rawProps, rawProps);
#endif
  const PropsParserContext propsParserContext{view.surfaceId, *contextContainer_};
  return componentDescriptorRegistry_->at(view.componentHandle)
      .cloneProps(propsParserContext, view.props, RawProps(std::move(rawProps)));
}

// The registry broadcasts one batch to every surface proxy; entries of other surfaces are skipped here.
void LayoutAnimationsProxyCommon::applySynchronousProps(const UpdatesBatch &updatesBatch, bool /*trackInLightTree*/)
    const {
  const auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (!hasLayoutAnimationRecords()) {
    return;
  }
  for (const auto &[shadowNodeFamily, props] : updatesBatch) {
    if (shadowNodeFamily->getSurfaceId() != surfaceId_) {
      continue;
    }
    applySynchronousPropsToLayoutAnimation(shadowNodeFamily->getTag(), props);
  }
}

bool LayoutAnimationsProxyCommon::hasLayoutAnimationRecords() const {
  return !layoutAnimations_.empty() || !pendingLayoutAnimations_.empty() || !completedAnimations_.empty();
}

// A layout animation builds every frame from its own copies of the props, not from the light node.
// The copies live in the queued start, in the running record and in the frame that waits for a pull.
void LayoutAnimationsProxyCommon::applySynchronousPropsToLayoutAnimation(const Tag tag, const folly::dynamic &props)
    const {
  const bool propsIncludeOpacity = props.count("opacity") > 0;
  if (hasPendingLayoutAnimation(tag)) {
    for (auto &operation : layoutAnimationOperations_) {
      std::visit(
          [&](auto &start) {
            using Start = std::decay_t<decltype(start)>;
            if constexpr (!std::is_same_v<Start, LayoutAnimationCancellation>) {
              if (start.tag != tag) {
                return;
              }
              start.before.props = mergeSynchronousProps(start.before, props);
              start.after.props = mergeSynchronousProps(start.after, props);
              if (start.frameProps) {
                start.frameProps = mergeSynchronousProps(withProps(start.after, start.frameProps), props);
              }
              if constexpr (std::is_same_v<Start, ManagedLayoutAnimationStart>) {
                if (propsIncludeOpacity && start.opacity) {
                  start.opacity = getViewProps(start.after).opacity;
                }
              }
            }
          },
          operation);
    }
  }

  LayoutAnimation *animation = nullptr;
  if (const auto it = layoutAnimations_.find(tag); it != layoutAnimations_.end()) {
    animation = &it->second;
  } else if (const auto it = completedAnimations_.find(tag);
             it != completedAnimations_.end() && !it->second.shouldRemove) {
    animation = &it->second.animation;
  }
  if (animation == nullptr) {
    return;
  }
  animation->finalView.props = mergeSynchronousProps(animation->finalView, props);
  animation->currentView.props = mergeSynchronousProps(currentViewOf(*animation), props);
#ifdef ANDROID
  animation->sentFrame.reset();
#endif
  if (animation->frameProps) {
    animation->frameProps = mergeSynchronousProps(withProps(animation->finalView, animation->frameProps), props);
  }
  if (propsIncludeOpacity && animation->opacity) {
    animation->opacity = getViewProps(animation->finalView).opacity;
  }
#ifdef ANDROID
  if (const auto it = updateMap_.find(tag); it != updateMap_.end()) {
    auto &frame = it->second;
    if (hasNullValue(props)) {
      const auto frameView = withProps(animation->finalView, frameProps(*animation, frame.base, frame.style));
      frame.base = mergeSynchronousProps(frameView, props);
      frame.style = folly::dynamic::object();
    } else {
      frame.style.update(props);
    }
  }
#else
  if (const auto it = updateMap_.find(tag); it != updateMap_.end() && it->second.newProps) {
    auto pendingView = animation->finalView;
    pendingView.props = it->second.newProps;
    it->second.newProps = mergeSynchronousProps(pendingView, props);
  }
#endif
}

ShadowView LayoutAnimationsProxyCommon::materializeLayoutAnimation(
    const Tag tag,
    const ShadowView &before,
    const ShadowView &after,
    const Props::Shared &frameProps,
    const Tag parentTag,
    const std::optional<double> opacity,
    const LayoutAnimationType type,
    const std::shared_ptr<Serializable> &config) const {
  auto currentView = before;
  const auto activeAnimationIt = layoutAnimations_.find(tag);
  // An entering view starts from the view that the Insert mounted.
  if (type != LayoutAnimationType::ENTERING) {
    if (activeAnimationIt != layoutAnimations_.end()) {
      currentView = currentViewOf(activeAnimationIt->second);
    } else if (const auto completedAnimationIt = completedAnimations_.find(tag);
               completedAnimationIt != completedAnimations_.end() && !completedAnimationIt->second.shouldRemove) {
      currentView = currentViewOf(completedAnimationIt->second.animation);
    }
  }

  if (activeAnimationIt != layoutAnimations_.end()) {
    updateMap_.erase(tag);
  }

  if (const auto completedAnimationIt = completedAnimations_.find(tag);
      completedAnimationIt != completedAnimations_.end()) {
    updateMap_.erase(tag);
    completedAnimations_.erase(completedAnimationIt);
  }

  layoutAnimations_.insert_or_assign(
      tag,
      LayoutAnimation{
          .finalView = after,
          .currentView = currentView,
          .startView = currentView,
          .frameProps = frameProps,
          .parentTag = parentTag,
          .opacity = opacity,
          .type = type,
          .config = config,
      });
  return currentView;
}

std::optional<LayoutAnimationsProxyCommon::PreparedLayoutAnimationOperation>
LayoutAnimationsProxyCommon::takeNextLayoutAnimationOperation(std::deque<LayoutAnimationOperation> &operations) const {
  if (operations.empty()) {
    return std::nullopt;
  }

  auto operation = std::move(operations.front());
  operations.pop_front();
  if (auto *managedStart = std::get_if<ManagedLayoutAnimationStart>(&operation)) {
    managedStart->before = materializeLayoutAnimation(
        managedStart->tag,
        managedStart->before,
        managedStart->after,
        managedStart->frameProps,
        managedStart->parentTag,
        managedStart->opacity,
        managedStart->type,
        managedStart->config);
    return PreparedLayoutAnimationStart{
        .start = std::move(*managedStart),
        .window = window_,
    };
  }
  if (const auto *progressStart = std::get_if<ProgressLayoutAnimationStart>(&operation)) {
    const auto tag = progressStart->tag;
    const auto activeAnimationIt = layoutAnimations_.find(tag);
    if (activeAnimationIt != layoutAnimations_.end() &&
        activeAnimationIt->second.type != LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS) {
      activeAnimationIt->second.type = LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS;
      operations.push_front(std::move(operation));
      return LayoutAnimationStop{tag};
    }
    materializeLayoutAnimation(
        tag,
        progressStart->before,
        progressStart->after,
        progressStart->frameProps,
        progressStart->parentTag,
        std::nullopt,
        LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS,
        progressStart->config);
    return std::monostate{};
  }
  const auto cancellation = std::get<LayoutAnimationCancellation>(operation);
  react_native_assert(cancellation.shouldStopManager);
  return LayoutAnimationStop{cancellation.tag};
}

void LayoutAnimationsProxyCommon::reconcileLayoutAnimationOperations(
    std::deque<LayoutAnimationOperation> &operations) const {
  std::unordered_set<Tag> cancelledTags;
  auto reconciled = std::deque<LayoutAnimationOperation>{};
  for (auto operationIt = operations.rbegin(); operationIt != operations.rend(); operationIt++) {
    auto &operation = *operationIt;
    if (const auto *cancellation = std::get_if<LayoutAnimationCancellation>(&operation)) {
      cancelledTags.insert(cancellation->tag);
      if (cancellation->shouldStopManager) {
        reconciled.push_front(std::move(operation));
      }
      continue;
    }
    const auto tag = std::visit([](const auto &start) { return start.tag; }, operation);
    if (!cancelledTags.contains(tag)) {
      reconciled.push_front(std::move(operation));
    }
  }
  operations = std::move(reconciled);
}

void LayoutAnimationsProxyCommon::flushLayoutAnimationOperationsLocked() const {
  // Runs on every frame; nothing to reconcile or start without queued operations.
  if (layoutAnimationOperations_.empty()) {
    pendingLayoutAnimations_.clear();
    return;
  }
  auto operations = std::exchange(layoutAnimationOperations_, std::deque<LayoutAnimationOperation>{});
  pendingLayoutAnimations_.clear();
  reconcileLayoutAnimationOperations(operations);
  auto deferredStarts = takeDeferredLayoutAnimationStarts(operations);
  bool hasFailedStart = false;
  for (auto operation = takeNextLayoutAnimationOperation(operations); operation;
       operation = takeNextLayoutAnimationOperation(operations)) {
    if (const auto *stop = std::get_if<LayoutAnimationStop>(&*operation)) {
      layoutAnimationsManager_->cancelLayoutAnimation(uiRuntime_, stop->tag);
      continue;
    }
    const auto *preparedStart = std::get_if<PreparedLayoutAnimationStart>(&*operation);
    if (!preparedStart) {
      continue;
    }
    const auto &start = preparedStart->start;
    const auto &window = preparedStart->window;

    jsi::Object values(uiRuntime_);
    if (start.type == LayoutAnimationType::SHARED_ELEMENT_TRANSITION) {
      values = SharedTransitionValuesFactory(uiRuntime_).create(start.before, start.after);
      if (start.contentOpacity) {
        values.setProperty(uiRuntime_, "currentContentOpacity", start.contentOpacity->from);
        values.setProperty(uiRuntime_, "targetContentOpacity", start.contentOpacity->to);
      }
    } else {
      const Snapshot current(start.before, window);
      const Snapshot target(start.after, window);
      if (start.type != LayoutAnimationType::ENTERING) {
        values.setProperty(uiRuntime_, "currentOriginX", current.x);
        values.setProperty(uiRuntime_, "currentGlobalOriginX", current.x);
        values.setProperty(uiRuntime_, "currentOriginY", current.y);
        values.setProperty(uiRuntime_, "currentGlobalOriginY", current.y);
        values.setProperty(uiRuntime_, "currentWidth", current.width);
        values.setProperty(uiRuntime_, "currentHeight", current.height);
      }
      if (start.isContentFadeIn && start.opacity) {
        values.setProperty(uiRuntime_, "targetOpacity", *start.opacity);
      }
      if (start.type != LayoutAnimationType::EXITING) {
        values.setProperty(uiRuntime_, "targetOriginX", target.x);
        values.setProperty(uiRuntime_, "targetGlobalOriginX", target.x);
        values.setProperty(uiRuntime_, "targetOriginY", target.y);
        values.setProperty(uiRuntime_, "targetGlobalOriginY", target.y);
        values.setProperty(uiRuntime_, "targetWidth", target.width);
        values.setProperty(uiRuntime_, "targetHeight", target.height);
      }
    }
    values.setProperty(uiRuntime_, "windowWidth", window.width);
    values.setProperty(uiRuntime_, "windowHeight", window.height);
    if (!layoutAnimationsManager_->startLayoutAnimation(uiRuntime_, start.tag, start.type, values, start.config)) {
      endLayoutAnimation(start.tag, start.type == LayoutAnimationType::EXITING);
      hasFailedStart = true;
    }
  }
  const bool hasNewOperations = !layoutAnimationOperations_.empty();
  requeueLayoutAnimationStarts(std::move(deferredStarts));
  if (hasNewOperations || hasFailedStart) {
    requestLayoutAnimationFlush_(surfaceId_);
  }
}

std::deque<LayoutAnimationOperation> LayoutAnimationsProxyCommon::takeDeferredLayoutAnimationStarts(
    std::deque<LayoutAnimationOperation> &operations) const {
  std::deque<LayoutAnimationOperation> deferred;
  std::deque<LayoutAnimationOperation> ready;
  for (auto &operation : operations) {
    const auto *start = std::get_if<ManagedLayoutAnimationStart>(&operation);
    (start && defersLayoutAnimationStart(start->tag) ? deferred : ready).push_back(std::move(operation));
  }
  operations = std::move(ready);
  return deferred;
}

// The deferred starts go before the operations that were queued during the flush, because they are older.
void LayoutAnimationsProxyCommon::requeueLayoutAnimationStarts(std::deque<LayoutAnimationOperation> starts) const {
  if (starts.empty()) {
    return;
  }
  std::ranges::move(layoutAnimationOperations_, std::back_inserter(starts));
  layoutAnimationOperations_ = std::move(starts);
  pendingLayoutAnimations_.clear();
  for (size_t index = 0; index < layoutAnimationOperations_.size(); index++) {
    std::visit(
        [&](const auto &operation) {
          using Operation = std::decay_t<decltype(operation)>;
          if constexpr (std::is_same_v<Operation, ManagedLayoutAnimationStart>) {
            pendingLayoutAnimations_.insert_or_assign(operation.tag, PendingLayoutAnimation{operation.type, index});
          } else if constexpr (std::is_same_v<Operation, ProgressLayoutAnimationStart>) {
            pendingLayoutAnimations_.try_emplace(
                operation.tag, PendingLayoutAnimation{LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS, index});
          } else {
            pendingLayoutAnimations_.erase(operation.tag);
          }
        },
        layoutAnimationOperations_[index]);
  }
}

void LayoutAnimationsProxyCommon::flushLayoutAnimationOperations() const {
  react_native_assert(worklets::isOnUIThread(uiScheduler_));
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  flushLayoutAnimationOperationsLocked();
  followTargetsPlacedNatively();
}

void LayoutAnimationsProxyCommon::cancelLayoutAnimation(const Tag tag) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto cancelsPendingStart = pendingLayoutAnimations_.contains(tag);
  auto shouldStopManager = false;

  if (const auto layoutAnimationIt = layoutAnimations_.find(tag); layoutAnimationIt != layoutAnimations_.end()) {
    shouldStopManager = layoutAnimationIt->second.type != LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS;
    updateMap_.erase(tag);
    layoutAnimations_.erase(layoutAnimationIt);
  } else if (const auto completedAnimationIt = completedAnimations_.find(tag);
             completedAnimationIt != completedAnimations_.end()) {
    updateMap_.erase(tag);
    completedAnimations_.erase(completedAnimationIt);
  }
  if (cancelsPendingStart || shouldStopManager) {
    layoutAnimationOperations_.push_back(LayoutAnimationCancellation{tag, shouldStopManager});
    pendingLayoutAnimations_.erase(tag);
  }
}

void LayoutAnimationsProxyCommon::cancelAllLayoutAnimations() const {
  std::vector<Tag> stops;
  {
    auto lock = std::unique_lock<std::recursive_mutex>(mutex);
    std::unordered_set<Tag> stoppedTags;
    for (const auto &operation : layoutAnimationOperations_) {
      if (const auto *cancellation = std::get_if<LayoutAnimationCancellation>(&operation);
          cancellation && cancellation->shouldStopManager && stoppedTags.insert(cancellation->tag).second) {
        stops.push_back(cancellation->tag);
      }
    }
    for (const auto &[tag, animation] : layoutAnimations_) {
      if (animation.type != LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS && stoppedTags.insert(tag).second) {
        stops.push_back(tag);
      }
    }
    clearSurfaceState();
  }
  if (!stops.empty()) {
    scheduleOnUI(
        uiScheduler_,
        [layoutAnimationsManager = layoutAnimationsManager_, &uiRuntime = uiRuntime_, stops = std::move(stops)]() {
          for (const auto tag : stops) {
            layoutAnimationsManager->cancelLayoutAnimation(uiRuntime, tag);
          }
        });
  }
}

bool LayoutAnimationsProxyCommon::hasPendingLayoutAnimation(const Tag tag) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  return pendingLayoutAnimations_.contains(tag);
}

LayoutAnimationPhase LayoutAnimationsProxyCommon::layoutAnimationPhase(const Tag tag) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (pendingLayoutAnimations_.contains(tag)) {
    return LayoutAnimationPhase::QUEUED;
  }
  if (layoutAnimations_.contains(tag)) {
    return LayoutAnimationPhase::RUNNING;
  }
  if (completedAnimations_.contains(tag)) {
    return LayoutAnimationPhase::ENDED;
  }
  return LayoutAnimationPhase::NONE;
}

void LayoutAnimationsProxyCommon::updateLayoutAnimationTarget(
    const Tag tag,
    const ShadowView &finalView,
    const Props::Shared &frameProps,
    const std::shared_ptr<Serializable> &config,
    const std::optional<ContentOpacityRange> contentOpacity) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (const auto pendingIt = pendingLayoutAnimations_.find(tag); pendingIt != pendingLayoutAnimations_.end()) {
    if (pendingIt->second.type == LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS) {
      return;
    }
    const auto operationIndex = pendingIt->second.operationIndex;
    react_native_assert(operationIndex < layoutAnimationOperations_.size());
    if (auto *managedStart = std::get_if<ManagedLayoutAnimationStart>(&layoutAnimationOperations_[operationIndex])) {
      managedStart->after = finalView;
      managedStart->frameProps = frameProps;
      if (config) {
        managedStart->config = config;
      }
      if (contentOpacity) {
        managedStart->contentOpacity = contentOpacity;
      }
      return;
    }
    react_native_assert(false && "Pending managed layout animation not found");
  }
  if (const auto animationIt = layoutAnimations_.find(tag); animationIt != layoutAnimations_.end()) {
    animationIt->second.finalView = finalView;
    animationIt->second.frameProps = frameProps;
    return;
  }
  react_native_assert(false && "Layout animation not found");
}

std::shared_ptr<Serializable> LayoutAnimationsProxyCommon::getRetargetLayoutAnimationConfig(const Tag tag) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (const auto pendingIt = pendingLayoutAnimations_.find(tag); pendingIt != pendingLayoutAnimations_.end()) {
    if (pendingIt->second.type != LayoutAnimationType::LAYOUT) {
      return nullptr;
    }
    const auto operationIndex = pendingIt->second.operationIndex;
    react_native_assert(operationIndex < layoutAnimationOperations_.size());
    if (const auto *start = std::get_if<ManagedLayoutAnimationStart>(&layoutAnimationOperations_[operationIndex])) {
      return start->config;
    }
    react_native_assert(false && "Pending managed layout animation not found");
  }
  if (const auto animationIt = layoutAnimations_.find(tag);
      animationIt != layoutAnimations_.end() && animationIt->second.type == LayoutAnimationType::LAYOUT) {
    return animationIt->second.config;
  }
  return nullptr;
}

bool LayoutAnimationsProxyCommon::updateEnteringAnimationTarget(const Tag tag, const ShadowView &finalView) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (const auto pendingIt = pendingLayoutAnimations_.find(tag); pendingIt != pendingLayoutAnimations_.end()) {
    if (pendingIt->second.type != LayoutAnimationType::ENTERING) {
      return false;
    }
    const auto operationIndex = pendingIt->second.operationIndex;
    react_native_assert(operationIndex < layoutAnimationOperations_.size());
    if (auto *start = std::get_if<ManagedLayoutAnimationStart>(&layoutAnimationOperations_[operationIndex])) {
      start->after = finalView;
      start->opacity = getViewProps(finalView).opacity;
      return true;
    }
    react_native_assert(false && "Pending managed layout animation not found");
  }
  if (const auto animationIt = layoutAnimations_.find(tag);
      animationIt != layoutAnimations_.end() && animationIt->second.type == LayoutAnimationType::ENTERING) {
    animationIt->second.finalView = finalView;
    if (animationIt->second.opacity) {
      animationIt->second.opacity = getViewProps(finalView).opacity;
    }
    return true;
  }
  return false;
}

std::optional<ShadowView> LayoutAnimationsProxyCommon::takeCompletedLayoutAnimationView(const Tag tag) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto it = completedAnimations_.find(tag);
  if (it == completedAnimations_.end() || it->second.shouldRemove || hasPendingLayoutAnimation(tag)) {
    return std::nullopt;
  }
  auto &animation = it->second.animation;
  if (animation.type != LayoutAnimationType::LAYOUT && animation.type != LayoutAnimationType::ENTERING) {
    return std::nullopt;
  }
  auto currentView = currentViewOf(animation);
  updateMap_.erase(tag);
  completedAnimations_.erase(it);
  return currentView;
}

// A started animation shows its current frame. A queued start still shows the view that it starts from.
std::optional<ShadowView> LayoutAnimationsProxyCommon::layoutAnimationViewOnScreen(const Tag tag) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (const auto animationIt = layoutAnimations_.find(tag); animationIt != layoutAnimations_.end()) {
    return currentViewOf(animationIt->second);
  }
  if (const auto completedAnimationIt = completedAnimations_.find(tag);
      completedAnimationIt != completedAnimations_.end()) {
    return currentViewOf(completedAnimationIt->second.animation);
  }
  if (const auto pendingIt = pendingLayoutAnimations_.find(tag); pendingIt != pendingLayoutAnimations_.end()) {
    if (const auto *managedStart =
            std::get_if<ManagedLayoutAnimationStart>(&layoutAnimationOperations_[pendingIt->second.operationIndex])) {
      return managedStart->before;
    }
  }
  return std::nullopt;
}

// A queued layout animation start holds back the React Update, so the screen still shows the view that it starts
// from.
const ShadowView *LayoutAnimationsProxyCommon::queuedLayoutStartView(const Tag tag) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto pendingIt = pendingLayoutAnimations_.find(tag);
  if (pendingIt == pendingLayoutAnimations_.end() || pendingIt->second.type != LayoutAnimationType::LAYOUT) {
    return nullptr;
  }
  const auto *start =
      std::get_if<ManagedLayoutAnimationStart>(&layoutAnimationOperations_[pendingIt->second.operationIndex]);
  return start ? &start->before : nullptr;
}

std::optional<ShadowView> LayoutAnimationsProxyCommon::reparentLayoutAnimation(const Tag tag, const Tag parentTag)
    const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  std::optional<ShadowView> pendingCurrentView;
  if (const auto pendingIt = pendingLayoutAnimations_.find(tag); pendingIt != pendingLayoutAnimations_.end() &&
      pendingIt->second.type != LayoutAnimationType::SHARED_ELEMENT_TRANSITION_PROGRESS) {
    const auto operationIndex = pendingIt->second.operationIndex;
    react_native_assert(operationIndex < layoutAnimationOperations_.size());
    if (auto *managedStart = std::get_if<ManagedLayoutAnimationStart>(&layoutAnimationOperations_[operationIndex])) {
      managedStart->parentTag = parentTag;
      pendingCurrentView = managedStart->before;
    } else {
      react_native_assert(false && "Pending managed layout animation not found");
    }
  }
  if (const auto animationIt = layoutAnimations_.find(tag); animationIt != layoutAnimations_.end()) {
    animationIt->second.parentTag = parentTag;
    return currentViewOf(animationIt->second);
  }
  if (const auto completedAnimationIt = completedAnimations_.find(tag);
      completedAnimationIt != completedAnimations_.end() && !completedAnimationIt->second.shouldRemove) {
    completedAnimationIt->second.animation.parentTag = parentTag;
    return currentViewOf(completedAnimationIt->second.animation);
  }
  return pendingCurrentView;
}

std::optional<ShadowView> LayoutAnimationsProxyCommon::reparentPendingLayoutAnimations(
    const Tag tag,
    const Tag parentTag,
    const ShadowView &newView,
    const react::Point offset) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (!pendingLayoutAnimations_.contains(tag)) {
    return std::nullopt;
  }
  std::optional<ShadowView> currentView;
  for (auto operationIt = layoutAnimationOperations_.rbegin(); operationIt != layoutAnimationOperations_.rend();
       operationIt++) {
    if (const auto *cancellation = std::get_if<LayoutAnimationCancellation>(&*operationIt);
        cancellation && cancellation->tag == tag) {
      break;
    }
    auto *start = std::get_if<ManagedLayoutAnimationStart>(&*operationIt);
    if (!start || start->tag != tag) {
      continue;
    }
    start->parentTag = parentTag;
    start->before.layoutMetrics.frame.origin += offset;
    start->after = newView;
    currentView = start->before;
  }
  return currentView;
}

void LayoutAnimationsProxyCommon::cleanupCompletedAnimations(
    ShadowViewMutationList &mutations,
    const PropsParserContext &propsParserContext,
    const bool preserveRemovals,
    const std::unordered_set<Tag> &preservedTags) const {
#ifdef ANDROID
  std::vector<OpacityRestoration> opacityRestorations;
#endif
  for (auto it = completedAnimations_.begin(); it != completedAnimations_.end();) {
    const auto tag = it->first;
    auto &completedAnimation = it->second;
    if (hasPendingLayoutAnimation(tag)) {
      ++it;
      continue;
    }
    if ((preserveRemovals && completedAnimation.shouldRemove) || preservedTags.contains(tag)) {
      ++it;
      continue;
    }
    auto &animation = completedAnimation.animation;
    auto finalView = animation.currentView;
    if (needsFinalFrameReconciliation(animation.type)) {
      if (animation.currentView == animation.startView) {
        finalView = animation.finalView;
      } else {
        finalView.layoutMetrics = animation.finalView.layoutMetrics;
      }
    }
    if (!completedAnimation.shouldRemove && animation.opacity) {
#ifdef ANDROID
      opacityRestorations.push_back(OpacityRestoration{
          .shadowView = animation.finalView,
          .opacity = *animation.opacity,
      });
#else
      finalView = cloneViewWithOpacity(finalView, *animation.opacity, propsParserContext);
#endif
    }
    if (!completedAnimation.shouldRemove &&
        (finalView.props != animation.currentView.props ||
         finalView.layoutMetrics != animation.currentView.layoutMetrics)) {
      mutations.push_back(ShadowViewMutation::UpdateMutation(animation.currentView, finalView, animation.parentTag));
    }
    updateMap_.erase(tag);
    it = completedAnimations_.erase(it);
  }
#ifdef ANDROID
  if (!opacityRestorations.empty()) {
    restoreOpacityInShadowTree(std::move(opacityRestorations));
  }
#endif
}

const ShadowView &LayoutAnimationsProxyCommon::currentViewOf(LayoutAnimation &animation) const {
#ifdef ANDROID
  resolveCurrentProps(animation);
#endif
  return animation.currentView;
}

ShadowViewMutation LayoutAnimationsProxyCommon::frameUpdate(
    LayoutAnimation &animation,
    const UpdateValues &frame,
    [[maybe_unused]] const bool sendsOnlyChangedProps) const {
  auto newView = animation.finalView;
  updateLayoutMetrics(newView.layoutMetrics, frame.frame, animation.frameOffset);
#ifdef ANDROID
  if (sendsOnlyChangedProps && !ReactNativeFeatureFlags::enableAccumulatedUpdatesInRawPropsAndroid()) {
    return changedPropsUpdate(animation, frame, std::move(newView));
  }
  newView.props = frameProps(animation, frame.base, frame.style);
  animation.sentFrame.reset();
#else
  newView.props = frame.newProps ? frame.newProps : animation.framePropsBase();
#endif
  auto mutation = ShadowViewMutation::UpdateMutation(animation.currentView, newView, animation.parentTag);
  animation.currentView = std::move(newView);
  return mutation;
}

ShadowView LayoutAnimationsProxyCommon::cloneViewWithOpacity(
    const ShadowView &shadowView,
    const double opacity,
    const PropsParserContext &propsParserContext) const {
  auto newView = shadowView;
  folly::dynamic opacityProps = folly::dynamic::object("opacity", opacity);
#ifdef ANDROID
  opacityProps = folly::dynamic::merge(shadowView.props->rawProps, opacityProps);
#endif
  newView.props = componentDescriptorRegistry_->at(newView.componentHandle)
                      .cloneProps(propsParserContext, newView.props, RawProps(opacityProps));
  return newView;
}

ShadowViewMutation LayoutAnimationsProxyCommon::createPropsUpdate(
    const ShadowView &oldView,
    const ShadowView &newView,
    const Tag parentTag,
    [[maybe_unused]] const PropsParserContext &propsParserContext) const {
#ifdef ANDROID
  auto updateView = newView;
  if (!ReactNativeFeatureFlags::enableAccumulatedUpdatesInRawPropsAndroid()) {
    auto changedProps = diffDynamicProps(oldView.props->rawProps, newView.props->rawProps);
    updateView.props = changedProps.empty()
        ? oldView.props
        : componentDescriptorRegistry_->at(newView.componentHandle)
              .cloneProps(propsParserContext, newView.props, RawProps(std::move(changedProps)));
  }
#else
  const auto &updateView = newView;
#endif
  return ShadowViewMutation::UpdateMutation(oldView, updateView, parentTag);
}

void LayoutAnimationsProxyCommon::schedulePullOnNextFrame() const {
  requestLayoutAnimationFlush_(surfaceId_);
}

void LayoutAnimationsProxyCommon::maybeUpdateWindowDimensions(const ShadowViewMutation &mutation) const {
  if (mutation.type == ShadowViewMutation::Update &&
      !std::strcmp(mutation.oldChildShadowView.componentName, RootComponentName)) {
    window_ = {
        mutation.newChildShadowView.layoutMetrics.frame.size.width,
        mutation.newChildShadowView.layoutMetrics.frame.size.height};
  }
}

#ifdef ANDROID
ShadowViewMutation LayoutAnimationsProxyCommon::changedPropsUpdate(
    LayoutAnimation &animation,
    const UpdateValues &frame,
    ShadowView newView) const {
  const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
  if (continuesSentFrame(animation, frame)) {
    auto changedProps = changedRawProps(*animation.sentFrame, frame.style);
    if (!hasNullValue(changedProps)) {
      if (changedProps.empty()) {
        newView.props = animation.currentView.props;
      } else {
        newView.props =
            componentDescriptorRegistry_->at(newView.componentHandle)
                .cloneProps(propsParserContext, animation.currentView.props, RawProps(std::move(changedProps)));
        animation.sentFrame->holdsAllRawProps = false;
      }
      animation.sentFrame->style = frame.style;
      auto mutation = ShadowViewMutation::UpdateMutation(animation.currentView, newView, animation.parentTag);
      animation.currentView = std::move(newView);
      return mutation;
    }
  }
  resolveCurrentProps(animation);
  newView.props = frameProps(animation, frame.base, frame.style);
  auto mutation = createPropsUpdate(animation.currentView, newView, animation.parentTag, propsParserContext);
  animation.currentView = std::move(newView);
  animation.sentFrame = SentFrame{frame.base, frame.style, true};
  return mutation;
}

void LayoutAnimationsProxyCommon::resolveCurrentProps(LayoutAnimation &animation) const {
  auto &sentFrame = animation.sentFrame;
  if (!sentFrame || sentFrame->holdsAllRawProps) {
    return;
  }
  animation.currentView.props = frameProps(animation, sentFrame->base, sentFrame->style);
  sentFrame->holdsAllRawProps = true;
}

Props::Shared LayoutAnimationsProxyCommon::frameProps(
    const LayoutAnimation &animation,
    const Props::Shared &base,
    const folly::dynamic &style) const {
  const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
  return componentDescriptorRegistry_->at(animation.finalView.componentHandle)
      .cloneProps(propsParserContext, base, RawProps(folly::dynamic::merge(base->rawProps, style)));
}

void LayoutAnimationsProxyCommon::scheduleCleanupPull() const {
  const std::weak_ptr<UIManager> weakUiManager = uiManager_;
  jsInvoker_->invokeAsync([weakUiManager, surfaceId = surfaceId_](jsi::Runtime &) {
    if (const auto uiManager = weakUiManager.lock()) {
      uiManager->getShadowTreeRegistry().visit(
          surfaceId, [](const ShadowTree &shadowTree) { shadowTree.notifyDelegatesOfUpdates(); });
    }
  });
}

void LayoutAnimationsProxyCommon::restoreOpacityInShadowTree(std::vector<OpacityRestoration> restorations) const {
  const std::weak_ptr<UIManager> weakUiManager = uiManager_;
  jsInvoker_->invokeAsync(
      [weakUiManager, surfaceId = surfaceId_, restorations = std::move(restorations)](jsi::Runtime &) {
        const auto uiManager = weakUiManager.lock();
        if (!uiManager) {
          return;
        }
        uiManager->getShadowTreeRegistry().visit(surfaceId, [&restorations](const ShadowTree &shadowTree) {
          shadowTree.commit(
              [&restorations](const RootShadowNode &oldRootShadowNode) -> RootShadowNode::Unshared {
                PropsMap propsMap;
                for (const auto &restoration : restorations) {
                  if (!restoration.shadowView.eventEmitter) {
                    continue;
                  }
                  const auto *node = findShadowNode(oldRootShadowNode, restoration.shadowView.tag);
                  if (!node || node->getComponentHandle() != restoration.shadowView.componentHandle ||
                      node->getEventEmitter() != restoration.shadowView.eventEmitter) {
                    continue;
                  }
                  folly::dynamic opacity = folly::dynamic::object("opacity", restoration.opacity);
                  propsMap[node->getFamilyShared()].emplace_back(std::move(opacity));
                }
                return propsMap.empty() ? nullptr : cloneShadowTreeWithNewProps(oldRootShadowNode, propsMap);
              },
              {});
        });
      });
}
#endif

} // namespace reanimated
