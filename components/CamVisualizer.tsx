import { Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import {
  useCameraDevice,
  useCameraPermission,
  Camera,
} from "react-native-vision-camera";

export default function CamVisualizer() {
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();

  const handleRequestPermission = async () => {
    const didGrantPermission = await requestPermission();

    if (!didGrantPermission) {
      Toast.show({
        type: "error",
        position: "top",
        autoHide: false,
        swipeable: true,
        topOffset: 56,
        text1: "Camera permission required",
        text2:
          "Open your device settings and enable camera permission to use this feature.",
      });
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.title}>Camera access is off</Text>
        <Text style={styles.message}>
          Grant camera permission to preview the feed.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Allow camera access"
          onPress={handleRequestPermission}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.linkButtonText}>Allow camera access</Text>
        </Pressable>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.title}>No camera available</Text>
        <Text style={styles.message}>
          EchoPath could not find a usable back camera on this device.
        </Text>
      </View>
    );
  }

  return <Camera style={styles.camera} device={device} isActive={true} />;
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#101828",
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475467",
    textAlign: "center",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  linkButton: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#98A2B3",
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#344054",
  },
});
