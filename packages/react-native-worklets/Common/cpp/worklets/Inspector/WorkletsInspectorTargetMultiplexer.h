#pragma once

#include <folly/dynamic.h>
#include <jsinspector-modern/InspectorInterfaces.h>

#include <cstdint>
#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <vector>

namespace worklets {

/**
 * A debugging session of a main page that also exposes the child pages of the
 * connection through the CDP Target domain. The frontend attaches to the
 * children with `Target.setAutoAttach` in flatten mode and addresses them with
 * a `sessionId`, which lets a single DevTools window debug every Worklet
 * Runtime at once.
 *
 * All methods must be called on the inspector thread.
 */
class WorkletsInspectorTargetMultiplexer final : public facebook::react::jsinspector_modern::ILocalConnection {
 public:
  using ConnectFunc = facebook::react::jsinspector_modern::IInspector::ConnectFunc;

  struct ChildTarget {
    int pageId;
    std::string title;
    ConnectFunc connectFunc;
  };

  /**
   * React Native names the execution context of every runtime "main". Renames
   * the context in a `Runtime.executionContextCreated` event so DevTools shows
   * the runtime name in the Threads pane and in the Console context selector.
   * Returns the message unchanged when it is any other message.
   */
  static std::string renameExecutionContext(const std::string &message, const std::string &name);

  using ListChildTargets = std::function<std::vector<ChildTarget>()>;

  WorkletsInspectorTargetMultiplexer(
      std::unique_ptr<facebook::react::jsinspector_modern::ILocalConnection> mainConnection,
      std::shared_ptr<facebook::react::jsinspector_modern::IRemoteConnection> upstream,
      ListChildTargets listChildTargets);

  ~WorkletsInspectorTargetMultiplexer() override;

  void sendMessage(std::string message) override;

  void disconnect() override;

  void onChildTargetAdded(const ChildTarget &child);

  void onChildTargetRemoved(int pageId);

 private:
  class ChildRemoteConnection;

  struct ChildSession {
    int pageId;
    std::string targetId;
    std::unique_ptr<facebook::react::jsinspector_modern::ILocalConnection> connection;
  };

  void handleTargetMethod(const folly::dynamic &id, const std::string &method, const folly::dynamic &params);
  void sendResult(const folly::dynamic &id, folly::dynamic result);
  void sendError(const folly::dynamic &id, int code, const std::string &message);
  void sendEvent(const std::string &method, folly::dynamic params);
  void sendToFrontend(const folly::dynamic &message);
  std::optional<std::string> attach(const ChildTarget &child);
  void detach(const std::string &sessionId);
  std::optional<std::string> findSessionByPageId(int pageId) const;
  std::optional<ChildTarget> findChildByTargetId(const std::string &targetId) const;
  folly::dynamic targetInfo(const ChildTarget &child) const;
  static std::string targetIdForPage(int pageId);

  std::unique_ptr<facebook::react::jsinspector_modern::ILocalConnection> mainConnection_;
  const std::shared_ptr<facebook::react::jsinspector_modern::IRemoteConnection> upstream_;
  const ListChildTargets listChildTargets_;
  bool autoAttach_{false};
  bool discoverTargets_{false};
  uint64_t nextSessionId_{1};
  std::unordered_map<std::string, ChildSession> sessions_;
};

} // namespace worklets
