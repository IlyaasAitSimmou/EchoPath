import { StyleSheet, Text, View } from "react-native";
import { useTensorflowModel } from "react-native-fast-tflite";
import type { TensorflowPlugin } from "react-native-fast-tflite";

const MODELS = {
  yolo: require("assets/my-model.tflite"),
} as const;

export default function CameraPage() {
  const modelPlugins = Object.fromEntries(
    Object.entries(MODELS).map(([key, uri]) => [key, useTensorflowModel(uri)]),
  ) as Record<keyof typeof MODELS, TensorflowPlugin>;

  const errors = Object.entries(modelPlugins)
    .map(([_, p]) => (p.state === "error" ? p.error : null))
    .filter((e) => e !== null)
    .map((e) => `${e.name}: ${e.message}\n${e.cause}\n${e.stack}`);
  const loading = Object.entries(modelPlugins)
    .map(([key, p]) => (p.state === "loading" ? key : null))
    .filter((k) => k !== null);
  const loaded = Object.entries(modelPlugins)
    .map(([key, p]) => (p.state === "loaded" ? key : null))
    .filter((k) => k !== null);

  // Bail out if any errors or still loading:
  if (errors.length + loading.length > 0) {
    return (
      <View>
        <Text>Loading: {loading.join(", ")}</Text>
        <Text>Loaded: {loaded.join(", ")}</Text>
        <Text>Errors:</Text>
        {errors.map((e) => (
          <Text>{e}</Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera Page</Text>
      <Text style={styles.subtitle}>Blank for now</Text>
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
