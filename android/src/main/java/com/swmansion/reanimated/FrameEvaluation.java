package com.swmansion.reanimated;

import android.util.SparseArray;

import com.facebook.react.bridge.UiThreadUtil;
import com.swmansion.reanimated.nodes.FinalNode;
import com.swmansion.reanimated.nodes.Node;
import com.swmansion.reanimated.nodes.ProceduralNode;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Stack;

/**
 * FrameEvaluation is a container for logic related
 * with single-frame evaluation
 */
public class FrameEvaluation {
  public FrameEvaluation(NodesManager nodesManager) {
    mNodesManager = nodesManager;
  }

  /**
   * visitedNodes' set stores information about node which has been traversed
   * by the BFS-search algorithm in given context
   */
  private SparseArray<Set<Node>> visitedNodes = new SparseArray<>();
  /**
   *  finalNodes are nodes which has no parent, so they has to be memoized
   *  and will be used for triggering updates
   */
  private Stack<FinalNode> finalNodes = new Stack<>();
  /**
   *  Contexts of evaluation could be represented as stack and the first one is globalEvalContext
   */
  private Stack<EvalContext> contexts = new Stack<>();

  /**
   *  mNodesManager provides the main context of evaluation
   */
  private final NodesManager mNodesManager;
  /**
   * findAndUpdateNodes performs a BFS-search-based evaluation algorithm 
   * in order to receive finalNodes which are nodes
   * which have to be updated. Each node could represent different values in different contexts
   * so all operations have to be context-sensitive
   * @param node is node which is being currently traversed
   * @param lastVisited is previously visited node (since findAndUpdateNodes uses recursion)
   */
  private void findAndUpdateNodes(Node node,
                                         Node lastVisited) {
    EvalContext currentContext = contexts.peek();
    if (visitedNodes.get(currentContext.contextID) == null) {
      // There's need to handle the case when no set of
      // visited nodes has been created in given context.
      visitedNodes.append(currentContext.contextID, new HashSet<Node>());
      // There's no need to traverse twice the same node.
    } else if (visitedNodes.get(currentContext.contextID).contains(node)) {
      return;
    }
    visitedNodes.get(currentContext.contextID).add(node);

    List<Node> children = node.mChildren;
    EvalContext newContext = node.contextForUpdatingChildren(currentContext, lastVisited);
    boolean pushedNewContext = false;
    EvalContext poppedContext = null;

    if (newContext != currentContext && newContext != null) {
      contexts.push(newContext);
      pushedNewContext = true;
    }
    // The second condition is added because of extra evaluation (dangerouslyRescheduleEvaluate)
    // which is done on each connecting node to view. If there's a node which should be evaluated
    // in some context, we firstly evaluate it global context, which cannot be popped because
    // it's the only one context on the stack.
    if (node instanceof ProceduralNode.PerformNode && contexts.size() > 1) {
      poppedContext = contexts.pop();
    }

    if (node instanceof ProceduralNode && currentContext.parent != null) {
      // If evaluation algorithm encounters Procedural node, there's no need to
      // evaluate each children, because only one on them is a performNode related to given context.
      findAndUpdateNodes(currentContext.parent, node);
    } else if (children != null) {
      for (Node child : children) {
        findAndUpdateNodes(child, node);
      }
    }

    if (node instanceof FinalNode) {
      finalNodes.push((FinalNode) node);
    }

    if (pushedNewContext) {
      contexts.pop();
    }

    if (poppedContext != null) {
      contexts.push(poppedContext);
    }
  }

  /**
   * Triggers an evaluation algorithm which calculate nodes
   * which have to be updated in current animation's frame
   */
  public void runUpdates() {
    UiThreadUtil.assertOnUiThread();
    ArrayList<Node> updatedNodes = mNodesManager.updatedNodes;
    contexts.push(mNodesManager.globalEvalContext);
    for (int i = 0; i < updatedNodes.size(); i++) {
      findAndUpdateNodes(updatedNodes.get(i), null);
      if (contexts.size() != 1) {
        throw new IllegalArgumentException("Stacking of contexts was not performed correctly");
      }
      if (i == updatedNodes.size() - 1) {
        while (!finalNodes.isEmpty()) {
          finalNodes.pop().update();
        }
      }
    }
    updatedNodes.clear();
    mNodesManager.updateLoopID++;
  }
}
