import com.android.build.gradle.tasks.ExternalNativeBuildJsonTask
import groovy.json.JsonSlurper
import org.apache.tools.ant.taskdefs.condition.Os
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.dsl.KotlinVersion
import java.util.Properties
import javax.inject.Inject

plugins {
    id("com.android.library")
    id("maven-publish")
    id("com.diffplug.spotless") version "8.4.0"
    id("org.jetbrains.kotlin.android")
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

fun isNewArchitectureEnabled(): Boolean {
    // In React Native 0.82+, users can no longer opt-out of the New Architecture.
    if (getReactNativeMinorVersion() >= 82) {
        return true
    }

    // In older versions, to opt-in for the New Architecture, you can either:
    // - Set `newArchEnabled` to true inside the `gradle.properties` file
    // - Invoke gradle with `-newArchEnabled=true`
    // - Set an environment variable `ORG_GRADLE_PROJECT_newArchEnabled=true`
    return project.hasProperty("newArchEnabled") && project.property("newArchEnabled") == "true"
}

fun resolveReactNativeDirectory(): File {
    val reactNativeLocation = safeAppExtGet("REACT_NATIVE_NODE_MODULES_DIR", null) as String?
    if (reactNativeLocation != null) {
        return file(reactNativeLocation)
    }

    // Fallback to node resolver for custom directory structures like monorepos.
    val reactNativePackage = file(
        providers.exec {
            workingDir(rootDir)
            commandLine("node", "--print", "require.resolve('react-native/package.json')")
        }.standardOutput.asText.get().trim()
    )
    if (reactNativePackage.exists()) {
        return reactNativePackage.parentFile
    }

    throw GradleException(
        "[Reanimated] Unable to resolve react-native location in node_modules. You should set project extension property (in `app/build.gradle`) named `REACT_NATIVE_NODE_MODULES_DIR` with the path to react-native in node_modules."
    )
}

fun getReactNativeVersion(): String {
    val reactNativeRootDir = resolveReactNativeDirectory()
    val reactProperties = Properties()
    file("$reactNativeRootDir/ReactAndroid/gradle.properties").inputStream().use { reactProperties.load(it) }
    return reactProperties.getProperty("VERSION_NAME")
}

fun getReactNativeMinorVersion(): Int {
    val reactNativeVersion = getReactNativeVersion()
    return if (reactNativeVersion.startsWith("0.0.0-")) 1000 else reactNativeVersion.split(".")[1].toInt()
}

fun getReanimatedVersion(): String {
    val inputFile = file("${projectDir.path}/../package.json")
    val json = JsonSlurper().parseText(inputFile.readText()) as Map<*, *>
    return json["version"]?.toString() ?: throw GradleException("[Reanimated] Cannot find version in package.json")
}

fun toPlatformFileString(path: String): String {
    var result = path
    if (Os.isFamily(Os.FAMILY_WINDOWS)) {
        result = result.replace(File.separatorChar, '/')
    }
    return result
}

fun getReanimatedStaticFeatureFlags(): String {
    val featureFlags = HashMap<String, String>()

    val staticFeatureFlagsFile = file("${projectDir.path}/../src/featureFlags/staticFlags.json")
    if (!staticFeatureFlagsFile.exists()) {
        throw GradleException("[Reanimated] Feature flags file not found at ${staticFeatureFlagsFile.absolutePath}.")
    }
    (JsonSlurper().parseText(staticFeatureFlagsFile.readText()) as Map<*, *>).forEach { (key, value) ->
        featureFlags[key.toString()] = value.toString()
    }

    val packageJsonFile = file("${rootDir.path}/../package.json")
    if (packageJsonFile.exists()) {
        val packageJson = JsonSlurper().parseText(packageJsonFile.readText()) as Map<*, *>
        (packageJson["reanimated"] as? Map<*, *>)
            ?.get("staticFeatureFlags")
            ?.let { it as? Map<*, *> }
            ?.forEach { (key, value) -> featureFlags[key.toString()] = value.toString() }
    }

    validateConflictingFeatureFlags(featureFlags)

    return featureFlags.entries.joinToString("") { (key, value) -> "[$key:$value]" }
}

fun validateConflictingFeatureFlags(featureFlags: HashMap<String, String>) {
    val androidSyncUiProps = featureFlags["ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS"] == "true"
    val sharedElementTransitions = featureFlags["ENABLE_SHARED_ELEMENT_TRANSITIONS"] == "true"

    if (androidSyncUiProps && sharedElementTransitions) {
        throw GradleException(
            "[Reanimated] The feature flags `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` and `ENABLE_SHARED_ELEMENT_TRANSITIONS` cannot be enabled simultaneously. Please disable one of them in your package.json."
        )
    }
}

if (isNewArchitectureEnabled() && project != rootProject) {
    apply(plugin = "com.facebook.react")
}

val packageDir: File = project.projectDir.parentFile
val reactNativeRootDir: File = resolveReactNativeDirectory()
val REACT_NATIVE_MINOR_VERSION: Int = getReactNativeMinorVersion()
val REACT_NATIVE_VERSION: String = getReactNativeVersion()
val REANIMATED_VERSION: String = getReanimatedVersion()
val IS_NEW_ARCHITECTURE_ENABLED: Boolean = isNewArchitectureEnabled()
val IS_REANIMATED_EXAMPLE_APP: Boolean = safeAppExtGet("isReanimatedExampleApp", false)?.toString()?.toBoolean() ?: false
val REANIMATED_PROFILING: Boolean = safeAppExtGet("enableReanimatedProfiling", false)?.toString()?.toBoolean() ?: false
val REANIMATED_FEATURE_FLAGS: String = getReanimatedStaticFeatureFlags()

// Set version for prefab
version = REANIMATED_VERSION

val reanimatedPrefabHeadersDir: File = project.file("${layout.buildDirectory.get().asFile.absolutePath}/prefab-headers/reanimated")

fun reactNativeArchitectures(): List<String> {
    val value = project.findProperty("reactNativeArchitectures") as String?
    return value?.split(",") ?: listOf("armeabi-v7a", "x86", "x86_64", "arm64-v8a")
}

if (project == rootProject) {
    spotless {
        kotlin {
            target("src/**/*.kt")
            ktlint()
        }
    }
}

android {
    compileSdk = safeExtGet("compileSdkVersion", 36) as Int

    namespace = "com.swmansion.reanimated"

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
        create("reanimated") {
            headers = reanimatedPrefabHeadersDir.absolutePath
        }
    }

    defaultConfig {
        minSdk = safeExtGet("minSdkVersion", 24) as Int
        testOptions.targetSdk = safeExtGet("targetSdkVersion", 36) as Int
        lint.targetSdk = safeExtGet("targetSdkVersion", 36) as Int

        buildConfigField("boolean", "REANIMATED_PROFILING", REANIMATED_PROFILING.toString())
        buildConfigField("String", "REANIMATED_VERSION_JAVA", "\"$REANIMATED_VERSION\"")
        buildConfigField("boolean", "IS_INTERNAL_BUILD", "false")
        buildConfigField("int", "EXOPACKAGE_FLAGS", "0")
        buildConfigField("int", "REACT_NATIVE_MINOR_VERSION", REACT_NATIVE_MINOR_VERSION.toString())

        @Suppress("UnstableApiUsage")
        externalNativeBuild {
            cmake {
                arguments(
                    "-DANDROID_STL=c++_shared",
                    "-DREACT_NATIVE_MINOR_VERSION=$REACT_NATIVE_MINOR_VERSION",
                    "-DANDROID_TOOLCHAIN=clang",
                    "-DREACT_NATIVE_DIR=${toPlatformFileString(reactNativeRootDir.path)}",
                    "-DIS_REANIMATED_EXAMPLE_APP=$IS_REANIMATED_EXAMPLE_APP",
                    "-DREANIMATED_PROFILING=$REANIMATED_PROFILING",
                    "-DREANIMATED_VERSION=$REANIMATED_VERSION",
                    "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON",
                    "-DREANIMATED_FEATURE_FLAGS=$REANIMATED_FEATURE_FLAGS"
                )
                abiFilters.addAll(reactNativeArchitectures())
                targets("reanimated")
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

    lint {
        abortOnError = false
    }

    packaging {
        // For some reason gradle only complains about the duplicated version of librrc_root and libreact_render libraries
        // while there are more libraries copied in intermediates folder of the lib build directory, we exclude
        // only the ones that make the build fail (ideally we should only include libreanimated but we
        // are only allowed to specify exclude patterns)
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
                "**/libworklets.so",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    project.tasks.withType<ExternalNativeBuildJsonTask>().configureEach {
        val compileTask = this
        val isExampleApp = IS_REANIMATED_EXAMPLE_APP
        val pkgDir = packageDir
        doLast {
            if (!isExampleApp) {
                return@doLast
            }
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
}

if (project != rootProject) {
    kotlin {
        compilerOptions {
            jvmTarget = JvmTarget.fromTarget("17")
        }
    }
}

androidComponents {
    onVariants(selector().withBuildType("debug")) {
        it.packaging.jniLibs.keepDebugSymbols.add("**/**/*.so")
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
        throw GradleException("[Reanimated] Reanimated requires new architecture to be enabled. Please enable it by setting `newArchEnabled` to `true` in `gradle.properties`.")
    }
}

tasks.named("preBuild") { dependsOn("assertNewArchitectureEnabledTask") }

val validateWorkletsBuildResult = providers.exec {
    workingDir(projectDir.path)
    commandLine("node", "./../scripts/validate-worklets-build.js")
    isIgnoreExitValue = true
}

tasks.register("assertWorkletsVersionTask") {
    val result = validateWorkletsBuildResult
    doFirst {
        if (result.result.get().exitValue != 0) {
            throw GradleException(result.standardError.asText.get().trim())
        }
    }
}

tasks.named("preBuild") { dependsOn("assertWorkletsVersionTask") }

tasks.register<Copy>("prepareReanimatedHeadersForPrefabs") {
    from("$projectDir/src/main/cpp")
    from("$projectDir/../Common/cpp")
    include("reanimated/**/*.h")
    into(reanimatedPrefabHeadersDir)
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
    "implementation"("androidx.core:core-ktx:1.18.0")

    if (project == rootProject) {
        // This is needed for linting in Reanimated's repo.
    } else {
        if (rootProject.subprojects.find { it.name == "react-native-worklets" } != null) {
            "implementation"(project(":react-native-worklets"))
        } else {
            throw GradleException(
                "[Reanimated] `react-native-worklets` library not found. Please install it as a dependency in your project. Install `react-native-worklets` with your package manager, i.e. `yarn add react-native-worklets` or `npm i react-native-worklets`. Read the documentation for more details: https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#unable-to-find-a-specification-for-rnworklets-depended-upon-by-rnreanimated"
            )
        }
    }
}

tasks.named("preBuild") { dependsOn("prepareReanimatedHeadersForPrefabs") }

if (project != rootProject) {
    evaluationDependsOn(":react-native-worklets")

    afterEvaluate {
        tasks.named("externalNativeBuildDebug").configure {
            dependsOn(findProject(":react-native-worklets")!!.tasks.named("externalNativeBuildDebug"))
        }
        tasks.named("externalNativeBuildRelease").configure {
            dependsOn(findProject(":react-native-worklets")!!.tasks.named("externalNativeBuildRelease"))
        }
        tasks.named("clean") {
            finalizedBy("cleanCMakeCache")
        }
    }
}
