// Reanimated DevTools Server with ImGui Frontend
// A C++ server that receives mutation data from Reanimated and visualizes it.
//
// Build: make
// Run: ./devtools-server

#include <atomic>
#include <cmath>
#include <csignal>
#include <cstdint>
#include <cstring>
#include <iostream>
#include <map>
#include <mutex>
#include <set>
#include <sstream>
#include <thread>
#include <unordered_map>
#include <vector>

#include <arpa/inet.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <GLFW/glfw3.h>
#include "imgui.h"
#include "imgui_impl_glfw.h"
#include "imgui_impl_opengl3.h"

// Protocol structs (copied from DevToolsProtocol.h)
// IMPORTANT: Must match exactly with client side!
namespace reanimated {

enum class MutationType : uint8_t { Create = 0, Delete = 1, Insert = 2, Remove = 3, Update = 4, Unknown = 255 };

#pragma pack(push, 1)
struct SimpleMutation {
  int32_t tag;
  int32_t parentTag;
  int32_t index;
  MutationType type;
  uint8_t padding[3]; // Explicit padding for alignment
  char componentName[64];
  float x;
  float y;
  float width;
  float height;
  uint32_t backgroundColor;
};
#pragma pack(pop)

struct DevToolsMessageHeader {
  uint32_t magic;
  uint32_t version;
  uint32_t numMutations;
  uint32_t reserved;

  static constexpr uint32_t MAGIC = 0xDEADBEEF;
  static constexpr uint32_t VERSION = 2;
};

struct DevToolsMessage {
  DevToolsMessageHeader header;
  std::vector<SimpleMutation> mutations;

  static bool deserialize(const uint8_t *data, size_t size, DevToolsMessage &outMessage) {
    if (size < sizeof(DevToolsMessageHeader)) {
      return false;
    }

    memcpy(&outMessage.header, data, sizeof(DevToolsMessageHeader));

    if (outMessage.header.magic != DevToolsMessageHeader::MAGIC) {
      return false;
    }

    size_t expectedSize = sizeof(DevToolsMessageHeader) + outMessage.header.numMutations * sizeof(SimpleMutation);
    if (size < expectedSize) {
      return false;
    }

    outMessage.mutations.resize(outMessage.header.numMutations);
    if (outMessage.header.numMutations > 0) {
      memcpy(
          outMessage.mutations.data(),
          data + sizeof(DevToolsMessageHeader),
          outMessage.header.numMutations * sizeof(SimpleMutation));
    }

    return true;
  }
};

const char *mutationTypeToString(MutationType type) {
  switch (type) {
    case MutationType::Create:
      return "CREATE";
    case MutationType::Delete:
      return "DELETE";
    case MutationType::Insert:
      return "INSERT";
    case MutationType::Remove:
      return "REMOVE";
    case MutationType::Update:
      return "UPDATE";
    default:
      return "UNKNOWN";
  }
}

ImU32 mutationTypeToColor(MutationType type) {
  switch (type) {
    case MutationType::Create:
      return IM_COL32(100, 200, 100, 255); // Green
    case MutationType::Delete:
      return IM_COL32(200, 100, 100, 255); // Red
    case MutationType::Insert:
      return IM_COL32(100, 150, 200, 255); // Blue
    case MutationType::Remove:
      return IM_COL32(200, 150, 100, 255); // Orange
    case MutationType::Update:
      return IM_COL32(200, 200, 100, 255); // Yellow
    default:
      return IM_COL32(150, 150, 150, 255); // Gray
  }
}

} // namespace reanimated

// Tree node for visualization
struct ViewNode {
  int32_t tag;
  int32_t parentTag;
  std::string componentName;
  float x, y, width, height;
  reanimated::MutationType lastMutationType;
  std::vector<int32_t> childTags;
};

// Snapshot of the view tree at a point in time
struct TreeSnapshot {
  int id;
  std::string label;
  std::unordered_map<int32_t, ViewNode> nodes;
  std::vector<int32_t> rootTags;
  std::vector<reanimated::SimpleMutation> mutations; // Original mutations for this snapshot
};

// Global state
std::mutex g_mutex;
std::vector<TreeSnapshot> g_snapshots;
int g_currentSnapshotIndex = -1;
std::atomic<bool> g_running{true};
int g_snapshotCounter = 0;

// Current tree state (accumulated)
std::unordered_map<int32_t, ViewNode> g_currentTree;
std::vector<int32_t> g_currentRoots;

void applyMutations(const std::vector<reanimated::SimpleMutation> &mutations) {
  std::lock_guard<std::mutex> lock(g_mutex);

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
        g_currentTree[mut.tag] = node;
        break;
      }
      case reanimated::MutationType::Delete: {
        g_currentTree.erase(mut.tag);
        break;
      }
      case reanimated::MutationType::Insert: {
        if (g_currentTree.count(mut.tag)) {
          auto &node = g_currentTree[mut.tag];
          node.parentTag = mut.parentTag;
          node.lastMutationType = mut.type;

          // Add to parent's children
          if (mut.parentTag >= 0 && g_currentTree.count(mut.parentTag)) {
            auto &parent = g_currentTree[mut.parentTag];
            // Insert at index
            if (mut.index >= 0 && mut.index <= static_cast<int>(parent.childTags.size())) {
              parent.childTags.insert(parent.childTags.begin() + mut.index, mut.tag);
            } else {
              parent.childTags.push_back(mut.tag);
            }
          } else {
            // Root node
            g_currentRoots.push_back(mut.tag);
          }
        }
        break;
      }
      case reanimated::MutationType::Remove: {
        if (g_currentTree.count(mut.tag)) {
          auto &node = g_currentTree[mut.tag];
          node.lastMutationType = mut.type;

          // Remove from parent's children
          if (node.parentTag >= 0 && g_currentTree.count(node.parentTag)) {
            auto &parent = g_currentTree[node.parentTag];
            auto it = std::find(parent.childTags.begin(), parent.childTags.end(), mut.tag);
            if (it != parent.childTags.end()) {
              parent.childTags.erase(it);
            }
          } else {
            auto it = std::find(g_currentRoots.begin(), g_currentRoots.end(), mut.tag);
            if (it != g_currentRoots.end()) {
              g_currentRoots.erase(it);
            }
          }
          node.parentTag = -1;
        }
        break;
      }
      case reanimated::MutationType::Update: {
        if (g_currentTree.count(mut.tag)) {
          auto &node = g_currentTree[mut.tag];
          node.x = mut.x;
          node.y = mut.y;
          node.width = mut.width;
          node.height = mut.height;
          node.lastMutationType = mut.type;
        }
        break;
      }
      default:
        break;
    }
  }

  // Create snapshot
  TreeSnapshot snapshot;
  snapshot.id = g_snapshotCounter++;
  snapshot.label = "Snapshot #" + std::to_string(snapshot.id) + " (" + std::to_string(mutations.size()) + " mutations)";
  snapshot.nodes = g_currentTree;
  snapshot.rootTags = g_currentRoots;
  snapshot.mutations = mutations;

  std::cout << "Created snapshot #" << snapshot.id << " with " << snapshot.nodes.size() << " nodes and "
            << snapshot.rootTags.size() << " roots\n";
  for (int32_t rootTag : snapshot.rootTags) {
    std::cout << "  Root: " << rootTag << "\n";
  }

  g_snapshots.push_back(snapshot);
  g_currentSnapshotIndex = static_cast<int>(g_snapshots.size()) - 1;
}

void networkThread(int port) {
  int serverSocket = socket(AF_INET, SOCK_STREAM, 0);
  if (serverSocket < 0) {
    std::cerr << "Failed to create socket\n";
    return;
  }

  int opt = 1;
  setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

  struct sockaddr_in serverAddr;
  memset(&serverAddr, 0, sizeof(serverAddr));
  serverAddr.sin_family = AF_INET;
  serverAddr.sin_addr.s_addr = INADDR_ANY;
  serverAddr.sin_port = htons(port);

  if (bind(serverSocket, reinterpret_cast<struct sockaddr *>(&serverAddr), sizeof(serverAddr)) < 0) {
    std::cerr << "Failed to bind to port " << port << "\n";
    close(serverSocket);
    return;
  }

  if (listen(serverSocket, 5) < 0) {
    std::cerr << "Failed to listen\n";
    close(serverSocket);
    return;
  }

  // Set non-blocking
  fcntl(serverSocket, F_SETFL, O_NONBLOCK);

  std::cout << "Server listening on port " << port << "\n";

  constexpr size_t BUFFER_SIZE = 65536;
  std::vector<uint8_t> buffer(BUFFER_SIZE);
  std::vector<uint8_t> pendingData;
  int clientSocket = -1;

  while (g_running) {
    // Accept new connections
    if (clientSocket < 0) {
      struct sockaddr_in clientAddr;
      socklen_t clientLen = sizeof(clientAddr);
      clientSocket = accept(serverSocket, reinterpret_cast<struct sockaddr *>(&clientAddr), &clientLen);
      if (clientSocket >= 0) {
        fcntl(clientSocket, F_SETFL, O_NONBLOCK);
        std::cout << "Client connected\n";
        pendingData.clear();
      }
    }

    // Read from client
    if (clientSocket >= 0) {
      ssize_t bytesRead = recv(clientSocket, buffer.data(), buffer.size(), 0);
      if (bytesRead > 0) {
        pendingData.insert(pendingData.end(), buffer.begin(), buffer.begin() + bytesRead);

        // Process complete messages
        while (pendingData.size() >= sizeof(reanimated::DevToolsMessageHeader)) {
          reanimated::DevToolsMessageHeader header;
          memcpy(&header, pendingData.data(), sizeof(header));

          if (header.magic != reanimated::DevToolsMessageHeader::MAGIC) {
            pendingData.clear();
            break;
          }

          size_t expectedSize =
              sizeof(reanimated::DevToolsMessageHeader) + header.numMutations * sizeof(reanimated::SimpleMutation);

          if (pendingData.size() < expectedSize) {
            break;
          }

          reanimated::DevToolsMessage message;
          if (reanimated::DevToolsMessage::deserialize(pendingData.data(), expectedSize, message)) {
            std::cout << "Received " << message.mutations.size() << " mutations:\n";
            for (const auto &mut : message.mutations) {
              std::cout << "  " << reanimated::mutationTypeToString(mut.type) << " tag=" << mut.tag
                        << " parent=" << mut.parentTag << " idx=" << mut.index << " " << mut.componentName << " ("
                        << mut.x << "," << mut.y << "," << mut.width << "," << mut.height << ")\n";
            }
            applyMutations(message.mutations);
          }

          pendingData.erase(pendingData.begin(), pendingData.begin() + expectedSize);
        }
      } else if (bytesRead == 0) {
        std::cout << "Client disconnected\n";
        close(clientSocket);
        clientSocket = -1;
      }
    }

    std::this_thread::sleep_for(std::chrono::milliseconds(10));
  }

  if (clientSocket >= 0) {
    close(clientSocket);
  }
  close(serverSocket);
}

// Structure to hold node drawing info for 3D sorting
struct DrawableNode {
  const ViewNode *node;
  float absoluteX;
  float absoluteY;
  int depth;
};

// Collect all nodes with their absolute positions and depths
void collectNodes(
    const TreeSnapshot &snapshot,
    const ViewNode &node,
    const std::set<int32_t> &hiddenTags,
    std::vector<DrawableNode> &outNodes,
    float parentX = 0,
    float parentY = 0,
    int depth = 0) {
  // Skip if this tag is in the hidden set
  if (hiddenTags.count(node.tag)) {
    return;
  }

  // Accumulate position (coordinates are relative to parent)
  float absoluteX = parentX + node.x;
  float absoluteY = parentY + node.y;

  // Add this node
  outNodes.push_back({&node, absoluteX, absoluteY, depth});

  // Collect children
  for (size_t i = 0; i < node.childTags.size(); ++i) {
    int32_t childTag = node.childTags[i];
    auto it = snapshot.nodes.find(childTag);
    if (it != snapshot.nodes.end()) {
      collectNodes(snapshot, it->second, hiddenTags, outNodes, absoluteX, absoluteY, depth + 1);
    }
  }
}

enum class ProjectionType { Perspective, Isometric };

// Apply 3D rotation transform to a point
// rotationDeg: rotation angle in degrees (0 = flat, 90 = fully rotated)
// depth: the z-depth of the node (higher = closer to viewer)
// centerX, centerY: the center point for rotation
// projection: Perspective or Isometric
void transform3D(
    float &x,
    float &y,
    float w,
    float h,
    float rotationDeg,
    int depth,
    float depthSpacing,
    float centerX,
    float centerY,
    ProjectionType projection) {
  // Convert rotation to radians
  float rotationRad = rotationDeg * 3.14159265f / 180.0f;

  // Calculate the z offset based on depth
  float z = depth * depthSpacing;

  // Apply rotation around Y axis (horizontal rotation)
  // This creates the "exploded view" effect
  float cosR = cosf(rotationRad);
  float sinR = sinf(rotationRad);

  // Translate to center, apply rotation, translate back
  float relX = x + w / 2 - centerX;
  float relY = y + h / 2 - centerY;

  // Rotate in 3D space (around Y axis)
  float newX = relX * cosR - z * sinR;
  float newZ = relX * sinR + z * cosR;

  if (projection == ProjectionType::Perspective) {
    // Apply perspective projection
    float perspective = 1000.0f; // Distance to viewer
    float projScale = perspective / (perspective + newZ);

    // Update position with perspective
    x = centerX + newX * projScale - w / 2;
    y = centerY + relY * projScale - h / 2;
  } else {
    // Isometric projection - no perspective scaling, just offset by z
    // In isometric, we offset both x and y based on z to create depth effect
    x = centerX + newX - w / 2;
    // Offset y slightly based on z for the isometric "stacking" effect
    y = centerY + relY - newZ * 0.3f - h / 2;
  }
}

void drawViewTree3D(
    const TreeSnapshot &snapshot,
    ImDrawList *drawList,
    ImVec2 offset,
    float scale,
    const std::set<int32_t> &hiddenTags,
    float rotationDeg,
    float depthSpacing,
    ProjectionType projection,
    const std::vector<int32_t> &rootTags) {
  // Collect all nodes
  std::vector<DrawableNode> nodes;
  for (int32_t rootTag : rootTags) {
    auto it = snapshot.nodes.find(rootTag);
    if (it != snapshot.nodes.end()) {
      collectNodes(snapshot, it->second, hiddenTags, nodes);
    }
  }

  if (nodes.empty()) {
    return;
  }

  // Find the center point for rotation (use first root's center)
  float centerX = offset.x + 200 * scale;
  float centerY = offset.y + 400 * scale;

  // Sort by depth (back to front for proper rendering)
  // When rotated, we also need to consider x position for proper occlusion
  float rotationRad = rotationDeg * 3.14159265f / 180.0f;
  std::sort(nodes.begin(), nodes.end(), [&](const DrawableNode &a, const DrawableNode &b) {
    // Calculate effective z for sorting
    float zA = a.depth * depthSpacing;
    float zB = b.depth * depthSpacing;

    float relXA = a.absoluteX * scale;
    float relXB = b.absoluteX * scale;

    // Transform z by rotation
    float effectiveZA = relXA * sinf(rotationRad) + zA * cosf(rotationRad);
    float effectiveZB = relXB * sinf(rotationRad) + zB * cosf(rotationRad);

    return effectiveZA < effectiveZB; // Draw farther nodes first
  });

  // Draw all nodes
  for (const auto &drawable : nodes) {
    const ViewNode &node = *drawable.node;

    float x = offset.x + drawable.absoluteX * scale;
    float y = offset.y + drawable.absoluteY * scale;
    float w = node.width * scale;
    float h = node.height * scale;

    // Apply 3D transform if rotation is non-zero
    if (std::abs(rotationDeg) > 0.1f) {
      transform3D(x, y, w, h, rotationDeg, drawable.depth, depthSpacing, centerX, centerY, projection);
    }

    // Draw rectangle
    ImU32 color = reanimated::mutationTypeToColor(node.lastMutationType);
    ImU32 borderColor = IM_COL32(255, 255, 255, 200);

    if (w > 0 && h > 0) {
      drawList->AddRectFilled(ImVec2(x, y), ImVec2(x + w, y + h), color);
      drawList->AddRect(ImVec2(x, y), ImVec2(x + w, y + h), borderColor);
    }

    // Draw label
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
    drawList->AddText(ImVec2(x + 2, y + 2), IM_COL32(255, 255, 255, 255), label);
  }
}

int main(int argc, char *argv[]) {
  int port = 8765;
  if (argc > 1) {
    port = std::atoi(argv[1]);
  }

  // Start network thread
  std::thread netThread(networkThread, port);

  // Initialize GLFW
  if (!glfwInit()) {
    std::cerr << "Failed to initialize GLFW\n";
    return 1;
  }

  glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
  glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);

  GLFWwindow *window = glfwCreateWindow(1280, 720, "Reanimated DevTools", nullptr, nullptr);
  if (!window) {
    std::cerr << "Failed to create window\n";
    glfwTerminate();
    return 1;
  }

  glfwMakeContextCurrent(window);
  glfwSwapInterval(1);

  // Initialize ImGui
  IMGUI_CHECKVERSION();
  ImGui::CreateContext();
  ImGuiIO &io = ImGui::GetIO();
  io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;

  ImGui::StyleColorsDark();
  ImGui_ImplGlfw_InitForOpenGL(window, true);
  ImGui_ImplOpenGL3_Init("#version 330");

  float viewScale = 0.5f;
  ImVec2 viewOffset(50, 50);
  char hiddenTagsInput[256] = "";
  std::set<int32_t> hiddenTags;
  float rotationDeg = 0.0f;
  float depthSpacing = 50.0f;
  int projectionType = 0; // 0 = Perspective, 1 = Isometric

  while (!glfwWindowShouldClose(window) && g_running) {
    glfwPollEvents();

    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();

    // Control panel
    ImGui::Begin("Controls");

    {
      std::lock_guard<std::mutex> lock(g_mutex);

      ImGui::Text("Snapshots: %zu", g_snapshots.size());

      if (!g_snapshots.empty()) {
        ImGui::SliderInt("Snapshot", &g_currentSnapshotIndex, 0, static_cast<int>(g_snapshots.size()) - 1);

        if (ImGui::Button("< Prev") && g_currentSnapshotIndex > 0) {
          g_currentSnapshotIndex--;
        }
        ImGui::SameLine();
        if (ImGui::Button("Next >") && g_currentSnapshotIndex < static_cast<int>(g_snapshots.size()) - 1) {
          g_currentSnapshotIndex++;
        }
        ImGui::SameLine();
        if (ImGui::Button("Latest")) {
          g_currentSnapshotIndex = static_cast<int>(g_snapshots.size()) - 1;
        }

        if (g_currentSnapshotIndex >= 0 && g_currentSnapshotIndex < static_cast<int>(g_snapshots.size())) {
          ImGui::Text("%s", g_snapshots[g_currentSnapshotIndex].label.c_str());
        }
      }

      if (ImGui::Button("Clear All")) {
        g_snapshots.clear();
        g_currentTree.clear();
        g_currentRoots.clear();
        g_currentSnapshotIndex = -1;
        g_snapshotCounter = 0;
      }
    }

    ImGui::Separator();
    ImGui::SliderFloat("Scale", &viewScale, 0.1f, 2.0f);
    ImGui::DragFloat2("Offset", &viewOffset.x);

    ImGui::Separator();
    ImGui::Text("3D View:");
    ImGui::SliderFloat("Rotation", &rotationDeg, -90.0f, 90.0f, "%.1f deg");
    ImGui::SliderFloat("Depth Spacing", &depthSpacing, 0.0f, 200.0f);
    ImGui::Text("Projection:");
    ImGui::RadioButton("Perspective", &projectionType, 0);
    ImGui::SameLine();
    ImGui::RadioButton("Isometric", &projectionType, 1);
    if (ImGui::Button("Reset 3D")) {
      rotationDeg = 0.0f;
      depthSpacing = 50.0f;
    }

    ImGui::Separator();
    ImGui::Text("Hidden Tags (comma-separated):");
    if (ImGui::InputText("##hiddentags", hiddenTagsInput, sizeof(hiddenTagsInput))) {
      // Parse the input and update hiddenTags set
      hiddenTags.clear();
      std::stringstream ss(hiddenTagsInput);
      std::string token;
      while (std::getline(ss, token, ',')) {
        // Trim whitespace
        size_t start = token.find_first_not_of(" \t");
        size_t end = token.find_last_not_of(" \t");
        if (start != std::string::npos && end != std::string::npos) {
          token = token.substr(start, end - start + 1);
          try {
            int32_t tag = std::stoi(token);
            hiddenTags.insert(tag);
          } catch (...) {
            // Ignore invalid numbers
          }
        }
      }
    }
    if (!hiddenTags.empty()) {
      ImGui::Text("Hiding %zu tags", hiddenTags.size());
    }

    ImGui::Separator();
    ImGui::Text("Legend:");
    ImGui::TextColored(ImVec4(0.4f, 0.8f, 0.4f, 1.0f), "CREATE");
    ImGui::TextColored(ImVec4(0.8f, 0.4f, 0.4f, 1.0f), "DELETE");
    ImGui::TextColored(ImVec4(0.4f, 0.6f, 0.8f, 1.0f), "INSERT");
    ImGui::TextColored(ImVec4(0.8f, 0.6f, 0.4f, 1.0f), "REMOVE");
    ImGui::TextColored(ImVec4(0.8f, 0.8f, 0.4f, 1.0f), "UPDATE");

    ImGui::End();

    // Mutations list
    ImGui::Begin("Mutations");
    {
      std::lock_guard<std::mutex> lock(g_mutex);

      if (g_currentSnapshotIndex >= 0 && g_currentSnapshotIndex < static_cast<int>(g_snapshots.size())) {
        const auto &snapshot = g_snapshots[g_currentSnapshotIndex];

        for (size_t i = 0; i < snapshot.mutations.size(); ++i) {
          const auto &mut = snapshot.mutations[i];
          ImU32 color = reanimated::mutationTypeToColor(mut.type);
          ImGui::PushStyleColor(ImGuiCol_Text, color);
          ImGui::Text(
              "[%zu] %s tag=%d parent=%d idx=%d %s (%.0f,%.0f,%.0f,%.0f)",
              i,
              reanimated::mutationTypeToString(mut.type),
              mut.tag,
              mut.parentTag,
              mut.index,
              mut.componentName,
              mut.x,
              mut.y,
              mut.width,
              mut.height);
          ImGui::PopStyleColor();
        }
      }
    }
    ImGui::End();

    // View tree visualization
    ImGui::Begin("View Tree");
    {
      std::lock_guard<std::mutex> lock(g_mutex);

      if (g_currentSnapshotIndex >= 0 && g_currentSnapshotIndex < static_cast<int>(g_snapshots.size())) {
        const auto &snapshot = g_snapshots[g_currentSnapshotIndex];

        ImDrawList *drawList = ImGui::GetWindowDrawList();
        ImVec2 contentPos = ImGui::GetCursorScreenPos();

        ImVec2 actualOffset(contentPos.x + viewOffset.x, contentPos.y + viewOffset.y);

        // Draw using 3D view
        ProjectionType projection = (projectionType == 0) ? ProjectionType::Perspective : ProjectionType::Isometric;
        drawViewTree3D(
            snapshot,
            drawList,
            actualOffset,
            viewScale,
            hiddenTags,
            rotationDeg,
            depthSpacing,
            projection,
            snapshot.rootTags);
      } else {
        ImGui::Text("No snapshots yet. Connect your app to see mutations.");
      }
    }
    ImGui::End();

    // Render
    ImGui::Render();
    int displayW, displayH;
    glfwGetFramebufferSize(window, &displayW, &displayH);
    glViewport(0, 0, displayW, displayH);
    glClearColor(0.1f, 0.1f, 0.1f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

    glfwSwapBuffers(window);
  }

  g_running = false;
  netThread.join();

  ImGui_ImplOpenGL3_Shutdown();
  ImGui_ImplGlfw_Shutdown();
  ImGui::DestroyContext();

  glfwDestroyWindow(window);
  glfwTerminate();

  return 0;
}
