#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <cassert>
#include <iostream>

using namespace reanimated;
int main() {
  UpdatesRegistryManager manager(nullptr);
  auto lock = manager.lock();
  auto a = std::make_shared<ShadowNodeFamily>(ShadowNodeFamily{10, 1});
  auto b = std::make_shared<ShadowNodeFamily>(ShadowNodeFamily{20, 2});
  manager.recordSynchronousProps({{a, folly::dynamic::object("opacity", 0.5)}});
  const auto av = manager.pendingSynchronousPropsVersion(1);
  manager.recordSynchronousProps({{b, folly::dynamic::object("opacity", 0.3)}});
  assert(manager.pendingSynchronousPropsVersion(1) == av);
  PropsMap props;
  manager.collectPendingSynchronousProps(props, 1);
  const auto version = manager.pendingSynchronousPropsVersion(1);
  assert(props.size() == 1 && props.contains(a));
  manager.recordSynchronousProps({{a, folly::dynamic::object("opacity", 0.7)}});
  manager.clearPendingSynchronousProps(1, version);
  assert(manager.hasPendingSynchronousProps(10));
  props.clear();
  manager.collectPendingSynchronousProps(props, 1);
  assert(((folly::dynamic)props.at(a).front())["opacity"] == 0.7);
  manager.clearPendingSynchronousProps(10, folly::dynamic::object("opacity", 0.5));
  assert(manager.hasPendingSynchronousProps(10));
  manager.clearPendingSynchronousProps(10, folly::dynamic::object("opacity", 0.7));
  assert(!manager.hasPendingSynchronousProps(10));
  assert(manager.hasPendingSynchronousProps(20));
  assert(manager.pendingSynchronousPropsVersion(1) == 0);
  manager.removeSurface(2);
  manager.recordSynchronousProps({{a, folly::dynamic::object("transform", 60)("opacity", 0.5)}});
  auto oldRoot = std::make_shared<RootShadowNode>(RootShadowNode{1});
  auto reactRoot = std::make_shared<RootShadowNode>(RootShadowNode{2});
  PropsMap registryProps;
  registryProps[a].emplace_back(folly::dynamic::object("transform", 100)("width", 200));
  assert(!manager.recordReactCommit(reactRoot, registryProps));
  manager.acknowledgeReactCommit(*oldRoot);
  props.clear();
  manager.collectPendingSynchronousProps(props, 1);
  assert(((folly::dynamic)props.at(a).front())["transform"] == 60);
  manager.recordSynchronousProps({{a, folly::dynamic::object("opacity", 0.7)}});
  manager.acknowledgeReactCommit(*reactRoot);
  props.clear();
  manager.collectPendingSynchronousProps(props, 1);
  folly::dynamic afterReact = props.at(a).front();
  assert(afterReact.count("transform") == 0 && afterReact["opacity"] == 0.7);
  auto beforeCommit = manager.pendingSynchronousPropsVersion(1);
  manager.recordSynchronousProps({{a, folly::dynamic::object("transform", 80)}});
  manager.clearPendingSynchronousProps(1, beforeCommit);
  props.clear();
  manager.collectPendingSynchronousProps(props, 1);
  folly::dynamic afterReanimated = props.at(a).front();
  assert(afterReanimated.count("opacity") == 0 && afterReanimated["transform"] == 80);
  manager.recordReactCommit(reactRoot, registryProps);
  manager.recordSynchronousProps({{a, folly::dynamic::object("transform", 80)}});
  manager.acknowledgeReactCommit(*reactRoot);
  assert(manager.hasPendingSynchronousProps(10));
  manager.removeSurface(1);
  assert(manager.pendingSynchronousSurfaces().empty());
  std::cout
      << "PASS: cancelled React root, committed keys, released CSS keys, per-key acknowledgment, same-value newer write, surface removal\n";
  std::cout << "PASS: surface isolation, snapshot acknowledgment, newer writes, value-scoped eviction\n";
}
