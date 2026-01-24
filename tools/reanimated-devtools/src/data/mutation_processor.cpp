#include "data/mutation_processor.h"
#include <algorithm>
#include <sstream>
#include "protocol.h"

namespace data {

void applyMutations(
    app::AppState &state,
    const std::vector<reanimated::SimpleMutation> &mutations,
    uint64_t timestampNs) {
  std::lock_guard<std::mutex> lock(state.data.snapshotMutex);

  for (const auto &mut : mutations) {
    switch (mut.type) {
      case reanimated::MutationType::Create: {
        ViewNode node;
        node.tag = mut.tag;
        node.parentTag = -1;
        node.componentName = mut.componentName;
        node.x = mut.x;
        node.y = mut.y;
        node.width = mut.width;
        node.height = mut.height;
        node.lastMutationType = mut.type;
        node.opacity = mut.opacity;
        node.backgroundColor = mut.backgroundColor;
        state.data.currentTree[mut.tag] = node;
        break;
      }
      case reanimated::MutationType::Delete: {
        state.data.currentTree.erase(mut.tag);
        break;
      }
      case reanimated::MutationType::Insert: {
        if (state.data.currentTree.count(mut.tag)) {
          auto &node = state.data.currentTree[mut.tag];
          node.parentTag = mut.parentTag;
          node.lastMutationType = mut.type;
          node.indexInParent = mut.index;
          node.backgroundColor = mut.backgroundColor;

          // Add to parent's children
          if (mut.parentTag >= 0 && state.data.currentTree.count(mut.parentTag)) {
            auto &parent = state.data.currentTree[mut.parentTag];
            // Insert at index
            if (mut.index >= 0 && mut.index <= static_cast<int>(parent.childTags.size())) {
              parent.childTags.insert(parent.childTags.begin() + mut.index, mut.tag);
            } else {
              parent.childTags.push_back(mut.tag);
            }
          } else {
            // Root node
            state.data.currentRoots.push_back(mut.tag);
          }
        }
        break;
      }
      case reanimated::MutationType::Remove: {
        if (state.data.currentTree.count(mut.tag)) {
          auto &node = state.data.currentTree[mut.tag];
          node.lastMutationType = mut.type;

          // Remove from parent's children
          if (node.parentTag >= 0 && state.data.currentTree.count(node.parentTag)) {
            auto &parent = state.data.currentTree[node.parentTag];
            auto it = std::find(parent.childTags.begin(), parent.childTags.end(), mut.tag);
            if (it != parent.childTags.end()) {
              parent.childTags.erase(it);
            }
          } else {
            auto it = std::find(state.data.currentRoots.begin(), state.data.currentRoots.end(), mut.tag);
            if (it != state.data.currentRoots.end()) {
              state.data.currentRoots.erase(it);
            }
          }
          node.parentTag = -1;
        }
        break;
      }
      case reanimated::MutationType::Update: {
        if (state.data.currentTree.count(mut.tag)) {
          auto &node = state.data.currentTree[mut.tag];
          node.x = mut.x;
          node.y = mut.y;
          node.width = mut.width;
          node.height = mut.height;
          node.lastMutationType = mut.type;
          node.opacity = mut.opacity;
          node.backgroundColor = mut.backgroundColor;
        }
        break;
      }
      default:
        break;
    }
  }

  // Create snapshot
  TreeSnapshot snapshot;
  snapshot.id = state.data.snapshotCounter++;
  snapshot.label = "Snapshot #" + std::to_string(snapshot.id) + " (" + std::to_string(mutations.size()) + " mutations)";
  snapshot.nodes = state.data.currentTree;
  snapshot.rootTags = state.data.currentRoots;
  snapshot.mutations = mutations;
  snapshot.timestampNs = timestampNs; // Store timestamp for linking to profiler events

  // Track which tags were mutated in this batch
  for (const auto &mut : mutations) {
    snapshot.mutatedTags.insert(mut.tag);
  }

  state.data.snapshots.push_back(snapshot);
  state.data.currentSnapshotIndex = static_cast<int>(state.data.snapshots.size()) - 1;
}

} // namespace data
