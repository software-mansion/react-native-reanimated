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

fun isNewArchitectureEnabled(): Boolean {
    if (getReactNativeMinorVersion() >= 82) return true
    return project.hasProperty("newArchEnabled") && project.property("newArchEnabled") == "true"
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

    throw GradleException("[Reanimated] Unable to resolve react-native location in node_modules. You should set project extension property (in `app/build.gradle`) named `REACT_NATIVE_NODE_MODULES_DIR` with the path to react-native in node_modules.")
}

fun resolveReactNativeWorkletsDirectory(): File {
    val reactNativeWorkletsLocation = safeAppExtGet("REACT_NATIVE_WORKLETS_NODE_MODULES_DIR", null) as String?
    if (reactNativeWorkletsLocation != null) return file(reactNativeWorkletsLocation)

    val reactNativeWorkletsPackage = file(
        providers.exec {
            workingDir(rootDir)
            commandLine("node", "--print", "require.resolve('react-native-worklets/package.json')")
        }.standardOutput.asText.get().trim()
    )
    if (reactNativeWorkletsPackage.exists()) return reactNativeWorkletsPackage.parentFile

    throw GradleException("[Reanimated] Unable to resolve react-native-worklets location in node_modules. You should set project extension property (in `app/build.gradle`) named `REACT_NATIVE_WORKLETS_NODE_MODULES_DIR` with the path to react-native-worklets in node_modules.")
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

@Suppress("UNCHECKED_CAST")
fun getReanimatedVersion(): String {
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
fun getReanimatedStaticFeatureFlags(): String {
    val featureFlags = HashMap<String, String>()

    val staticFeatureFlagsFile = file("${projectDir.path}/../src/featureFlags/staticFlags.json")
    if (!staticFeatureFlagsFile.exists()) {
        throw GradleException("[Reanimated] Feature flags file not found at ${staticFeatureFlagsFile.absolutePath}.")
    }
    (JsonSlurper().parseText(staticFeatureFlagsFile.readText()) as Map<String, Any>).forEach { (key, value) ->
        featureFlags[key] = value.toString()
    }

    val packageJsonFile = file("${rootDir.path}/../package.json")
    if (packageJsonFile.exists()) {
        val packageJson = JsonSlurper().parseText(packageJsonFile.readText()) as Map<String, Any?>
        (packageJson["reanimated"] as? Map<String, Any?>)
            ?.get("staticFeatureFlags")
            ?.let { it as Map<String, Any?> }
            ?.forEach { (key, value) -> featureFlags[key] = value.toString() }
    }

    return featureFlags.entries.joinToString("") { (key, value) -> "[$key:$value]" }
}

fun reactNativeArchitectures(): List<String> {
    val value = project.findProperty("reactNativeArchitectures") as String?
    return value?.split(",") ?: listOf("armeabi-v7a", "x86", "x86_64", "arm64-v8a")
}

if (isNewArchitectureEnabled() && project != rootProject) {
    apply(plugin = "com.facebook.react")
}

val packageDir: File = project.projectDir.parentFile
val reactNativeRootDir: File = resolveReactNativeDirectory()
val reactNativeWorkletsRootDir: File = resolveReactNativeWorkletsDirectory()
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

if (project == rootProject) {
    apply(plugin = "com.diffplug.spotless")
    configure<com.diffplug.gradle.spotless.SpotlessExtension> {
        kotlin {
            target("src/**/*.kt")
            ktlint()
        }
    }
}

apply(plugin = "com.android.library")
apply(plugin = "maven-publish")
apply(plugin = "de.undercouch.download")

if (project != rootProject) {
    apply(plugin = "org.jetbrains.kotlin.android")
}

configure<com.android.build.gradle.LibraryExtension> {
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

        buildConfigField("boolean", "REANIMATED_PROFILING", REANIMATED_PROFILING.toString())
        buildConfigField("String", "REANIMATED_VERSION_JAVA", "\"$REANIMATED_VERSION\"")
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

    buildTypes {
        debug {
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
                "**/libworklets.so",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
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
            throw GradleException("[Reanimated] `react-native-worklets` library not found. Please install it as a dependency in your project. Install `react-native-worklets` with your package manager, i.e. `yarn add react-native-worklets` or `npm i react-native-worklets`. Read the documentation for more details: https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting#unable-to-find-a-specification-for-rnworklets-depended-upon-by-rnreanimated")
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
