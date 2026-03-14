module.exports = {
  expo: {
    name: "vision-nav-app",
    slug: "vision-nav-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSSpeechRecognitionUsageDescription:
          "Allow $(PRODUCT_NAME) to use speech recognition for voice control.",
        NSMicrophoneUsageDescription:
          "Allow $(PRODUCT_NAME) to use the microphone for voice control.",
        NSLocationWhenInUseUsageDescription:
          "Allow $(PRODUCT_NAME) to access your location for walking directions."
      },
      bundleIdentifier: "com.ilyaseen.vision-nav-app",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION"
      ],
      package: "com.ilyaseen.visionnavapp",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "expo-speech-recognition",
        {
          microphonePermission:
            "Allow $(PRODUCT_NAME) to use the microphone for voice control.",
          speechRecognitionPermission:
            "Allow $(PRODUCT_NAME) to use speech recognition for voice control.",
          androidSpeechServicePackages: ["com.google.android.googlequicksearchbox"],
        },
      ],
      [
        "react-native-fast-tflite",
        {
          enableCoreMLDelegate: true,
          enableAndroidGpuLibraries: true,
        },
      ],
      [
        "react-native-vision-camera",
        {
          cameraPermissionText: "$(PRODUCT_NAME) needs access to your Camera.",
          // optionally, if you want to record audio:
          // enableMicrophonePermission: true,
          // microphonePermissionText:
          //   "$(PRODUCT_NAME) needs access to your Microphone.",
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "f7693cb5-c4dd-4cb5-84ba-e8506469a5ab",
      },
    },
  },
};