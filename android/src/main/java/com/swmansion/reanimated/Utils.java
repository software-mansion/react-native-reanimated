package com.swmansion.reanimated;

import android.util.SparseArray;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.UiThreadUtil;
import com.swmansion.reanimated.nodes.FinalNode;
import com.swmansion.reanimated.nodes.Node;
import com.swmansion.reanimated.nodes.ProceduralNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Stack;

public class Utils {

  public static Map<String, Integer> processMapping(ReadableMap style) {
    ReadableMapKeySetIterator iter = style.keySetIterator();
    HashMap<String, Integer> mapping = new HashMap<>();
    while (iter.hasNextKey()) {
      String propKey = iter.nextKey();
      int nodeIndex = style.getInt(propKey);
      mapping.put(propKey, nodeIndex);
    }
    return mapping;
  }

  public static int[] processIntArray(ReadableArray ary) {
    int size = ary.size();
    int[] res = new int[size];
    for (int i = 0; i < size; i++) {
      res[i] = ary.getInt(i);
    }
    return res;
  }

  /**
   * Performs a BFS-search-based evaluation algorithm in order to receive finalNodes which are nodes
   * which has to be updated. Each node could represent different values in different contexts
   * so all operations have to be context-sensitive
   * @param node is node which is being currently traversed
   * @param visitedNodes is set of nodes (mapped by contexts) which has been
   *                     already marked as updated in current evaluation
   * @param finalNodes represent result of evaluation. These nodes has to be updated in this frame
   * @param contexts is a stack of contexts which have been used during evaluation
   * @param lastVisited is previously visited node (since findAndUpdateNodes uses recursion)
   */
  private static void findAndUpdateNodes(Node node,
                                         SparseArray<Set<Node>> visitedNodes,
                                         Stack<FinalNode> finalNodes,
                                         Stack<EvalContext> contexts,
                                         Node lastVisited) {
    EvalContext currentContext = contexts.peek();

    if (visitedNodes.get(currentContext.contextID) == null) {
      // There's need to handle the case when no set of
      // visited nodes has been created
      visitedNodes.append(currentContext.contextID, new HashSet<Node>());
      // There's no need to traverse twice the same node
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
      findAndUpdateNodes(currentContext.parent, visitedNodes, finalNodes, contexts, node);
    } else if (children != null) {
      for (Node child : children) {
        findAndUpdateNodes(child, visitedNodes, finalNodes, contexts, node);
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
   * which has to be updated in current animation frame
   * @param nodesManager NodesManager which provides main context of evaluation
   */
  public static void runUpdates(NodesManager nodesManager) {
    UiThreadUtil.assertOnUiThread();
    ArrayList<Node> updatedNodes = nodesManager.updatedNodes;
    // Visited nodes stores information about node which has been traversed
    // by the algorithm which is some kind of BFS-search
    SparseArray<Set<Node>> visitedNodes = new SparseArray<>();
    // Final nodes are nodes which has no parent, so they has to be memoized
    // and will be used for triggering updates
    Stack<FinalNode> finalNodes = new Stack<>();
    // Contexts of evaluation could be represented as stack and the first one is globalEvalContext
    Stack<EvalContext> contexts = new Stack<>();
    contexts.push(nodesManager.globalEvalContext);
    for (int i = 0; i < updatedNodes.size(); i++) {
      findAndUpdateNodes(updatedNodes.get(i), visitedNodes, finalNodes, contexts, null);
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
    nodesManager.updateLoopID++;
  }
}


