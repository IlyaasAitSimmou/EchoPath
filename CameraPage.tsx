import { StyleSheet, Text, View } from "react-native";
import CamVisualizer from "./components/CamVisualizer";
import ModelProvider from "./components/ModelProvider";
import Toast from "react-native-toast-message";

export default function CameraPage() {
  return (
    <>
      <ModelProvider>
        <View style={styles.container}>
          <Text style={styles.title}>Camera Page</Text>
          <View style={styles.cameraContainer}>
            <CamVisualizer />
          </View>
        </View>
      </ModelProvider>
      <Toast />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  cameraContainer: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#101828",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#475467",
  },
});
