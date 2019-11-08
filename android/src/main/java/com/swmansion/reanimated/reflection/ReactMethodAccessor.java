package com.swmansion.reanimated.reflection;

import android.util.Log;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableNativeArray;
import com.facebook.react.bridge.ReadableNativeMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;
import com.swmansion.reanimated.nodes.CallbackNode;
import com.swmansion.reanimated.nodes.Node;

import java.lang.reflect.InvocationTargetException;

import static com.swmansion.reanimated.Utils.concat;

public class ReactMethodAccessor extends NativeModuleAccessor implements ReanimatedAccessor {
    //protected final ReactContext mContext;
    private NativeModule mCallee;
    private MethodAccessor mMethod;

    public ReactMethodAccessor(ReactContext context, String moduleName, String methodName) {
        super(context);
        setCaller(moduleName, methodName);
    }

    public void setCaller(String moduleName, String methodName) {
        NativeModule module = getNativeModule(moduleName);
        setCaller(module, methodName);
    }

    public void setCaller(NativeModule module, String methodName){
        mCallee = module;
        mMethod = getReactMethod(module, methodName);
    }

    public void call(int[] params, NodesManager nodesManager){
        invoke(cast(params, nodesManager));
    }

    protected void invoke(Object[] params) {
        try {
            mMethod.getMethod().invoke(mCallee, params);
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
                    "Reanimated invoke: Failed to invoke " + mCallee.getName() + "." +
                            mMethod.getName() + "(" + concat(params) + ")" + "\n" +
                            "Details: " + errorMessage
            );
        }
    }

    public Object[] cast(int[] params, NodesManager nodesManager) {
        Object[] out = new Object[params.length];
        Node n;
        Object value;
        Class<?>[] paramTypes = mMethod.getParamTypes();
        Class<?> paramType;
        Log.d("InvokeR", "cast: " + concat(params));
        try {
            for (int i = 0; i < params.length; i++) {
                n = nodesManager.findNodeById(params[i], Node.class);
                paramType = paramTypes[i];
                /**
                 * {@link CallbackNode is used for consuming/stubbing
                 *      {@link ReadableNativeArray },
                 *      {@link ReadableNativeMap },
                 *      {@link Callback },
                 *      {@link Promise }
                 */
                if (n instanceof CallbackNode){
                    if (paramType == Callback.class || paramType == Promise.class) {
                        out[i] = n;
                    } else {
                        out[i] = ((CallbackNode) n).getValue();
                    }
                } else {
                    value = n.value();
                    if(value instanceof Double) {
                        out[i] = Utils.castFromDouble(((Double) value), paramType);
                    } else {
                        out[i] = paramType.cast(value);
                    }
                }
            }
        }
        catch (Throwable err){
            String outOfBoundsMessage = "";
            String typeDetails = "Expected " + concat(paramTypes) + ",\nGot " + concat(params);
            if(err instanceof ArrayIndexOutOfBoundsException){
                outOfBoundsMessage = "Expected " + paramTypes.length + " parameters, got " + params.length;
            }
            throw new JSApplicationIllegalArgumentException(
                    "Parameter mismatch when calling reanimated invoke.\n" +
                            mCallee.getName() + "." + mMethod +"()\n" +
                            outOfBoundsMessage + ".\n" +
                            typeDetails + ".\n" +
                            "Details: " + err.getMessage()
            );
        }

        return out;
    }

    @Override
    public void connectToView(int viewTag) {
        //  noop
        //  this is used for invoking a view manager command only
    }
}