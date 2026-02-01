// Reanimated DevTools - Client Application
// Connects to Reanimated apps running DevTools server and visualizes data.
//
// Architecture: App acts as server (binds to port 8765-8784),
// DevTools connects as client.
//
// Build: make
// Run: ./devtools

#include <iostream>
#include <thread>

#include <GLFW/glfw3.h>
#include "imgui.h"
#include "imgui_impl_glfw.h"
#include "imgui_impl_opengl3.h"

#include "app_state.h"

// Window render functions
#include "windows/connection_window.h"
#include "windows/controls_window.h"
#include "windows/fps_window.h"
#include "windows/mutations_window.h"
#include "windows/profiler_window.h"
#include "windows/view_tree_window.h"

// Data processing
#include "data/network_handler.h"

int main(int /* argc */, char * /* argv */[]) {
  // Create application state
  app::AppState appState;

  // Start network thread (handles connection state and data receiving)
  std::thread netThread(data::networkThread, std::ref(appState));

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
  io.ConfigFlags |= ImGuiConfigFlags_DockingEnable;

  ImGui::StyleColorsDark();
  ImGui_ImplGlfw_InitForOpenGL(window, true);
  ImGui_ImplOpenGL3_Init("#version 330");

  // Main loop
  while (!glfwWindowShouldClose(window) && appState.data.running) {
    glfwPollEvents();

    // ImGui new frame
    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();

    // Create fullscreen dockspace
    ImGui::DockSpaceOverViewport(0, ImGui::GetMainViewport(), ImGuiDockNodeFlags_PassthruCentralNode);

    // Always render connection window (can be toggled via menu)
    windows::renderConnectionWindow(appState);

    // Check connection state to decide which windows to show
    app::ConnectionState connState;
    {
      std::lock_guard<std::mutex> lock(appState.data.connectionMutex);
      connState = appState.data.connectionState;
    }

    // Only show data windows when connected
    if (connState == app::ConnectionState::Connected) {
      windows::renderControlsWindow(appState);
      windows::renderMutationsWindow(appState);
      windows::renderViewTreeWindow(appState);
      windows::renderProfilerWindow(appState);
    }

#ifdef ENABLE_FPS_COUNTER
    windows::renderFpsWindow(appState);
#endif

    // ImGui render
    ImGui::Render();
    int displayW, displayH;
    glfwGetFramebufferSize(window, &displayW, &displayH);
    glViewport(0, 0, displayW, displayH);
    glClearColor(0.1f, 0.1f, 0.1f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

    glfwSwapBuffers(window);
  }

  // Cleanup
  appState.data.running = false;
  windows::cleanupConnectionWindow();
  netThread.join();

  ImGui_ImplOpenGL3_Shutdown();
  ImGui_ImplGlfw_Shutdown();
  ImGui::DestroyContext();

  glfwDestroyWindow(window);
  glfwTerminate();

  return 0;
}
