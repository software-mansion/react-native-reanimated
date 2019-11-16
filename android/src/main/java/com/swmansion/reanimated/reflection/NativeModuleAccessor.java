package com.swmansion.reanimated.reflection;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.uimanager.ViewManager;

import java.lang.reflect.Method;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import static com.swmansion.reanimated.Utils.concat;

public class NativeModuleAccessor {
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

    public NativeModule getNativeModule(String name) {
        try {
            //mContext.getCatalystInstance().hasNativeModule()
            //Class.forName()

            return mContext.getCatalystInstance().getNativeModule(name);
        } catch (Throwable err) {
            //  module was not found
            Map<String, NativeModule> modules = getNativeModules();
            String[] keys = modules.keySet().toArray(new String[modules.size()]);
            throw new JSApplicationIllegalArgumentException(
                    "Reanimated invoke:\n" +
                            "Native module " + name + " was not found. Expected one of:\n" +
                            concat(keys) + ".\n" +
                            "Details: " + err.getMessage()
            );
        }
    }

    public Map<String, MethodAccessor> getReactMethodsForModule(NativeModule module) {
        Method[] methods = module.getClass().getDeclaredMethods();
        Method m;
        Map<String, MethodAccessor> methodMap = new HashMap();

        for (int i = 0; i < methods.length; i++) {
            m = methods[i];
            if(MethodAccessor.isReactMethod(m)){
                methodMap.put(m.getName(), new MethodAccessor(m));
            }
        }

        return methodMap;
    }

    public MethodAccessor getReactMethod(NativeModule nativeModule, String name) {
        Map<String, MethodAccessor> methods = getReactMethodsForModule(nativeModule);
        if(methods.containsKey(name)) {
            return methods.get(name);
        } else {
            //  method was not found
            String[] keys = methods.keySet().toArray(new String[methods.size()]);
            throw new JSApplicationIllegalArgumentException(
                    "Reanimated invoke: method name " + name + " was not found in class " + nativeModule.getName() +
                            ". Expected one of:\n" + concat(keys)
            );
        }
    }

    public WritableNativeMap out() {
        WritableNativeMap out = new WritableNativeMap();
        WritableNativeMap temp;
        Map<String, NativeModule> modules = getNativeModules();
        Map<String, MethodAccessor> methods;
        String[] keys = modules.keySet().toArray(new String[modules.size()]);
        String[] mKeys;

        for (int i = 0; i < keys.length; i++) {
            temp = new WritableNativeMap();
            methods = getReactMethodsForModule(modules.get(keys[i]));
            mKeys = methods.keySet().toArray(new String[methods.size()]);
            for (int j = 0; j < mKeys.length; j++) {
                temp.putArray(mKeys[j], methods.get(mKeys[j]).out());
            }
            out.putMap(keys[i], temp);
        }

        //  append view manager names
        try{
            Map<String, ViewManager> viewManagers = ReanimatedViewManagerRegistry
                    .getViewManagers(
                            mContext.getNativeModule(UIManagerModule.class)
                                    .getUIImplementation()
                    );
            String[] viewManagerNames = viewManagers.keySet().toArray(new String[viewManagers.size()]);
            WritableNativeArray arr = new WritableNativeArray();
            for (int i = 0; i < viewManagerNames.length; i++) {
                arr.pushString(viewManagerNames[i]);
            }
            out.putArray("viewManagers", arr);
        } catch (Throwable error) {
            throw new JSApplicationCausedNativeException("Reanimated failed to build reflection output", error);
        }

        return out;
    }

    public static WritableNativeMap getReflectionMap(ReactContext context) {
        return new NativeModuleAccessor(context).out();
    }
}