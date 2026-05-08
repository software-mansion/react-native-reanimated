#pragma once

#include <cxxreact/ReactNativeVersion.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ShadowNode.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>

#if REACT_NATIVE_VERSION_MINOR >= 85
#include <react/renderer/animationbackend/AnimatedProps.h>
#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
#include <react/renderer/animationbackend/AnimationBackend.h>
#endif

#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace react;

using UpdatesBatch = std::vector<std::pair<ShadowNodeFamily::Shared, folly::dynamic>>;

#if REACT_NATIVE_VERSION_MINOR >= 85
struct AnimatedPropsEntry {
  ShadowNodeFamily::Shared shadowNodeFamily;
  AnimatedProps animatedProps;
  bool hasLayoutUpdates;
};
using UpdatesBatchAnimatedProps = std::vector<AnimatedPropsEntry>;
#endif

using RegistryMap = std::unordered_map<Tag, std::pair<ShadowNodeFamily::Shared, folly::dynamic>>;

#ifdef ANDROID
struct PropsToRevert {
  ShadowNodeFamily::Shared shadowNodeFamily;
  std::unordered_set<std::string> props;
};

using PropsToRevertMap = std::unordered_map<Tag, PropsToRevert>;
#endif

class UpdatesRegistry {
 public:
  virtual ~UpdatesRegistry() {}

  virtual bool isEmpty() const;
  folly::dynamic get(Tag tag) const;
  void remove(Tag tag) {
    std::lock_guard<std::mutex> lock{mutex_};
    removeTag(tag);
  }

#ifdef ANDROID
  bool hasPropsToRevert() const;
  void collectPropsToRevert(PropsToRevertMap &propsToRevertMap);
#endif

  // get updates in the non-animation backend path
  void flushUpdates(UpdatesBatch &updatesBatch) {
    std::lock_guard<std::mutex> lock{mutex_};
    flush(updatesBatch);
  }

#if REACT_NATIVE_VERSION_MINOR >= 85
  // get updates in the animation backend path
  void flushAnimatedPropsUpdates(UpdatesBatchAnimatedProps &updatesBatch);
  // get only non-layout updates (for android event handling) in the animation backend path
  void flushNonLayoutUpdates(jsi::Runtime &rt, facebook::react::AnimationMutations &mutations);
  bool hasPendingAnimatedPropsUpdates() const;
  /// Assumes the caller already locked the registry.
  void flushAnimatedProps(UpdatesBatchAnimatedProps &updatesBatch);
  void addAnimatedPropsToBatch(
      const ShadowNodeFamily::Shared &shadowNodeFamily,
      AnimatedProps animatedProps,
      bool hasLayoutUpdates = false);
  void addRawPropsToAnimatedPropsBatch(
      const ShadowNodeFamily::Shared &shadowNodeFamily,
      folly::dynamic props,
      bool hasLayoutUpdates = false);
  void addJSIPropsToAnimatedPropsBatch(
      const ShadowNodeFamily::Shared &shadowNodeFamily,
      jsi::Runtime &rt,
      jsi::Value &props,
      bool hasLayoutUpdates = false);
#endif

  void collectProps(PropsMap &propsMap);
  UpdatesBatch getPendingUpdates();

 protected:
  mutable std::mutex mutex_;
  RegistryMap updatesRegistry_;

  /// Assumes the caller already locked the registry.
  void flush(UpdatesBatch &updatesBatch);

  /// Assumes the caller already locked the registry.
  virtual void removeTag(Tag tag) = 0;

  /// Assumes the caller already locked the registry.
  void addUpdatesToBatch(const ShadowNodeFamily::Shared &shadowNodeFamily, const folly::dynamic &props);

  /// Assumes the caller already locked the registry.
  folly::dynamic getUpdatesFromRegistry(const Tag tag) const;

  /// Assumes the caller already locked the registry.
  void setInUpdatesRegistry(const ShadowNodeFamily::Shared &shadowNodeFamily, const folly::dynamic &props);

  /// Assumes the caller already locked the registry.
  void removeFromUpdatesRegistry(Tag tag);

 private:
  UpdatesBatch updatesBatch_;

#if REACT_NATIVE_VERSION_MINOR >= 85
  UpdatesBatchAnimatedProps updatesBatchAnimatedProps_;
  AnimatedPropsBuilder animatedPropsBuilder_;
#endif

  void flushUpdatesToRegistry(const UpdatesBatch &updatesBatch);

#ifdef ANDROID
  PropsToRevertMap propsToRevertMap_;

  void updatePropsToRevert(Tag tag, const folly::dynamic *newProps = nullptr);
#endif
};

} // namespace reanimated
