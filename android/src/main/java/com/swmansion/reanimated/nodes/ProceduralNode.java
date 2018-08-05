package com.swmansion.reanimated.nodes;

import android.util.SparseArray;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.EvaluationContext;
import com.swmansion.reanimated.NodesManager;

import java.util.ArrayList;
import java.util.List;

import javax.annotation.Nullable;

public class ProceduralNode extends Node {

  static public class PerformNode extends Node {

    private final int mProceduralNode;
    private final int[] mArgumentsInputs;
    EvaluationContext mOldContext = null;
    EvaluationContext mEvaluationContext = new EvaluationContext(this);

    public PerformNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
      super(nodeID, config, nodesManager);

      mProceduralNode = config.getInt("proceduralNode");
      ArrayList argumentsInput = (config.getArray("args").toArrayList());
      mArgumentsInputs = new int[argumentsInput.size()];
      for (int i = 0; i < argumentsInput.size(); i++) {
        if (argumentsInput.get(i) instanceof Double) {
          mArgumentsInputs[i] = ((Double) argumentsInput.get(i)).intValue();
        }
      }
    }

    @Override
    protected Object evaluate(EvaluationContext oldEvaluationContext) {
      if (mOldContext == null) {
        mOldContext = oldEvaluationContext;
        for (int i = 0; i < mArgumentsInputs.length; i++) {
          int argumentID =
                  mNodesManager.findNodeById(mProceduralNode, ProceduralNode.class)
                          .mProceduralArguments[i];
          ArgumentNode arg = mNodesManager.findNodeById(argumentID, ArgumentNode.class);
          Node inputNode = mNodesManager.findNodeById(mArgumentsInputs[i], Node.class);
          arg.matchContextWithValue(
                  mEvaluationContext,
                  inputNode
          );
          arg.matchValueWithOldContext(
                  inputNode,
                  oldEvaluationContext
          );
        }
      } else if (mOldContext != oldEvaluationContext) {
        throw new IllegalArgumentException("Tried to evaluate perform node in more than one contexts");
      }

      ProceduralNode proceduralNode = mNodesManager.findNodeById(mProceduralNode, ProceduralNode.class);
      return proceduralNode.value(mEvaluationContext);
    }
  }

  static public class ArgumentNode extends ValueNode {

    private SparseArray<Node> mValuesByContext = new SparseArray<>();
    private SparseArray<EvaluationContext> mContextsByValue = new SparseArray<>();
    private SparseArray<EvaluationContext> mOldContextByValue = new SparseArray<>();

    public ArgumentNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
      super(nodeID, config, nodesManager);
    }

    public void matchContextWithValue(EvaluationContext context, Node node) {
      mValuesByContext.put(context.contextID, node);
      mContextsByValue.put(node.mNodeID, context);
    }

    public void matchValueWithOldContext(Node node, EvaluationContext context) {
      mOldContextByValue.put(node.mNodeID, context);
    }

    @Override
    public EvaluationContext switchContextWhileUpdatingIfNeeded(EvaluationContext context, Node lastVisited) {
      if (lastVisited == null) {
        return context;
      }
      return mContextsByValue.get(lastVisited.mNodeID);
    }

    @Override
    public void setValue(Double value, EvaluationContext context) {
      ((ValueNode)mValuesByContext.get(context.contextID)).setValue(value, mNodesManager.mGlobalEvaluationContext);
    }

    @Override
    protected Double evaluate(EvaluationContext evaluationContext) {
      if (evaluationContext == mNodesManager.mGlobalEvaluationContext) {
        throw new IllegalArgumentException("Tried to evaluate argumentNode in global context");
      }
      Node value = mValuesByContext.get(evaluationContext.contextID);
      return value.doubleValue(mOldContextByValue.get(value.mNodeID));
    }
  }

  private final int mResultNode;
  private final int[] mProceduralArguments;

  public ProceduralNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    mResultNode = config.getInt("result");
    ArrayList argumentsInput = (config.getArray("arguments").toArrayList());
    mProceduralArguments = new int [argumentsInput.size()];
    for (int i = 0; i < argumentsInput.size(); i++) {
      if (argumentsInput.get(i) instanceof Double) {
        mProceduralArguments[i] = ((Double) argumentsInput.get(i)).intValue();
      }
    }
  }

  @Override
  public @Nullable List<Node<?>> getChildrenInContext(EvaluationContext context) {
    if (context.parent != null) {
      List<Node<?>> result = new ArrayList<>();
      result.add(context.parent);
      return result;
    }
    return mChildren;
  }

  @Override
  protected Object evaluate(EvaluationContext evaluationContext) {
    return mNodesManager.findNodeById(mResultNode, Node.class).value(evaluationContext);
  }
}
