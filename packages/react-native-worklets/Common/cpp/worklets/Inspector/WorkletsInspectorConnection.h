#pragma once

#include <folly/dynamic.h>
#include <jsinspector-modern/InspectorInterfaces.h>
#include <jsinspector-modern/ScopedExecutor.h>
#include <jsinspector-modern/WebSocketInterfaces.h>
#include <worklets/Inspector/WorkletsInspectorTargetMultiplexer.h>

#include <chrono>
#include <cstdint>
#include <functional>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

namespace worklets {

/**
 * Creates a WebSocket connected to `url`. The returned socket must report to
 * `delegate`; it may do so from any thread, the connection marshals every
 * callback to its own thread.
 */
using WorkletsInspectorWebSocketFactory =
    std::function<std::unique_ptr<facebook::react::jsinspector_modern::IWebSocket>(
        const std::string &url,
        std::weak_ptr<facebook::react::jsinspector_modern::IWebSocketDelegate> delegate)>;

class WorkletsInspectorThread;

/**
 * A device connection to the Metro inspector proxy dedicated to Worklet
 * Runtimes.
 *
 * React Native delivers inspector messages on the main thread, which is also
 * where the UI Runtime executes JavaScript. A UI Runtime paused on a breakpoint
 * would therefore never receive the resume command. This connection lists only
 * Worklet Runtime pages and dispatches every message on its own thread, so the
 * runtimes can be paused and resumed regardless of the thread they run on.
 *
 * Only main pages are listed to the proxy. Child pages are exposed to every
 * session of a main page through the CDP Target domain, so one DevTools window
 * shows all Worklet Runtimes.
 *
 * Connections are shared per URL for the lifetime of the process, mirroring
 * how React Native keeps its own inspector connection across reloads.
 */
class WorkletsInspectorConnection final : public std::enable_shared_from_this<WorkletsInspectorConnection> {
 public:
  using ConnectFunc = facebook::react::jsinspector_modern::IInspector::ConnectFunc;
  using Capabilities = facebook::react::jsinspector_modern::InspectorTargetCapabilities;

  enum class PageKind : std::uint8_t {
    Main,
    Child,
  };

  struct Config {
    std::string url;
    std::string deviceName;
    std::string appName;
    WorkletsInspectorWebSocketFactory webSocketFactory;
  };

  static std::shared_ptr<WorkletsInspectorConnection> getOrCreate(Config config);

  ~WorkletsInspectorConnection();

  /**
   * Returns an executor that runs callbacks on the inspector thread.
   */
  [[nodiscard]] facebook::react::jsinspector_modern::VoidExecutor getExecutor() const;

  [[nodiscard]] bool isOnInspectorThread() const;

  /**
   * Registers a page. May be called from any thread. Returns the page id.
   *
   * `description` is the name listed by Metro for a main page and the name of
   * the child target for a child page. `runtimeName` names the execution
   * context of the page's runtime in DevTools.
   */
  int addPage(
      PageKind kind,
      std::string description,
      std::string runtimeName,
      ConnectFunc connectFunc,
      Capabilities capabilities);

  /**
   * Unregisters a page and disconnects all its sessions. Must be called on
   * the inspector thread.
   */
  void removePage(int pageId);

 private:
  using SessionId = uint64_t;

  struct Page {
    PageKind kind;
    std::string description;
    std::string runtimeName;
    ConnectFunc connectFunc;
    Capabilities capabilities;
  };

  struct Session {
    std::unique_ptr<facebook::react::jsinspector_modern::ILocalConnection> localConnection;
    WorkletsInspectorTargetMultiplexer *multiplexer;
    SessionId sessionId;
  };

  using PageSessions = std::unordered_map<std::string, Session>;

  class RemoteConnection;
  class WebSocketDelegateProxy;

  explicit WorkletsInspectorConnection(Config config);

  void connect();
  void reconnect();
  void handleDidOpen();
  void handleDidClose();
  void handleDidFailWithError(std::optional<int> posixCode, const std::string &error);
  void handleMessage(std::string_view message);
  void handleGetPages();
  void handleConnect(const folly::dynamic &payload);
  void handleDisconnect(const folly::dynamic &payload);
  void handleWrappedEvent(const folly::dynamic &payload);
  std::unique_ptr<facebook::react::jsinspector_modern::ILocalConnection> connectToPage(
      const std::string &pageId,
      SessionId sessionId,
      const std::string &proxySessionId,
      WorkletsInspectorTargetMultiplexer **multiplexer);
  void disconnectSession(const std::string &pageId, const std::string &proxySessionId);
  void disconnectPageSessions(const std::string &pageId);
  void closeAllSessions();
  void sendToPackager(const folly::dynamic &message);
  void scheduleSendToPackager(
      folly::dynamic message,
      SessionId sourceSessionId,
      const std::string &sourcePageId,
      const std::string &sourceProxySessionId);
  folly::dynamic pages();
  std::vector<WorkletsInspectorTargetMultiplexer::ChildTarget> childTargets();
  void forEachMultiplexer(const std::function<void(WorkletsInspectorTargetMultiplexer &)> &callback);

  const Config config_;
  const std::shared_ptr<WorkletsInspectorThread> thread_;
  std::shared_ptr<WebSocketDelegateProxy> webSocketDelegate_;
  std::unique_ptr<facebook::react::jsinspector_modern::IWebSocket> webSocket_;
  bool connected_{false};
  bool reconnectPending_{false};
  bool loggedConnectionFailure_{false};
  std::chrono::milliseconds reconnectDelay_;
  std::mutex pagesMutex_;
  std::map<int, Page> pages_;
  int nextPageId_{1};
  std::unordered_map<std::string, PageSessions> sessionsByPage_;
  SessionId nextSessionId_{1};
};

} // namespace worklets
