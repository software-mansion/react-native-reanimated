// Reanimated DevTools Server
// A simple C++ server that receives mutation data from Reanimated and prints it to console.
//
// Build: clang++ -std=c++17 -o devtools-server main.cpp
// Run: ./devtools-server

#include <atomic>
#include <csignal>
#include <cstdint>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <vector>

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

// Copy of the protocol structs from DevToolsProtocol.h
// We duplicate here to keep the server standalone

namespace reanimated {

struct SimpleMutation {
  int32_t tag;
  char componentName[64];
  float x;
  float y;
  float width;
  float height;
  uint32_t backgroundColor;
};

struct DevToolsMessageHeader {
  uint32_t magic;
  uint32_t version;
  uint32_t numMutations;
  uint32_t reserved;

  static constexpr uint32_t MAGIC = 0xDEADBEEF;
  static constexpr uint32_t VERSION = 1;
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

} // namespace reanimated

// Global flag for graceful shutdown
std::atomic<bool> running{true};

void signalHandler(int signal) {
  std::cout << "\nReceived signal " << signal << ", shutting down..." << std::endl;
  running = false;
}

void printMutation(const reanimated::SimpleMutation &mutation, int index) {
  std::cout << "  [" << index << "] tag: " << mutation.tag << ", component: " << mutation.componentName << ", frame: ("
            << mutation.x << ", " << mutation.y << ", " << mutation.width << ", " << mutation.height << ")"
            << ", bgColor: 0x" << std::hex << std::setfill('0') << std::setw(8) << mutation.backgroundColor << std::dec
            << std::endl;
}

void handleClient(int clientSocket) {
  std::cout << "Client connected" << std::endl;

  constexpr size_t BUFFER_SIZE = 65536;
  std::vector<uint8_t> buffer(BUFFER_SIZE);
  std::vector<uint8_t> pendingData;

  while (running) {
    ssize_t bytesRead = recv(clientSocket, buffer.data(), buffer.size(), 0);

    if (bytesRead <= 0) {
      if (bytesRead == 0) {
        std::cout << "Client disconnected" << std::endl;
      } else {
        std::cerr << "Error reading from client" << std::endl;
      }
      break;
    }

    // Append to pending data
    pendingData.insert(pendingData.end(), buffer.begin(), buffer.begin() + bytesRead);

    // Try to process complete messages
    while (pendingData.size() >= sizeof(reanimated::DevToolsMessageHeader)) {
      reanimated::DevToolsMessageHeader header;
      memcpy(&header, pendingData.data(), sizeof(header));

      if (header.magic != reanimated::DevToolsMessageHeader::MAGIC) {
        std::cerr << "Invalid magic number, discarding data" << std::endl;
        pendingData.clear();
        break;
      }

      size_t expectedSize =
          sizeof(reanimated::DevToolsMessageHeader) + header.numMutations * sizeof(reanimated::SimpleMutation);

      if (pendingData.size() < expectedSize) {
        // Wait for more data
        break;
      }

      // Parse the message
      reanimated::DevToolsMessage message;
      if (reanimated::DevToolsMessage::deserialize(pendingData.data(), expectedSize, message)) {
        std::cout << "\n=== Received " << message.mutations.size() << " mutations ===" << std::endl;
        for (size_t i = 0; i < message.mutations.size(); ++i) {
          printMutation(message.mutations[i], static_cast<int>(i));
        }
        std::cout << std::endl;
      } else {
        std::cerr << "Failed to deserialize message" << std::endl;
      }

      // Remove processed data
      pendingData.erase(pendingData.begin(), pendingData.begin() + expectedSize);
    }
  }

  close(clientSocket);
}

int main(int argc, char *argv[]) {
  // Setup signal handlers
  signal(SIGINT, signalHandler);
  signal(SIGTERM, signalHandler);

  int port = 8765;
  if (argc > 1) {
    port = std::atoi(argv[1]);
  }

  std::cout << "Reanimated DevTools Server" << std::endl;
  std::cout << "Listening on port " << port << "..." << std::endl;
  std::cout << "Press Ctrl+C to stop" << std::endl;
  std::cout << std::endl;

  int serverSocket = socket(AF_INET, SOCK_STREAM, 0);
  if (serverSocket < 0) {
    std::cerr << "Failed to create socket" << std::endl;
    return 1;
  }

  // Allow reuse of address
  int opt = 1;
  setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

  struct sockaddr_in serverAddr;
  memset(&serverAddr, 0, sizeof(serverAddr));
  serverAddr.sin_family = AF_INET;
  serverAddr.sin_addr.s_addr = INADDR_ANY;
  serverAddr.sin_port = htons(port);

  if (bind(serverSocket, reinterpret_cast<struct sockaddr *>(&serverAddr), sizeof(serverAddr)) < 0) {
    std::cerr << "Failed to bind to port " << port << std::endl;
    close(serverSocket);
    return 1;
  }

  if (listen(serverSocket, 5) < 0) {
    std::cerr << "Failed to listen" << std::endl;
    close(serverSocket);
    return 1;
  }

  // Set socket timeout for accept() so we can check the running flag
  struct timeval timeout;
  timeout.tv_sec = 1;
  timeout.tv_usec = 0;
  setsockopt(serverSocket, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));

  while (running) {
    struct sockaddr_in clientAddr;
    socklen_t clientLen = sizeof(clientAddr);
    int clientSocket = accept(serverSocket, reinterpret_cast<struct sockaddr *>(&clientAddr), &clientLen);

    if (clientSocket < 0) {
      // Timeout or error, check if we should continue
      continue;
    }

    char clientIp[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &clientAddr.sin_addr, clientIp, sizeof(clientIp));
    std::cout << "Connection from " << clientIp << ":" << ntohs(clientAddr.sin_port) << std::endl;

    handleClient(clientSocket);
  }

  close(serverSocket);
  std::cout << "Server stopped" << std::endl;
  return 0;
}
