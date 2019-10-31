package com.swmansion.reanimated.nodes;

import android.util.Log;
import android.view.View;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableNativeArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.UIBlock;
import com.facebook.react.uimanager.UIManagerModule;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

public class MFunctionNode extends FunctionNode {
    EvalutionHelper mEvalHelper;

    MFunctionNode(int nodeID, ReadableMap config, NodesManager nodesManager){
        super(nodeID, config, nodesManager);
        mEvalHelper = EvalutionHelper.getInstance(nodesManager.getContext(), config);
    }

    @Override
    protected Object evaluate() {
        //  this methods should evaluate nodes
        //  create Callbacks that set corresponding event value nodes to their new value
        //  then pass it to invoke
        return super.evaluate();
    }

    private static class EvalutionHelper {
        interface MethodInvoker {
            public void invoke(ReadableNativeArray array);
        }

        private MethodInvoker methodInvoker;

        public void blip(){
            for (int i = 0; i < mParams.length; i++) {
                int paramId = mParams[i];
                int argId = mArgs[i];
                ParamNode paramNode = mNodesManager.findNodeById(paramId, ParamNode.class);
                Node argNode = mNodesManager.findNodeById(argId, Node.class);
                if(argNode instanceof EventNode){

                }
                else if(argNode instanceof FunctionNode){

                }
                else {
                    paramNode.beginContext(mArgs[i], mPreviousCallID);
                }
            }
        }

        public static EvalutionHelper getInstance(ReactContext context, ReadableMap config){
            String moduleName = config.getString("moduleName");
            Dynamic methodName = config.getDynamic("methodName");
            //mParams = Utils.processIntArray(config.getArray("params"));
            switch(methodName.getType()){
                case String:
                    return new EvalutionHelper(context, moduleName, methodName.asString());
                case Number:
                    return new EvalutionHelper(context, moduleName, ((int) methodName.asDouble()));
                default:
                    throw new JSApplicationIllegalArgumentException("Animated ModuleFunction node\'s method name should be" +
                            "of type string of number, got" + methodName.getType().name());
            }
        }
        EvalutionHelper(ReactContext context, String moduleName, String methodName) {
            methodInvoker = new NativeModuleInvoker(context, moduleName, methodName);
        }
        EvalutionHelper(ReactContext context, String moduleName, int commandId){
            methodInvoker = new ViewManagerInvoker(context, moduleName, commandId);
        }

        public void invoke(ReadableNativeArray arr){
            methodInvoker.invoke(arr);
        }

        private class ViewManagerInvoker implements MethodInvoker {
            private final ReactContext mContext;
            private UIManagerModule mUIManager;
            private final String mModuleName;
            private final int mCommandId;
            private int mConnectedViewTag;

            ViewManagerInvoker(ReactContext context, String moduleName, int commandId){
                mContext = context;
                mUIManager = mContext.getNativeModule(UIManagerModule.class);
                mModuleName = moduleName;
                mCommandId = commandId;
            }

            public void connectToView(int viewTag) {
                mConnectedViewTag = viewTag;
            }

            @Override
            public void invoke(final ReadableNativeArray arr){
                //  is this the correct approach??

                mUIManager.prependUIBlock(new UIBlock() {
                    @Override
                    public void execute(NativeViewHierarchyManager nativeViewHierarchyManager) {
                        View view = nativeViewHierarchyManager.resolveView(mConnectedViewTag);
                        nativeViewHierarchyManager
                                .resolveViewManager(mConnectedViewTag)
                                .receiveCommand(view, mCommandId, arr);
                    }
                });
            /*
            UIManagerReanimatedHelper
                    .resolveViewManager(mUIManager.getUIImplementation(), mModuleName)
                    .receiveCommand(mUIManager.resolveView(mConnectedViewTag), mCommandId, arr);

             */
            }
        }

        private class NativeModuleInvoker implements MethodInvoker {
            private final ReactContext mContext;
            private final String mModuleName;
            private final String mMethodName;

            NativeModuleInvoker(ReactContext context, String moduleName, String methodName){
                mContext = context;
                mModuleName = moduleName;
                mMethodName = methodName;
            }

            @Override
            public void invoke(ReadableNativeArray arr){
                mContext.getCatalystInstance().callFunction(mModuleName, mMethodName, arr);
            }
        }
    }
}



/*
    public static ReadableNativeArray shift(ReadableNativeArray array){
        return copyArray(array, 1, array.size());
    }
    public static ReadableNativeArray copyArray(ReadableNativeArray array, int from){
        return copyArray(array, from, array.size());
    }
    public static ReadableNativeArray copyArray(ReadableNativeArray array, int from, int to){
        WritableArray arr = Arguments.createArray();

        for (int i = 0; i < array.size(); i++) {
            if(i > from && i < to){
                switch(array.getType(i)){
                    case Array:
                        arr.pushArray(((WritableArray) array.getArray(i)));
                        break;
                    case Map:
                        arr.pushMap(((WritableMap) array.getMap(i)));
                        break;
                    case Null:
                        arr.pushNull();
                        break;
                    case Number:
                        arr.pushDouble(array.getDouble(i));
                        break;
                    case String:
                        arr.pushString(array.getString(i));
                        break;
                    case Boolean:
                        arr.pushBoolean(array.getBoolean(i));
                        break;
                }
            }
        }

        return ((ReadableNativeArray) arr);
    }


 */