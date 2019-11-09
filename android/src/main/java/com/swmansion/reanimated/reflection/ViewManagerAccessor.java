package com.swmansion.reanimated.reflection;

import android.util.Log;
import android.view.View;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.DynamicFromArray;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableNativeArray;
import com.facebook.react.bridge.ReadableNativeMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.common.ReactConstants;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.UIManagerReanimatedHelper;
import com.facebook.react.uimanager.ViewManager;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;
import com.swmansion.reanimated.nodes.CallbackNode;
import com.swmansion.reanimated.nodes.MapNode;
import com.swmansion.reanimated.nodes.Node;
import com.swmansion.reanimated.nodes.ValueNode;

import java.util.Map;

import static com.swmansion.reanimated.Utils.concat;

public class ViewManagerAccessor implements ReanimatedAccessor {
    private UIManagerModule mUIManager;
    private Dynamic mCommandId;
    private ViewManager mViewManager;
    private Map<String, Object> mCommandsMap;
    private View mView;
    private int mConnectedViewTag;
    private Boolean mAttachedToAnimatedView = false;

    public ViewManagerAccessor(ReactContext context, String viewManagerName, Dynamic commandId){
        mUIManager = context.getNativeModule(UIManagerModule.class);
        setCaller(viewManagerName, commandId);
    }

    public void setCaller(String viewManagerName, Dynamic commandId) {
        resolveViewManager(viewManagerName);
        setCommand(commandId);
    }

    private void resolveViewManager(String name) {
        try {
            mViewManager = UIManagerReanimatedHelper
                    .resolveViewManager(mUIManager.getUIImplementation(), name);
            mCommandsMap = mViewManager.getCommandsMap();
        } catch (Throwable err){
            String details = "";
            try{
                Map<String, ViewManager> viewManagers = ReanimatedViewManagerRegistry.getViewManagers(mUIManager.getUIImplementation());
                String[] keys = viewManagers.keySet().toArray(new String[viewManagers.size()]);
                details = "Expected one of:\n" + concat(keys);
            } catch (Throwable error) {
                Log.d(ReactConstants.TAG, "reanimated invoke setCaller: " + error);
            }

            throw new JSApplicationIllegalArgumentException(
                    "Animated invoke: View manager with name " + name + " was not found." + details
            );
        }
    }

    private void setCommand(Dynamic commandId) {
        mCommandId = commandId;
        /**
         * validate {@link mCommandId} against the {@link mCommandsMap} of the {@link ViewManager}
         */
        if (mCommandsMap != null && mCommandsMap.size() > 0){
            if(mCommandsMap.containsValue(mCommandId.getType() == ReadableType.String ? mCommandId.asString(): mCommandId.asInt())){
                // all is good
            } else if (mCommandsMap.containsKey(mCommandId.asString())){
                WritableArray temp = new WritableNativeArray();
                temp.pushString(mCommandId.asString());
                mCommandId.recycle();
                mCommandId = DynamicFromArray.create(temp, 0);
            }
            else {
                // View manager command was not found
                throw new JSApplicationIllegalArgumentException(
                        "Animated invoke: View manager command " + mCommandId.toString() + " was not found. Expected one of:\n" +
                                mCommandsMap.entrySet().toString()
                );
            }
        } else {
            throw new JSApplicationIllegalArgumentException(
                    "Animated invoke: could not find commands map of View manager " + mViewManager
            );
        }
    }

    @Override
    public void connectToView(int viewTag) {
        mAttachedToAnimatedView = true;
        setViewTag(viewTag);
    }

    protected void setViewTag(int viewTag) {
        mConnectedViewTag = viewTag;
        mView = mUIManager.resolveView(mConnectedViewTag);
    }

    @Override
    public void call(int[] params, NodesManager nodesManager) {
        Utils.ReanimatedWritableNativeArray args = new Utils.ReanimatedWritableNativeArray();
        Node n;
        int paramStart;

        /**
         * If this node isn't attached to a view the first node must be the view's tag
         */
        if(mAttachedToAnimatedView) {
            paramStart = 0;
        } else {
            paramStart = 1;
            ValueNode tagValueNode = nodesManager.findNodeById(params[0], ValueNode.class);
            setViewTag(tagValueNode.doubleValue().intValue());
        }

        for (int i = paramStart; i < params.length; i++) {
            n = nodesManager.findNodeById(params[i], Node.class);
            /**
             * {@link CallbackNode is used for consuming/stubbing
             *      {@link ReadableNativeArray },
             *      {@link ReadableNativeMap },
             *      {@link Callback },
             *      {@link Promise }
             * {@link ViewManager } has no {@link Callback} or {@link Promise} args,
             * therefore we use the map's value
             */
            if(n instanceof MapNode) {
                args.pushMap(((MapNode) n).getValue());
            } else {
                Utils.pushVariant(args, n.value());
            }
        }

        receiveCommand(args);
        Log.d("InvokeR", "called view manager: " + args.toString());
    }

    public void receiveCommand(ReadableArray args) {
        mViewManager.receiveCommand(mView, mCommandId.asString(), args);
    }
}
