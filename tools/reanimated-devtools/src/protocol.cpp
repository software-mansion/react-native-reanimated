#include "protocol.h"

namespace reanimated {

// mutationTypeToString() is now provided by the shared DevToolsProtocol.h header (inline)

ImU32 mutationTypeToColor(MutationType type) {
  switch (type) {
    case MutationType::Create:
      return IM_COL32(100, 150, 200, 255); // Blue
    case MutationType::Delete:
      return IM_COL32(200, 100, 100, 255); // Red
    case MutationType::Insert:
      return IM_COL32(100, 200, 100, 255); // Green
    case MutationType::Remove:
      return IM_COL32(200, 150, 100, 255); // Orange
    case MutationType::Update:
      return IM_COL32(200, 200, 100, 255); // Yellow
    default:
      return IM_COL32(150, 150, 150, 255); // Gray
  }
}

} // namespace reanimated
