package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.swmansion.reanimated.NativeProxy;
import com.swmansion.reanimated.NodesManager;

import java.util.HashMap;

import javax.annotation.Nullable;

public class SharedValueNode extends Node {
  private Object mValue;
  private static HashMap<Integer, SharedValueNode> mSharedValueMap = new HashMap<>();
  private int id;

  public SharedValueNode(int nodeID, @Nullable ReadableMap config, NodesManager nodesManager) {
    super(nodeID, config, nodesManager);
    if (config == null || !config.hasKey("initialValue") || !config.hasKey("sharedValueId")) {
      mValue = null;
      return;
    }

    id = (int) config.getDouble("sharedValueId");
    mSharedValueMap.put(id, this);
    
    Object sharedValue = NativeProxy.getSharedValue(id);
    if (sharedValue == null) {
      throw new IllegalStateException("Shared Value for node shouldn't be null");
    }
    mValue = sharedValue;
  }

  public void onDrop() {
    mSharedValueMap.remove(id);
  }

  public void setValue(Object value) {
    mValue = value;
    forceUpdateMemoizedValue(mValue);
  }

  @Override
  protected Object evaluate() {
    return mValue;
  }

  public static void setNewValueFor(Integer id, Object newValue) {
    SharedValueNode svn = mSharedValueMap.get(id);
    if (svn != null) {
      svn.setValue(newValue);
    }
  }
}

