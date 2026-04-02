import com.android.build.gradle.AppExtension
import com.android.build.gradle.LibraryExtension

fun reactNativeArchitectures(): List<String> {
    val value = project.findProperty("reactNativeArchitectures") as String?
    return value?.split(",") ?: listOf("armeabi-v7a", "x86", "x86_64", "arm64-v8a")
}

tasks.configureEach {
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
        if (proj === rootProject) return@forEach

        val dependsOnThisLib = proj.configurations.any { config ->
            config.dependencies.any { dep ->
                dep.group == project.group && dep.name == project.name
            }
        }
        if (!dependsOnThisLib && proj != project) return@forEach

        if (!proj.plugins.hasPlugin("com.android.application") && !proj.plugins.hasPlugin("com.android.library")) {
            return@forEach
        }

        @Suppress("UNCHECKED_CAST")
        val variants = try {
            (proj.extensions.getByType(AppExtension::class.java)).applicationVariants
        } catch (e: Exception) {
            (proj.extensions.getByType(LibraryExtension::class.java)).libraryVariants
        }

        variants.all { variant ->
            val variantName = variant.name
            abis.forEach { abi ->
                val searchDir = File(proj.projectDir, ".cxx/$variantName")
                if (!searchDir.exists()) return@forEach
                val matches = mutableListOf<File>()
                searchDir.listFiles { f -> f.isDirectory }?.forEach { randomDir ->
                    val prefabFile = File(randomDir, "$abi/prefab_config.json")
                    if (prefabFile.exists()) matches += prefabFile
                }
                matches.forEach { prefabConfig ->
                    prefabConfig.setLastModified(System.currentTimeMillis())
                }
            }
            true
        }
    }
}
