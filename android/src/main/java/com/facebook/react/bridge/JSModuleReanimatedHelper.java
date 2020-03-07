package com.facebook.react.bridge;

import java.lang.reflect.Field;
import java.util.HashMap;

public class JSModuleReanimatedHelper {

    @SuppressWarnings("unchecked cast")
    public static HashMap<Class<? extends JavaScriptModule>, JavaScriptModule> getModuleInstances(CatalystInstanceImpl catalystInstance) {
        try {
            //  ReactAndroid/src/main/java/com/facebook/react/bridge/CatalystInstanceImpl.java
            Field jsModuleRegistryField = CatalystInstanceImpl.class.getDeclaredField("mJSModuleRegistry");

            //  ReactAndroid/src/main/java/com/facebook/react/bridge/JavaScriptModuleRegistry.java
            Field moduleInstancesField = JavaScriptModuleRegistry.class.getDeclaredField("mModuleInstances");

            jsModuleRegistryField.setAccessible(true);
            moduleInstancesField.setAccessible(true);

            JavaScriptModuleRegistry javaScriptModuleRegistry =
                    (JavaScriptModuleRegistry) jsModuleRegistryField.get(catalystInstance);

            return (HashMap<Class<? extends JavaScriptModule>, JavaScriptModule>) moduleInstancesField.get(javaScriptModuleRegistry);

        } catch (Throwable throwable) {
            throwable.printStackTrace();
            throw new JSApplicationCausedNativeException("Reanimated intercept critical error", throwable);
        }
    }

}
