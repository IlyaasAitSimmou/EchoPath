import { useEffect, useState } from "react";
import { InteractionManager, StyleSheet, Text, View } from "react-native";
import CamVisualizer from "./components/CamVisualizer";
import ModelProvider from "./components/ModelProvider";

export default function CameraPage() {
  const [shouldWarmupModel, setShouldWarmupModel] = useState(false);

  useEffect(() => {
    const task = requestIdleCallback(() => {
      setShouldWarmupModel(true);
    });

    return () => {
      cancelIdleCallback(task);
    };
  }, []);

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>Camera Page</Text>
        <View style={styles.cameraContainer}>
          <CamVisualizer />
        </View>
      </View>

      {shouldWarmupModel ? (
        <View pointerEvents="none" style={styles.modelWarmupHost}>
          <ModelProvider>
            <View />
          </ModelProvider>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  modelWarmupHost: {
    position: "absolute",
    width: 0,
    height: 0,
    opacity: 0,
  },
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
