#include "data/network_handler.h"
#include <fcntl.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>
#include <cstring>
#include <iostream>
#include <thread>
#include <vector>
#include "data/mutation_processor.h"
#include "data/profiler_processor.h"
#include "protocol.h"

namespace data {

void networkThread(app::AppState &state, int port) {
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

  while (state.data.running) {
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
            std::cerr << "Invalid magic number, clearing pending data\n";
            pendingData.clear();
            break;
          }

          // Calculate payload size based on message type
          size_t payloadSize = 0;
          switch (header.type) {
            case reanimated::DevToolsMessageType::Mutations:
              payloadSize = header.payloadCount * sizeof(reanimated::SimpleMutation);
              break;
            case reanimated::DevToolsMessageType::ProfilerStringRegistry:
              payloadSize = header.payloadCount * sizeof(reanimated::ProfilerStringEntry);
              break;
            case reanimated::DevToolsMessageType::ProfilerEvents:
              payloadSize = header.payloadCount * sizeof(reanimated::ProfilerEvent);
              break;
            case reanimated::DevToolsMessageType::ThreadMetadata:
              payloadSize = header.payloadCount * sizeof(reanimated::ThreadMetadata);
              break;
            default:
              std::cerr << "Unknown message type: " << static_cast<int>(header.type) << "\n";
              pendingData.clear();
              continue;
          }

          size_t expectedSize = sizeof(reanimated::DevToolsMessageHeader) + payloadSize;

          if (pendingData.size() < expectedSize) {
            break; // Wait for more data
          }

          // Process based on message type
          const uint8_t *payloadPtr = pendingData.data() + sizeof(reanimated::DevToolsMessageHeader);

          switch (header.type) {
            case reanimated::DevToolsMessageType::Mutations: {
              std::vector<reanimated::SimpleMutation> mutations(header.payloadCount);
              memcpy(mutations.data(), payloadPtr, payloadSize);

              applyMutations(state, mutations, header.timestampNs);
              break;
            }

            case reanimated::DevToolsMessageType::ProfilerStringRegistry: {
              for (uint32_t i = 0; i < header.payloadCount; ++i) {
                reanimated::ProfilerStringEntry entry;
                memcpy(&entry, payloadPtr + i * sizeof(reanimated::ProfilerStringEntry), sizeof(entry));
                entry.name[sizeof(entry.name) - 1] = '\0'; // Ensure null termination
                registerProfilerString(state, entry.stringId, entry.name);
              }
              break;
            }

            case reanimated::DevToolsMessageType::ProfilerEvents: {
              for (uint32_t i = 0; i < header.payloadCount; ++i) {
                reanimated::ProfilerEvent event;
                memcpy(&event, payloadPtr + i * sizeof(reanimated::ProfilerEvent), sizeof(event));
                recordProfilerEvent(state, event);
              }
              break;
            }

            case reanimated::DevToolsMessageType::ThreadMetadata: {
              for (uint32_t i = 0; i < header.payloadCount; ++i) {
                reanimated::ThreadMetadata metadata;
                memcpy(&metadata, payloadPtr + i * sizeof(reanimated::ThreadMetadata), sizeof(metadata));
                metadata.threadName[sizeof(metadata.threadName) - 1] = '\0'; // Ensure null termination
                recordThreadMetadata(state, metadata.threadId, metadata.threadName);
              }
              break;
            }
          }

          pendingData.erase(pendingData.begin(), pendingData.begin() + expectedSize);
        }
      } else if (bytesRead == 0) {
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

} // namespace data
