#include "windows/profiler_window.h"
#include <imgui.h>
#include <algorithm>
#include <cmath>
#include "protocol.h"

namespace windows {

namespace {

constexpr float PROFILER_ROW_HEIGHT = 24.0f;
constexpr float PROFILER_ROW_SPACING = 4.0f;
constexpr float PROFILER_HEADER_WIDTH = 150.0f;
constexpr float PROFILER_EVENT_HEIGHT = 18.0f;
constexpr float PROFILER_EVENT_SPACING = 2.0f;

ImU32 getColorForStringId(uint32_t stringId) {
  uint32_t hash = stringId * 2654435761u;
  uint8_t r = 100 + (hash & 0xFF) % 155;
  uint8_t g = 100 + ((hash >> 8) & 0xFF) % 155;
  uint8_t b = 100 + ((hash >> 16) & 0xFF) % 155;
  return IM_COL32(r, g, b, 255);
}

std::vector<EventWithDepth> assignEventDepths(const std::vector<ProfilerEventData> &events, uint64_t minTimeNs) {
  std::vector<EventWithDepth> eventsWithDepth;
  eventsWithDepth.reserve(events.size());

  for (const auto &event : events) {
    EventWithDepth ewd;
    ewd.event = &event;
    ewd.startRel = static_cast<double>(event.startTimeNs - minTimeNs);
    ewd.endRel = static_cast<double>(event.endTimeNs - minTimeNs);
    ewd.depth = 0;
    eventsWithDepth.push_back(ewd);
  }

  std::sort(eventsWithDepth.begin(), eventsWithDepth.end(), [](const EventWithDepth &a, const EventWithDepth &b) {
    if (a.startRel != b.startRel)
      return a.startRel < b.startRel;
    return (b.endRel - b.startRel) < (a.endRel - a.startRel);
  });

  std::vector<double> depthEndTimes;

  for (auto &ewd : eventsWithDepth) {
    int assignedDepth = -1;
    bool foundSlot = false;

    for (size_t d = 0; d < depthEndTimes.size(); ++d) {
      if (ewd.startRel >= depthEndTimes[d]) {
        assignedDepth = static_cast<int>(d);
        depthEndTimes[d] = ewd.endRel;
        foundSlot = true;
        break;
      }
    }

    if (!foundSlot) {
      assignedDepth = static_cast<int>(depthEndTimes.size());
      depthEndTimes.push_back(ewd.endRel);
    }

    ewd.depth = assignedDepth;
  }

  return eventsWithDepth;
}

HoveredEventInfo
renderProfilerTimeline(ImDrawList *drawList, ImVec2 windowPos, ImVec2 windowSize, app::AppState &state) {
  HoveredEventInfo hoveredEvent;
  std::lock_guard<std::mutex> lock(state.data.profilerMutex);

  if (state.data.threadTimelines.empty() || state.data.profilerMinTimeNs == UINT64_MAX) {
    ImGui::SetCursorPos(ImVec2(10, 30));
    ImGui::Text("No profiler data yet. Waiting for events...");
    return hoveredEvent;
  }

  ImVec2 mousePos = ImGui::GetMousePos();
  bool isHoveringCanvas = ImGui::IsItemHovered();

  float timelineX = windowPos.x + PROFILER_HEADER_WIDTH;
  float timelineWidth = windowSize.x - PROFILER_HEADER_WIDTH;

  if (timelineWidth <= 0)
    return hoveredEvent;

  uint64_t totalTimeRangeNs = state.data.profilerMaxTimeNs - state.data.profilerMinTimeNs;

  if (state.ui.profilerLockToLatest && totalTimeRangeNs > 0) {
    double viewWidthNs = timelineWidth * state.ui.profilerNsPerPixel;
    state.ui.profilerViewStartNs = static_cast<double>(totalTimeRangeNs) - viewWidthNs;
    if (state.ui.profilerViewStartNs < 0)
      state.ui.profilerViewStartNs = 0;
  }

  double viewStartNs = state.ui.profilerViewStartNs;
  double viewEndNs = viewStartNs + timelineWidth * state.ui.profilerNsPerPixel;

  // Header background
  drawList->AddRectFilled(
      windowPos, ImVec2(windowPos.x + PROFILER_HEADER_WIDTH, windowPos.y + windowSize.y), IM_COL32(40, 40, 40, 255));

  // Draw grid lines
  double gridInterval = 1000000.0;
  double viewRangeNs = viewEndNs - viewStartNs;
  if (viewRangeNs > 50000000)
    gridInterval = 10000000.0;
  if (viewRangeNs > 500000000)
    gridInterval = 100000000.0;
  if (viewRangeNs < 5000000)
    gridInterval = 100000.0;
  if (viewRangeNs < 500000)
    gridInterval = 10000.0;

  double firstGrid = std::floor(viewStartNs / gridInterval) * gridInterval;
  for (double t = firstGrid; t <= viewEndNs; t += gridInterval) {
    if (t < viewStartNs)
      continue;
    float x = timelineX + static_cast<float>((t - viewStartNs) / state.ui.profilerNsPerPixel);
    if (x >= timelineX && x < timelineX + timelineWidth) {
      drawList->AddLine(ImVec2(x, windowPos.y), ImVec2(x, windowPos.y + windowSize.y), IM_COL32(60, 60, 60, 255));

      double timeMs = t / 1000000.0;
      char timeLabel[32];
      if (timeMs >= 1.0) {
        snprintf(timeLabel, sizeof(timeLabel), "%.1fms", timeMs);
      } else {
        snprintf(timeLabel, sizeof(timeLabel), "%.2fms", timeMs);
      }
      drawList->AddText(ImVec2(x + 2, windowPos.y + 2), IM_COL32(150, 150, 150, 255), timeLabel);
    }
  }

  std::vector<uint32_t> threadIds;
  threadIds.reserve(state.data.threadTimelines.size());
  for (const auto &[threadId, timeline] : state.data.threadTimelines) {
    threadIds.push_back(threadId);
  }
  std::sort(threadIds.begin(), threadIds.end());

  float currentY = 20.0f - state.ui.profilerViewOffsetY;
  for (uint32_t threadId : threadIds) {
    const auto &timeline = state.data.threadTimelines[threadId];

    std::vector<EventWithDepth> eventsWithDepth = assignEventDepths(timeline.events, state.data.profilerMinTimeNs);

    int maxDepth = 0;
    for (const auto &ewd : eventsWithDepth) {
      maxDepth = std::max(maxDepth, ewd.depth);
    }

    float threadRowHeight = PROFILER_ROW_HEIGHT + maxDepth * (PROFILER_EVENT_HEIGHT + PROFILER_EVENT_SPACING);

    float rowTop = windowPos.y + currentY;
    float rowBottom = rowTop + threadRowHeight;

    if (rowBottom >= windowPos.y && rowTop < windowPos.y + windowSize.y) {
      size_t threadIndex = std::find(threadIds.begin(), threadIds.end(), threadId) - threadIds.begin();
      ImU32 rowBgColor = (threadIndex % 2 == 0) ? IM_COL32(30, 30, 35, 255) : IM_COL32(35, 35, 40, 255);
      drawList->AddRectFilled(ImVec2(timelineX, rowTop), ImVec2(timelineX + timelineWidth, rowBottom), rowBgColor);

      char threadLabel[128];
      snprintf(threadLabel, sizeof(threadLabel), "%s (%zu)", timeline.threadName.c_str(), timeline.events.size());
      drawList->AddText(ImVec2(windowPos.x + 5, rowTop + 4), IM_COL32(255, 255, 255, 255), threadLabel);

      for (const auto &ewd : eventsWithDepth) {
        double eventStartRel = ewd.startRel;
        double eventEndRel = ewd.endRel;

        if (eventEndRel < viewStartNs || eventStartRel > viewEndNs) {
          continue;
        }

        float startX = timelineX + static_cast<float>((eventStartRel - viewStartNs) / state.ui.profilerNsPerPixel);
        float endX = timelineX + static_cast<float>((eventEndRel - viewStartNs) / state.ui.profilerNsPerPixel);

        startX = std::max(startX, timelineX);
        endX = std::min(endX, timelineX + timelineWidth);

        float width = endX - startX;
        if (width < 1.0f) {
          endX = startX + 1.0f;
          width = 1.0f;
        }

        float eventY = rowTop + 2 + ewd.depth * (PROFILER_EVENT_HEIGHT + PROFILER_EVENT_SPACING);

        ImU32 eventColor = getColorForStringId(ewd.event->stringId);
        ImVec2 eventMin(startX, eventY);
        ImVec2 eventMax(endX, eventY + PROFILER_EVENT_HEIGHT);
        drawList->AddRectFilled(eventMin, eventMax, eventColor);
        drawList->AddRect(eventMin, eventMax, IM_COL32(255, 255, 255, 100));

        if (isHoveringCanvas && mousePos.x >= eventMin.x && mousePos.x <= eventMax.x && mousePos.y >= eventMin.y &&
            mousePos.y <= eventMax.y) {
          drawList->AddRect(eventMin, eventMax, IM_COL32(255, 255, 0, 255), 0.0f, 0, 2.0f);

          hoveredEvent.isValid = true;
          auto it = state.data.profilerStrings.find(ewd.event->stringId);
          hoveredEvent.name = (it != state.data.profilerStrings.end()) ? it->second : "Unknown";
          hoveredEvent.threadName = timeline.threadName;
          hoveredEvent.durationUs = (eventEndRel - eventStartRel) / 1000.0;
          hoveredEvent.startTimeMs = eventStartRel / 1000000.0;
          hoveredEvent.endTimeMs = eventEndRel / 1000000.0;
          hoveredEvent.snapshotId = ewd.event->snapshotId;
        }

        if (width > 40) {
          std::string name = "?";
          auto it = state.data.profilerStrings.find(ewd.event->stringId);
          if (it != state.data.profilerStrings.end()) {
            name = it->second;
          }

          double durationUs = (eventEndRel - eventStartRel) / 1000.0;
          char label[128];
          if (width > 120) {
            snprintf(label, sizeof(label), "%s (%.1fus)", name.c_str(), durationUs);
          } else {
            snprintf(label, sizeof(label), "%s", name.c_str());
          }

          ImVec4 clipRect(eventMin.x, eventMin.y, eventMax.x, eventMax.y);
          drawList->AddText(
              nullptr,
              0.0f,
              ImVec2(startX + 2, eventY + 2),
              IM_COL32(255, 255, 255, 255),
              label,
              nullptr,
              0.0f,
              &clipRect);
        }
      }

      drawList->AddLine(
          ImVec2(windowPos.x, rowBottom), ImVec2(windowPos.x + windowSize.x, rowBottom), IM_COL32(80, 80, 80, 255));
    }

    currentY += threadRowHeight + PROFILER_ROW_SPACING;
  }

  drawList->AddLine(
      ImVec2(windowPos.x + PROFILER_HEADER_WIDTH, windowPos.y),
      ImVec2(windowPos.x + PROFILER_HEADER_WIDTH, windowPos.y + windowSize.y),
      IM_COL32(80, 80, 80, 255));

  return hoveredEvent;
}

} // anonymous namespace

void renderProfilerWindow(app::AppState &state) {
  ImGui::Begin("Profiler Timeline", nullptr, ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoScrollWithMouse);
  {
    ImGui::Checkbox("Lock to latest", &state.ui.profilerLockToLatest);
    ImGui::SameLine();
    if (ImGui::Button("Reset View")) {
      state.ui.profilerViewStartNs = 0.0;
      state.ui.profilerViewOffsetY = 0.0f;
      state.ui.profilerNsPerPixel = 100000.0;
      state.ui.profilerLockToLatest = true;
    }
    ImGui::SameLine();
    if (ImGui::Button("Clear")) {
      std::lock_guard<std::mutex> lock(state.data.profilerMutex);
      state.data.threadTimelines.clear();
      state.data.profilerMinTimeNs = UINT64_MAX;
      state.data.profilerMaxTimeNs = 0;
    }

    {
      std::lock_guard<std::mutex> lock(state.data.profilerMutex);
      size_t totalEvents = 0;
      for (const auto &[tid, timeline] : state.data.threadTimelines) {
        totalEvents += timeline.events.size();
      }

      const char *zoomUnit = "ns/px";
      double zoomValue = state.ui.profilerNsPerPixel;
      if (zoomValue >= 1000000.0) {
        zoomValue /= 1000000.0;
        zoomUnit = "ms/px";
      } else if (zoomValue >= 1000.0) {
        zoomValue /= 1000.0;
        zoomUnit = "us/px";
      }

      ImGui::SameLine(ImGui::GetWindowWidth() - 350);
      ImGui::Text(
          "Threads: %zu | Events: %zu | Zoom: %.1f %s",
          state.data.threadTimelines.size(),
          totalEvents,
          zoomValue,
          zoomUnit);
    }

    ImGui::Separator();

    bool profilerFocused = ImGui::IsWindowFocused();
    if (profilerFocused) {
      constexpr double PAN_SPEED_FACTOR = 20.0;
      constexpr float ZOOM_SPEED = 1.1f;

      if (ImGui::IsKeyDown(ImGuiKey_A)) {
        state.ui.profilerLockToLatest = false;
        state.ui.profilerViewStartNs -= PAN_SPEED_FACTOR * state.ui.profilerNsPerPixel;
        if (state.ui.profilerViewStartNs < 0)
          state.ui.profilerViewStartNs = 0;
      }
      if (ImGui::IsKeyDown(ImGuiKey_D)) {
        state.ui.profilerLockToLatest = false;
        state.ui.profilerViewStartNs += PAN_SPEED_FACTOR * state.ui.profilerNsPerPixel;
      }

      if (ImGui::IsKeyDown(ImGuiKey_W)) {
        state.ui.profilerNsPerPixel /= ZOOM_SPEED;
        if (state.ui.profilerNsPerPixel < 10.0)
          state.ui.profilerNsPerPixel = 10.0;
      }
      if (ImGui::IsKeyDown(ImGuiKey_S)) {
        state.ui.profilerNsPerPixel *= ZOOM_SPEED;
        if (state.ui.profilerNsPerPixel > 1000000000.0)
          state.ui.profilerNsPerPixel = 1000000000.0;
      }

      if (ImGui::IsKeyDown(ImGuiKey_Q)) {
        state.ui.profilerNsPerPixel *= ZOOM_SPEED;
        if (state.ui.profilerNsPerPixel > 1000000000.0)
          state.ui.profilerNsPerPixel = 1000000000.0;
      }
      if (ImGui::IsKeyDown(ImGuiKey_E)) {
        state.ui.profilerNsPerPixel /= ZOOM_SPEED;
        if (state.ui.profilerNsPerPixel < 10.0)
          state.ui.profilerNsPerPixel = 10.0;
      }

      float scrollY = ImGui::GetIO().MouseWheel;
      if (std::abs(scrollY) > 0.0f) {
        double zoomFactor = 1.0 + scrollY * 0.1;
        state.ui.profilerNsPerPixel /= zoomFactor;
        state.ui.profilerNsPerPixel = std::max(10.0, std::min(1000000000.0, state.ui.profilerNsPerPixel));
      }

      if (ImGui::IsKeyPressed(ImGuiKey_R)) {
        state.ui.profilerViewStartNs = 0.0;
        state.ui.profilerViewOffsetY = 0.0f;
        state.ui.profilerNsPerPixel = 100000.0;
        state.ui.profilerLockToLatest = true;
      }
    }

    ImVec2 windowSize = ImGui::GetContentRegionAvail();
    ImVec2 windowPos = ImGui::GetCursorScreenPos();

    if (state.ui.profilerLockToLatest && state.data.profilerMaxTimeNs > state.data.profilerMinTimeNs) {
      double timeRangeNs = static_cast<double>(state.data.profilerMaxTimeNs - state.data.profilerMinTimeNs);
      double viewWidthNs = windowSize.x * state.ui.profilerNsPerPixel;
      state.ui.profilerViewStartNs = std::max(0.0, timeRangeNs - viewWidthNs * 0.9);
    }

    if (windowSize.x > 0 && windowSize.y > 0) {
      ImGui::InvisibleButton("##profiler_canvas", windowSize);

      ImDrawList *drawList = ImGui::GetWindowDrawList();
      HoveredEventInfo hoveredEvent = renderProfilerTimeline(drawList, windowPos, windowSize, state);

      if (hoveredEvent.isValid) {
        if (ImGui::IsMouseDoubleClicked(0) && hoveredEvent.snapshotId >= 0) {
          std::lock_guard<std::mutex> lock(state.data.snapshotMutex);
          for (size_t i = 0; i < state.data.snapshots.size(); ++i) {
            if (state.data.snapshots[i].id == hoveredEvent.snapshotId) {
              state.data.currentSnapshotIndex = static_cast<int>(i);
              break;
            }
          }
        }

        ImGui::BeginTooltip();
        ImGui::Text("Event: %s", hoveredEvent.name.c_str());
        ImGui::Text("Thread: %s", hoveredEvent.threadName.c_str());
        ImGui::Text("Duration: %.2f us", hoveredEvent.durationUs);
        ImGui::Text("Start: %.3f ms", hoveredEvent.startTimeMs);
        ImGui::Text("End: %.3f ms", hoveredEvent.endTimeMs);
        if (hoveredEvent.snapshotId >= 0) {
          ImGui::Separator();
          ImGui::Text("Snapshot: #%d", hoveredEvent.snapshotId);
          ImGui::TextColored(ImVec4(0.7f, 0.7f, 0.7f, 1.0f), "Double-click to view");
        }
        ImGui::EndTooltip();
      }
    }

    ImGui::SetCursorPos(ImVec2(10, ImGui::GetWindowHeight() - 25));
    ImGui::TextColored(
        ImVec4(0.5f, 0.5f, 0.5f, 1.0f), "A/D: pan | W/S/Q/E/scroll: zoom | R: reset | hover for details");
  }
  ImGui::End();
}

} // namespace windows
