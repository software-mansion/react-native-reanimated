#include <harness/PlatformDriver.h>

#include <cstdlib>
#include <fstream>
#include <stdexcept>
#include <string_view>
#include <utility>

#include <folly/json.h>
#include <react/renderer/componentregistry/ComponentDescriptorProvider.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/components/rnreanimated/REASharedTransitionBoundaryComponentDescriptor.h>
#include <react/renderer/components/view/ViewComponentDescriptor.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/LayoutConstraints.h>
#include <react/renderer/core/LayoutContext.h>
#include <react/renderer/mounting/ShadowView.h>

namespace reanimated::layout_animation::test {

using namespace facebook::react;

namespace {

std::string_view modeName(DriverMode mode) {
  switch (mode) {
    case DriverMode::AndroidPush:
      return "android-push";
    case DriverMode::AndroidPull:
      return "android-pull";
    case DriverMode::IOS:
      return "ios";
  }
}

std::string_view mutationName(ShadowViewMutation::Type type) {
  switch (type) {
    case ShadowViewMutation::Create:
      return "create";
    case ShadowViewMutation::Delete:
      return "delete";
    case ShadowViewMutation::Insert:
      return "insert";
    case ShadowViewMutation::Remove:
      return "remove";
    case ShadowViewMutation::Update:
      return "update";
  }
}

MountedNode mountedNode(const StubView &view, bool isRoot = false) {
  auto opacity = 1.0f;
  auto zIndex = 0;
  if (!isRoot) {
    const auto &props = static_cast<const ViewProps &>(*view.props);
    opacity = props.opacity;
    zIndex = props.zIndex.value_or(0);
  }

  auto children = std::vector<MountedNode>{};
  children.reserve(view.children.size());
  for (const auto &child : view.children) {
    children.push_back(mountedNode(*child));
  }

  const auto &frame = view.layoutMetrics.frame;
  return {
      .tag = view.tag,
      .component = view.componentName,
      .frame = {frame.origin.x, frame.origin.y, frame.size.width, frame.size.height},
      .opacity = opacity,
      .zIndex = zIndex,
      .children = std::move(children),
  };
}

folly::dynamic nodeJson(const MountedNode &node) {
  auto children = folly::dynamic::array();
  for (const auto &child : node.children) {
    children.push_back(nodeJson(child));
  }
  return folly::dynamic::object("tag", node.tag)("component", node.component)(
      "frame",
      folly::dynamic::object("x", node.frame.x)("y", node.frame.y)("width", node.frame.width)(
          "height", node.frame.height))("opacity", node.opacity)("zIndex", node.zIndex)(
      "children", std::move(children));
}

folly::dynamic frameJson(const MountedFrame &frame) {
  auto mutations = folly::dynamic::array();
  for (const auto &mutation : frame.mutations) {
    mutations.push_back(
        folly::dynamic::object("type", mutation.type)("tag", mutation.tag)("parentTag", mutation.parentTag)(
            "index", mutation.index));
  }
  return folly::dynamic::object("time", frame.time)("transaction", frame.transactionNumber)(
      "mutations", std::move(mutations))("root", nodeJson(frame.root));
}

} // namespace

PlatformDriver::PlatformDriver(Choreographer &choreographer, DriverMode mode)
    : choreographer_(choreographer),
      mode_(mode),
      contextContainer_(std::make_shared<ContextContainer>()),
      componentDescriptorProviderRegistry_(std::make_shared<ComponentDescriptorProviderRegistry>()),
      componentDescriptorRegistry_(componentDescriptorProviderRegistry_->createComponentDescriptorRegistry(
          ComponentDescriptorParameters{
              .eventDispatcher = EventDispatcher::Shared{},
              .contextContainer = contextContainer_,
              .flavor = nullptr,
          })),
      treeBuilder_(surfaceId_, contextContainer_),
      uiManager_(std::make_shared<UIManager>([](auto &&) {}, contextContainer_)) {
  componentDescriptorProviderRegistry_->add(concreteComponentDescriptorProvider<ViewComponentDescriptor>());
  componentDescriptorProviderRegistry_->add(
      concreteComponentDescriptorProvider<REASharedTransitionBoundaryComponentDescriptor>());
  uiManager_->setComponentDescriptorRegistry(componentDescriptorRegistry_);
  uiManager_->setDelegate(this);
  auto size = Size{.width = 1024, .height = 1024};
  auto shadowTree = std::make_unique<ShadowTree>(
      surfaceId_,
      LayoutConstraints{.minimumSize = size, .maximumSize = size},
      LayoutContext{},
      *uiManager_,
      *contextContainer_);
  hostTree_ = StubViewTree(ShadowView(*shadowTree->getCurrentRevision().rootShadowNode));
  uiManager_->startEmptySurface(std::move(shadowTree));
}

PlatformDriver::~PlatformDriver() {
  writeTrace();
  uiManager_->setDelegate(nullptr);
  uiManager_->getShadowTreeRegistry().remove(surfaceId_);
}

void PlatformDriver::render(const Snapshot &snapshot) {
  choreographer_.requireLane(Lane::JS);
  commit(snapshot, false);
}

void PlatformDriver::commitFromMount(const Snapshot &snapshot) {
  choreographer_.requireLane(Lane::UI);
  commit(snapshot, true);
}

void PlatformDriver::frame() {
  choreographer_.requireLane(Lane::UI);
  if (mode_ == DriverMode::IOS) {
    throw std::logic_error("iOS mounting is driven by its main queue");
  }

  dispatchAndroidMountItems();
  auto requests = std::exchange(androidRenderRequests_, {});
  for (const auto &coordinator : requests) {
    renderAndroid(coordinator);
  }
}

void PlatformDriver::flushMountingCoordinator() {
  choreographer_.requireLane(Lane::UI);
  uiManager_->getShadowTreeRegistry().visit(
      surfaceId_, [](const ShadowTree &shadowTree) { shadowTree.notifyDelegatesOfUpdates(); });
}

void PlatformDriver::setMountingOverrideDelegate(const std::shared_ptr<const MountingOverrideDelegate> &delegate) {
  uiManager_->getShadowTreeRegistry().visit(surfaceId_, [&](const ShadowTree &shadowTree) {
    shadowTree.getMountingCoordinator()->setMountingOverrideDelegate(delegate);
  });
}

const StubViewTree &PlatformDriver::hostTree() const {
  return hostTree_;
}

std::shared_ptr<const ContextContainer> PlatformDriver::contextContainer() const {
  return contextContainer_;
}

const SharedComponentDescriptorRegistry &PlatformDriver::componentDescriptorRegistry() const {
  return componentDescriptorRegistry_;
}

const std::shared_ptr<UIManager> &PlatformDriver::uiManager() const {
  return uiManager_;
}

std::vector<std::string> PlatformDriver::takeMountingLogs() {
  return hostTree_.takeMountingLogs();
}

const std::vector<MountingTransaction::Number> &PlatformDriver::mountedTransactionNumbers() const {
  return mountedTransactionNumbers_;
}

const std::vector<MountedFrame> &PlatformDriver::mountedFrames() const {
  return mountedFrames_;
}

void PlatformDriver::uiManagerDidFinishTransaction(
    std::shared_ptr<const MountingCoordinator> coordinator,
    bool mountSynchronously) {
  if (mode_ == DriverMode::IOS) {
    if (mountSynchronously) {
      choreographer_.requireLane(Lane::UI);
      initiateIOS(coordinator);
    } else {
      choreographer_.post(Lane::UI, [this, coordinator = std::move(coordinator)] { initiateIOS(coordinator); });
    }
    return;
  }

  if (mode_ == DriverMode::AndroidPush) {
    pullAndroid(coordinator);
  }

  if (mountSynchronously) {
    renderAndroid(coordinator);
  } else {
    androidRenderRequests_.push_back(std::move(coordinator));
  }
}

void PlatformDriver::uiManagerDidCreateShadowNode(const ShadowNode &) {}

void PlatformDriver::uiManagerDidDispatchCommand(
    const std::shared_ptr<const ShadowNode> &,
    const std::string &,
    const folly::dynamic &) {}

void PlatformDriver::uiManagerDidSendAccessibilityEvent(
    const std::shared_ptr<const ShadowNode> &,
    const std::string &) {}

void PlatformDriver::uiManagerDidSetIsJSResponder(const std::shared_ptr<const ShadowNode> &, bool, bool) {}

void PlatformDriver::uiManagerShouldSynchronouslyUpdateViewOnUIThread(Tag, const folly::dynamic &) {}

void PlatformDriver::uiManagerDidUpdateShadowTree(const std::unordered_map<Tag, folly::dynamic> &) {}

void PlatformDriver::uiManagerShouldAddEventListener(std::shared_ptr<const EventListener>) {}

void PlatformDriver::uiManagerShouldRemoveEventListener(const std::shared_ptr<const EventListener> &) {}

void PlatformDriver::uiManagerDidStartSurface(const ShadowTree &) {}

void PlatformDriver::uiManagerDidFinishReactCommit(const ShadowTree &) {}

void PlatformDriver::uiManagerDidPromoteReactRevision(const ShadowTree &) {}

void PlatformDriver::uiManagerShouldSetOnSurfaceStartCallback(UIManagerDelegate::OnSurfaceStartCallback &&) {}

void PlatformDriver::commit(const Snapshot &snapshot, bool mountSynchronously) {
  auto status = ShadowTree::CommitStatus::Cancelled;
  uiManager_->getShadowTreeRegistry().visit(surfaceId_, [&](const ShadowTree &shadowTree) {
    auto currentRoot = shadowTree.getCurrentRevision().rootShadowNode;
    auto nextRoot = treeBuilder_.build(*currentRoot, snapshot);
    status = shadowTree.commit(
        [nextRoot = std::move(nextRoot)](const RootShadowNode &) { return nextRoot; },
        ShadowTree::CommitOptions{
            .enableStateReconciliation = false,
            .mountSynchronously = mountSynchronously,
            .source = ShadowTree::CommitSource::Unknown,
        });
  });
  if (status != ShadowTree::CommitStatus::Succeeded) {
    throw std::runtime_error("ShadowTree commit failed");
  }
}

void PlatformDriver::pullAndroid(const std::shared_ptr<const MountingCoordinator> &coordinator) const {
  auto transaction = coordinator->pullTransaction(true);
  if (!transaction) {
    return;
  }

  if (pendingAndroidTransaction_) {
    pendingAndroidTransaction_->mergeWith(std::move(*transaction));
  } else {
    pendingAndroidTransaction_ = std::move(*transaction);
  }
}

void PlatformDriver::renderAndroid(const std::shared_ptr<const MountingCoordinator> &coordinator) const {
  if (mode_ == DriverMode::AndroidPull) {
    auto transaction = coordinator->pullTransaction(true);
    if (transaction) {
      executeMountAndroid(std::move(*transaction), coordinator);
    }
    return;
  }

  if (!pendingAndroidTransaction_) {
    return;
  }
  auto transaction = std::move(*pendingAndroidTransaction_);
  pendingAndroidTransaction_.reset();
  executeMountAndroid(std::move(transaction), coordinator);
}

void PlatformDriver::executeMountAndroid(
    MountingTransaction transaction,
    std::shared_ptr<const MountingCoordinator> coordinator) const {
  androidMountItems_.push_back({std::move(transaction), std::move(coordinator)});
  if (choreographer_.isOn(Lane::UI)) {
    dispatchAndroidMountItems();
  }
}

void PlatformDriver::dispatchAndroidMountItems() const {
  if (androidDispatchInProgress_) {
    return;
  }

  androidDispatchInProgress_ = true;
  auto items = std::exchange(androidMountItems_, {});
  try {
    for (auto &item : items) {
      mount(item.transaction);
      item.coordinator->didPerformAsyncTransactions();
    }
  } catch (...) {
    androidDispatchInProgress_ = false;
    throw;
  }
  androidDispatchInProgress_ = false;
}

void PlatformDriver::initiateIOS(const std::shared_ptr<const MountingCoordinator> &coordinator) const {
  if (iosTransactionInFlight_) {
    iosFollowUpRequired_ = true;
    iosFollowUpCoordinator_ = coordinator;
    return;
  }

  auto nextCoordinator = coordinator;
  do {
    iosFollowUpRequired_ = false;
    iosFollowUpCoordinator_.reset();
    iosTransactionInFlight_ = true;
    try {
      auto transaction = nextCoordinator->pullTransaction();
      if (transaction) {
        mount(*transaction);
      }
    } catch (...) {
      iosTransactionInFlight_ = false;
      throw;
    }
    iosTransactionInFlight_ = false;
    if (iosFollowUpCoordinator_) {
      nextCoordinator = iosFollowUpCoordinator_;
    }
  } while (iosFollowUpRequired_);
}

void PlatformDriver::mount(MountingTransaction &transaction) const {
  for (const auto &mutation : transaction.getMutations()) {
    hostTree_.mutate({mutation});
    runEffect(mutation);
  }
  mountedTransactionNumbers_.push_back(transaction.getNumber());
  recordFrame(transaction);
}

void PlatformDriver::recordFrame(const MountingTransaction &transaction) const {
  auto mutations = std::vector<MountedMutation>{};
  mutations.reserve(transaction.getMutations().size());
  for (const auto &mutation : transaction.getMutations()) {
    const auto &view = mutation.type == ShadowViewMutation::Delete || mutation.type == ShadowViewMutation::Remove
        ? mutation.oldChildShadowView
        : mutation.newChildShadowView;
    mutations.push_back({
        .type = std::string(mutationName(mutation.type)),
        .tag = view.tag,
        .parentTag = mutation.parentTag,
        .index = mutation.index,
    });
  }
  mountedFrames_.push_back({
      .time = choreographer_.now().count(),
      .transactionNumber = transaction.getNumber(),
      .mutations = std::move(mutations),
      .root = mountedNode(hostTree_.getRootStubView(), true),
  });
}

void PlatformDriver::writeTrace() const {
  const auto *path = std::getenv("LA_HARNESS_TRACE_FILE");
  if (!path) {
    return;
  }

  auto frames = folly::dynamic::array();
  for (const auto &frame : mountedFrames_) {
    frames.push_back(frameJson(frame));
  }
  auto output = std::ofstream(path, std::ios::app);
  if (output) {
    output << folly::toJson(folly::dynamic::object("mode", modeName(mode_))("frames", std::move(frames))) << '\n';
  }
}

void PlatformDriver::runEffect(const ShadowViewMutation &mutation) const {
  Tag tag = 0;
  MutationCallback callbackForMutation;

  switch (mutation.type) {
    case ShadowViewMutation::Insert:
      tag = mutation.newChildShadowView.tag;
      if (auto effects = treeBuilder_.findEffects(tag)) {
        callbackForMutation = effects->onMount;
      }
      break;
    case ShadowViewMutation::Update:
      tag = mutation.newChildShadowView.tag;
      if (auto effects = treeBuilder_.findEffects(tag)) {
        callbackForMutation = effects->onUpdate;
      }
      break;
    case ShadowViewMutation::Remove:
      tag = mutation.oldChildShadowView.tag;
      if (auto effects = treeBuilder_.findEffects(tag)) {
        callbackForMutation = effects->onRemove;
      }
      break;
    case ShadowViewMutation::Create:
    case ShadowViewMutation::Delete:
      break;
  }

  if (callbackForMutation) {
    (*callbackForMutation)();
  }
}

} // namespace reanimated::layout_animation::test
