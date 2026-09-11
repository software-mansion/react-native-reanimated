#ifdef ANDROID
#include <ReactCommon/CallInvoker.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>
#endif
#include <folly/dynamic.h>
#include <react/debug/react_native_assert.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>
#include <reanimated/LayoutAnimations/PropsDiffer.h>

#include <cstring>
#include <memory>
#include <optional>
#include <unordered_set>
#include <utility>

namespace reanimated {

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

std::optional<SurfaceId> LayoutAnimationsProxyCommon::progressLayoutAnimation(
    const int tag,
    const jsi::Object &newStyle) {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto layoutAnimationIt = layoutAnimations_.find(tag);
  if (layoutAnimationIt == layoutAnimations_.end()) {
    return {};
  }

  auto &layoutAnimation = layoutAnimationIt->second;
  if (layoutAnimation.opacity && !newStyle.hasProperty(uiRuntime_, "opacity")) {
    newStyle.setProperty(uiRuntime_, "opacity", jsi::Value(*layoutAnimation.opacity));
  }

  auto rawProps = std::make_shared<RawProps>(uiRuntime_, jsi::Value(uiRuntime_, newStyle));
  const PropsParserContext propsParserContext{surfaceId_, *contextContainer_};
#ifdef RN_SERIALIZABLE_STATE
  rawProps = std::make_shared<RawProps>(
      folly::dynamic::merge(layoutAnimation.finalView.props->rawProps, (folly::dynamic)*rawProps));
#endif
  auto newProps = componentDescriptorRegistry_->at(layoutAnimation.finalView.componentHandle)
                      .cloneProps(propsParserContext, layoutAnimation.finalView.props, std::move(*rawProps));
  updateMap_.insert_or_assign(tag, UpdateValues{newProps, Frame(uiRuntime_, newStyle)});

  return surfaceId_;
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
  layoutAnimationOperations_.push_back(std::move(start));
  pendingLayoutAnimations_.insert_or_assign(tag, PendingLayoutAnimation{type, layoutAnimationOperations_.size() - 1});
}

void LayoutAnimationsProxyCommon::enqueueLayoutAnimation(ProgressLayoutAnimationStart start) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto tag = start.tag;
  layoutAnimationOperations_.push_back(std::move(start));
  pendingLayoutAnimations_.try_emplace(
      tag, PendingLayoutAnimation{LayoutAnimationType::PROGRESS, layoutAnimationOperations_.size() - 1});
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

ShadowView LayoutAnimationsProxyCommon::materializeLayoutAnimation(
    const Tag tag,
    const ShadowView &before,
    const ShadowView &after,
    const Tag parentTag,
    const std::optional<double> opacity,
    const LayoutAnimationType type) const {
  auto currentView = before;
  const auto activeAnimationIt = layoutAnimations_.find(tag);
  if (type == LayoutAnimationType::ENTERING) {
    currentView = after;
  } else if (activeAnimationIt != layoutAnimations_.end()) {
    currentView = activeAnimationIt->second.currentView;
  } else if (const auto completedAnimationIt = completedAnimations_.find(tag);
             completedAnimationIt != completedAnimations_.end()) {
    if (!completedAnimationIt->second.shouldRemove) {
      currentView = completedAnimationIt->second.animation.currentView;
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
          .parentTag = parentTag,
          .opacity = opacity,
          .type = type,
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
        managedStart->parentTag,
        managedStart->opacity,
        managedStart->type);
    return PreparedLayoutAnimationStart{
        .start = std::move(*managedStart),
        .window = window_,
    };
  }
  if (const auto *progressStart = std::get_if<ProgressLayoutAnimationStart>(&operation)) {
    const auto tag = progressStart->tag;
    const auto activeAnimationIt = layoutAnimations_.find(tag);
    if (activeAnimationIt != layoutAnimations_.end() &&
        activeAnimationIt->second.type != LayoutAnimationType::PROGRESS) {
      activeAnimationIt->second.type = LayoutAnimationType::PROGRESS;
      operations.push_front(std::move(operation));
      return LayoutAnimationStop{tag};
    }
    materializeLayoutAnimation(
        tag,
        progressStart->before,
        progressStart->after,
        progressStart->parentTag,
        std::nullopt,
        LayoutAnimationType::PROGRESS);
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
  auto operations = std::exchange(layoutAnimationOperations_, std::deque<LayoutAnimationOperation>{});
  pendingLayoutAnimations_.clear();
  reconcileLayoutAnimationOperations(operations);
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
      auto propsDiffer = PropsDiffer(uiRuntime_, start.before, start.after);
      values = propsDiffer.computeDiff(uiRuntime_);
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
    layoutAnimationsManager_->startLayoutAnimation(uiRuntime_, start.tag, start.type, values, start.config);
  }
  if (!layoutAnimationOperations_.empty()) {
    requestLayoutAnimationFlush_(surfaceId_);
  }
}

void LayoutAnimationsProxyCommon::flushLayoutAnimationOperations() const {
  react_native_assert(worklets::isOnUIThread(uiScheduler_));
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  flushLayoutAnimationOperationsLocked();
}

void LayoutAnimationsProxyCommon::cancelLayoutAnimation(const Tag tag) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  const auto cancelsPendingStart = pendingLayoutAnimations_.contains(tag);
  auto shouldStopManager = false;

  if (const auto layoutAnimationIt = layoutAnimations_.find(tag); layoutAnimationIt != layoutAnimations_.end()) {
    shouldStopManager = layoutAnimationIt->second.type != LayoutAnimationType::PROGRESS;
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
    layoutAnimationOperations_.clear();
    pendingLayoutAnimations_.clear();
    for (const auto &[tag, animation] : layoutAnimations_) {
      if (animation.type != LayoutAnimationType::PROGRESS && stoppedTags.insert(tag).second) {
        stops.push_back(tag);
      }
    }
    updateMap_.clear();
    layoutAnimations_.clear();
    completedAnimations_.clear();
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

void LayoutAnimationsProxyCommon::updateLayoutAnimationTarget(
    const Tag tag,
    const ShadowView &finalView,
    const std::shared_ptr<Serializable> &config) const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  if (const auto pendingIt = pendingLayoutAnimations_.find(tag); pendingIt != pendingLayoutAnimations_.end()) {
    if (pendingIt->second.type == LayoutAnimationType::PROGRESS) {
      return;
    }
    const auto operationIndex = pendingIt->second.operationIndex;
    react_native_assert(operationIndex < layoutAnimationOperations_.size());
    if (auto *managedStart = std::get_if<ManagedLayoutAnimationStart>(&layoutAnimationOperations_[operationIndex])) {
      managedStart->after = finalView;
      if (config) {
        managedStart->config = config;
      }
      return;
    }
    react_native_assert(false && "Pending managed layout animation not found");
  }
  if (const auto animationIt = layoutAnimations_.find(tag); animationIt != layoutAnimations_.end()) {
    animationIt->second.finalView = finalView;
    return;
  }
  react_native_assert(false && "Layout animation not found");
}

std::optional<ShadowView> LayoutAnimationsProxyCommon::reparentLayoutAnimation(const Tag tag, const Tag parentTag)
    const {
  auto lock = std::unique_lock<std::recursive_mutex>(mutex);
  std::optional<ShadowView> pendingCurrentView;
  if (const auto pendingIt = pendingLayoutAnimations_.find(tag);
      pendingIt != pendingLayoutAnimations_.end() && pendingIt->second.type != LayoutAnimationType::PROGRESS) {
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
    return animationIt->second.currentView;
  }
  if (const auto completedAnimationIt = completedAnimations_.find(tag);
      completedAnimationIt != completedAnimations_.end() && !completedAnimationIt->second.shouldRemove) {
    return completedAnimationIt->second.animation.currentView;
  }
  return pendingCurrentView;
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
    if (!completedAnimation.shouldRemove && completedAnimation.animation.opacity) {
      auto &animation = completedAnimation.animation;
#ifdef ANDROID
      opacityRestorations.push_back(OpacityRestoration{
          .shadowView = animation.finalView,
          .opacity = *animation.opacity,
      });
#else
      auto restoredView = cloneViewWithOpacity(animation.currentView, *animation.opacity, propsParserContext);
      mutations.push_back(ShadowViewMutation::UpdateMutation(animation.currentView, restoredView, animation.parentTag));
#endif
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

ShadowView LayoutAnimationsProxyCommon::cloneViewWithOpacity(
    const ShadowView &shadowView,
    const double opacity,
    const PropsParserContext &propsParserContext) const {
  auto newView = shadowView;
  folly::dynamic opacityProps = folly::dynamic::object("opacity", opacity);
  newView.props = componentDescriptorRegistry_->at(newView.componentHandle)
                      .cloneProps(propsParserContext, newView.props, RawProps(opacityProps));
  return newView;
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
