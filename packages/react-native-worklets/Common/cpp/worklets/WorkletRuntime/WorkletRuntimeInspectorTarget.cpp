#include <worklets/WorkletRuntime/WorkletRuntimeInspectorTarget.h>

#if JS_RUNTIME_HERMES

#include <jsinspector-modern/HostTargetTracing.h>
#include <jsinspector-modern/InspectorInterfaces.h>
#include <jsinspector-modern/cdp/CdpJson.h>
#include <jsinspector-modern/tracing/TracingCategory.h>
#include <jsinspector-modern/tracing/TracingMode.h>

#include <functional>
#include <memory>
#include <set>
#include <string>
#include <utility>

namespace worklets {

using namespace facebook;
using namespace facebook::react;
using namespace facebook::react::jsinspector_modern;

// Suppresses ReactNativeApplication.systemStateChanged notifications so that
// DevTools does not disable Performance/Network tabs due to multiple registered
// hosts. The frontend defaults to isSingleHost=true, so omitting this
// notification keeps it in single-host mode for worklet runtime pages.
class WorkletRuntimeInspectorTarget::FilteringRemoteConnection
    : public IRemoteConnection {
 public:
  explicit FilteringRemoteConnection(std::unique_ptr<IRemoteConnection> inner)
      : inner_(std::move(inner)) {}

  void onMessage(std::string message) override {
    if (message.find("ReactNativeApplication.systemStateChanged") !=
        std::string::npos) {
      return;
    }
    inner_->onMessage(std::move(message));
  }

  void onDisconnect() override {
    inner_->onDisconnect();
  }

 private:
  std::unique_ptr<IRemoteConnection> inner_;
};

// Intercepts Tracing.start / Tracing.end before they reach TracingAgent, which
// would reject them due to the multi-host registeredHostsCount check. Instead
// we call HostTarget::startTracing() / stopTracing() directly, bypassing that
// guard, then emit the standard CDP responses ourselves.
//
// inner_ is held as a shared_ptr so it can be captured in runtimeExecutor_
// callbacks to keep the HostTargetSession (and FilteringRemoteConnection) alive
// until the async stop+emit completes. The remote_ raw pointer is safe as long
// as any copy of inner_ is alive.
class WorkletRuntimeInspectorTarget::WorkletLocalConnection
    : public ILocalConnection {
 public:
  WorkletLocalConnection(
      std::unique_ptr<ILocalConnection> inner,
      FilteringRemoteConnection *remote,
      std::weak_ptr<HostTarget> hostTarget,
      RuntimeExecutor runtimeExecutor)
      : inner_(std::move(inner)),
        remote_(remote),
        hostTarget_(std::move(hostTarget)),
        runtimeExecutor_(std::move(runtimeExecutor)) {}

  ~WorkletLocalConnection() {
    stopTracingIfPending();
  }

  void sendMessage(std::string message) override {
    if (message.find("\"Tracing.start\"") != std::string::npos) {
      handleTracingStart(message);
      return;
    }
    if (message.find("\"Tracing.end\"") != std::string::npos) {
      handleTracingEnd(message);
      return;
    }
    inner_->sendMessage(std::move(message));
  }

  void disconnect() override {
    stopTracingIfPending();
    inner_->disconnect();
  }

 private:
  void stopTracingIfPending() {
    if (hasPendingTrace_) {
      hasPendingTrace_ = false;
      if (auto target = hostTarget_.lock()) {
        // Dispatch to the worklet queue thread so SamplingProfiler::disable()
        // (and its final walkRuntimeStack) runs on the correct thread.
        // We discard the profile — this path is cleanup only (disconnect/dtor).
        // Capture inner_ to keep the HostTargetSession alive until the callback
        // runs, preventing a dangling remote_ in any concurrent handleTracingEnd
        // callback that may still be in flight on the queue.
        runtimeExecutor_([target, inner = inner_](jsi::Runtime &) {
          target->stopTracing();
        });
      }
    }
  }

  void handleTracingStart(const std::string &message) {
    auto target = hostTarget_.lock();
    if (!target) {
      return;
    }

    cdp::PreparsedRequest req;
    try {
      req = cdp::preparse(message);
    } catch (...) {
      return;
    }

    std::set<tracing::Category> categories;
    if (req.params.isObject() && req.params.count("categories") != 0 &&
        req.params["categories"].isString()) {
      categories = tracing::parseSerializedTracingCategories(
          req.params["categories"].getString());
    }

    bool started =
        target->startTracing(tracing::Mode::CDP, std::move(categories));
    if (!started) {
      remote_->onMessage(cdp::jsonError(
          req.id,
          cdp::ErrorCode::InvalidRequest,
          "Tracing has already been started"));
      return;
    }

    hasPendingTrace_ = true;
    remote_->onMessage(cdp::jsonResult(req.id));
  }

  void handleTracingEnd(const std::string &message) {
    auto target = hostTarget_.lock();
    if (!target) {
      return;
    }

    cdp::PreparsedRequest req;
    try {
      req = cdp::preparse(message);
    } catch (...) {
      return;
    }

    hasPendingTrace_ = false;
    // Acknowledge the CDP request immediately, before the async stop.
    remote_->onMessage(cdp::jsonResult(req.id));

    // Dispatch stopTracing() to the worklet queue thread so that
    // SamplingProfiler::disable() — and its final walkRuntimeStack call —
    // runs on the Hermes runtime's own thread rather than the inspector thread.
    // Capture inner_ to keep the HostTargetSession (and thus remote_) alive
    // until the callback completes.
    runtimeExecutor_([target, remote = remote_, inner = inner_](jsi::Runtime &) {
      auto profile = target->stopTracing();
      FrontendChannel fc = [remote](std::string_view msg) {
        remote->onMessage(std::string(msg));
      };
      emitNotificationsForTracingProfile(std::move(profile), fc, false);
    });
  }

  std::shared_ptr<ILocalConnection> inner_;
  FilteringRemoteConnection *remote_; // non-owning; safe while any copy of inner_ is alive
  std::weak_ptr<HostTarget> hostTarget_;
  RuntimeExecutor runtimeExecutor_;
  bool hasPendingTrace_{false};
};

// Minimal HostTargetDelegate for a worklet runtime. Most callbacks are no-ops
// since worklet runtimes are not independently reloadable.
class WorkletRuntimeInspectorTarget::HostDelegate : public HostTargetDelegate {
 public:
  explicit HostDelegate(std::string name) : name_(std::move(name)) {}

  HostTargetMetadata getMetadata() override {
    return {
        .integrationName = name_,
    };
  }

  // Worklet runtimes are not independently reloadable.
  void onReload(const PageReloadRequest & /*request*/) override {}

  // No pause overlay for worklet runtimes.
  void onSetPausedInDebuggerMessage(
      const OverlaySetPausedInDebuggerMessageRequest & /*request*/) override {}

 private:
  std::string name_;
};

// Empty InstanceTargetDelegate — the base class has no pure-virtual methods.
class WorkletRuntimeInspectorTarget::InstanceDelegate
    : public InstanceTargetDelegate {};

WorkletRuntimeInspectorTarget::WorkletRuntimeInspectorTarget(
    const std::string &name,
    std::shared_ptr<jsi::Runtime> runtimeForLifetime,
    facebook::hermes::HermesRuntime &hermesRuntime,
    RuntimeExecutor runtimeExecutor)
    : hostDelegate_(std::make_unique<HostDelegate>(name)),
      instanceDelegate_(std::make_unique<InstanceDelegate>()),
      hermesTargetDelegate_(std::make_unique<HermesRuntimeTargetDelegate>(
          std::move(runtimeForLifetime),
          hermesRuntime)),
      runtimeExecutor_(runtimeExecutor) {
  // Use a synchronous (immediate) VoidExecutor for HostTarget. This means
  // HostTarget callbacks run on the thread that triggers them. Safe for our
  // use case because we control when HostTarget methods are called and the
  // worklet runtime operates on a single serial queue.
  VoidExecutor hostExecutor = [](std::function<void()> &&callback) {
    callback();
  };
  hostTarget_ = HostTarget::create(*hostDelegate_, std::move(hostExecutor));

  // Register with the global inspector singleton so React Native DevTools
  // can discover this runtime as a separate page.
  auto weakHostTarget = std::weak_ptr<HostTarget>(hostTarget_);
  inspectorPageId_ = getInspectorInstance().addPage(
      name,
      /* vm */ "",
      [weakHostTarget, runtimeExecutor = runtimeExecutor_](
          std::unique_ptr<IRemoteConnection> remote)
          -> std::unique_ptr<ILocalConnection> {
        auto target = weakHostTarget.lock();
        if (!target) {
          // Runtime is being torn down — reject the connection.
          return nullptr;
        }
        // FilteringRemoteConnection is moved into HostTarget::connect(), which
        // stores it inside the HostTargetSession. WorkletLocalConnection's
        // inner_ (shared_ptr) keeps that session alive, so the raw pointer is safe.
        auto filteringRemote =
            std::make_unique<FilteringRemoteConnection>(std::move(remote));
        auto *filteringRawPtr = filteringRemote.get();
        auto innerConn = target->connect(std::move(filteringRemote));
        return std::make_unique<WorkletLocalConnection>(
            std::move(innerConn), filteringRawPtr, weakHostTarget, runtimeExecutor);
      },
      {.nativePageReloads = true});

  // Register the RN instance and the Hermes runtime under the host target.
  instanceTarget_ = &hostTarget_->registerInstance(*instanceDelegate_);
  runtimeTarget_ =
      &instanceTarget_->registerRuntime(*hermesTargetDelegate_, std::move(runtimeExecutor));
}

WorkletRuntimeInspectorTarget::~WorkletRuntimeInspectorTarget() {
  // Unregister in reverse order of registration.
  if (instanceTarget_ != nullptr && runtimeTarget_ != nullptr) {
    instanceTarget_->unregisterRuntime(*runtimeTarget_);
    runtimeTarget_ = nullptr;
  }
  if (hostTarget_ != nullptr && instanceTarget_ != nullptr) {
    hostTarget_->unregisterInstance(*instanceTarget_);
    instanceTarget_ = nullptr;
  }
  if (inspectorPageId_ >= 0) {
    getInspectorInstance().removePage(inspectorPageId_);
    inspectorPageId_ = -1;
  }
}

} // namespace worklets

#endif // JS_RUNTIME_HERMES
