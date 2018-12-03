package com.swmansion.reanimated;

import android.util.SparseArray;

import com.swmansion.reanimated.nodes.Node;
import com.swmansion.reanimated.nodes.ProceduralNode;

import java.util.Set;

/**
 * EvalContext is a context of evaluation which could be used in order to
 * reuse nodes if the evaluation is performed with ProceduralNodes.
 * Tha main context of evaluation is a globalEvaluationContext which is
 * member of NodesManager.
 */
public class EvalContext {
  /**
   * Each context is identified via unique id
   */
  private static int nextContextID = 0;
  public final int contextID = EvalContext.nextContextID++;
  /**
   * memoizedValues are values which are results of the last evaluation
   * and could be reused in order to optimize evaluation if possible.
   */
  public final SparseArray<Object> memoizedValues = new SparseArray<>();
  /**
   * lastLoopsIDs are ids of last loop when given node has been evaluated.
   */
  public final SparseArray<Long> lastLoopsIDs = new SparseArray<>();
  /**
   * Root is one of the children of ProceduralNode which is being used
   * to switch evaluation context
   */
  public final ProceduralNode.PerformNode parent;
  public EvalContext(ProceduralNode.PerformNode parent) {
    this.parent = parent;
  }
}
