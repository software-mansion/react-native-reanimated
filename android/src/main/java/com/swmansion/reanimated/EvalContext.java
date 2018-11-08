package com.swmansion.reanimated;

import android.util.SparseArray;

import com.swmansion.reanimated.nodes.Node;
import com.swmansion.reanimated.nodes.ProceduralNode;

import java.util.ArrayList;

/**
 * EvalContext is a context of evaluation which could be used in order to
 * reuse nodes if the evaluation is performed with ProceduralNodes.
 * Tha main context of evaluation is a globalEvaluationContext which is
 * member of NodesManager.
 */
public class EvalContext {
  private static int nextContextID = 0;
  public final int contextID = EvalContext.nextContextID++;
  /**
   * memoizedValues are values which are results of the last evaluation
   * and could be reused in order to optimize evaluation if possible.
   */
  public final SparseArray<Object> memoizedValues = new SparseArray<>();
  /**
   * updatedNodes is a list of updated nodes during the last evaluation
   */
  public final SparseArray<Long> lastLoopsIDs = new SparseArray<>();
  /**
   * Root is one of the children of ProceduralNode which is used
   * in order to switch evaluation context
   */
  public final ProceduralNode.PerformNode root;
  public EvalContext(ProceduralNode.PerformNode root) {
    this.root = root;
  }
}
