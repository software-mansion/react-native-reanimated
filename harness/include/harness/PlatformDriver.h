#pragma once

#include <deque>
#include <memory>
#include <optional>
#include <string>
#include <vector>

#include <harness/Choreographer.h>
#include <harness/Tree.h>

#include <react/renderer/componentregistry/ComponentDescriptorRegistry.h>
#include <react/renderer/mounting/MountingCoordinator.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/MountingTransaction.h>
#include <react/renderer/mounting/stubs/StubViewTree.h>
#include <react/renderer/uimanager/UIManager.h>
#include <react/renderer/uimanager/UIManagerDelegate.h>

namespace reanimated::layout_animation::test {

enum class DriverMode : uint8_t { AndroidPush, AndroidPull, IOS };

struct MountedNode {
  facebook::react::Tag tag;
  std::string component;
  Frame frame;
  float opacity;
  int zIndex;
  std::vector<MountedNode> children;
};

struct MountedMutation {
  std::string type;
  facebook::react::Tag tag;
  facebook::react::Tag parentTag;
  int index;
};

struct MountedFrame {
  int64_t time;
  facebook::react::MountingTransaction::Number transactionNumber;
  std::vector<MountedMutation> mutations;
  MountedNode root;
};

class PlatformDriver final : public facebook::react::UIManagerDelegate {
 public:
  explicit PlatformDriver(Choreographer &choreographer, DriverMode mode);
  ~PlatformDriver() override;

  void render(const Snapshot &snapshot);
  void commitFromMount(const Snapshot &snapshot);
  void frame();
  void flushMountingCoordinator();
  void setMountingOverrideDelegate(const std::shared_ptr<const facebook::react::MountingOverrideDelegate> &delegate);

  const facebook::react::StubViewTree &hostTree() const;
  std::shared_ptr<const facebook::react::ContextContainer> contextContainer() const;
  const facebook::react::SharedComponentDescriptorRegistry &componentDescriptorRegistry() const;
  const std::shared_ptr<facebook::react::UIManager> &uiManager() const;
  std::vector<std::string> takeMountingLogs();
  const std::vector<facebook::react::MountingTransaction::Number> &mountedTransactionNumbers() const;
  const std::vector<MountedFrame> &mountedFrames() const;

  void uiManagerDidFinishTransaction(
      std::shared_ptr<const facebook::react::MountingCoordinator> mountingCoordinator,
      bool mountSynchronously) override;
  void uiManagerDidCreateShadowNode(const facebook::react::ShadowNode &shadowNode) override;
  void uiManagerDidDispatchCommand(
      const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
      const std::string &commandName,
      const folly::dynamic &args) override;
  void uiManagerDidSendAccessibilityEvent(
      const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
      const std::string &eventType) override;
  void uiManagerDidSetIsJSResponder(
      const std::shared_ptr<const facebook::react::ShadowNode> &shadowNode,
      bool isJSResponder,
      bool blockNativeResponder) override;
  void uiManagerShouldSynchronouslyUpdateViewOnUIThread(facebook::react::Tag tag, const folly::dynamic &props) override;
  void uiManagerDidUpdateShadowTree(
      const std::unordered_map<facebook::react::Tag, folly::dynamic> &tagToProps) override;
  void uiManagerShouldAddEventListener(std::shared_ptr<const facebook::react::EventListener> listener) override;
  void uiManagerShouldRemoveEventListener(
      const std::shared_ptr<const facebook::react::EventListener> &listener) override;
  void uiManagerDidStartSurface(const facebook::react::ShadowTree &shadowTree) override;
  void uiManagerDidFinishReactCommit(const facebook::react::ShadowTree &shadowTree) override;
  void uiManagerDidPromoteReactRevision(const facebook::react::ShadowTree &shadowTree) override;
  void uiManagerShouldSetOnSurfaceStartCallback(
      facebook::react::UIManagerDelegate::OnSurfaceStartCallback &&callback) override;

 private:
  struct AndroidMountItem {
    facebook::react::MountingTransaction transaction;
    std::shared_ptr<const facebook::react::MountingCoordinator> coordinator;
  };

  void commit(const Snapshot &snapshot, bool mountSynchronously);
  void pullAndroid(const std::shared_ptr<const facebook::react::MountingCoordinator> &coordinator) const;
  void renderAndroid(const std::shared_ptr<const facebook::react::MountingCoordinator> &coordinator) const;
  void executeMountAndroid(
      facebook::react::MountingTransaction transaction,
      std::shared_ptr<const facebook::react::MountingCoordinator> coordinator) const;
  void dispatchAndroidMountItems() const;
  void initiateIOS(const std::shared_ptr<const facebook::react::MountingCoordinator> &coordinator) const;
  void mount(facebook::react::MountingTransaction &transaction) const;
  void runEffect(const facebook::react::ShadowViewMutation &mutation) const;
  void recordFrame(const facebook::react::MountingTransaction &transaction) const;
  void writeTrace() const;

  static constexpr facebook::react::SurfaceId surfaceId_{1};

  Choreographer &choreographer_;
  DriverMode mode_;
  std::shared_ptr<facebook::react::ContextContainer> contextContainer_;
  std::shared_ptr<facebook::react::ComponentDescriptorProviderRegistry> componentDescriptorProviderRegistry_;
  facebook::react::SharedComponentDescriptorRegistry componentDescriptorRegistry_;
  TreeBuilder treeBuilder_;
  std::shared_ptr<facebook::react::UIManager> uiManager_;
  mutable facebook::react::StubViewTree hostTree_;
  mutable std::optional<facebook::react::MountingTransaction> pendingAndroidTransaction_;
  mutable std::vector<std::shared_ptr<const facebook::react::MountingCoordinator>> androidRenderRequests_;
  mutable std::deque<AndroidMountItem> androidMountItems_;
  mutable bool androidDispatchInProgress_{false};
  mutable bool iosTransactionInFlight_{false};
  mutable bool iosFollowUpRequired_{false};
  mutable std::shared_ptr<const facebook::react::MountingCoordinator> iosFollowUpCoordinator_;
  mutable std::vector<facebook::react::MountingTransaction::Number> mountedTransactionNumbers_;
  mutable std::vector<MountedFrame> mountedFrames_;
};

} // namespace reanimated::layout_animation::test
