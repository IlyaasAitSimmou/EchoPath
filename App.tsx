import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";
import CameraPage from "./CameraPage";
import { modelToastConfig } from "./components/ModelProvider";
import VoiceControlPage from "./VoiceControlPage";

export default function App() {
  const [activePage, setActivePage] = useState<"voice" | "camera">("voice");
  const showingCamera = activePage === "camera";

  return (
    <>
      {showingCamera ? <CameraPage /> : <VoiceControlPage />}

      <View pointerEvents="box-none" style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showingCamera ? "Go back to voice controls" : "Go to camera page"
          }
          onPress={() => setActivePage(showingCamera ? "voice" : "camera")}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.linkButtonText}>
            {showingCamera ? "Back to Voice Controls" : "Go to Camera Page"}
          </Text>
        </Pressable>
      </View>

      <Toast config={modelToastConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: "center",
  },
  linkButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#98A2B3",
    backgroundColor: "#FFFFFF",
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#344054",
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
