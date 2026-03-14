import { useModels } from "./ModelContext";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { Frame } from "react-native-vision-camera";
import type { BBox } from "./types";

export function useYolo() {
  const models = useModels();
  const yolo = models?.models?.yolo;
  const { resize } = useResizePlugin();
  const hook = (frame: Frame) => {
    "worklet";

    if (!yolo || yolo.state !== "loaded") return [];
    const model = yolo.model;
    const resized = resize(frame, {
      scale: {
        width: 640,
        height: 640,
      },
      pixelFormat: "rgb",
      dataType: "float32",
    });
    const outputs = model.runSync([resized]);
    // TFLite returns a flat 1D array of 1800 elements (1 * 300 * 6)
    const outputArray = outputs[0] as Float32Array;

    const maxDetections = 300;
    const confThreshold = 0.1;

    const scaleX = frame.width / 640;
    const scaleY = frame.height / 640;

    const boxes: BBox[] = [];

    // Loop through the 300 possible detections
    for (let i = 0; i < maxDetections; i++) {
      const offset = i * 6;

      // Index 4 is the confidence score
      const score = outputArray[offset + 4];

      // Skip padded detections or low-confidence guesses
      if (score < confThreshold) continue;

      // Index 5 is the Class ID
      const classIndex = Math.round(outputArray[offset + 5]);

      // Indices 0-3 are the bounding box corners [x_min, y_min, x_max, y_max]
      // We multiply by the scale ratios to map them back to the original camera frame
      // const xMin = outputArray[offset + 0] * scaleX;
      // const yMin = outputArray[offset + 1] * scaleY;
      // const xMax = outputArray[offset + 2] * scaleX;
      // const yMax = outputArray[offset + 3] * scaleY;
      const xMin = outputArray[offset + 0] * frame.width;
      const yMin = outputArray[offset + 1] * frame.height;
      const xMax = outputArray[offset + 2] * frame.width;
      const yMax = outputArray[offset + 3] * frame.height;

      boxes.push({
        xMin,
        yMin,
        xMax,
        yMax,
        score,
        classIndex,
      });
    }

    // No NMS needed! The model already did the heavy lifting.
    return boxes;
  };
  return hook;
}
