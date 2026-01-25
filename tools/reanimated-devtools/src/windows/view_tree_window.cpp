#include "windows/view_tree_window.h"
#include <imgui.h>
#include <algorithm>
#include <cmath>
#include <unordered_map>
#include "protocol.h"

namespace windows {

namespace {

// Structure to hold node drawing info for 3D sorting
struct DrawableNode {
  const ViewNode *node;
  float absoluteX;
  float absoluteY;
  float zDepth;
};

enum class ViewMode : uint8_t { Layered, True3D };

// Helper to check if two rectangles overlap
bool rectsOverlap(float x1, float y1, float w1, float h1, float x2, float y2, float w2, float h2) {
  constexpr float epsilon = 0.01f;

  if (x1 + w1 <= x2 + epsilon || x2 + w2 <= x1 + epsilon)
    return false;
  if (y1 + h1 <= y2 + epsilon || y2 + h2 <= y1 + epsilon)
    return false;
  return true;
}

// Calculate the maximum depth of a subtree
int getSubtreeMaxDepth(
    const TreeSnapshot &snapshot,
    const ViewNode &node,
    const std::set<int32_t> &hiddenTags,
    int currentDepth = 0) {
  if (hiddenTags.count(node.tag)) {
    return currentDepth;
  }

  int maxDepth = currentDepth;
  for (int32_t childTag : node.childTags) {
    auto it = snapshot.nodes.find(childTag);
    if (it != snapshot.nodes.end()) {
      int childMax = getSubtreeMaxDepth(snapshot, it->second, hiddenTags, currentDepth + 1);
      maxDepth = std::max(maxDepth, childMax);
    }
  }
  return maxDepth;
}

// First pass: collect all nodes with simple tree-based depth (no overlap handling)
void collectNodesSimple(
    const TreeSnapshot &snapshot,
    const ViewNode &node,
    const std::set<int32_t> &hiddenTags,
    std::vector<DrawableNode> &outNodes,
    float parentX,
    float parentY,
    float depth) {
  if (hiddenTags.count(node.tag)) {
    return;
  }

  float absoluteX = parentX + node.x;
  float absoluteY = parentY + node.y;

  outNodes.push_back({&node, absoluteX, absoluteY, depth});

  for (int32_t childTag : node.childTags) {
    auto it = snapshot.nodes.find(childTag);
    if (it != snapshot.nodes.end()) {
      collectNodesSimple(snapshot, it->second, hiddenTags, outNodes, absoluteX, absoluteY, depth + 1);
    }
  }
}

// Collect nodes and handle overlapping siblings by adjusting z-depths
void collectNodesWithOverlapHandling(
    const TreeSnapshot &snapshot,
    const std::set<int32_t> &hiddenTags,
    std::vector<DrawableNode> &outNodes,
    const std::vector<int32_t> &rootTags) {

  for (int32_t rootTag : rootTags) {
    auto it = snapshot.nodes.find(rootTag);
    if (it != snapshot.nodes.end()) {
      collectNodesSimple(snapshot, it->second, hiddenTags, outNodes, 0, 0, 0);
    }
  }

  if (outNodes.empty())
    return;

  size_t n = outNodes.size();

  std::unordered_map<int32_t, size_t> tagToIndex;
  tagToIndex.reserve(n);
  for (size_t i = 0; i < n; ++i) {
    tagToIndex[outNodes[i].node->tag] = i;
  }

  std::unordered_map<int32_t, std::vector<size_t>> parentToChildren;
  for (size_t i = 0; i < n; ++i) {
    parentToChildren[outNodes[i].node->parentTag].push_back(i);
  }

  std::vector<std::vector<size_t>> subtreeIndices(n);

  for (size_t i = n; i-- > 0;) {
    int32_t tag = outNodes[i].node->tag;
    subtreeIndices[i].push_back(i);

    auto childIt = parentToChildren.find(tag);
    if (childIt != parentToChildren.end()) {
      for (size_t childIdx : childIt->second) {
        subtreeIndices[i].insert(
            subtreeIndices[i].end(), subtreeIndices[childIdx].begin(), subtreeIndices[childIdx].end());
      }
    }
  }

  std::vector<float> subtreeMaxZ(n);
  for (size_t i = n; i-- > 0;) {
    float maxZ = outNodes[i].zDepth;
    int32_t tag = outNodes[i].node->tag;
    auto childIt = parentToChildren.find(tag);
    if (childIt != parentToChildren.end()) {
      for (size_t childIdx : childIt->second) {
        maxZ = std::max(maxZ, subtreeMaxZ[childIdx]);
      }
    }
    subtreeMaxZ[i] = maxZ;
  }

  std::unordered_map<int32_t, float> parentDepth;
  for (auto &[parentTag, childIndices] : parentToChildren) {
    if (!childIndices.empty()) {
      parentDepth[parentTag] = outNodes[childIndices[0]].zDepth - 1;
    }
  }

  std::vector<int32_t> sortedParents;
  sortedParents.reserve(parentToChildren.size());
  for (auto &[parentTag, _] : parentToChildren) {
    sortedParents.push_back(parentTag);
  }
  std::sort(sortedParents.begin(), sortedParents.end(), [&](int32_t a, int32_t b) {
    return parentDepth[a] > parentDepth[b];
  });

  for (int32_t parentTag : sortedParents) {
    auto &childIndices = parentToChildren[parentTag];
    if (childIndices.size() < 2)
      continue;

    for (size_t i = 1; i < childIndices.size(); ++i) {
      size_t currIdx = childIndices[i];
      DrawableNode &curr = outNodes[currIdx];

      float currMinX = curr.absoluteX;
      float currMinY = curr.absoluteY;
      float currW = curr.node->width;
      float currH = curr.node->height;

      float maxZOffset = 0;

      for (size_t j = 0; j < i; ++j) {
        size_t prevIdx = childIndices[j];
        DrawableNode &prev = outNodes[prevIdx];

        float prevMinX = prev.absoluteX;
        float prevMinY = prev.absoluteY;
        float prevW = prev.node->width;
        float prevH = prev.node->height;

        if (rectsOverlap(currMinX, currMinY, currW, currH, prevMinX, prevMinY, prevW, prevH)) {
          float maxPrevZ = subtreeMaxZ[prevIdx];
          float neededOffset = (maxPrevZ + 1) - curr.zDepth;
          maxZOffset = std::max(maxZOffset, neededOffset);
        }
      }

      if (maxZOffset > 0) {
        for (size_t idx : subtreeIndices[currIdx]) {
          outNodes[idx].zDepth += maxZOffset;
        }
        subtreeMaxZ[currIdx] += maxZOffset;

        int32_t ancestorTag = outNodes[currIdx].node->parentTag;
        while (ancestorTag >= 0) {
          auto it = tagToIndex.find(ancestorTag);
          if (it == tagToIndex.end())
            break;
          size_t ancestorIdx = it->second;
          subtreeMaxZ[ancestorIdx] = std::max(subtreeMaxZ[ancestorIdx], subtreeMaxZ[currIdx]);
          ancestorTag = outNodes[ancestorIdx].node->parentTag;
        }
      }
    }
  }
}

// Transform a single point in 3D space and project to 2D using orthographic projection
void transformPoint3D(
    float inX,
    float inY,
    float inZ,
    float rotationRad,
    float centerX,
    float centerY,
    float centerZ,
    float &outX,
    float &outY,
    float &outZ) {
  float relX = inX - centerX;
  float relY = inY - centerY;
  float relZ = inZ - centerZ;

  float cosR = cosf(rotationRad);
  float sinR = sinf(rotationRad);
  float newX = relX * cosR - relZ * sinR;
  float newZ = relX * sinR + relZ * cosR;

  outX = centerX + newX;
  outY = centerY + relY;
  outZ = newZ;
}

// For layered mode: simple X offset based on depth only
void transformLayered(float &x, float rotationDeg, float zDepth, float depthSpacing) {
  float rotationRad = rotationDeg * 3.14159265f / 180.0f;
  float z = zDepth * depthSpacing;

  float sinR = sinf(rotationRad);

  x = x - z * sinR;
}

void drawViewTree3D(
    app::AppState &state,
    const TreeSnapshot &snapshot,
    ImDrawList *drawList,
    ImVec2 offset,
    float scale,
    const std::set<int32_t> &hiddenTags,
    float rotationDeg,
    float depthSpacing,
    ViewMode viewMode,
    const std::vector<int32_t> &rootTags,
    bool enableHover) {
  std::vector<DrawableNode> nodes;
  collectNodesWithOverlapHandling(snapshot, hiddenTags, nodes, rootTags);

  if (nodes.empty()) {
    return;
  }

  float rotationRad = rotationDeg * 3.14159265f / 180.0f;

  float centerX = offset.x + 200 * scale;
  float centerY = offset.y + 400 * scale;
  float centerZ = 0;

  struct DrawnItem {
    ImVec2 points[4];
    const ViewNode *node;
    bool wasMutated;
    float sortZ;
  };
  std::vector<DrawnItem> drawnItems;

  struct TransformedNode {
    const DrawableNode *drawable;
    ImVec2 corners[4];
    float sortZ;
  };
  std::vector<TransformedNode> transformedNodes;
  transformedNodes.reserve(nodes.size());

  for (const auto &drawable : nodes) {
    const ViewNode &node = *drawable.node;

    float x = offset.x + drawable.absoluteX * scale;
    float y = offset.y + drawable.absoluteY * scale;
    float w = node.width * scale;
    float h = node.height * scale;
    float z = drawable.zDepth * depthSpacing;

    TransformedNode tn;
    tn.drawable = &drawable;

    if (viewMode == ViewMode::True3D && std::abs(rotationDeg) > 0.1f) {
      float corners3D[4][3] = {{x, y, z}, {x + w, y, z}, {x + w, y + h, z}, {x, y + h, z}};

      float totalZ = 0;
      for (int i = 0; i < 4; i++) {
        float outX, outY, outZ;
        transformPoint3D(
            corners3D[i][0],
            corners3D[i][1],
            corners3D[i][2],
            rotationRad,
            centerX,
            centerY,
            centerZ,
            outX,
            outY,
            outZ);
        tn.corners[i] = ImVec2(outX, outY);
        totalZ += outZ;
      }
      tn.sortZ = totalZ / 4.0f;
    } else if (viewMode == ViewMode::Layered && std::abs(rotationDeg) > 0.1f) {
      float layerX = x;
      transformLayered(layerX, rotationDeg, drawable.zDepth, depthSpacing);

      tn.corners[0] = ImVec2(layerX, y);
      tn.corners[1] = ImVec2(layerX + w, y);
      tn.corners[2] = ImVec2(layerX + w, y + h);
      tn.corners[3] = ImVec2(layerX, y + h);
      tn.sortZ = drawable.zDepth;
    } else {
      tn.corners[0] = ImVec2(x, y);
      tn.corners[1] = ImVec2(x + w, y);
      tn.corners[2] = ImVec2(x + w, y + h);
      tn.corners[3] = ImVec2(x, y + h);
      tn.sortZ = drawable.zDepth;
    }

    transformedNodes.push_back(tn);
  }

  std::sort(transformedNodes.begin(), transformedNodes.end(), [](const TransformedNode &a, const TransformedNode &b) {
    return a.sortZ < b.sortZ;
  });

  for (const auto &tn : transformedNodes) {
    const ViewNode &node = *tn.drawable->node;

    bool wasMutated = snapshot.mutatedTags.count(node.tag) > 0;
    ImU32 color = wasMutated ? reanimated::mutationTypeToColor(node.lastMutationType)
                             : IM_COL32(80, 80, 80, static_cast<int>(node.opacity * 255));
    ImU32 borderColor = wasMutated ? IM_COL32(255, 255, 255, 200) : IM_COL32(120, 120, 120, 200);

    drawList->AddQuadFilled(tn.corners[0], tn.corners[1], tn.corners[2], tn.corners[3], color);
    drawList->AddQuad(tn.corners[0], tn.corners[1], tn.corners[2], tn.corners[3], borderColor);

    DrawnItem item;
    for (int i = 0; i < 4; i++)
      item.points[i] = tn.corners[i];
    item.node = &node;
    item.wasMutated = wasMutated;
    item.sortZ = tn.sortZ;
    drawnItems.push_back(item);

    ImU32 textColor = wasMutated ? IM_COL32(255, 255, 255, 255) : IM_COL32(160, 160, 160, 255);
    char label[256];
    snprintf(
        label,
        sizeof(label),
        "%s [%d]\n(%.0f,%.0f) %.0fx%.0f",
        node.componentName.c_str(),
        node.tag,
        node.x,
        node.y,
        node.width,
        node.height);
    drawList->AddText(ImVec2(tn.corners[0].x + 2, tn.corners[0].y + 2), textColor, label);
  }

  if (!enableHover) {
    return;
  }

  ImVec2 mousePos = ImGui::GetMousePos();

  auto pointInQuad = [](ImVec2 p, const ImVec2 quad[4]) -> bool {
    int intersections = 0;
    for (int i = 0; i < 4; i++) {
      ImVec2 v1 = quad[i];
      ImVec2 v2 = quad[(i + 1) % 4];

      if ((v1.y > p.y) != (v2.y > p.y)) {
        float xIntersect = v1.x + (p.y - v1.y) / (v2.y - v1.y) * (v2.x - v1.x);
        if (p.x < xIntersect) {
          intersections++;
        }
      }
    }
    return (intersections % 2) == 1;
  };

  for (auto it = drawnItems.rbegin(); it != drawnItems.rend(); ++it) {
    const auto &item = *it;
    if (pointInQuad(mousePos, item.points)) {
        if (ImGui::IsMouseDoubleClicked(ImGuiMouseButton_Left)){
            state.ui.hiddenTags.insert(item.node->tag);
        }
      ImGui::BeginTooltip();
      ImGui::Text("Component: %s", item.node->componentName.c_str());
      ImGui::Text("Tag: %d", item.node->tag);
      ImGui::Separator();
      ImGui::Text("Position: (%.1f, %.1f)", item.node->x, item.node->y);
      ImGui::Text("Size: %.1f x %.1f", item.node->width, item.node->height);
      ImGui::Text("Opacity: %.2f", item.node->opacity);
      ImGui::Text("Background Color:");
      ImGui::SameLine();
      uint32_t argbColor = static_cast<uint32_t>(item.node->backgroundColor);
      uint32_t rgbaColor = ((argbColor & 0xFF000000) >> 24) | ((argbColor & 0x00FF0000) << 8) |
          ((argbColor & 0x0000FF00) << 8) | ((argbColor & 0x000000FF) << 8);
      ImVec4 bgColor = ImGui::ColorConvertU32ToFloat4(rgbaColor);
      ImGui::TextColored(bgColor, "%08X", rgbaColor);
      ImGui::Separator();
      ImGui::Text("Parent Tag: %d", item.node->parentTag);
      ImGui::Text("Index in Parent: %d", item.node->indexInParent);
      ImGui::Text("Children: %zu", item.node->childTags.size());
      ImGui::Separator();
      const char *mutationType = reanimated::mutationTypeToString(item.node->lastMutationType);
      if (item.wasMutated) {
        ImGui::TextColored(ImVec4(0.4f, 0.8f, 0.4f, 1.0f), "Mutated: %s", mutationType);
      } else {
        ImGui::TextColored(ImVec4(0.5f, 0.5f, 0.5f, 1.0f), "Not mutated this batch");
        ImGui::Text("Last mutation: %s", mutationType);
      }
      ImGui::EndTooltip();

      drawList->AddQuad(
          item.points[0], item.points[1], item.points[2], item.points[3], IM_COL32(255, 255, 0, 255), 3.0f);
      break;
    }
  }
}

} // anonymous namespace

void renderViewTreeWindow(app::AppState &state) {
  bool altHeld = ImGui::GetIO().KeyAlt;
  ImGuiWindowFlags viewTreeFlags = ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoScrollWithMouse;
  ImGui::Begin("View Tree", nullptr, viewTreeFlags);
  {
    std::lock_guard<std::mutex> lock(state.data.snapshotMutex);

    ImVec2 windowSize = ImGui::GetWindowSize();
    ImVec2 contentPos = ImGui::GetCursorScreenPos();
    ImVec2 contentSize = ImGui::GetContentRegionAvail();
    ImVec2 mousePos = ImGui::GetMousePos();

    bool isCanvasHovered = false;
    bool isCanvasActive = false;

    if (!altHeld) {
      ImGui::InvisibleButton("##viewtree_canvas", contentSize);
      isCanvasHovered = ImGui::IsItemHovered();
      isCanvasActive = ImGui::IsItemActive();

      if (isCanvasActive && ImGui::IsMouseDragging(ImGuiMouseButton_Left)) {
        ImVec2 delta = ImGui::GetMouseDragDelta(ImGuiMouseButton_Left);
        state.ui.viewOffset.x += delta.x;
        state.ui.viewOffset.y += delta.y;
        ImGui::ResetMouseDragDelta(ImGuiMouseButton_Left);
      }
      if (isCanvasHovered && ImGui::IsMouseDragging(ImGuiMouseButton_Middle)) {
        ImVec2 delta = ImGui::GetMouseDragDelta(ImGuiMouseButton_Middle);
        state.ui.rotationDeg += delta.x;
        ImGui::ResetMouseDragDelta(ImGuiMouseButton_Middle);
      }

      if (isCanvasHovered) {
        float scrollY = ImGui::GetIO().MouseWheel;
        if (std::abs(scrollY) > 0.0f) {
          float zoomFactor = 1.0f + scrollY * 0.1f;
          float newScale = state.ui.viewScale * zoomFactor;
          newScale = std::max(0.05f, std::min(5.0f, newScale));

          float mouseRelX = mousePos.x - contentPos.x - state.ui.viewOffset.x;
          float mouseRelY = mousePos.y - contentPos.y - state.ui.viewOffset.y;

          state.ui.viewOffset.x -= mouseRelX * (newScale / state.ui.viewScale - 1.0f);
          state.ui.viewOffset.y -= mouseRelY * (newScale / state.ui.viewScale - 1.0f);

          state.ui.viewScale = newScale;
        }
      }
    }

    if (state.data.currentSnapshotIndex >= 0 &&
        state.data.currentSnapshotIndex < static_cast<int>(state.data.snapshots.size())) {
      const auto &snapshot = state.data.snapshots[state.data.currentSnapshotIndex];

      ImDrawList *windowDrawList = ImGui::GetWindowDrawList();

      ImVec2 actualOffset(contentPos.x + state.ui.viewOffset.x, contentPos.y + state.ui.viewOffset.y);

      ViewMode viewMode = (state.ui.viewModeInt == 0) ? ViewMode::Layered : ViewMode::True3D;
      drawViewTree3D(
          state,
          snapshot,
          windowDrawList,
          actualOffset,
          state.ui.viewScale,
          state.ui.hiddenTags,
          state.ui.rotationDeg,
          state.ui.depthSpacing,
          viewMode,
          snapshot.rootTags,
          isCanvasHovered);

      ImGui::SetCursorPos(ImVec2(10, windowSize.y - 25));
      ImGui::TextColored(ImVec4(0.5f, 0.5f, 0.5f, 1.0f), "Drag to pan, scroll to zoom, hold Alt to move window");
    } else {
      ImGui::SetCursorPos(ImVec2(10, 30));
      ImGui::Text("No snapshots yet. Connect your app to see mutations.");
    }
  }
  ImGui::End();
}

} // namespace windows
