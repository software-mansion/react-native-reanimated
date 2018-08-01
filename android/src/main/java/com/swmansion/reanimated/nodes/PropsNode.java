package com.swmansion.reanimated.nodes;

import android.view.View;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.GuardedRunnable;
import com.facebook.react.bridge.JavaOnlyMap;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.ReactStylesDiffMap;
import com.facebook.react.uimanager.UIImplementation;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

import java.util.Map;

public class PropsNode extends Node<Double> implements FinalNode {

  private final Map<String, Integer> mMapping;
  private final UIImplementation mUIImplementation;
  private int mConnectedViewTag = View.NO_ID;

  private final JavaOnlyMap mPropMap;
  private final ReactStylesDiffMap mDiffMap;

  public PropsNode(
          int nodeID,
          ReadableMap config,
          NodesManager nodesManager,
          UIImplementation uiImplementation) {
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
  protected Double evaluate() {
    boolean hasNativeProps = false;
    boolean hasJSProps = false;
    final WritableMap jsProps = Arguments.createMap();

    for (Map.Entry<String, Integer> entry : mMapping.entrySet()) {
      Node node = mNodesManager.findNodeById(entry.getValue(), Node.class);
      if (node instanceof StyleNode) {
        WritableMap style = ((StyleNode) node).value();
        ReadableMapKeySetIterator iter = style.keySetIterator();
        while (iter.hasNextKey()) {
          String key = iter.nextKey();
          WritableMap dest;
          if (mNodesManager.nativeProps.contains(key)) {
            hasNativeProps = true;
            dest = mPropMap;
          } else if (mNodesManager.jsPropsHandledNatively.contains(key)){
            hasJSProps = true;
            dest = jsProps;
          } else {
            continue;
          }
          ReadableType type = style.getType(key);
          switch (type) {
            case Number:
              dest.putDouble(key, style.getDouble(key));
              break;
            case Array:
              dest.putArray(key, (WritableArray) style.getArray(key));
              break;
            default:
              throw new IllegalArgumentException("Unexpected type " + type);
          }
        }
      } else {
        String key = entry.getKey();
        if (mNodesManager.nativeProps.contains(key)) {
          hasNativeProps = true;
          mPropMap.putDouble(key, node.doubleValue());
        } else {
          hasJSProps = true;
          jsProps.putDouble(key, node.doubleValue());
        }
      }
    }

    if (mConnectedViewTag != View.NO_ID) {
      if (hasNativeProps) {
        mUIImplementation.synchronouslyUpdateViewOnUIThread(
                mConnectedViewTag,
                mDiffMap);
      }
      if (hasJSProps) {
        ReactContext reactApplicationContext = mNodesManager.mContext;
        reactApplicationContext.runOnNativeModulesQueueThread(
                new GuardedRunnable(reactApplicationContext) {
                  @Override
                  public void runGuarded() {
                    mNodesManager.mUIManager.updateView(mConnectedViewTag, "RCTView", jsProps);
                  }
                });
        mNodesManager.updateContext.shouldTriggerUIUpdate = true;
      }
    }

    return ZERO;
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
  }
}
