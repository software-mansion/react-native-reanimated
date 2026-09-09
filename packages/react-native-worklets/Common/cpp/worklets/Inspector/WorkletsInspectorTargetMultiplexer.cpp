#include <worklets/Inspector/WorkletsInspectorTargetMultiplexer.h>

#include <folly/json.h>

#include <exception>
#include <memory>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

using namespace facebook::react::jsinspector_modern;

namespace {

constexpr int kMethodNotFound = -32601;
constexpr int kInvalidParams = -32602;
constexpr int kSessionNotFound = -32001;

std::string withSessionId(const std::string &message, const std::string &sessionId) {
  const auto prefix = "{\"sessionId\":\"" + sessionId + "\"";
  if (message.size() < 2 || message.front() != '{') {
    return message;
  }
  if (message.size() == 2) {
    return prefix + "}";
  }
  return prefix + "," + message.substr(1);
}

} // namespace

/**
 * Tags every message of a child session with its `sessionId` before handing
 * it to the frontend connection of the main page. Drops the child's
 * `ReactNativeApplication.metadataUpdated` event, so DevTools keeps showing
 * the app metadata of the main page.
 */
class WorkletsInspectorTargetMultiplexer::ChildRemoteConnection final : public IRemoteConnection {
 public:
  ChildRemoteConnection(std::shared_ptr<IRemoteConnection> upstream, std::string sessionId, std::string contextName)
      : upstream_(std::move(upstream)), sessionId_(std::move(sessionId)), contextName_(std::move(contextName)) {}

  void onMessage(std::string message) override {
    if (message.find("\"ReactNativeApplication.metadataUpdated\"") != std::string::npos) {
      return;
    }
    upstream_->onMessage(withSessionId(renameExecutionContext(message, contextName_), sessionId_));
  }

  void onDisconnect() override {}

 private:
  const std::shared_ptr<IRemoteConnection> upstream_;
  const std::string sessionId_;
  const std::string contextName_;
};

std::string WorkletsInspectorTargetMultiplexer::renameExecutionContext(
    const std::string &message,
    const std::string &name) {
  if (message.find("\"Runtime.executionContextCreated\"") == std::string::npos) {
    return message;
  }
  try {
    auto parsed = folly::parseJson(message);
    const auto *method = parsed.get_ptr("method");
    if (method == nullptr || !method->isString() || method->getString() != "Runtime.executionContextCreated") {
      return message;
    }
    auto *params = parsed.get_ptr("params");
    auto *context = params != nullptr && params->isObject() ? params->get_ptr("context") : nullptr;
    if (context == nullptr || !context->isObject()) {
      return message;
    }
    (*context)["name"] = name;
    return folly::toJson(parsed);
  } catch (const std::exception &) {
    return message;
  }
}

WorkletsInspectorTargetMultiplexer::WorkletsInspectorTargetMultiplexer(
    std::unique_ptr<ILocalConnection> mainConnection,
    std::shared_ptr<IRemoteConnection> upstream,
    ListChildTargets listChildTargets)
    : mainConnection_(std::move(mainConnection)),
      upstream_(std::move(upstream)),
      listChildTargets_(std::move(listChildTargets)) {}

WorkletsInspectorTargetMultiplexer::~WorkletsInspectorTargetMultiplexer() = default;

void WorkletsInspectorTargetMultiplexer::sendMessage(std::string message) {
  folly::dynamic parsed;
  try {
    parsed = folly::parseJson(message);
  } catch (const std::exception &) {
    mainConnection_->sendMessage(std::move(message));
    return;
  }
  if (!parsed.isObject()) {
    mainConnection_->sendMessage(std::move(message));
    return;
  }

  const auto *sessionId = parsed.get_ptr("sessionId");
  if (sessionId != nullptr && sessionId->isString()) {
    auto sessionIt = sessions_.find(sessionId->getString());
    const auto *id = parsed.get_ptr("id");
    if (sessionIt == sessions_.end()) {
      if (id != nullptr) {
        folly::dynamic error = folly::dynamic::object("id", *id)("sessionId", *sessionId)(
            "error", folly::dynamic::object("code", kSessionNotFound)("message", "Session not found"));
        sendToFrontend(error);
      }
      return;
    }
    parsed.erase("sessionId");
    sessionIt->second.connection->sendMessage(folly::toJson(parsed));
    return;
  }

  const auto *method = parsed.get_ptr("method");
  if (method != nullptr && method->isString() && method->getString().starts_with("Target.")) {
    const auto *id = parsed.get_ptr("id");
    const auto *params = parsed.get_ptr("params");
    handleTargetMethod(
        id != nullptr ? *id : folly::dynamic(nullptr),
        method->getString(),
        params != nullptr ? *params : folly::dynamic::object());
    return;
  }

  mainConnection_->sendMessage(std::move(message));
}

void WorkletsInspectorTargetMultiplexer::disconnect() {
  std::vector<std::string> sessionIds;
  sessionIds.reserve(sessions_.size());
  for (const auto &[sessionId, session] : sessions_) {
    sessionIds.push_back(sessionId);
  }
  for (const auto &sessionId : sessionIds) {
    detach(sessionId);
  }
  mainConnection_->disconnect();
}

void WorkletsInspectorTargetMultiplexer::onChildTargetAdded(const ChildTarget &child) {
  if (discoverTargets_) {
    sendEvent("Target.targetCreated", folly::dynamic::object("targetInfo", targetInfo(child)));
  }
  if (autoAttach_) {
    attach(child);
  }
}

void WorkletsInspectorTargetMultiplexer::onChildTargetRemoved(int pageId) {
  if (const auto sessionId = findSessionByPageId(pageId)) {
    detach(*sessionId);
  } else if (discoverTargets_) {
    sendEvent("Target.targetDestroyed", folly::dynamic::object("targetId", targetIdForPage(pageId)));
  }
}

void WorkletsInspectorTargetMultiplexer::handleTargetMethod(
    const folly::dynamic &id,
    const std::string &method,
    const folly::dynamic &params) {
  const auto boolParam = [&params](const char *name) {
    const auto *value = params.isObject() ? params.get_ptr(name) : nullptr;
    return value != nullptr && value->isBool() && value->getBool();
  };
  const auto stringParam = [&params](const char *name) -> std::optional<std::string> {
    const auto *value = params.isObject() ? params.get_ptr(name) : nullptr;
    if (value == nullptr || !value->isString()) {
      return std::nullopt;
    }
    return value->getString();
  };

  if (method == "Target.setAutoAttach") {
    autoAttach_ = boolParam("autoAttach");
    if (autoAttach_) {
      for (const auto &child : listChildTargets_()) {
        if (!findSessionByPageId(child.pageId)) {
          attach(child);
        }
      }
    }
    sendResult(id, folly::dynamic::object());
    return;
  }
  if (method == "Target.setDiscoverTargets") {
    discoverTargets_ = boolParam("discover");
    if (discoverTargets_) {
      for (const auto &child : listChildTargets_()) {
        sendEvent("Target.targetCreated", folly::dynamic::object("targetInfo", targetInfo(child)));
      }
    }
    sendResult(id, folly::dynamic::object());
    return;
  }
  if (method == "Target.getTargets") {
    folly::dynamic targetInfos = folly::dynamic::array();
    for (const auto &child : listChildTargets_()) {
      targetInfos.push_back(targetInfo(child));
    }
    sendResult(id, folly::dynamic::object("targetInfos", std::move(targetInfos)));
    return;
  }
  if (method == "Target.attachToTarget") {
    const auto targetId = stringParam("targetId");
    const auto child = targetId ? findChildByTargetId(*targetId) : std::nullopt;
    if (!child) {
      sendError(id, kInvalidParams, "No target with given id found");
      return;
    }
    if (const auto existing = findSessionByPageId(child->pageId)) {
      sendResult(id, folly::dynamic::object("sessionId", *existing));
      return;
    }
    const auto sessionId = attach(*child);
    if (!sessionId) {
      sendError(id, kInvalidParams, "Target rejected the connection");
      return;
    }
    sendResult(id, folly::dynamic::object("sessionId", *sessionId));
    return;
  }
  if (method == "Target.detachFromTarget") {
    const auto sessionId = stringParam("sessionId");
    if (!sessionId || !sessions_.contains(*sessionId)) {
      sendError(id, kInvalidParams, "No session with given id");
      return;
    }
    detach(*sessionId);
    sendResult(id, folly::dynamic::object());
    return;
  }
  if (method == "Target.setRemoteLocations" || method == "Target.activateTarget") {
    sendResult(id, folly::dynamic::object());
    return;
  }
  sendError(id, kMethodNotFound, "'" + method + "' wasn't found");
}

void WorkletsInspectorTargetMultiplexer::sendResult(const folly::dynamic &id, folly::dynamic result) {
  if (id.isNull()) {
    return;
  }
  sendToFrontend(folly::dynamic::object("id", id)("result", std::move(result)));
}

void WorkletsInspectorTargetMultiplexer::sendError(const folly::dynamic &id, int code, const std::string &message) {
  if (id.isNull()) {
    return;
  }
  sendToFrontend(folly::dynamic::object("id", id)("error", folly::dynamic::object("code", code)("message", message)));
}

void WorkletsInspectorTargetMultiplexer::sendEvent(const std::string &method, folly::dynamic params) {
  sendToFrontend(folly::dynamic::object("method", method)("params", std::move(params)));
}

void WorkletsInspectorTargetMultiplexer::sendToFrontend(const folly::dynamic &message) {
  upstream_->onMessage(folly::toJson(message));
}

std::optional<std::string> WorkletsInspectorTargetMultiplexer::attach(const ChildTarget &child) {
  auto sessionId = "worklets-session-" + std::to_string(nextSessionId_++);
  auto connection = child.connectFunc(std::make_unique<ChildRemoteConnection>(upstream_, sessionId, child.title));
  if (!connection) {
    return std::nullopt;
  }
  sessions_.emplace(
      sessionId,
      ChildSession{
          .pageId = child.pageId, .targetId = targetIdForPage(child.pageId), .connection = std::move(connection)});
  sendEvent(
      "Target.attachedToTarget",
      folly::dynamic::object("sessionId", sessionId)("targetInfo", targetInfo(child))("waitingForDebugger", false));
  return sessionId;
}

void WorkletsInspectorTargetMultiplexer::detach(const std::string &sessionId) {
  auto sessionIt = sessions_.find(sessionId);
  if (sessionIt == sessions_.end()) {
    return;
  }
  auto session = std::move(sessionIt->second);
  sessions_.erase(sessionIt);
  session.connection->disconnect();
  sendEvent("Target.detachedFromTarget", folly::dynamic::object("sessionId", sessionId)("targetId", session.targetId));
  if (discoverTargets_) {
    sendEvent("Target.targetDestroyed", folly::dynamic::object("targetId", session.targetId));
  }
}

std::optional<std::string> WorkletsInspectorTargetMultiplexer::findSessionByPageId(int pageId) const {
  for (const auto &[sessionId, session] : sessions_) {
    if (session.pageId == pageId) {
      return sessionId;
    }
  }
  return std::nullopt;
}

std::optional<WorkletsInspectorTargetMultiplexer::ChildTarget> WorkletsInspectorTargetMultiplexer::findChildByTargetId(
    const std::string &targetId) const {
  for (const auto &child : listChildTargets_()) {
    if (targetIdForPage(child.pageId) == targetId) {
      return child;
    }
  }
  return std::nullopt;
}

folly::dynamic WorkletsInspectorTargetMultiplexer::targetInfo(const ChildTarget &child) const {
  return folly::dynamic::object("targetId", targetIdForPage(child.pageId))("type", "worker")("title", child.title)(
      "url", "worklets://runtime/" + std::to_string(child.pageId))(
      "attached", findSessionByPageId(child.pageId).has_value())("canAccessOpener", false);
}

std::string WorkletsInspectorTargetMultiplexer::targetIdForPage(int pageId) {
  return "worklets-target-" + std::to_string(pageId);
}

} // namespace worklets
