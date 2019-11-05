package com.swmansion.reanimated.nodes;

import android.util.Log;
import android.view.View;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.DynamicFromArray;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.NativeArray;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableNativeArray;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.uimanager.NativeViewHierarchyManager;
import com.facebook.react.uimanager.UIBlock;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.UIManagerReanimatedHelper;
import com.facebook.react.uimanager.ViewManager;
import com.swmansion.reanimated.BuildConfig;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class InvokeNode extends Node implements ConnectedNode {
    EvaluationHelper.MethodInvoker mEvalHelper;
    protected final int[] mParams;
    private int invocationId = 0;

    public InvokeNode(int nodeID, ReadableMap config, NodesManager nodesManager){
        super(nodeID, config, nodesManager);
        mEvalHelper = EvaluationHelper.getInstance(nodesManager.getContext(), config);
        mParams = Utils.processIntArray(config.getArray("params"));
    }

    @Override
    protected Object evaluate() {
        mEvalHelper.call(mParams, mNodesManager);

        invocationId++;
        return invocationId;
    }

    @Override
    public void connectToView(int viewTag) {
        mEvalHelper.connectToView(viewTag);
    }

    private static class EvaluationHelper {
        interface MethodInvoker {
            public void call(int[] params, NodesManager nodesManager);
            public void call(ReadableNativeArray array);
            public void connectToView(int viewTag);
        }

        private static String CONFIG_KEYS_MODULE = "module";
        private static String CONFIG_KEYS_METHOD = "method";
        private static String CONFIG_KEYS_COMMAND = "command";

        public static MethodInvoker getInstance(ReactContext context, ReadableMap config){
            String moduleName = config.getString(CONFIG_KEYS_MODULE);

            if (config.hasKey(CONFIG_KEYS_METHOD) && config.getType(CONFIG_KEYS_METHOD).equals(ReadableType.String)) {
                return new NativeModuleCaller(context, moduleName, config.getString(CONFIG_KEYS_METHOD));
            } else if (config.hasKey(CONFIG_KEYS_COMMAND)) {
                return new ViewManagerCaller(context, moduleName, config.getDynamic(CONFIG_KEYS_COMMAND));
            } else {
                throw new JSApplicationIllegalArgumentException("Missing method/command arg in animated invoke");
            }

        }

        private static class ViewManagerCaller implements MethodInvoker {
            private UIManagerModule mUIManager;
            private String mModuleName;
            private final String mMethodName = "receiveCommand";
            private Dynamic mCommandId;
            private int mConnectedViewTag;
            private Boolean mAttachedToAnimatedView = false;
            private ViewManager mViewManager;
            private View mView;

            ViewManagerCaller(ReactContext context, String viewManagerName, Dynamic commandId){
                mUIManager = context.getNativeModule(UIManagerModule.class);
                setCaller(viewManagerName, commandId);
            }

            public void setCaller(String viewManagerName, Dynamic commandId) {
                mModuleName = viewManagerName;
                mCommandId = commandId;
                Map commandsMap;
                try {
                    mViewManager = UIManagerReanimatedHelper
                            .resolveViewManager(mUIManager.getUIImplementation(), viewManagerName);
                    commandsMap = mViewManager.getCommandsMap();
                } catch (Throwable err){
                    throw new JSApplicationIllegalArgumentException(
                            "Animated invoke: View manager with name " + viewManagerName + " was not found."
                    );
                }


                /**
                 * validate {@link commandId} against the {@link commandsMap} of the {@link com.facebook.react.uimanager.ViewManager}
                 */
                 if (commandsMap != null && commandsMap.size() > 0){
                     if(commandsMap.containsValue(commandId.getType() == ReadableType.String ? commandId.asString(): commandId.asInt())){
                         // all is good
                     } else if (commandsMap.containsKey(commandId.asString())){
                         WritableArray temp = new WritableNativeArray();
                         temp.pushString(commandId.asString());
                         commandId.recycle();
                         mCommandId = DynamicFromArray.create(temp, 0);
                     }
                     else {
                         // View manager command was not found
                         // inform with meaningful error
                         throw new JSApplicationIllegalArgumentException(
                                 "Animated invoke: View manager command " + commandId.toString() + " was not found. Expected one of:\n" +
                                         commandsMap.entrySet().toString()
                         );
                     }
                 } else {
                     throw new JSApplicationIllegalArgumentException(
                             "Animated invoke: could not find commands map of View manager " + mViewManager
                     );
                 }

                //resolveViewManager
                //super.setCaller(mModuleName, mMethodName);
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

                if(mAttachedToAnimatedView) {
                    paramStart = 0;
                } else {
                    paramStart = 1;
                    ValueNode tagValueNode = nodesManager.findNodeById(params[0], ValueNode.class);
                    setViewTag(tagValueNode.doubleValue().intValue());
                }

                for (int i = paramStart; i < params.length; i++) {
                    n = nodesManager.findNodeById(params[i], Node.class);
                    if(n instanceof CallbackNode){
                        // misuse, there are no callbacks from "receiveCommand"
                        // inform with meaningful error
                        throw new JSApplicationIllegalArgumentException(
                                "Animated invoke: view manager commands do not have callbacks, did you mean to invoke a module method?"
                        );
                    } else if(n instanceof MapNode) {
                        args.pushMap(((MapNode) n).getValue());
                    } else {
                        Utils.pushVariant(args, n.value());
                    }
                }
                
                //call(((WritableNativeArray) args));

                mViewManager.receiveCommand(mView, mCommandId.asString(), args);
                Log.d("InvokeR", "called view manager: " + args.toString());
            }

            @Override
            public void call(final ReadableNativeArray arr){
                try {
                    mUIManager.dispatchViewManagerCommand(mConnectedViewTag, mCommandId, arr);
                    Log.d("InvokeR", "called view manager: " + arr.toString());
                } catch (Throwable err){
                    throw new JSApplicationIllegalArgumentException(
                            "Animated invoke: " + err.getMessage()
                    );
                }


                //  is this the correct approach??
/*
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

        private static class NativeModuleCaller extends MethodReflector implements MethodInvoker {

            private String mModuleName;
            private String mMethodName;

            NativeModuleCaller(ReactContext context, String moduleName, String methodName){
                super(context);
                setCaller(moduleName, methodName);
            }

            @Override
            public void setCaller(String moduleName, String methodName) {
                mModuleName = moduleName;
                mMethodName = methodName;
                super.setCaller(moduleName, methodName);
            }

            @Override
            public void call(int[] params, NodesManager nodesManager) {
                Utils.ReanimatedWritableNativeArray args = new Utils.ReanimatedWritableNativeArray();
                Node n;

                for (int i = 0; i < params.length; i++) {
                    n = nodesManager.findNodeById(params[i], Node.class);
                    if(n instanceof CallbackNode){
                        //args.pushArray(n.);
                    } else if(n instanceof MapNode) {
                        args.pushMap(((MapNode) n).getValue());
                    } else {
                        Utils.pushVariant(args, n.value());
                    }
                }

                //mContext.getCatalystInstance().getNativeModule(mModuleName).getClass().
            }

            @Override
            public void call(ReadableNativeArray arr){
                mContext.getCatalystInstance().callFunction(mModuleName, mMethodName, arr);
            }

            @Override
            public void connectToView(int viewTag) {
                //  stubbing
                //  this is used for invoking a view manager command only
                return;
            }
        }

        private static class MethodReflector {
            protected final ReactContext mContext;
            private Method mMethod;
            private Class<?>[] mParamTypes;
            private ReadableType[] mTypes;

            MethodReflector(ReactContext context) {
                mContext = context;
            }



            public void setCaller(String moduleName, String methodName) {
                //mContext.getCatalystInstance().hasNativeModule()
                NativeModule module;

                try {
                    module = mContext.getCatalystInstance().getNativeModule(moduleName);
                } catch (Throwable err) {
                    //  module was not found
                    //  create meaningful error

                    String m = "";
                    Collection<NativeModule> modules = mContext.getCatalystInstance().getNativeModules();
                    Iterator<NativeModule> moduleIterator = modules.iterator();
                    while (moduleIterator.hasNext()){
                        module = moduleIterator.next();
                        m += module.getName();
                        if(moduleIterator.hasNext()) m += ",\n";
                    }

                    throw new JSApplicationIllegalArgumentException(
                            "Reanimated invoke:\n" + err.getMessage() + "\nnative module " + moduleName + " was not found. Expected one of:\n" + m
                    );
                }

                setCaller(module, methodName);
            }

            public void setCaller(NativeModule module, String methodName){
                Method[] methods = module.getClass().getDeclaredMethods();

                for (Method method: methods) {
                    if (method.getName().equals(methodName)) {
                        setCaller(method);
                        return;
                    }
                }

                //  method was not found
                //  create meaningful error

                String m = "";
                for (int i = 0; i < methods.length; i++) {
                    Boolean isReactMethod = methods[i].getAnnotation(ReactMethod.class) != null;
                    if(isReactMethod){
                        m += methods[i].getName();
                        if(i < methods.length - 1) m += ",\n";
                    }
                }

                throw new JSApplicationIllegalArgumentException(
                        "Reanimated invoke: method name " + methodName + " was not found in class " + module.getName() +
                                ". Expected one of:\n" + m
                );
            }

            public void setCaller(Method method) {
                mMethod = method;
                //mMethod.getParameterAnnotations()[1][0].annotationType().
                mParamTypes = mMethod.getParameterTypes();
                mTypes = new ReadableType[mParamTypes.length];
                for (int i = 0; i < mParamTypes.length; i++) {
                    mTypes[i] = Utils.inferType(mParamTypes[i]);
                }
            }

            public void call(Object... params) {
                //mMethod.invoke()
            }

            public Object[] cast(Object... params) {
                Object[] out = new Object[params.length];
                try {
                    for (int i = 0; i < params.length; i++) {
                        out[i] = mParamTypes[i].cast(params[i]);
                    }
                }
                catch (Throwable e){
                    if(e instanceof ArrayIndexOutOfBoundsException){
                        throw new JSApplicationIllegalArgumentException(
                                "Parameter mismatch when calling reanimated invoke function. Expected " +
                                        mTypes.length + " parameters, got " + params.length
                        );
                    }
                    else {
                        throw new JSApplicationIllegalArgumentException(
                                "Parameter mismatch when calling reanimated invoke function. Expected " +
                                        mTypes.toString() + " , got " + params.toString()
                        );
                    }
                }
                return out;
            }
        }

        public static class NativeModuleAccessor {
            protected final ReactContext mContext;
            
            public NativeModuleAccessor(ReactContext context){
                mContext = context;
            }
            
            public Map<String, NativeModule> getNativeModules(){
                Collection<NativeModule> modules = mContext.getCatalystInstance().getNativeModules();
                Iterator<NativeModule> moduleIterator = modules.iterator();
                Map<String, NativeModule> moduleMap = new HashMap();
                NativeModule module;
                
                while (moduleIterator.hasNext()){
                    module = moduleIterator.next();
                    moduleMap.put(module.getName(), module);
                }

                return moduleMap;
            }

        }

    }

}