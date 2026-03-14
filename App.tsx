import { StatusBar } from "expo-status-bar";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import CameraPage from "./CameraPage";

type AppCommand = "start navigation" | "stop navigation" | "repeat" | "help";

const COMMANDS: AppCommand[] = [
  "start navigation",
  "stop navigation",
  "repeat",
  "help",
];

export default function App() {
  const [activePage, setActivePage] = useState<"home" | "camera">("home");
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("-");
  const [navigationEnabled, setNavigationEnabled] = useState(false);
  const [lastGuidance, setLastGuidance] = useState(
    "Say 'help' to hear available commands.",
  );

  const spokenState = useMemo(() => {
    return navigationEnabled ? "Navigation is ON." : "Navigation is OFF.";
  }, [navigationEnabled]);

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { rate: 0.95, pitch: 1.0 });
  };

  const detectCommand = (transcript: string): AppCommand | null => {
    const normalized = transcript.toLowerCase().trim();
    for (const command of COMMANDS) {
      if (normalized.includes(command)) {
        return command;
      }
    }
    return null;
  };

  const applyCommand = (command: AppCommand) => {
    if (command === "start navigation") {
      setNavigationEnabled(true);
      setLastGuidance("Navigation started. Keep walking slowly.");
      speak("Navigation started. Keep walking slowly.");
      return;
    }

    if (command === "stop navigation") {
      setNavigationEnabled(false);
      setLastGuidance("Navigation stopped.");
      speak("Navigation stopped.");
      return;
    }

    if (command === "repeat") {
      speak(lastGuidance);
      return;
    }

    setLastGuidance(
      "Available commands: start navigation, stop navigation, repeat, help.",
    );
    speak(
      "Available commands: start navigation, stop navigation, repeat, help.",
    );
  };

  const requestPermissionsAndStart = async () => {
    const permission =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setLastGuidance("Microphone permission is required.");
      speak("Microphone permission is required.");
      return;
    }

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setLastGuidance("Speech recognition is not available on this device.");
      speak("Speech recognition is not available on this device.");
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: false,
      contextualStrings: COMMANDS,
    });
  };

  const toggleListening = async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    await requestPermissionsAndStart();
  };

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    setLastGuidance("Listening. Say a command.");
    speak("Listening.");
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    setLastGuidance(`Speech error: ${event.error}`);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (!transcript) {
      return;
    }

    setLastTranscript(transcript);
    if (!event.isFinal) {
      return;
    }

    const command = detectCommand(transcript);
    if (command) {
      applyCommand(command);
      return;
    }

    setLastGuidance("Command not recognized. Say help.");
    speak("Command not recognized. Say help.");
  });

  if (activePage === "camera") {
    return (
      <View style={styles.cameraScreen}>
        <View style={styles.cameraPageWrapper}>
          <CameraPage />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back to home page"
          onPress={() => setActivePage("home")}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.linkButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Navigation Control</Text>
      <Text style={styles.state}>{spokenState}</Text>
      <Text style={styles.label}>Last heard:</Text>
      <Text style={styles.value}>{lastTranscript}</Text>
      <Text style={styles.label}>Guidance:</Text>
      <Text style={styles.value}>{lastGuidance}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isListening ? "Stop listening" : "Start listening"}
        onPress={toggleListening}
        style={({ pressed }) => [
          styles.button,
          isListening ? styles.buttonStop : styles.buttonStart,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>
          {isListening ? "Stop Listening" : "Start Listening"}
        </Text>
      </Pressable>

      <Text style={styles.hint}>
        Commands: start navigation, stop navigation, repeat, help
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go to camera page"
        onPress={() => setActivePage("camera")}
        style={({ pressed }) => [
          styles.linkButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.linkButtonText}>Go to Camera Page</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  cameraPageWrapper: {
    flex: 1,
    width: "100%",
  },
  state: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    alignSelf: "flex-start",
  },
  value: {
    width: "100%",
    minHeight: 28,
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 220,
    alignItems: "center",
    marginTop: 8,
  },
  buttonStart: {
    backgroundColor: "#1B7F3A",
  },
  buttonStop: {
    backgroundColor: "#B42318",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    textAlign: "center",
    color: "#475467",
  },
  linkButton: {
    marginTop: 10,
    alignSelf: "center",
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#98A2B3",
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#344054",
  },
});
