import com.android.build.gradle.tasks.ExternalNativeBuildJsonTask
import groovy.json.JsonSlurper
import org.apache.tools.ant.taskdefs.condition.Os
import javax.inject.Inject

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.13.1")
        classpath("de.undercouch:gradle-download-task:5.6.0")
        classpath("com.diffplug.spotless:spotless-plugin-gradle:8.1.0")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.20")
    }
}

fun safeExtGet(prop: String, fallback: Any?): Any? =
    if (rootProject.extensions.extraProperties.has(prop)) rootProject.extensions.extraProperties.get(prop) else fallback

fun safeAppExtGet(prop: String, fallback: Any?): Any? {
    val appProject = rootProject.allprojects.find { it.plugins.hasPlugin("com.android.application") }
    return if (appProject?.extensions?.extraProperties?.has(prop) == true)
        appProject.extensions.extraProperties.get(prop)
    else
        fallback
}

fun resolveReactNativeDirectory(): File {
    val reactNativeLocation = safeAppExtGet("REACT_NATIVE_NODE_MODULES_DIR", null) as String?
    if (reactNativeLocation != null) return file(reactNativeLocation)

    val reactNativePackage = file(
        providers.exec {
            workingDir(rootDir)
            commandLine("node", "--print", "require.resolve('react-native/package.json')")
        }.standardOutput.asText.get().trim()
    )
    if (reactNativePackage.exists()) return reactNativePackage.parentFile

    throw GradleException("[Worklets] Unable to resolve react-native location in node_modules. You should set project extension property (in `app/build.gradle`) named `REACT_NATIVE_NODE_MODULES_DIR` with the path to react-native in node_modules.")
}

fun getReactNativeVersion(): String {
    val reactNativeRootDir = resolveReactNativeDirectory()
    val reactProperties = java.util.Properties()
    file("$reactNativeRootDir/ReactAndroid/gradle.properties").inputStream().use { reactProperties.load(it) }
    return reactProperties.getProperty("VERSION_NAME")
}

fun getReactNativeMinorVersion(): Int {
    val reactNativeVersion = getReactNativeVersion()
    return if (reactNativeVersion.startsWith("0.0.0-")) 1000 else reactNativeVersion.split(".")[1].toInt()
}

fun isNewArchitectureEnabled(): Boolean {
    if (getReactNativeMinorVersion() >= 82) return true
    return project.hasProperty("newArchEnabled") && project.property("newArchEnabled") == "true"
}

fun getHermesV1Enabled(): Boolean {
    // Even though `HERMES_V1_ENABLED` is now centralized
    // in `react-native-flags.cmake` for React Native >= 0.84
    // that CMake file depends on definitions provided
    // in local `externalNativeBuild` configuration of the LIBRARY.
    // I hope this is only a temporary workaround.
    return if (getReactNativeMinorVersion() >= 84) {
        safeAppExtGet("hermesV1Enabled", true)?.toString()?.toBoolean() ?: true
    } else {
        safeAppExtGet("hermesV1Enabled", false)?.toString()?.toBoolean() ?: false
    }
}

@Suppress("UNCHECKED_CAST")
fun getWorkletsVersion(): String {
    val inputFile = file("${projectDir.path}/../package.json")
    val json = JsonSlurper().parseText(inputFile.readText()) as Map<String, Any?>
    return json["version"] as String
}

fun toPlatformFileString(path: String): String {
    var result = path
    if (Os.isFamily(Os.FAMILY_WINDOWS)) {
        result = result.replace(File.separatorChar, '/')
    }
    return result
}

@Suppress("UNCHECKED_CAST")
fun getStaticFeatureFlags(): Map<String, String> {
    val featureFlags = HashMap<String, String>()

    val staticFeatureFlagsFile = file("${projectDir.path}/../src/featureFlags/staticFlags.json")
    if (!staticFeatureFlagsFile.exists()) {
        throw GradleException("[Worklets] Feature flags file not found at ${staticFeatureFlagsFile.absolutePath}.")
    }
    (JsonSlurper().parseText(staticFeatureFlagsFile.readText()) as Map<String, Any>).forEach { (key, value) ->
        featureFlags[key] = value.toString()
    }

    val packageJsonFile = file("${rootDir.path}/../package.json")
    if (packageJsonFile.exists()) {
        val packageJson = JsonSlurper().parseText(packageJsonFile.readText()) as Map<String, Any?>
        (packageJson["worklets"] as? Map<String, Any?>)
            ?.get("staticFeatureFlags")
            ?.let { it as Map<String, Any?> }
            ?.forEach { (key, value) -> featureFlags[key] = value.toString() }
    }

    return featureFlags
}

fun getStaticFeatureFlagsString(featureFlags: Map<String, String>): String =
    featureFlags.entries.joinToString("") { (key, value) -> "[$key:$value]" }

fun isFlagEnabled(featureFlags: Map<String, String>, flagName: String): Boolean =
    featureFlags.containsKey(flagName) && featureFlags[flagName] == "true"

fun reactNativeArchitectures(): List<String> {
    val value = project.findProperty("reactNativeArchitectures") as String?
    return value?.split(",") ?: listOf("armeabi-v7a", "x86", "x86_64", "arm64-v8a")
}

if (isNewArchitectureEnabled() && project != rootProject) {
    apply(plugin = "com.facebook.react")
}

val featureFlags = getStaticFeatureFlags()

val packageDir: File = project.projectDir.parentFile
val reactNativeRootDir: File = resolveReactNativeDirectory()
val REACT_NATIVE_MINOR_VERSION: Int = getReactNativeMinorVersion()
val REACT_NATIVE_VERSION: String = getReactNativeVersion()
val WORKLETS_VERSION: String = getWorkletsVersion()
val IS_NEW_ARCHITECTURE_ENABLED: Boolean = isNewArchitectureEnabled()
val IS_REANIMATED_EXAMPLE_APP: Boolean = safeAppExtGet("isReanimatedExampleApp", false)?.toString()?.toBoolean() ?: false
val FETCH_PREVIEW_ENABLED: Boolean = isFlagEnabled(featureFlags, "FETCH_PREVIEW_ENABLED")
val WORKLETS_FEATURE_FLAGS: String = getStaticFeatureFlagsString(featureFlags)
val HERMES_V1_ENABLED: Boolean = getHermesV1Enabled()
val WORKLETS_PROFILING: Boolean = safeAppExtGet("enableWorkletsProfiling", false)?.toString()?.toBoolean() ?: false

// Set version for prefab
version = WORKLETS_VERSION

val workletsPrefabHeadersDir: File = project.file("${layout.buildDirectory.get().asFile.absolutePath}/prefab-headers/worklets")

val JS_RUNTIME: String = run {
    System.getenv("JS_RUNTIME")?.let { return@run it }

    val appProject = rootProject.allprojects.find { it.plugins.hasPlugin("com.android.application") }
    val appExt = appProject?.extensions?.extraProperties
    val hermesEnabled = (appExt?.properties?.get("hermesEnabled") as? String)?.toBoolean()
        ?: (appExt?.properties?.get("react") as? Map<*, *>)?.get("enableHermes")?.let { it.toString().toBoolean() }
        ?: false
    if (hermesEnabled) return@run "hermes"

    "jsc"
}

apply(plugin = "com.android.library")
apply(plugin = "maven-publish")
apply(plugin = "de.undercouch.download")

if (project == rootProject) {
    apply(plugin = "com.diffplug.spotless")
    configure<com.diffplug.gradle.spotless.SpotlessExtension> {
        kotlin {
            target("src/**/*.kt")
            ktlint()
        }
    }
} else {
    apply(plugin = "org.jetbrains.kotlin.android")
}

// fix-prefab: ensure prefab config tasks depend on native build
tasks.configureEach {
    val prefabConfigurePattern = Regex("^prefab(.+)ConfigurePackage$")
    val matchResult = prefabConfigurePattern.matchEntire(name)
    if (matchResult != null) {
        val variantName = matchResult.groupValues[1]
        outputs.upToDateWhen { false }
        dependsOn("externalNativeBuild$variantName")
    }
}

configure<com.android.build.gradle.LibraryExtension> {
    compileSdk = safeExtGet("compileSdkVersion", 36) as Int

    namespace = "com.swmansion.worklets"

    if (rootProject.hasProperty("ndkPath")) {
        ndkPath = rootProject.extensions.extraProperties.get("ndkPath") as String
    }
    if (rootProject.hasProperty("ndkVersion")) {
        ndkVersion = rootProject.extensions.extraProperties.get("ndkVersion") as String
    }

    buildFeatures {
        prefab = true
        prefabPublishing = true
        buildConfig = true
    }

    prefab {
        create("worklets") {
            headers = workletsPrefabHeadersDir.absolutePath
        }
    }

    defaultConfig {
        minSdk = safeExtGet("minSdkVersion", 24) as Int

        buildConfigField("boolean", "WORKLETS_PROFILING", WORKLETS_PROFILING.toString())
        buildConfigField("boolean", "IS_INTERNAL_BUILD", "false")
        buildConfigField("int", "EXOPACKAGE_FLAGS", "0")
        buildConfigField("int", "REACT_NATIVE_MINOR_VERSION", REACT_NATIVE_MINOR_VERSION.toString())

        externalNativeBuild {
            cmake {
                arguments(
                    "-DANDROID_STL=c++_shared",
                    "-DREACT_NATIVE_MINOR_VERSION=$REACT_NATIVE_MINOR_VERSION",
                    "-DANDROID_TOOLCHAIN=clang",
                    "-DREACT_NATIVE_DIR=${toPlatformFileString(reactNativeRootDir.path)}",
                    "-DJS_RUNTIME=$JS_RUNTIME",
                    "-DIS_REANIMATED_EXAMPLE_APP=$IS_REANIMATED_EXAMPLE_APP",
                    "-DWORKLETS_FETCH_PREVIEW_ENABLED=$FETCH_PREVIEW_ENABLED",
                    "-DWORKLETS_PROFILING=$WORKLETS_PROFILING",
                    "-DWORKLETS_VERSION=$WORKLETS_VERSION",
                    "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON",
                    "-DWORKLETS_FEATURE_FLAGS=$WORKLETS_FEATURE_FLAGS",
                    "-DHERMES_V1_ENABLED=$HERMES_V1_ENABLED"
                )
                abiFilters.addAll(reactNativeArchitectures())
                targets("worklets")
            }
        }

        consumerProguardFiles("proguard-rules.pro")
    }

    externalNativeBuild {
        cmake {
            this.version = System.getenv("CMAKE_VERSION") ?: "3.22.1"
            path = file("CMakeLists.txt")
        }
    }

    buildTypes {
        debug {
            externalNativeBuild {
                cmake {
                    if (JS_RUNTIME == "hermes") {
                        //  React Native doesn't expose these flags, but not having them
                        //  can lead to runtime errors due to ABI mismatches.
                        //  There's also
                        //    HERMESVM_PROFILER_OPCODE
                        //    HERMESVM_PROFILER_BB
                        //  which shouldn't be defined in standard setups.
                        arguments("-DHERMES_ENABLE_DEBUGGER=1")
                    }
                }
            }
            packaging {
                jniLibs {
                    keepDebugSymbols += "**/**/*.so"
                }
            }
        }
    }

    lint {
        abortOnError = false
    }

    packaging {
        resources {
            excludes += setOf(
                "META-INF",
                "META-INF/**",
            )
        }
        jniLibs {
            excludes += setOf(
                "**/libc++_shared.so",
                "**/libfbjni.so",
                "**/libjsi.so",
                "**/libhermes.so",
                "**/libhermesvm.so",
                "**/libhermestooling.so",
                "**/libreactnative.so",
                "**/libjscexecutor.so",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    sourceSets {
        getByName("main") {
            java {
                if (FETCH_PREVIEW_ENABLED) {
                    srcDir("src/networking")
                } else {
                    srcDir("src/no-networking")
                }
            }
        }
    }
}

if (project != rootProject) {
    tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }
}

tasks.withType<ExternalNativeBuildJsonTask>().configureEach {
    val compileTask = this
    val isExampleApp = IS_REANIMATED_EXAMPLE_APP
    val pkgDir = packageDir
    doLast {
        if (!isExampleApp) return@doLast
        // abi is internal in AGP so we access it via reflection
        try {
            val abiField = compileTask.javaClass.getDeclaredField("abi").also { it.isAccessible = true }
            val abi = abiField.get(compileTask) ?: return@doLast
            val cxxBuildFolder = abi.javaClass.getMethod("getCxxBuildFolder").invoke(abi) as? File ?: return@doLast
            val generated = File("$cxxBuildFolder/compile_commands.json")
            val output = File("$pkgDir/compile_commands.json")
            output.writeText(generated.readText())
            println("Generated clangd metadata.")
        } catch (e: Exception) {
            logger.warn("Failed to generate clangd metadata: ${e.message}")
        }
    }
}

val validateReactNativeVersionResult = providers.exec {
    workingDir(projectDir.path)
    commandLine("node", "./../scripts/validate-react-native-version.js", REACT_NATIVE_VERSION)
    isIgnoreExitValue = true
}

tasks.register("assertMinimalReactNativeVersionTask") {
    val result = validateReactNativeVersionResult
    doFirst {
        if (result.result.get().exitValue != 0) {
            throw GradleException(result.standardError.asText.get().trim())
        }
    }
}

tasks.named("preBuild") { dependsOn("assertMinimalReactNativeVersionTask") }

tasks.register("assertNewArchitectureEnabledTask") {
    val isNewArch = IS_NEW_ARCHITECTURE_ENABLED
    onlyIf { !isNewArch }
    doFirst {
        throw GradleException("[Worklets] Worklets require new architecture to be enabled. Please enable it by setting `newArchEnabled` to `true` in `gradle.properties`.")
    }
}

tasks.named("preBuild") { dependsOn("assertNewArchitectureEnabledTask") }

tasks.register<Copy>("prepareWorkletsHeadersForPrefabs") {
    from("$projectDir/src/main/cpp")
    from("$projectDir/../Common/cpp")
    include("worklets/**/*.h")
    into(workletsPrefabHeadersDir.absolutePath)
}

interface FSService {
    @get:Inject
    val fs: FileSystemOperations
}

tasks.register("cleanCMakeCache") {
    val fsProvider = project.objects.newInstance<FSService>()
    val cxxDir = file("${projectDir}/.cxx")
    doFirst {
        fsProvider.fs.delete {
            delete(cxxDir)
        }
    }
}

repositories {
    mavenCentral()
    google()
}

dependencies {
    "implementation"("com.facebook.yoga:proguard-annotations:1.19.0")
    "implementation"("androidx.transition:transition:1.6.0")
    "implementation"("androidx.core:core:1.15.0")
    "implementation"("com.facebook.react:react-android") // version substituted by RNGP
    "implementation"("androidx.core:core-ktx:1.17.0")
    if (JS_RUNTIME == "hermes") {
        "implementation"("com.facebook.react:hermes-android") // version substituted by RNGP
    }
}

tasks.named("preBuild") { dependsOn("prepareWorkletsHeadersForPrefabs") }

afterEvaluate {
    tasks.named("clean") {
        finalizedBy("cleanCMakeCache")
    }

    // fix-prefab: touch prefab_config.json to invalidate stale prefab caches
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
            (proj.extensions.getByType(com.android.build.gradle.AppExtension::class.java)).applicationVariants
        } catch (e: Exception) {
            (proj.extensions.getByType(com.android.build.gradle.LibraryExtension::class.java)).libraryVariants
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
