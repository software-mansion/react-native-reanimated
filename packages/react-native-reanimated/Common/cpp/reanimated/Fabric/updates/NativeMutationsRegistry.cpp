#include <reanimated/Fabric/updates/NativeMutationsRegistry.h>
#include <reanimated/NativeModules/PropValueProcessor.h>

#include <array>
#include <string>
#include <string_view>
#include <utility>

namespace reanimated {

// The props ReJest is able to snapshot. Mirrors `isValidPropName` on the JS
// side and the set supported by `PropValueProcessor`.
static constexpr std::array<std::string_view, 8> kRecordableProps =
    {"opacity", "zIndex", "width", "height", "top", "left", "backgroundColor", "boxShadow"};

void NativeMutationsRegistry::start() {
  std::lock_guard<std::mutex> lock(mutex_);
  recording_.store(true);
  index_ = 0;
  mutationLog_.clear();
  descriptorLog_.clear();
  latestViewForTag_.clear();
}

void NativeMutationsRegistry::stop() {
  recording_.store(false);
}

void NativeMutationsRegistry::clear() {
  std::lock_guard<std::mutex> lock(mutex_);
  index_ = 0;
  mutationLog_.clear();
  descriptorLog_.clear();
  latestViewForTag_.clear();
}

bool NativeMutationsRegistry::isRecording() const {
  return recording_.load();
}

void NativeMutationsRegistry::record(const ShadowViewMutationList &mutations) {
  if (!recording_.load()) {
    return;
  }

  std::lock_guard<std::mutex> lock(mutex_);
  const auto currentIndex = index_++;
  for (const auto &mutation : mutations) {
    if (mutation.type != ShadowViewMutation::Update && mutation.type != ShadowViewMutation::Insert) {
      continue;
    }
    const auto &view = mutation.newChildShadowView;
    if (view.tag <= 0 || !view.props) {
      continue;
    }
    mutationLog_.push_back({view.tag, currentIndex, view});
    latestViewForTag_[view.tag] = view;
  }
}

void NativeMutationsRegistry::recordCoreAnimationDescriptor(
    Tag tag,
    const std::string &propName,
    double fromValue,
    double toValue,
    double durationMs) {
  if (!recording_.load()) {
    return;
  }

  std::lock_guard<std::mutex> lock(mutex_);
  descriptorLog_.push_back({tag, index_++, propName, fromValue, toValue, durationMs});
}

std::string NativeMutationsRegistry::obtainLatestProp(jsi::Runtime &rt, Tag tag, const std::string &propName) const {
  std::lock_guard<std::mutex> lock(mutex_);
  const auto it = latestViewForTag_.find(tag);
  if (it == latestViewForTag_.end()) {
    return "";
  }
  try {
    return PropValueProcessor::processPropValue(propName, it->second, rt);
  } catch (...) {
    // The prop is not present on this view (e.g. a backgroundColor that was
    // never set). Treat it as "no recorded value" and let the caller fall back.
    return "";
  }
}

jsi::Value NativeMutationsRegistry::getRecordedMutations(jsi::Runtime &rt) const {
  std::lock_guard<std::mutex> lock(mutex_);

  const auto total = mutationLog_.size() + descriptorLog_.size();
  jsi::Array result(rt, total);
  size_t resultIndex = 0;

  for (const auto &entry : mutationLog_) {
    jsi::Object item(rt);
    item.setProperty(rt, "tag", jsi::Value(static_cast<int>(entry.tag)));
    item.setProperty(rt, "index", jsi::Value(static_cast<double>(entry.index)));

    jsi::Object snapshot(rt);
    for (const auto &propName : kRecordableProps) {
      const std::string prop{propName};
      try {
        const auto value = PropValueProcessor::processPropValue(prop, entry.view, rt);
        snapshot.setProperty(rt, prop.c_str(), jsi::String::createFromUtf8(rt, value));
      } catch (...) {
        // Prop absent on this view - skip it.
      }
    }
    item.setProperty(rt, "snapshot", std::move(snapshot));
    result.setValueAtIndex(rt, resultIndex++, std::move(item));
  }

  for (const auto &entry : descriptorLog_) {
    jsi::Object item(rt);
    item.setProperty(rt, "tag", jsi::Value(static_cast<int>(entry.tag)));
    item.setProperty(rt, "index", jsi::Value(static_cast<double>(entry.index)));

    jsi::Object descriptor(rt);
    descriptor.setProperty(rt, "property", jsi::String::createFromUtf8(rt, entry.propName));
    descriptor.setProperty(rt, "from", jsi::Value(entry.fromValue));
    descriptor.setProperty(rt, "to", jsi::Value(entry.toValue));
    descriptor.setProperty(rt, "duration", jsi::Value(entry.durationMs));
    item.setProperty(rt, "descriptor", std::move(descriptor));
    result.setValueAtIndex(rt, resultIndex++, std::move(item));
  }

  return result;
}

} // namespace reanimated
