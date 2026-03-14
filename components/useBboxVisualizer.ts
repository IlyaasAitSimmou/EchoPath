import { useMemo } from "react";
import { Skia, PaintStyle, SkFont } from "@shopify/react-native-skia";
import { DrawableFrame } from "react-native-vision-camera";
import type { BBox } from "./types";
import { COCO_CLASSES } from "./const";

export function useBboxVisualizer(font: SkFont | null) {
  let previousTimestamp = 0;
  let smoothedFps = 0;

  // 1. Initialize Skia Paint objects once for performance
  const boxPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(3);
    paint.setColor(Skia.Color("lime")); // Classic YOLO Green
    return paint;
  }, []);

  const labelBgPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setStyle(PaintStyle.Fill);
    paint.setColor(Skia.Color("lime"));
    return paint;
  }, []);

  const textPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("black"));
    return paint;
  }, []);

  const hudBgPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setStyle(PaintStyle.Fill);
    paint.setColor(Skia.Color("#101828CC"));
    return paint;
  }, []);

  const hudTextPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("#F9FAFB"));
    return paint;
  }, []);

  // 2. Return the drawing function
  const drawDetections = (frame: DrawableFrame, detections: BBox[]) => {
    "worklet"; // CRITICAL: This allows the function to run on the frame processor thread

    const detectionCount = detections.length;

    const deltaTimestamp = frame.timestamp - previousTimestamp;
    if (previousTimestamp !== 0 && deltaTimestamp > 0) {
      let instantFps = 0;

      // Handle timestamp units (s, ms, µs, ns) across platforms.
      if (deltaTimestamp > 1_000_000) {
        instantFps = 1_000_000_000 / deltaTimestamp;
      } else if (deltaTimestamp > 1_000) {
        instantFps = 1_000_000 / deltaTimestamp;
      } else if (deltaTimestamp > 1) {
        instantFps = 1_000 / deltaTimestamp;
      } else {
        instantFps = 1 / deltaTimestamp;
      }

      // Exponential smoothing to reduce jitter.
      smoothedFps =
        smoothedFps === 0 ? instantFps : smoothedFps * 0.9 + instantFps * 0.1;
    }
    previousTimestamp = frame.timestamp;
    for (const box of detections) {
      const { xMin, yMin, xMax, yMax, score, classIndex } = box;
      const width = xMax - xMin;
      const height = yMax - yMin;

      // Draw the bounding box
      const rect = Skia.XYWHRect(xMin, yMin, width, height);
      frame.drawRect(rect, boxPaint);

      // Handle Label Resolution (Fallback to number if missing)
      // Note: In worklets, accessing external dictionaries can sometimes require
      // passing them via runOnJS or ensuring they are parsed as worklet variables.
      const className =
        classIndex in COCO_CLASSES
          ? COCO_CLASSES[classIndex as keyof typeof COCO_CLASSES]
          : `Class ${classIndex}`;
      const labelText = `${className} ${Math.round(score * 100)}%`;

      // Draw the label text and background (Only if font is loaded)
      if (font) {
        const textRect = font.measureText(labelText);
        const textWidth = textRect.width;
        const textHeight = textRect.height;

        // Background rectangle for text readability
        const bgRect = Skia.XYWHRect(
          xMin,
          yMin - textHeight - 8,
          textWidth + 8,
          textHeight + 8,
        );
        frame.drawRect(bgRect, labelBgPaint);

        // Draw the actual text
        frame.drawText(labelText, xMin + 4, yMin - 4, textPaint, font);
      }
    }

    if (!font) {
      return;
    }

    const fpsText = smoothedFps > 0 ? `${smoothedFps.toFixed(1)}` : "--";
    const hudText = `FPS: ${fpsText}  Detections: ${detectionCount}`;
    const hudMetrics = font.measureText(hudText);
    const paddingX = 8;
    const paddingY = 6;
    const margin = 8;
    const hudWidth = hudMetrics.width + paddingX * 2;
    const hudHeight = hudMetrics.height + paddingY * 2;
    const hudX = Math.max(margin, frame.width - hudWidth - margin);
    const hudY = margin;

    frame.drawRect(Skia.XYWHRect(hudX, hudY, hudWidth, hudHeight), hudBgPaint);
    frame.drawText(
      hudText,
      hudX + paddingX,
      hudY + hudHeight - paddingY,
      hudTextPaint,
      font,
    );
  };

  return drawDetections;
}
