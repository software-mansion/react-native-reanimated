#include <worklets/Inspector/WorkletsInspectorConnection.h>
#include <worklets/Tools/PlatformLogger.h>

#include <folly/json.h>

#ifdef ANDROID
#include <fbjni/fbjni.h>
#endif // ANDROID

#include <algorithm>
#include <atomic>
#include <condition_variable>
#include <exception>
#include <memory>
#include <string>
#include <thread>
#include <utility>
#include <vector>

namespace worklets {

using namespace facebook::react::jsinspector_modern;

namespace {

constexpr std::chrono::milliseconds kInitialReconnectDelay{2000};
constexpr std::chrono::milliseconds kMaxReconnectDelay{120000};
constexpr const char *kInvalid = "<invalid>";

std::string stringOr(const folly::dynamic &object, const char *key, const std::string &fallback) {
  if (!object.isObject()) {
    return fallback;
  }
  const auto *value = object.get_ptr(key);
  if (value == nullptr || !value->isString()) {
    return fallback;
  }
  return value->getString();
}

/**
 * Lets the main page's HostTarget own a remote connection while the
 * multiplexer shares the same upstream with the child sessions.
 */
class ForwardingRemoteConnection final : public IRemoteConnection {
 public:
  ForwardingRemoteConnection(std::shared_ptr<IRemoteConnection> upstream, std::string runtimeName)
      : upstream_(std::move(upstream)), runtimeName_(std::move(runtimeName)) {}

  void onMessage(std::string message) override {
    upstream_->onMessage(WorkletsInspectorTargetMultiplexer::renameExecutionContext(message, runtimeName_));
  }

  void onDisconnect() override {
    upstream_->onDisconnect();
  }

 private:
  const std::shared_ptr<IRemoteConnection> upstream_;
  const std::string runtimeName_;
};

} // namespace

/**
 * A serial queue backed by a dedicated thread with support for delayed jobs.
 */
class WorkletsInspectorThread {
 public:
  using Job = std::function<void()>;

  WorkletsInspectorThread() : state_(std::make_shared<State>()) {
    auto thread = std::thread([state = state_] {
#ifdef ANDROID
      facebook::jni::ThreadScope::WithClassLoader([state] { runLoop(state); });
#else
      runLoop(state);
#endif // ANDROID
    });
#ifdef ANDROID
    pthread_setname_np(thread.native_handle(), "worklets-inspector");
#endif // ANDROID
    thread.detach();
  }

  ~WorkletsInspectorThread() {
    {
      std::lock_guard lock(state_->mutex);
      state_->running = false;
      state_->jobs.clear();
    }
    state_->cv.notify_all();
  }

  void post(Job job) {
    postDelayed(std::move(job), std::chrono::milliseconds{0});
  }

  void postDelayed(Job job, std::chrono::milliseconds delay) {
    {
      std::lock_guard lock(state_->mutex);
      state_->jobs.emplace(std::chrono::steady_clock::now() + delay, std::move(job));
    }
    state_->cv.notify_one();
  }

  [[nodiscard]] bool isCurrent() const {
    return state_->threadId.load() == std::this_thread::get_id();
  }

 private:
  using TimePoint = std::chrono::steady_clock::time_point;

  struct State {
    std::mutex mutex;
    std::condition_variable cv;
    std::multimap<TimePoint, Job> jobs;
    std::atomic<std::thread::id> threadId;
    bool running{true};
  };

  static void runLoop(const std::shared_ptr<State> &state) {
#if !defined(ANDROID) && defined(__APPLE__)
    pthread_setname_np("worklets-inspector");
#endif
    state->threadId.store(std::this_thread::get_id());
    while (true) {
      Job job;
      {
        std::unique_lock lock(state->mutex);
        while (state->running) {
          if (state->jobs.empty()) {
            state->cv.wait(lock);
            continue;
          }
          const auto nextTime = state->jobs.begin()->first;
          if (nextTime <= std::chrono::steady_clock::now()) {
            break;
          }
          state->cv.wait_until(lock, nextTime);
        }
        if (!state->running) {
          return;
        }
        job = std::move(state->jobs.begin()->second);
        state->jobs.erase(state->jobs.begin());
      }
      job();
    }
  }

  const std::shared_ptr<State> state_;
};

/**
 * Forwards WebSocket callbacks from arbitrary threads to the inspector thread.
 */
class WorkletsInspectorConnection::WebSocketDelegateProxy final : public IWebSocketDelegate {
 public:
  WebSocketDelegateProxy(
      std::weak_ptr<WorkletsInspectorConnection> connection,
      std::shared_ptr<WorkletsInspectorThread> thread)
      : connection_(std::move(connection)), thread_(std::move(thread)) {}

  void didFailWithError(std::optional<int> posixCode, std::string error) override {
    thread_->post([connection = connection_, posixCode, error = std::move(error)] {
      if (auto strongConnection = connection.lock()) {
        strongConnection->handleDidFailWithError(posixCode, error);
      }
    });
  }

  void didReceiveMessage(std::string_view message) override {
    thread_->post([connection = connection_, message = std::string(message)] {
      if (auto strongConnection = connection.lock()) {
        strongConnection->handleMessage(message);
      }
    });
  }

  void didOpen() override {
    thread_->post([connection = connection_] {
      if (auto strongConnection = connection.lock()) {
        strongConnection->handleDidOpen();
      }
    });
  }

  void didClose() override {
    thread_->post([connection = connection_] {
      if (auto strongConnection = connection.lock()) {
        strongConnection->handleDidClose();
      }
    });
  }

 private:
  const std::weak_ptr<WorkletsInspectorConnection> connection_;
  const std::shared_ptr<WorkletsInspectorThread> thread_;
};

/**
 * The frontend side of a debugging session, handed to the page's HostTarget.
 */
class WorkletsInspectorConnection::RemoteConnection final : public IRemoteConnection {
 public:
  RemoteConnection(
      std::weak_ptr<WorkletsInspectorConnection> connection,
      std::string pageId,
      SessionId sessionId,
      std::string proxySessionId)
      : connection_(std::move(connection)),
        pageId_(std::move(pageId)),
        sessionId_(sessionId),
        proxySessionId_(std::move(proxySessionId)) {}

  void onMessage(std::string message) override {
    auto connection = connection_.lock();
    if (!connection) {
      return;
    }
    folly::dynamic payload =
        folly::dynamic::object("pageId", pageId_)("wrappedEvent", std::move(message))("sessionId", proxySessionId_);
    connection->scheduleSendToPackager(
        folly::dynamic::object("event", "wrappedEvent")("payload", std::move(payload)),
        sessionId_,
        pageId_,
        proxySessionId_);
  }

  void onDisconnect() override {
    auto connection = connection_.lock();
    if (!connection) {
      return;
    }
    folly::dynamic payload = folly::dynamic::object("pageId", pageId_)("sessionId", proxySessionId_);
    connection->scheduleSendToPackager(
        folly::dynamic::object("event", "disconnect")("payload", std::move(payload)),
        sessionId_,
        pageId_,
        proxySessionId_);
  }

 private:
  const std::weak_ptr<WorkletsInspectorConnection> connection_;
  const std::string pageId_;
  const SessionId sessionId_;
  const std::string proxySessionId_;
};

std::shared_ptr<WorkletsInspectorConnection> WorkletsInspectorConnection::getOrCreate(Config config) {
  static std::mutex registryMutex;
  static std::map<std::string, std::shared_ptr<WorkletsInspectorConnection>> registry;

  std::lock_guard lock(registryMutex);
  auto it = registry.find(config.url);
  if (it != registry.end()) {
    return it->second;
  }
  std::shared_ptr<WorkletsInspectorConnection> connection(new WorkletsInspectorConnection(std::move(config)));
  connection->webSocketDelegate_ = std::make_shared<WebSocketDelegateProxy>(connection, connection->thread_);
  connection->thread_->post([weakConnection = std::weak_ptr(connection)] {
    if (auto strongConnection = weakConnection.lock()) {
      strongConnection->connect();
    }
  });
  registry.emplace(connection->config_.url, connection);
  return connection;
}

WorkletsInspectorConnection::WorkletsInspectorConnection(Config config)
    : config_(std::move(config)),
      thread_(std::make_shared<WorkletsInspectorThread>()),
      reconnectDelay_(kInitialReconnectDelay) {}

WorkletsInspectorConnection::~WorkletsInspectorConnection() = default;

VoidExecutor WorkletsInspectorConnection::getExecutor() const {
  return [thread = thread_](std::function<void()> &&callback) {
    thread->post(std::move(callback));
  };
}

bool WorkletsInspectorConnection::isOnInspectorThread() const {
  return thread_->isCurrent();
}

int WorkletsInspectorConnection::addPage(
    PageKind kind,
    std::string description,
    std::string runtimeName,
    ConnectFunc connectFunc,
    Capabilities capabilities) {
  int pageId = 0;
  {
    std::lock_guard lock(pagesMutex_);
    pageId = nextPageId_++;
    pages_.emplace(
        pageId,
        Page{
            .kind = kind,
            .description = std::move(description),
            .runtimeName = std::move(runtimeName),
            .connectFunc = std::move(connectFunc),
            .capabilities = capabilities});
  }
  if (kind == PageKind::Child) {
    thread_->post([weakThis = weak_from_this(), pageId] {
      auto strongThis = weakThis.lock();
      if (!strongThis) {
        return;
      }
      for (const auto &child : strongThis->childTargets()) {
        if (child.pageId == pageId) {
          strongThis->forEachMultiplexer(
              [&child](WorkletsInspectorTargetMultiplexer &multiplexer) { multiplexer.onChildTargetAdded(child); });
          return;
        }
      }
    });
  }
  return pageId;
}

void WorkletsInspectorConnection::removePage(int pageId) {
  forEachMultiplexer(
      [pageId](WorkletsInspectorTargetMultiplexer &multiplexer) { multiplexer.onChildTargetRemoved(pageId); });
  {
    std::lock_guard lock(pagesMutex_);
    pages_.erase(pageId);
  }
  disconnectPageSessions(std::to_string(pageId));
}

void WorkletsInspectorConnection::connect() {
  try {
    webSocket_ = config_.webSocketFactory(config_.url, webSocketDelegate_);
  } catch (const std::exception &e) {
    PlatformLogger::log(("[Worklets] Failed to create the inspector WebSocket: " + std::string(e.what())).c_str());
    webSocket_.reset();
  }
  if (!webSocket_) {
    reconnect();
  }
}

void WorkletsInspectorConnection::reconnect() {
  if (reconnectPending_ || connected_) {
    return;
  }
  if (!loggedConnectionFailure_) {
    PlatformLogger::log("[Worklets] Couldn't connect to the inspector proxy, will silently retry");
    loggedConnectionFailure_ = true;
  }
  reconnectPending_ = true;
  const auto delay = reconnectDelay_;
  reconnectDelay_ = std::min(reconnectDelay_ * 2, kMaxReconnectDelay);
  thread_->postDelayed(
      [weakThis = weak_from_this()] {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        strongThis->reconnectPending_ = false;
        if (!strongThis->connected_) {
          strongThis->connect();
        }
      },
      delay);
}

void WorkletsInspectorConnection::handleDidOpen() {
  connected_ = true;
  reconnectDelay_ = kInitialReconnectDelay;
  loggedConnectionFailure_ = false;
}

void WorkletsInspectorConnection::handleDidClose() {
  connected_ = false;
  webSocket_.reset();
  closeAllSessions();
  reconnect();
}

void WorkletsInspectorConnection::handleDidFailWithError(
    std::optional<int> /*posixCode*/,
    const std::string & /*error*/) {
  connected_ = false;
  if (webSocket_) {
    closeAllSessions();
    webSocket_.reset();
  }
  reconnect();
}

void WorkletsInspectorConnection::handleMessage(std::string_view message) {
  folly::dynamic parsed;
  try {
    parsed = folly::parseJson(message);
  } catch (const std::exception &e) {
    PlatformLogger::log(("[Worklets] Unrecognized inspector message: " + std::string(e.what())).c_str());
    return;
  }
  const auto event = stringOr(parsed, "event", kInvalid);
  const auto *payload = parsed.isObject() ? parsed.get_ptr("payload") : nullptr;
  const folly::dynamic emptyPayload = folly::dynamic::object();
  const auto &payloadOrEmpty = payload != nullptr ? *payload : emptyPayload;
  if (event == "getPages") {
    handleGetPages();
  } else if (event == "wrappedEvent") {
    handleWrappedEvent(payloadOrEmpty);
  } else if (event == "connect") {
    handleConnect(payloadOrEmpty);
  } else if (event == "disconnect") {
    handleDisconnect(payloadOrEmpty);
  } else {
    PlatformLogger::log(("[Worklets] Unknown inspector event: " + event).c_str());
  }
}

void WorkletsInspectorConnection::handleGetPages() {
  sendToPackager(folly::dynamic::object("event", "getPages")("payload", pages()));
}

void WorkletsInspectorConnection::handleConnect(const folly::dynamic &payload) {
  const auto pageId = stringOr(payload, "pageId", kInvalid);
  const auto proxySessionId = stringOr(payload, "sessionId", "");

  auto &pageSessions = sessionsByPage_[pageId];
  if (pageSessions.contains(proxySessionId)) {
    disconnectSession(pageId, proxySessionId);
    return;
  }

  const auto sessionId = nextSessionId_++;
  WorkletsInspectorTargetMultiplexer *multiplexer = nullptr;
  auto localConnection = connectToPage(pageId, sessionId, proxySessionId, &multiplexer);
  if (!localConnection) {
    folly::dynamic disconnectPayload = folly::dynamic::object("pageId", pageId)("sessionId", proxySessionId);
    sendToPackager(folly::dynamic::object("event", "disconnect")("payload", std::move(disconnectPayload)));
    return;
  }
  sessionsByPage_[pageId].emplace(
      proxySessionId,
      Session{.localConnection = std::move(localConnection), .multiplexer = multiplexer, .sessionId = sessionId});
}

std::unique_ptr<ILocalConnection> WorkletsInspectorConnection::connectToPage(
    const std::string &pageId,
    SessionId sessionId,
    const std::string &proxySessionId,
    WorkletsInspectorTargetMultiplexer **multiplexer) {
  std::optional<Page> page;
  {
    std::lock_guard lock(pagesMutex_);
    int pageIdInt = 0;
    try {
      pageIdInt = std::stoi(pageId);
    } catch (...) {
      pageIdInt = 0;
    }
    auto it = pages_.find(pageIdInt);
    if (it != pages_.end()) {
      page = it->second;
    }
  }
  if (!page) {
    return nullptr;
  }

  std::shared_ptr<IRemoteConnection> upstream =
      std::make_shared<RemoteConnection>(weak_from_this(), pageId, sessionId, proxySessionId);
  if (page->kind == PageKind::Child) {
    return page->connectFunc(std::make_unique<ForwardingRemoteConnection>(upstream, page->runtimeName));
  }

  auto mainConnection = page->connectFunc(std::make_unique<ForwardingRemoteConnection>(upstream, page->runtimeName));
  if (!mainConnection) {
    return nullptr;
  }
  auto multiplexedConnection = std::make_unique<WorkletsInspectorTargetMultiplexer>(
      std::move(mainConnection), std::move(upstream), [weakThis = weak_from_this()] {
        auto strongThis = weakThis.lock();
        return strongThis ? strongThis->childTargets() : std::vector<WorkletsInspectorTargetMultiplexer::ChildTarget>{};
      });
  *multiplexer = multiplexedConnection.get();
  return multiplexedConnection;
}

void WorkletsInspectorConnection::handleDisconnect(const folly::dynamic &payload) {
  disconnectSession(stringOr(payload, "pageId", kInvalid), stringOr(payload, "sessionId", ""));
}

void WorkletsInspectorConnection::handleWrappedEvent(const folly::dynamic &payload) {
  const auto pageId = stringOr(payload, "pageId", kInvalid);
  const auto proxySessionId = stringOr(payload, "sessionId", "");
  const auto wrappedEvent = stringOr(payload, "wrappedEvent", kInvalid);

  auto pageIt = sessionsByPage_.find(pageId);
  if (pageIt == sessionsByPage_.end()) {
    return;
  }
  auto sessionIt = pageIt->second.find(proxySessionId);
  if (sessionIt == pageIt->second.end()) {
    return;
  }
  sessionIt->second.localConnection->sendMessage(wrappedEvent);
}

void WorkletsInspectorConnection::disconnectSession(const std::string &pageId, const std::string &proxySessionId) {
  auto pageIt = sessionsByPage_.find(pageId);
  if (pageIt == sessionsByPage_.end()) {
    return;
  }
  auto sessionIt = pageIt->second.find(proxySessionId);
  if (sessionIt == pageIt->second.end()) {
    return;
  }
  auto localConnection = std::move(sessionIt->second.localConnection);
  pageIt->second.erase(sessionIt);
  if (pageIt->second.empty()) {
    sessionsByPage_.erase(pageIt);
  }
  if (localConnection) {
    localConnection->disconnect();
  }
}

void WorkletsInspectorConnection::disconnectPageSessions(const std::string &pageId) {
  while (true) {
    auto pageIt = sessionsByPage_.find(pageId);
    if (pageIt == sessionsByPage_.end() || pageIt->second.empty()) {
      return;
    }
    disconnectSession(pageId, pageIt->second.begin()->first);
  }
}

void WorkletsInspectorConnection::closeAllSessions() {
  while (!sessionsByPage_.empty()) {
    disconnectPageSessions(sessionsByPage_.begin()->first);
  }
}

void WorkletsInspectorConnection::sendToPackager(const folly::dynamic &message) {
  if (!webSocket_) {
    return;
  }
  webSocket_->send(folly::toJson(message));
}

void WorkletsInspectorConnection::scheduleSendToPackager(
    folly::dynamic message,
    SessionId sourceSessionId,
    const std::string &sourcePageId,
    const std::string &sourceProxySessionId) {
  thread_->post(
      [weakThis = weak_from_this(), message = std::move(message), sourceSessionId, sourcePageId, sourceProxySessionId] {
        auto strongThis = weakThis.lock();
        if (!strongThis) {
          return;
        }
        auto pageIt = strongThis->sessionsByPage_.find(sourcePageId);
        if (pageIt == strongThis->sessionsByPage_.end()) {
          return;
        }
        auto sessionIt = pageIt->second.find(sourceProxySessionId);
        if (sessionIt != pageIt->second.end() && sessionIt->second.sessionId == sourceSessionId) {
          strongThis->sendToPackager(message);
        }
      });
}

folly::dynamic WorkletsInspectorConnection::pages() {
  std::lock_guard lock(pagesMutex_);
  folly::dynamic array = folly::dynamic::array();
  for (const auto &[pageId, page] : pages_) {
    if (page.kind != PageKind::Main) {
      continue;
    }
    folly::dynamic pageDescription = folly::dynamic::object;
    pageDescription["id"] = std::to_string(pageId);
    pageDescription["title"] = config_.appName + " (" + config_.deviceName + ")";
    pageDescription["description"] = page.description;
    pageDescription["app"] = config_.appName;
    auto capabilities = targetCapabilitiesToDynamic(page.capabilities);
    capabilities["supportsMultipleDebuggers"] = true;
    pageDescription["capabilities"] = std::move(capabilities);
    array.push_back(std::move(pageDescription));
  }
  return array;
}

std::vector<WorkletsInspectorTargetMultiplexer::ChildTarget> WorkletsInspectorConnection::childTargets() {
  std::lock_guard lock(pagesMutex_);
  std::vector<WorkletsInspectorTargetMultiplexer::ChildTarget> children;
  for (const auto &[pageId, page] : pages_) {
    if (page.kind == PageKind::Child) {
      children.push_back(WorkletsInspectorTargetMultiplexer::ChildTarget{
          .pageId = pageId, .title = page.description, .connectFunc = page.connectFunc});
    }
  }
  return children;
}

void WorkletsInspectorConnection::forEachMultiplexer(
    const std::function<void(WorkletsInspectorTargetMultiplexer &)> &callback) {
  for (auto &[pageId, pageSessions] : sessionsByPage_) {
    for (auto &[proxySessionId, session] : pageSessions) {
      if (session.multiplexer != nullptr) {
        callback(*session.multiplexer);
      }
    }
  }
}

} // namespace worklets
