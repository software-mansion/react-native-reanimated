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
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableNativeArray;
import com.facebook.react.bridge.ReadableNativeMap;
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

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import static com.swmansion.reanimated.Utils.concat;

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
                     *      {@link ReadableNativeArray},
                     *      {@link ReadableNativeMap},
                     *      {@link Callback},
                     *      {@link Promise}
                     * {@link ViewManager} has no {@link Callback} args,
                     * therefore we use the map's value
                     */
                    if(n instanceof MapNode) {
                        args.pushMap(((MapNode) n).getValue());
                    } else {
                        Utils.pushVariant(args, n.value());
                    }
                }

                mViewManager.receiveCommand(mView, mCommandId.asString(), args);
                Log.d("InvokeR", "called view manager: " + args.toString());
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
            public void connectToView(int viewTag) {
                //  noop
                //  this is used for invoking a view manager command only
                return;
            }
        }

        private static class MethodReflector {
            protected final ReactContext mContext;
            private Object mCallee;
            private Method mMethod;
            private Class<?>[] mParamTypes;
            private ReadableType[] mTypes;

            MethodReflector(ReactContext context) {
                mContext = context;
            }

            public static Boolean isReactMethod(Method method) {
                return method.getAnnotation(ReactMethod.class) != null;
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
                            "Reanimated invoke:\n" + err.getMessage() + ".\nNative module " + moduleName + " was not found. Expected one of:\n" + m
                    );
                }

                setCaller(module, methodName);
            }

            public void setCaller(NativeModule module, String methodName){
                Method[] methods = module.getClass().getDeclaredMethods();

                for (Method method: methods) {
                    if (method.getName().equals(methodName)) {

                        /**
                         * allow only {@link ReactMethod}??
                         */
                        //if(isReactMethod(method))

                        setCaller(module, method);
                        return;
                    }
                }

                //  method was not found
                //  create meaningful error

                String m = "";
                for (int i = 0; i < methods.length; i++) {
                    if(isReactMethod(methods[i])){
                        m += methods[i].getName();
                        if(i < methods.length - 1) m += ",\n";
                    }
                }

                throw new JSApplicationIllegalArgumentException(
                        "Reanimated invoke: method name " + methodName + " was not found in class " + module.getName() +
                                ". Expected one of:\n" + m
                );
            }

            protected void setCaller(Object callee, Method method) {
                mCallee = callee;
                mMethod = method;
                mMethod.setAccessible(true);
                //mMethod.getParameterAnnotations()[1][0].annotationType().
                mParamTypes = mMethod.getParameterTypes();
                mTypes = new ReadableType[mParamTypes.length];
                for (int i = 0; i < mParamTypes.length; i++) {
                    mTypes[i] = Utils.inferType(mParamTypes[i]);
                }
                Log.d("InvokeR", "setCaller: " + concat(mParamTypes));
            }

            public void call(int[] params, NodesManager nodesManager){
                invoke(cast(params, nodesManager));
            }

            protected void invoke(Object[] params) {
                try {
                    mMethod.invoke(mCallee, params);
                } catch (Throwable err) {
                    String errorMessage;
                    if(err instanceof InvocationTargetException){
                        err.getCause().printStackTrace();
                        errorMessage = err.getCause().getMessage();
                    } else {
                        err.printStackTrace();
                        errorMessage = err.getMessage();
                    }

                    throw new JSApplicationIllegalArgumentException(
                            "Reanimated invoke: Failed to invoke " + mCallee.getClass().getSimpleName() + "." +
                                    mMethod.getName() + "(" + concat(params) + ")" + "\n" +
                                    "Details: " + errorMessage
                    );
                }
            }

            public Object[] cast(int[] params, NodesManager nodesManager) {
                Object[] out = new Object[params.length];
                Node n;
                Object value;
                Log.d("InvokeR", "cast: " + concat(params));
                try {
                    for (int i = 0; i < params.length; i++) {
                        n = nodesManager.findNodeById(params[i], Node.class);
                        /**
                         * {@link CallbackNode is used for consuming/stubbing
                         *      {@link ReadableNativeArray},
                         *      {@link ReadableNativeMap},
                         *      {@link Callback},
                         *      {@link Promise}
                         */
                        if (n instanceof CallbackNode){
                            if (mParamTypes[i] == Callback.class || mParamTypes[i] == Promise.class) {
                                out[i] = n;
                            } else {
                                out[i] = ((CallbackNode) n).getValue();
                            }
                        } else {
                            value = n.value();
                            if(value instanceof Double) {
                                out[i] = Utils.castFromDouble(((Double) value), mParamTypes[i]);
                            } else {
                                out[i] = mParamTypes[i].cast(value);
                            }
                        }
                    }
                }
                catch (Throwable err){
                    if(err instanceof ArrayIndexOutOfBoundsException){
                        throw new JSApplicationIllegalArgumentException(
                                "Parameter mismatch when calling reanimated invoke. Expected " +
                                        mParamTypes.length + " parameters, got " + params.length + ".\n" +
                                        "Details: " + err.getMessage()
                        );
                    }
                    else {
                        throw new JSApplicationIllegalArgumentException(
                                "Parameter mismatch when calling reanimated invoke.\nExpected " +
                                        concat(mParamTypes) + ",\nGot " + concat(params) + ".\n" +
                                        "Details: " + err.getMessage()
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