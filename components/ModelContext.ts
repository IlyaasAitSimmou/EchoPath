import { createContext, useContext } from "react";
import type { TensorflowPlugin } from "react-native-fast-tflite";

export type ModelKey = "yolo";

export type ModelError = {
  key: ModelKey;
  name: string;
  message: string;
};

export type ModelContextValue = {
  models: Record<ModelKey, TensorflowPlugin>;
  loading: ModelKey[];
  loaded: ModelKey[];
  errors: ModelError[];
  isLoading: boolean;
  hasErrors: boolean;
};

const ModelContext = createContext<ModelContextValue | null>(null);

export function useModels() {
  const context = useContext(ModelContext);
  if (context === null) {
    throw new Error("useModels must be used inside ModelProvider.");
  }
  return context;
}

export default ModelContext;
