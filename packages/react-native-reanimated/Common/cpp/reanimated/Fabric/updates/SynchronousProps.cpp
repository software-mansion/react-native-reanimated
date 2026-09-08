#include <reanimated/Fabric/updates/SynchronousProps.h>

#include <string>
#include <unordered_set>

namespace reanimated {

bool isSynchronousPropName(const std::string &name) {
  static const std::unordered_set<std::string> synchronousPropNames = {
      "opacity",
      "elevation",
      "zIndex",
      "shadowColor",
#if __APPLE__
      "shadowOffset",
      "shadowOpacity",
      "shadowRadius",
#endif // __APPLE__
      "backgroundColor",
      // "color", // not supported
      "tintColor",
      "placeholderTextColor",
      "borderRadius",
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderTopStartRadius",
      "borderTopEndRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius",
      "borderBottomStartRadius",
      "borderBottomEndRadius",
      "borderStartStartRadius",
      "borderStartEndRadius",
      "borderEndStartRadius",
      "borderEndEndRadius",
      "borderColor",
      "borderTopColor",
      "borderBottomColor",
      "borderLeftColor",
      "borderRightColor",
      "borderStartColor",
      "borderEndColor",
      "borderBlockColor",
      "borderBlockStartColor",
      "borderBlockEndColor",
      "outlineColor",
      "outlineOffset",
      "outlineWidth",
      "transform",
  };
  return synchronousPropNames.contains(name);
}

} // namespace reanimated
