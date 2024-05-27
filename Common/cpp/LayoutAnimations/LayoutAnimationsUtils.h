#pragma once

namespace reanimated {

struct Window{
  double width, height;
};

struct Frame{
  std::optional<double> x, y, width, height;
  Frame(jsi::Runtime& runtime, const jsi::Object &newStyle){
    if (newStyle.hasProperty(runtime, "originX")){
      x = newStyle.getProperty(runtime, "originX").asNumber();
    }
    if (newStyle.hasProperty(runtime, "originY")){
      y = newStyle.getProperty(runtime, "originY").asNumber();
    }
    if (newStyle.hasProperty(runtime, "width")){
      width = newStyle.getProperty(runtime, "width").asNumber();
    }
    if (newStyle.hasProperty(runtime, "height")){
      height = newStyle.getProperty(runtime, "height").asNumber();
    }
  }
};

struct UpdateValues{
  Props::Shared newProps;
  Frame frame;
};

struct Snapshot{
  double x, y, width, height, windowWidth, windowHeight;
  Snapshot(const ShadowView& shadowView, Window window){
    auto& frame = shadowView.layoutMetrics.frame;
    x = frame.origin.x;
    y = frame.origin.y;
    width = frame.size.width;
    height = frame.size.height;
    windowWidth = window.width;
    windowHeight = window.height;
  }
};

struct MutationNode;

struct Node {
  std::vector<std::shared_ptr<MutationNode>> children;
  std::shared_ptr<Node> parent;
  Tag tag;
  void removeChild(std::shared_ptr<MutationNode> child);
  void addChild(std::shared_ptr<MutationNode> child);
  void handleMutation(ShadowViewMutation mutation);
  void insertChildren(std::vector<std::shared_ptr<MutationNode>> &newChildren);
  Node(Tag tag): tag(tag){}
  Node(Node&& node):children(std::move(node.children)), tag(node.tag){}
};

typedef enum ExitingState{
  UNDEFINED = 1,
  WAITING = 2,
  ANIMATING = 4,
  DEAD = 8,
  MOVED = 16,
  DELETED = 32,
} ExitingState;

struct MutationNode: public Node{
  ShadowViewMutation mutation;
  std::unordered_set<Tag> animatedChildren;
  ExitingState state = UNDEFINED;
  MutationNode(ShadowViewMutation& mutation): Node(mutation.oldChildShadowView.tag),  mutation(mutation){}
  MutationNode(ShadowViewMutation& mutation, Node&& node): Node(std::move(node)), mutation(mutation){}
};

struct SurfaceManager {
  mutable std::unordered_map<SurfaceId, std::shared_ptr<std::unordered_map<Tag, UpdateValues>>> props_;
  mutable std::unordered_map<SurfaceId, Window> windows_;
  
  std::unordered_map<Tag, UpdateValues>& getUpdateMap(SurfaceId surfaceId){
    auto props = props_.find(surfaceId);
    if (props != props_.end()){
      return *props->second;
    }
    
    auto newProps = std::make_shared<std::unordered_map<Tag, UpdateValues>>();
    props_.insert_or_assign(surfaceId, newProps);
    return *newProps;
  }
  
  void updateWindow(SurfaceId surfaceId, double windowWidth, double windowHeight){
    windows_.insert_or_assign(surfaceId, Window{windowWidth, windowHeight});
  }
  
  Window getWindow(SurfaceId surfaceId){
    auto windowIt = windows_.find(surfaceId);
    if (windowIt != windows_.end()){
      return windowIt->second;
    }
    return Window{0,0};
  }
};

static inline void updateLayoutMetrics(LayoutMetrics& layoutMetrics, Frame& frame){
  if (frame.width) {
    layoutMetrics.frame.size.width = *frame.width;
  }
  if (frame.height) {
    layoutMetrics.frame.size.height = *frame.height;
  }
  if (frame.x) {
    layoutMetrics.frame.origin.x = *frame.x;
  }
  if (frame.y) {
    layoutMetrics.frame.origin.y = *frame.y;
  }
}
}
