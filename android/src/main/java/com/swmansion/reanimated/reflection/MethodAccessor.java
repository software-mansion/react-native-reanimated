package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.swmansion.reanimated.Utils;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;

import static com.swmansion.reanimated.Utils.concat;

public class MethodAccessor {
    private Method mMethod;
    private Class<?>[] mParamTypes;
    private String[] mParamNames;
    private String[] mJSTypes;

    public static String CALLBACK = "Callback";

    public static Boolean isReactMethod(Method method) {
        return method.getAnnotation(ReactMethod.class) != null;
    }

    public MethodAccessor(Method method) {
        setMethod(method);
    }

    protected void setMethod(Method method) {
        mMethod = method;
        mMethod.setAccessible(true);
        mParamTypes = mMethod.getParameterTypes();
        mParamNames = getParameterNames(mMethod);
        mJSTypes = getJSParameterTypes(mMethod);
    }

    public Method getMethod() {
        return mMethod;
    }

    private static String[] getParameterNames(Method method) {
        String[] out = new String[method.getParameterTypes().length];
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            Parameter[] parameters = method.getParameters();
            Parameter p;
            for (int i = 0; i < parameters.length; i++) {
                p = parameters[i];
                out[i] = p.isNamePresent() ? p.getName() : "param" + (i + 1);
            }
        } else {
            for (int i = 0; i < out.length; i++) {
                out[i] = "param" + (i + 1);
            }
        }

        return out;
    }

    public static ReadableType[] getInferredParameterTypes(Method method) {
        Class<?>[] mParamTypes = method.getParameterTypes();
        ReadableType[] mTypes = new ReadableType[mParamTypes.length];
        for (int i = 0; i < mParamTypes.length; i++) {
            mTypes[i] = Utils.inferType(mParamTypes[i]);
        }
        return mTypes;
    }

    public static String[] getJSParameterTypes(Method method) {
        Class<?>[] mParamTypes = method.getParameterTypes();
        String[] mTypes = new String[mParamTypes.length];
        for (int i = 0; i < mParamTypes.length; i++) {
            mTypes[i] = (mParamTypes[i] == Callback.class || mParamTypes[i] == Promise.class) ?
                    CALLBACK :
                    Utils.inferType(mParamTypes[i]).name();
        }
        return mTypes;
    }

    public String getName(){
        return mMethod.getName();
    }

    public Class<?>[] getParamTypes() {
        return mParamTypes;
    }

    @NonNull
    @Override
    public String toString() {
        String[] paramRep = new String[mParamTypes.length];
        for (int i = 0; i < paramRep.length; i++) {
            paramRep[i] = mJSTypes[i] + " " + mParamNames[i];
        }
        return mMethod.getName() + "(" + concat(paramRep, ", ") + ")";
    }

    public WritableArray out() {
        WritableArray array = Arguments.createArray();
        WritableMap param;
        for (int i = 0; i < mParamTypes.length; i++) {
            param = Arguments.createMap();
            param.putString("type", mJSTypes[i]);
            param.putString("nativeType", mParamTypes[i].getSimpleName());
            param.putString("name", mParamNames[i]);
            array.pushMap(param);
        }
        return array;
    }
}