# Local Android Build & Testing Guide

This guide outlines the steps to run the mobile app on a local Android emulator and build an APK for testing on real devices.

## 1. Set Environment Variables
Your system needs to know where the Android SDK is located. Run this in your terminal (only needed once per machine):

```bash
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.bashrc
source ~/.bashrc
```

## 2. Start the Emulator
Launch your existing Pixel 9 emulator in the background:

```bash
~/Android/Sdk/emulator/emulator -avd Pixel_9 &
```

*Wait about 30 seconds for it to fully boot up.*
To verify it's running, run `adb devices`. You should see `emulator-5554 device` listed.

## 3. Run on the Emulator (Development Mode)
Once the emulator is running, run this command from the `mobile-app` folder. This will automatically generate the `android/` native project folder and install the development version on your emulator.

```bash
cd mobile-app
npx expo run:android
```

## 4. Build a Shareable Test APK
If you want an `.apk` file that you can send to your phone or share with others for testing, you need to build a "Debug APK".

**Important:** You must run Step 3 (`npx expo run:android`) at least once before doing this, because that step creates the `android/` folder.

```bash
cd mobile-app/android
./gradlew assembleDebug
```

Once the build finishes, your APK will be located here:
`mobile-app/android/app/build/outputs/apk/debug/app-debug.apk`

### Installing the APK to a connected device via USB:
Make sure your phone is plugged in with USB Debugging enabled, then run:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Troubleshooting Common Build Issues (React Native / Gradle)

Unlike Flutter, React Native (especially on the New Architecture) compiles its C++ bridge and TurboModules directly on your host machine. This requires strict dependencies (like specific Java versions and the Android NDK).

If your `npx expo run:android` build hangs or fails, follow these steps to resolve the most common issues:

### Issue A: Build hangs at `0% INITIALIZING` (Foojay Toolchain Download)
**Symptom:** Gradle gets permanently stuck trying to download a Java toolchain from `api.foojay.io`.
**Cause:** React Native strictly requires Java 17. If you have Java 21 (or another version) as your default, Gradle attempts to download Java 17 automatically but fails due to network timeouts.
**Solution:** 
1. Install Java 17 manually:
   ```bash
   sudo apt-get update && sudo apt-get install -y openjdk-17-jdk
   ```
2. Open `mobile-app/android/gradle.properties` and add this "cheat code" to explicitly bypass the auto-download:
   ```properties
   org.gradle.java.installations.auto-download=false
   org.gradle.java.home=/usr/lib/jvm/java-17-openjdk-amd64
   ```
3. Kill any stuck Gradle daemons and retry:
   ```bash
   cd mobile-app/android
   ./gradlew --stop
   pkill -f 'gradle'
   ```

### Issue B: Build hangs at `Resolve files of configuration...`
**Symptom:** The build hangs during the configuration phase while downloading Kotlin or Gradle plugins.
**Cause:** Maven default requests try to use IPv6, which can silently drop packets on some routers. Alternatively, Gradle's parallel execution causes a deadlock.
**Solution:**
Add these lines to `mobile-app/android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Djava.net.preferIPv4Stack=true
org.gradle.parallel=false
```

### Issue C: SocketException / Connection Reset when downloading SDK components (NDK or Build-Tools)
**Symptom:** Gradle fails with `java.net.SocketException: Connection reset` when trying to download `Install NDK (Side by side)` or `Android SDK Build-Tools`.
**Cause:** Gradle handles large downloads poorly over unstable connections. The Android NDK is a ~1.5GB dependency required for React Native's C++ compilation.
**Solution:** 
Cancel the hanging build (`Ctrl+C`) and use the official Android `sdkmanager` to download the specific failing package manually. 

For the NDK:
```bash
~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager "ndk;27.1.12297006"
```

For the Build-Tools:
```bash
~/Android/Sdk/cmdline-tools/latest/bin/sdkmanager "build-tools;36.0.0"
```
*(Check your build logs for the exact version numbers it requires).*
Once installed, run `npx expo run:android` again and Gradle will instantly skip the download.
