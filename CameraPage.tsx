import { StyleSheet, Text, View } from "react-native";
import { useModels } from "./components/ModelContext";

export default function CameraPage() {
  const { models } = useModels();
  const yoloState = models.yolo.state;

  const modelStatusText =
    yoloState === "loaded"
      ? "YOLO model is ready."
      : yoloState === "loading"
        ? "Loading YOLO model..."
        : "Model failed to load. Check the error toast.";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera Page</Text>
      <Text style={styles.subtitle}>{modelStatusText}</Text>
    </View>
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
