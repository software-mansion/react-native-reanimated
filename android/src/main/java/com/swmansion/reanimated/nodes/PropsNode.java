package com.swmansion.reanimated.nodes;

import android.view.View;

import com.facebook.react.bridge.JavaOnlyMap;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.ReactStylesDiffMap;
import com.facebook.react.uimanager.UIImplementation;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

import java.util.Map;

import javax.annotation.Nullable;

public class PropsNode extends Node<WritableMap> implements FinalNode {

  private final Map<String, Integer> mMapping;
  private final UIImplementation mUIImplementation;
  private int mConnectedViewTag = View.NO_ID;

  private final JavaOnlyMap mPropMap;
  private final ReactStylesDiffMap mDiffMap;

  public PropsNode(int nodeID, ReadableMap config, NodesManager nodesManager, UIImplementation uiImplementation) {
    super(nodeID, config, nodesManager);
    mMapping = Utils.processMapping(config.getMap("props"));
    mUIImplementation = uiImplementation;
    mPropMap = new JavaOnlyMap();
    mDiffMap = new ReactStylesDiffMap(mPropMap);
  }

  public void connectToView(int viewTag) {
    mConnectedViewTag = viewTag;
    dangerouslyRescheduleEvaluate();
  }

  public void disconnectFromView(int viewTag) {
    mConnectedViewTag = View.NO_ID;
  }

  @Override
  protected WritableMap evaluate() {
    for (Map.Entry<String, Integer> entry : mMapping.entrySet()) {
      @Nullable Node node = mNodesManager.findNodeById(entry.getValue());
      if (node == null) {
        throw new IllegalArgumentException("Mapped style node does not exists");
      } else if (node instanceof StyleNode) {
        mPropMap.merge(((StyleNode) node).value());
      } else {
        mPropMap.putDouble(entry.getKey(), (Double) node.value());
      }
    }

    return mPropMap;
  }

  @Override
  public void update() {
    // Since we are updating nodes after detaching them from views there is a time where it's
    // possible that the view was disconnected and still receive an update, this is normal and
    // we can simply skip that update.
    if (mConnectedViewTag == View.NO_ID) {
      return;
    }

    // call value for side effect (diff map update via changes made to prop map)
    value();

    mUIImplementation.synchronouslyUpdateViewOnUIThread(
            mConnectedViewTag,
            mDiffMap);
  }
}
