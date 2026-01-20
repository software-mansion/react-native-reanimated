#pragma once

#include <reanimated/Tools/DevToolsProtocol.h>

#include <react/renderer/mounting/ShadowViewMutation.h>

#ifdef __APPLE__
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
#elif defined(ANDROID)
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
#endif

#include <atomic>
#include <mutex>
#include <string>
#include <vector>

namespace reanimated {

using namespace facebook::react;

class DevToolsClient {
 public:
  static constexpr int DEFAULT_PORT = 8765;
  static constexpr const char *DEFAULT_HOST = "127.0.0.1";

  static DevToolsClient &getInstance() {
    static DevToolsClient instance;
    return instance;
  }

  // Enable/disable the client
  void setEnabled(bool enabled) {
    enabled_ = enabled;
  }

  bool isEnabled() const {
    return enabled_;
  }

  // Send mutations to the dev tools server
  void sendMutations(const ShadowViewMutationList &mutations) {
    if (!enabled_) {
      return;
    }

    std::vector<SimpleMutation> simpleMutations;
    simpleMutations.reserve(mutations.size());

    for (const auto &mutation : mutations) {
      SimpleMutation sm;

      // Convert mutation type
      sm.type = convertMutationType(mutation.type);
      sm.parentTag = mutation.parentTag;
      sm.index = mutation.index;

      // Get tag and component name based on mutation type
      if (mutation.type == ShadowViewMutation::Create || mutation.type == ShadowViewMutation::Insert ||
          mutation.type == ShadowViewMutation::Update) {
        const auto &view = mutation.newChildShadowView;
        sm.tag = view.tag;
        if (view.componentName) {
          strncpy(sm.componentName, view.componentName, sizeof(sm.componentName) - 1);
          sm.componentName[sizeof(sm.componentName) - 1] = '\0';
        }
        sm.x = view.layoutMetrics.frame.origin.x;
        sm.y = view.layoutMetrics.frame.origin.y;
        sm.width = view.layoutMetrics.frame.size.width;
        sm.height = view.layoutMetrics.frame.size.height;
        sm.backgroundColor = 0; // Could extract from props if needed
      } else {
        const auto &view = mutation.oldChildShadowView;
        sm.tag = view.tag;
        if (view.componentName) {
          strncpy(sm.componentName, view.componentName, sizeof(sm.componentName) - 1);
          sm.componentName[sizeof(sm.componentName) - 1] = '\0';
        }
        sm.x = view.layoutMetrics.frame.origin.x;
        sm.y = view.layoutMetrics.frame.origin.y;
        sm.width = view.layoutMetrics.frame.size.width;
        sm.height = view.layoutMetrics.frame.size.height;
        sm.backgroundColor = 0;
      }

      simpleMutations.push_back(sm);
    }

    if (!simpleMutations.empty()) {
      sendToServer(simpleMutations);
    }
  }

 private:
  DevToolsClient() : enabled_(false), socket_(-1) {}

  ~DevToolsClient() {
    disconnect();
  }

  DevToolsClient(const DevToolsClient &) = delete;
  DevToolsClient &operator=(const DevToolsClient &) = delete;

  static MutationType convertMutationType(ShadowViewMutation::Type type) {
    switch (type) {
      case ShadowViewMutation::Create:
        return MutationType::Create;
      case ShadowViewMutation::Delete:
        return MutationType::Delete;
      case ShadowViewMutation::Insert:
        return MutationType::Insert;
      case ShadowViewMutation::Remove:
        return MutationType::Remove;
      case ShadowViewMutation::Update:
        return MutationType::Update;
      default:
        return MutationType::Unknown;
    }
  }

  bool connect() {
    std::lock_guard<std::mutex> lock(mutex_);

    if (socket_ >= 0) {
      return true; // Already connected
    }

#if defined(__APPLE__) || defined(ANDROID)
    socket_ = socket(AF_INET, SOCK_STREAM, 0);
    if (socket_ < 0) {
      return false;
    }

    // Set socket to non-blocking for connection with timeout
    struct timeval timeout;
    timeout.tv_sec = 0;
    timeout.tv_usec = 100000; // 100ms timeout
    setsockopt(socket_, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));

    struct sockaddr_in serverAddr;
    memset(&serverAddr, 0, sizeof(serverAddr));
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(DEFAULT_PORT);
    inet_pton(AF_INET, DEFAULT_HOST, &serverAddr.sin_addr);

    if (::connect(socket_, reinterpret_cast<struct sockaddr *>(&serverAddr), sizeof(serverAddr)) < 0) {
      close(socket_);
      socket_ = -1;
      return false;
    }

    return true;
#else
    return false;
#endif
  }

  void disconnect() {
    std::lock_guard<std::mutex> lock(mutex_);
#if defined(__APPLE__) || defined(ANDROID)
    if (socket_ >= 0) {
      close(socket_);
      socket_ = -1;
    }
#endif
  }

  void sendToServer(const std::vector<SimpleMutation> &mutations) {
    // Try to connect if not connected
    if (!connect()) {
      return; // Server not available, silently ignore
    }

#if defined(__APPLE__) || defined(ANDROID)
    DevToolsMessage message(mutations);
    auto buffer = message.serialize();

    std::lock_guard<std::mutex> lock(mutex_);
    ssize_t sent = send(socket_, buffer.data(), buffer.size(), 0);
    if (sent < 0) {
      // Connection lost, close socket to trigger reconnect on next send
      close(socket_);
      socket_ = -1;
    }
#endif
  }

  std::atomic<bool> enabled_;
  int socket_;
  std::mutex mutex_;
};

// Convenience function to send mutations
inline void sendMutationsToDevTools(const ShadowViewMutationList &mutations) {
  DevToolsClient::getInstance().sendMutations(mutations);
}

// Convenience function to enable/disable dev tools
inline void setDevToolsEnabled(bool enabled) {
  DevToolsClient::getInstance().setEnabled(enabled);
}

} // namespace reanimated
