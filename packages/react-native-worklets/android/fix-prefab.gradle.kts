fun reactNativeArchitectures(): List<String> {
    val value = project.findProperty("reactNativeArchitectures") as String?
    return value?.split(",") ?: listOf("armeabi-v7a", "x86", "x86_64", "arm64-v8a")
}

tasks.configureEach {
    // Make sure that we generate our prefab publication file only after having built the native library
    // so that not a header publication file, but a full configuration publication will be generated, which
    // will include the .so file
    val prefabConfigurePattern = Regex("^prefab(.+)ConfigurePackage$")
    val matchResult = prefabConfigurePattern.matchEntire(name)
    if (matchResult != null) {
        val variantName = matchResult.groupValues[1]
        outputs.upToDateWhen { false }
        dependsOn("externalNativeBuild$variantName")
    }
}

afterEvaluate {
    val abis = reactNativeArchitectures()
    rootProject.allprojects.forEach { proj ->
        if (proj === rootProject) {
            return@forEach
        }

        val dependsOnThisLib = proj.configurations.any { config ->
            config.dependencies.any { dep ->
                dep.group == project.group && dep.name == project.name
            }
        }
        if (!dependsOnThisLib && proj != project) return@forEach

        if (!proj.plugins.hasPlugin("com.android.application") && !proj.plugins.hasPlugin("com.android.library")) {
            return@forEach
        }

        // Touch the prefab_config.json files to ensure that in ExternalNativeJsonGenerator.kt we will re-trigger the prefab CLI to
        // generate a libnameConfig.cmake file that will contain our native library (.so).
        // See this condition: https://cs.android.com/android-studio/platform/tools/base/+/mirror-goog-studio-main:build-system/gradle-core/src/main/java/com/android/build/gradle/tasks/ExternalNativeJsonGenerator.kt;l=207-219?q=createPrefabBuildSystemGlue
        val cxxDir = File(proj.projectDir, ".cxx")
        if (!cxxDir.exists()) return@forEach
        cxxDir.listFiles { dir -> dir.isDirectory }?.forEach { variantDir ->
            val randomDirs = variantDir.listFiles { dir -> dir.isDirectory }
            abis.forEach { abi ->
                randomDirs?.forEach { randomDir ->
                    val prefabFile = File(randomDir, "$abi/prefab_config.json")
                    if (prefabFile.exists()) prefabFile.setLastModified(System.currentTimeMillis())
                }
            }
        }
    }
}
