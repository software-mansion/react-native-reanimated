#include "windows/profiler_window.h"
#include <imgui.h>
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <stack>
#include "data_structures.h"
#include "protocol.h"

namespace windows {

namespace {

constexpr float PROFILER_ROW_HEIGHT = 24.0f;
constexpr float PROFILER_ROW_SPACING = 10.0f;
constexpr float PROFILER_HEADER_WIDTH = 250.0f;
constexpr float PROFILER_EVENT_HEIGHT = 18.0f;
constexpr float PROFILER_EVENT_SPACING = 2.0f;
constexpr float MIN_WIDTH = 1.0f;

ImU32 getColorForStringId(uint32_t stringId) {
  uint32_t hash = stringId * 2654435761u;
  uint8_t r = 100 + (hash & 0xFF) % 155;
  uint8_t g = 100 + ((hash >> 8) & 0xFF) % 155;
  uint8_t b = 100 + ((hash >> 16) & 0xFF) % 155;
  return IM_COL32(r, g, b, 255);
}

float renderSingleProfilerTimeline(
    ImDrawList *drawList,
    ImVec2 timelinePos,
    float timelineWidth,
    const ThreadTimeline &timeline,
    double viewStartNs,
    double viewEndNs,
    const app::AppState &state,
    ImVec2 mousePos,
    HoveredEventInfo &hoveredEvent) {

  float maxDepth = timeline.eventsPerLane.size();

  for (size_t laneIdx = 0; laneIdx < timeline.eventsPerLane.size(); laneIdx++) {
    float y = timelinePos.y + laneIdx * (PROFILER_EVENT_HEIGHT + PROFILER_EVENT_SPACING);
    const auto &laneEvents = timeline.eventsPerLane[laneIdx];

    auto it = std::lower_bound(
        laneEvents.begin(), laneEvents.end(), viewStartNs, [](const ProfilerEventData &event, double value) {
          return static_cast<double>(event.endTimeNs) < value;
        });

    while (it != laneEvents.end()) {
      const auto &event = *it;
      double eventStart = static_cast<double>(event.startTimeNs);
      double eventEnd = static_cast<double>(event.endTimeNs);

      if (eventStart > viewEndNs) {
        break;
      }

      float x1 = timelinePos.x + static_cast<float>((eventStart - viewStartNs) / state.ui.profilerNsPerPixel);
      float x2 = timelinePos.x + static_cast<float>((eventEnd - viewStartNs) / state.ui.profilerNsPerPixel);

      float x1Clamped = std::max(timelinePos.x, x1);
      float x2Clamped = std::min(timelinePos.x + timelineWidth, x2);
      auto width = x2 - x1;

      if (width < MIN_WIDTH) {
        auto interval = state.ui.profilerNsPerPixel * MIN_WIDTH;
        auto nextIt = it + 1;
        auto nextTargetTime = eventStart + interval;
        while (true) {
          nextIt = std::lower_bound(
              nextIt, laneEvents.end(), nextTargetTime, [](const ProfilerEventData &event, double value) {
                return static_cast<double>(event.endTimeNs) < value;
              });
          if (nextIt == laneEvents.end()) {
            break;
          }
          auto prev = nextIt - 1;
          if (nextIt->endTimeNs - prev->endTimeNs > interval) {
            break;
          }
          nextTargetTime = nextIt->endTimeNs + interval;
        }
        auto prev = nextIt - 1;
        x1 = timelinePos.x + static_cast<float>(it->startTimeNs - viewStartNs) / state.ui.profilerNsPerPixel;
        x2 = timelinePos.x + static_cast<float>(prev->endTimeNs - viewStartNs) / state.ui.profilerNsPerPixel;
        x1Clamped = std::max(timelinePos.x, x1);
        x2Clamped = std::min(timelinePos.x + timelineWidth, x2);
        drawList->AddRectFilled(
            ImVec2(x1Clamped, y), ImVec2(x2Clamped, y + PROFILER_EVENT_HEIGHT), IM_COL32(0xFF, 0xB6, 0xC1, 255));
        it = nextIt;
      } else {
        ImU32 color = getColorForStringId(event.stringId);
        drawList->AddRectFilled(ImVec2(x1Clamped, y), ImVec2(x2Clamped, y + PROFILER_EVENT_HEIGHT), color);

        if (width > 40) {
          std::string name = "?";
          auto it = state.data.profilerStrings.find(event.stringId);
          if (it != state.data.profilerStrings.end()) {
            name = it->second;
          }

          double durationUs = (eventEnd - eventStart) / 1000.0;
          char label[128];
          if (width > 120) {
            snprintf(label, sizeof(label), "%s (%.1fus)", name.c_str(), durationUs);
          } else {
            snprintf(label, sizeof(label), "%s", name.c_str());
          }

          ImVec4 clipRect(x1Clamped, y, x2Clamped, y + PROFILER_EVENT_HEIGHT);
          drawList->AddText(
              nullptr,
              0.0f,
              ImVec2(x1Clamped + 2, y + 2),
              IM_COL32(255, 255, 255, 255),
              label,
              nullptr,
              0.0f,
              &clipRect);
        }

        if (ImVec2(x1, y).x <= mousePos.x && mousePos.x <= ImVec2(x2, y + PROFILER_EVENT_HEIGHT).x &&
            ImVec2(x1, y).y <= mousePos.y && mousePos.y <= ImVec2(x2, y + PROFILER_EVENT_HEIGHT).y) {
          hoveredEvent.isValid = true;
          hoveredEvent.name = state.data.profilerStrings.at(event.stringId);
          hoveredEvent.threadName = timeline.threadName;
          hoveredEvent.durationUs = (eventEnd - eventStart) / 1000.0;
          hoveredEvent.startTimeMs = eventStart / 1000000.0;
          hoveredEvent.endTimeMs = eventEnd / 1000000.0;
        }
        it++;
      }
    }
  }

  return maxDepth * (PROFILER_EVENT_HEIGHT + PROFILER_EVENT_SPACING) + PROFILER_ROW_SPACING;
}

HoveredEventInfo
renderProfilerTimelines(ImDrawList *drawList, ImVec2 windowPos, ImVec2 windowSize, app::AppState &state) {
  HoveredEventInfo hoveredEvent;
  std::lock_guard<std::mutex> lock(state.data.profilerMutex);

  if (state.data.threadTimelines.empty()) {
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

  if (state.ui.profilerLockToLatest) {
    for (const auto &[threadId, timeline] : state.data.threadTimelines) {
      state.ui.profilerViewEndNs = std::max(state.ui.profilerViewEndNs, static_cast<double>(timeline.lastKnownTimeNs));
    }
  }

  double viewEndNs = state.ui.profilerViewEndNs;
  double viewStartNs = viewEndNs - state.ui.profilerNsPerPixel * timelineWidth;

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

  float currentY = 20.0f;
  for (const auto &[threadId, timeline] : state.data.threadTimelines) {

    drawList->AddText(
        ImVec2(windowPos.x + 5, windowPos.y + currentY + 4), IM_COL32(255, 255, 255, 255), timeline.threadName.c_str());

    currentY += renderSingleProfilerTimeline(
        drawList,
        ImVec2(timelineX, windowPos.y + currentY),
        timelineWidth,
        timeline,
        viewStartNs,
        viewEndNs,
        state,
        mousePos,
        hoveredEvent);

    drawList->AddLine(
        ImVec2(windowPos.x, windowPos.y + currentY - PROFILER_ROW_SPACING / 2),
        ImVec2(windowPos.x + windowSize.x, windowPos.y + currentY - PROFILER_ROW_SPACING / 2),
        IM_COL32(80, 80, 80, 255));
  }
  return hoveredEvent;
}

} // anonymous namespace

void renderProfilerWindow(app::AppState &state) {
  ImGui::Begin("Profiler Timeline", nullptr, ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoScrollWithMouse);
  {
    ImGui::Checkbox("Lock to latest", &state.ui.profilerLockToLatest);
    ImGui::SameLine();
    if (ImGui::Button("Reset View")) {
      state.ui.profilerViewEndNs = 0.0;
      state.ui.profilerNsPerPixel = 100000.0;
      state.ui.profilerLockToLatest = true;
    }
    ImGui::SameLine();
    if (ImGui::Button("Clear")) {
      std::lock_guard<std::mutex> lock(state.data.profilerMutex);
      state.data.threadTimelines.clear();
      state.ui.profilerViewEndNs = 0.0;
      state.ui.profilerNsPerPixel = 100000.0;
      state.ui.profilerLockToLatest = true;
    }

    {
      std::lock_guard<std::mutex> lock(state.data.profilerMutex);
      size_t totalEvents = 0;
      for (const auto &[tid, timeline] : state.data.threadTimelines) {
        for (const auto &laneEvents : timeline.eventsPerLane) {
          totalEvents += laneEvents.size();
        }
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
        state.ui.profilerViewEndNs -= PAN_SPEED_FACTOR * state.ui.profilerNsPerPixel;
        if (state.ui.profilerViewEndNs < 0)
          state.ui.profilerViewEndNs = 0;
      }
      if (ImGui::IsKeyDown(ImGuiKey_D)) {
        state.ui.profilerLockToLatest = false;
        state.ui.profilerViewEndNs += PAN_SPEED_FACTOR * state.ui.profilerNsPerPixel;
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
        state.ui.profilerViewEndNs = 0.0;
        state.ui.profilerNsPerPixel = 100000.0;
        state.ui.profilerLockToLatest = true;
      }
    }

    ImVec2 windowSize = ImGui::GetContentRegionAvail();
    ImVec2 windowPos = ImGui::GetCursorScreenPos();

    // if (state.ui.profilerLockToLatest && state.data.profilerMaxTimeNs > state.data.profilerMinTimeNs) {
    //   double timeRangeNs = static_cast<double>(state.data.profilerMaxTimeNs - state.data.profilerMinTimeNs);
    //   double viewWidthNs = windowSize.x * state.ui.profilerNsPerPixel;
    //   state.ui.profilerViewStartNs = std::max(0.0, timeRangeNs - viewWidthNs * 0.9);
    // }

    if (windowSize.x > 0 && windowSize.y > 0) {
      ImGui::InvisibleButton("##profiler_canvas", windowSize);

      ImDrawList *drawList = ImGui::GetWindowDrawList();
      HoveredEventInfo hoveredEvent = renderProfilerTimelines(drawList, windowPos, windowSize, state);

      if (hoveredEvent.isValid) {

        ImGui::BeginTooltip();
        ImGui::Text("Event: %s", hoveredEvent.name.c_str());
        ImGui::Text("Thread: %s", hoveredEvent.threadName.c_str());
        if (hoveredEvent.durationUs < 1000.0) {
          ImGui::Text("Duration: %.2f µs", hoveredEvent.durationUs);
        } else {
          ImGui::Text("Duration: %.2f ms", hoveredEvent.durationUs / 1000.0);
        }
        ImGui::Text("Start: %.3f ms", hoveredEvent.startTimeMs);
        ImGui::Text("End: %.3f ms", hoveredEvent.endTimeMs);
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
