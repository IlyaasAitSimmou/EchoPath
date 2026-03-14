import { type PropsWithChildren, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useTensorflowModel } from "react-native-fast-tflite";
import Toast, {
  BaseToast,
  ErrorToast,
  type ToastConfig,
} from "react-native-toast-message";
import ModelContext, {
  type ModelContextValue,
  type ModelKey,
} from "./ModelContext";

const MODEL_SOURCES = {
  yolo: require("./assets/models/yolo26l_float32.tflite"),
} as const;

export default function ModelProvider({ children }: PropsWithChildren) {
  const hasShownReadyToastRef = useRef(false);

  const yolo = useTensorflowModel(MODEL_SOURCES.yolo);

  const contextValue = useMemo<ModelContextValue>(() => {
    const models = { yolo };
    const entries = Object.entries(models) as [ModelKey, typeof yolo][];

    const loading = entries
      .filter(([, plugin]) => plugin.state === "loading")
      .map(([key]) => key);

    const loaded = entries
      .filter(([, plugin]) => plugin.state === "loaded")
      .map(([key]) => key);

    const errors = entries.flatMap(([key, plugin]) => {
      if (plugin.state !== "error") {
        return [];
      }

      return [
        {
          key,
          name: plugin.error.name,
          message: plugin.error.message,
        },
      ];
    });

    return {
      models,
      loading,
      loaded,
      errors,
      isLoading: loading.length > 0,
      hasErrors: errors.length > 0,
    };
  }, [yolo]);

  const errorFingerprint = contextValue.errors
    .map((error) => `${error.key}:${error.name}:${error.message}`)
    .join("|");
  const loadingLabel = contextValue.loading.join(", ");

  const toastConfig = useMemo<ToastConfig>(
    () => ({
      modelLoading: ({ text1, text2 }) => (
        <BaseToast
          text1={text1}
          text2={text2}
          text1NumberOfLines={1}
          text2NumberOfLines={2}
          style={styles.loadingToast}
          contentContainerStyle={styles.toastContentContainer}
          text1Style={styles.toastTitle}
          text2Style={styles.toastMessage}
        />
      ),
      modelError: ({ text1, text2 }) => (
        <ErrorToast
          text1={text1}
          text2={text2}
          text1NumberOfLines={1}
          text2NumberOfLines={6}
          style={styles.errorToast}
          contentContainerStyle={styles.toastContentContainer}
          text1Style={styles.toastTitle}
          text2Style={styles.toastMessage}
        />
      ),
      modelReady: ({ text1, text2 }) => (
        <BaseToast
          text1={text1}
          text2={text2}
          text1NumberOfLines={1}
          text2NumberOfLines={1}
          style={styles.successToast}
          contentContainerStyle={styles.toastContentContainer}
          text1Style={styles.toastTitle}
          text2Style={styles.toastMessage}
        />
      ),
    }),
    [],
  );

  useEffect(() => {
    if (contextValue.hasErrors) {
      hasShownReadyToastRef.current = false;

      Toast.show({
        type: "modelError",
        position: "top",
        autoHide: false,
        swipeable: true,
        topOffset: 56,
        text1: "Model load error",
        text2: contextValue.errors
          .map((error) => `${error.key}: ${error.name} - ${error.message}`)
          .join("\n"),
      });
      return;
    }

    if (contextValue.isLoading) {
      hasShownReadyToastRef.current = false;

      Toast.show({
        type: "modelLoading",
        position: "top",
        autoHide: false,
        swipeable: false,
        topOffset: 56,
        text1: "Preparing AI models",
        text2: `Loading: ${loadingLabel}`,
      });
      return;
    }

    if (!hasShownReadyToastRef.current && contextValue.loaded.length > 0) {
      hasShownReadyToastRef.current = true;

      Toast.show({
        type: "modelReady",
        position: "top",
        autoHide: true,
        visibilityTime: 1800,
        topOffset: 56,
        text1: "Models ready",
        text2: `Loaded: ${contextValue.loaded.join(", ")}`,
      });
      return;
    }

    Toast.hide();
  }, [
    contextValue.errors,
    contextValue.hasErrors,
    contextValue.isLoading,
    contextValue.loaded,
    errorFingerprint,
    loadingLabel,
  ]);

  useEffect(() => {
    return () => {
      Toast.hide();
    };
  }, []);

  return (
    <ModelContext.Provider value={contextValue}>
      <View style={styles.root}>
        {children}
        <Toast config={toastConfig} />
      </View>
    </ModelContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toastContentContainer: {
    paddingHorizontal: 10,
  },
  loadingToast: {
    borderLeftColor: "#1570EF",
    borderWidth: 1,
    borderColor: "#B2DDFF",
    backgroundColor: "#EFF8FF",
    minHeight: 64,
  },
  errorToast: {
    borderLeftColor: "#D92D20",
    borderWidth: 1,
    borderColor: "#FECDCA",
    backgroundColor: "#FEF3F2",
    minHeight: 76,
  },
  successToast: {
    borderLeftColor: "#1B7F3A",
    borderWidth: 1,
    borderColor: "#ABEFC6",
    backgroundColor: "#ECFDF3",
    minHeight: 64,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#101828",
  },
  toastMessage: {
    fontSize: 12,
    lineHeight: 16,
    color: "#344054",
  },
});
