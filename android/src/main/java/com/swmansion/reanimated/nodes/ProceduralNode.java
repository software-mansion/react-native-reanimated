package com.swmansion.reanimated.nodes;

import android.util.SparseArray;

import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.EvalContext;
import com.swmansion.reanimated.NodesManager;

import java.util.ArrayList;
import java.util.List;

import javax.annotation.Nullable;

public class ProceduralNode extends Node {

  static public class PerformNode extends Node {

    private final int mProceduralNode;
    private final int[] mArgumentsInputs;
    EvalContext mOldContext = null;
    EvalContext mEvalContext = new EvalContext(this);

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
    public void onDrop(){
      if (!mNodesManager.isNodeCreated(mProceduralNode)) {
        return;
      }
      ProceduralNode proceduralNode = mNodesManager.findNodeById(mProceduralNode, ProceduralNode.class);
      if (mOldContext != null) {
        for (int i = 0; i < mArgumentsInputs.length; i++) {
          if (mNodesManager.isNodeCreated(proceduralNode.mProceduralArguments[i])) {
            ArgumentNode arg = mNodesManager.findNodeById(proceduralNode.mProceduralArguments[i], ArgumentNode.class);
            arg.dropContext(mEvalContext);
          }
        }
      }
    }

    @Override
    protected Object evaluate(EvalContext oldEvalContext) {
      if (mOldContext == null) {
        ProceduralNode proceduralNode =  mNodesManager.findNodeById(mProceduralNode, ProceduralNode.class);
        mOldContext = oldEvalContext;
        for (int i = 0; i < mArgumentsInputs.length; i++) {
          int argumentID = proceduralNode.mProceduralArguments[i];
          ArgumentNode arg = mNodesManager.findNodeById(argumentID, ArgumentNode.class);
          Node inputNode = mNodesManager.findNodeById(mArgumentsInputs[i], Node.class);
          arg.matchContextWithValue(
                  mEvalContext,
                  inputNode
          );
          arg.matchValueWithOldContext(
                  inputNode,
                  oldEvalContext
          );
        }
      } else if (mOldContext != oldEvalContext) {
        throw new IllegalArgumentException("Tried to evaluate perform node in more than one contexts");
      }

      ProceduralNode proceduralNode = mNodesManager.findNodeById(mProceduralNode, ProceduralNode.class);
      return proceduralNode.value(mEvalContext);
    }
  }

  static public class ArgumentNode extends ValueNode {

    private SparseArray<Node> mValuesByContext = new SparseArray<>();
    private SparseArray<EvalContext> mContextsByValue = new SparseArray<>();
    private SparseArray<EvalContext> mOldContextByValue = new SparseArray<>();

    public ArgumentNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
      super(nodeID, config, nodesManager);
    }

    public void matchContextWithValue(EvalContext context, Node node) {
      mValuesByContext.put(context.contextID, node);
      mContextsByValue.put(node.mNodeID, context);
    }

    public void dropContext(EvalContext context) {
      Node relatedNode = mValuesByContext.get(context.contextID);
      mContextsByValue.remove(relatedNode.mNodeID);
      mValuesByContext.remove(context.contextID);
      mOldContextByValue.remove(relatedNode.mNodeID);
    }

    public void matchValueWithOldContext(Node node, EvalContext context) {
      mOldContextByValue.put(node.mNodeID, context);
    }

    @Override
    public EvalContext switchContextWhileUpdatingIfNeeded(EvalContext context, Node lastVisited) {
      if (lastVisited == null) {
        return context;
      }
      return mContextsByValue.get(lastVisited.mNodeID);
    }

    @Override
    public void setValue(Double value, EvalContext context) {
      ((ValueNode)mValuesByContext.get(context.contextID)).setValue(value, mNodesManager.mGlobalEvalContext);
    }

    @Override
    protected Double evaluate(EvalContext evalContext) {
      if (evalContext == mNodesManager.mGlobalEvalContext) {
        throw new IllegalArgumentException("Tried to evaluate argumentNode in global context");
      }
      Node value = mValuesByContext.get(evalContext.contextID);
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
  public @Nullable List<Node<?>> getChildrenInContext(EvalContext context) {
    if (context.parent != null) {
      List<Node<?>> result = new ArrayList<>();
      result.add(context.parent);
      return result;
    }
    return mChildren;
  }

  @Override
  protected Object evaluate(EvalContext evalContext) {
    return mNodesManager.findNodeById(mResultNode, Node.class).value(evalContext);
  }
}
