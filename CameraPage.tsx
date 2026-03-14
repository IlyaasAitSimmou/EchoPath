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
          <CamVisualizer />
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
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#475467",
  },
});
