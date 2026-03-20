package com.swmansion.worklets

import com.facebook.react.BaseReactPackage
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.module.annotations.ReactModuleList
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

@ReactModuleList(nativeModules = [WorkletsModule::class])
class WorkletsPackage : BaseReactPackage(), ReactPackage {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == WorkletsModule.NAME) WorkletsModule(reactContext) else null

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        val moduleList: Array<Class<*>> = arrayOf(WorkletsModule::class.java)

        val reactModuleInfoMap = HashMap<String, ReactModuleInfo>()
        for (moduleClass in moduleList) {
            val reactModule: ReactModule =
                checkNotNull(moduleClass.getAnnotation(ReactModule::class.java))

            reactModuleInfoMap[reactModule.name] =
                ReactModuleInfo(
                    reactModule.name,
                    moduleClass.name,
                    reactModule.canOverrideExistingModule,
                    reactModule.needsEagerInit,
                    reactModule.isCxxModule,
                    true
                )
        }

        return ReactModuleInfoProvider { reactModuleInfoMap }
    }
}
