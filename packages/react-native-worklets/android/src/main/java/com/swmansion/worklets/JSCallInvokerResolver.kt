package com.swmansion.worklets

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl

object JSCallInvokerResolver {

    @OptIn(FrameworkAPI::class)
    @JvmStatic
    fun getJSCallInvokerHolder(context: ReactApplicationContext): CallInvokerHolderImpl {
        try {
            val method = context.javaClass.getMethod("getJSCallInvokerHolder")
            return method.invoke(context) as CallInvokerHolderImpl
        } catch (_: Exception) {
            // In newer implementations, the method is in CatalystInstance, continue.
        }
        try {
            val catalystInstance =
                context.javaClass.getMethod("getCatalystInstance").invoke(context)
            checkNotNull(catalystInstance)
            val method = catalystInstance.javaClass.getMethod("getJSCallInvokerHolder")
            return method.invoke(catalystInstance) as CallInvokerHolderImpl
        } catch (e: Exception) {
            throw RuntimeException("Failed to get JSCallInvokerHolder", e)
        }
    }
}
