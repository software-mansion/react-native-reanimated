#pragma once

#include <reanimated/Tools/DevToolsProfiler.h>
#include <reanimated/Tools/DevToolsProtocol.h>
#include <reanimated/Tools/DevToolsServer.h>

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/mounting/ShadowViewMutation.h>

#include <atomic>
#include <string>
#include <vector>

namespace reanimated {

using namespace facebook::react;

/**
 * DevToolsClient - Converts React Native mutations to SimpleMutation format
 *
 * This class handles the conversion of ShadowViewMutation to our wire format.
 * Network I/O is delegated to DevToolsServer (background thread).
 * Also triggers profiler flush when sending mutations.
 */
class DevToolsClient {
 public:
  static DevToolsClient &getInstance() {
    static DevToolsClient instance;
    return instance;
  }

  // Enable/disable the client
  void setEnabled(bool enabled) {
    enabled_ = enabled;
    if (enabled) {
      DevToolsServer::getInstance().start();
    }
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
        auto viewProps = std::dynamic_pointer_cast<const ViewProps>(view.props);
        if (viewProps) {
          sm.opacity = viewProps->opacity;
          if (viewProps->backgroundColor) {
            sm.backgroundColor = static_cast<int32_t>(*viewProps->backgroundColor);
          } else {
            sm.backgroundColor = 0;
          }
        } else {
          sm.opacity = 1.0f;
          sm.backgroundColor = 0;
        }
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
        auto viewProps = std::dynamic_pointer_cast<const ViewProps>(view.props);
        if (viewProps) {
          sm.opacity = viewProps->opacity;
          if (viewProps->backgroundColor) {
            sm.backgroundColor = static_cast<int32_t>(*viewProps->backgroundColor);
          } else {
            sm.backgroundColor = 0;
          }
        } else {
          sm.opacity = 1.0f;
          sm.backgroundColor = 0;
        }
      }

      simpleMutations.push_back(sm);
    }

    if (!simpleMutations.empty()) {
      // Send mutations to background thread
      DevToolsServer::getInstance().sendMutations(std::move(simpleMutations));

      // Also flush profiler events
      //      DevToolsProfiler::getInstance().flush();
    }
  }

 private:
  DevToolsClient() : enabled_(false) {}
  ~DevToolsClient() = default;

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

  std::atomic<bool> enabled_;
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
