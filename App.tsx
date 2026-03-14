import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import CameraPage from "./CameraPage";

type AppCommand = "start navigation" | "stop navigation" | "repeat" | "help";

type LatLon = {
  latitude: number;
  longitude: number;
};

type Destination = LatLon & {
  name: string;
};

type RouteStep = {
  instruction: string;
  distanceMeters: number;
  location: LatLon;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type PhotonResult = {
  features?: Array<{
    properties?: {
      name?: string;
      city?: string;
      state?: string;
      country?: string;
    };
    geometry?: {
      coordinates?: [number, number];
    };
  }>;
};

type OsrmResponse = {
  code: string;
  routes?: Array<{
    legs: Array<{
      steps: Array<{
        distance: number;
        name: string;
        maneuver: {
          type: string;
          modifier?: string;
          location: [number, number];
        };
      }>;
    }>;
  }>;
};

const COMMANDS: AppCommand[] = [
  "start navigation",
  "stop navigation",
  "repeat",
  "help",
];

const DESTINATION_COMMAND_PREFIXES = [
  "set destination to",
  "navigate to",
  "go to",
  "take me to",
];

export default function App() {
  const [activePage, setActivePage] = useState<"home" | "camera">("home");
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("-");
  const [navigationEnabled, setNavigationEnabled] = useState(false);
  const [lastGuidance, setLastGuidance] = useState(
    "Say 'help' to hear available commands."
  );
  const [destinationQuery, setDestinationQuery] = useState("");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LatLon | null>(null);
  const [currentLocationAccuracyMeters, setCurrentLocationAccuracyMeters] = useState<number | null>(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRouting, setIsRouting] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const passiveLocationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const lastStepSpokenRef = useRef<number>(-1);
  const routeStepsRef = useRef<RouteStep[]>([]);
  const currentStepIndexRef = useRef(0);
  const navigationEnabledRef = useRef(false);

  const spokenState = useMemo(() => {
    return navigationEnabled ? "Navigation is ON." : "Navigation is OFF.";
  }, [navigationEnabled]);

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { rate: 0.95, pitch: 1.0 });
  };

  const formatDistance = (distanceMeters: number): string => {
    if (distanceMeters < 10) {
      return "now";
    }
    if (distanceMeters < 1000) {
      return `${Math.round(distanceMeters)} meters`;
    }
    return `${(distanceMeters / 1000).toFixed(1)} kilometers`;
  };

  const getInstruction = (
    type: string,
    modifier: string | undefined,
    roadName: string,
    distanceMeters: number
  ): string => {
    const roadPart = roadName ? ` onto ${roadName}` : "";
    const modifierText = modifier ? ` ${modifier}` : "";
    const distancePart = formatDistance(distanceMeters);

    if (type === "arrive") {
      return "You have arrived.";
    }
    if (type === "depart") {
      return `Start and go ${modifier ?? "straight"}${roadPart}.`;
    }
    if (type === "turn") {
      return `In ${distancePart}, turn${modifierText}${roadPart}.`;
    }
    if (type === "new name" || type === "continue") {
      return `Continue ${modifier ?? "straight"}${roadPart}.`;
    }
    if (type === "roundabout") {
      return `In ${distancePart}, take the roundabout${roadPart}.`;
    }
    return `In ${distancePart}, keep moving${roadPart}.`;
  };

  const distanceMetersBetween = (from: LatLon, to: LatLon): number => {
    const earthRadiusMeters = 6371000;
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const latDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
    const lonDelta = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
  };

  const toLatLon = (coords: Location.LocationObjectCoords): LatLon => {
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  };

  const setLocationFromCoords = (coords: Location.LocationObjectCoords) => {
    setCurrentLocation(toLatLon(coords));
    setCurrentLocationAccuracyMeters(
      typeof coords.accuracy === "number" ? coords.accuracy : null
    );
  };

  const ensureLocationPermission = async (): Promise<boolean> => {
    const permission = await Location.requestForegroundPermissionsAsync();
    setLocationPermissionGranted(permission.granted);

    if (permission.granted && Platform.OS === "android") {
      try {
        await Location.enableNetworkProviderAsync();
      } catch {
      }
    }

    return permission.granted;
  };

  const getCurrentLocationWithPermission = async (): Promise<LatLon | null> => {
    const hasPermission = await ensureLocationPermission();
    if (!hasPermission) {
      setLastGuidance("Location permission is required. Please allow it in the prompt.");
      speak("Location permission is required.");
      return null;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      setLastGuidance("Location services are off. Turn on device location/GPS.");
      speak("Please turn on location services.");
      return null;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
        mayShowUserSettingsDialog: true,
      });

      setLocationFromCoords(position.coords);
      return toLatLon(position.coords);
    } catch {
      const fallback = await Location.getLastKnownPositionAsync();
      if (fallback) {
        setLocationFromCoords(fallback.coords);
        return toLatLon(fallback.coords);
      }

      setLastGuidance("Waiting for GPS fix. Set emulator location or move outdoors.");
      return null;
    }
  };

  const searchDestination = async (inputQuery?: string): Promise<Destination | null> => {
    const query = (inputQuery ?? destinationQuery).trim();
    if (!query) {
      setLastGuidance("Type a destination first.");
      return null;
    }

    setDestinationQuery(query);

    try {
      setIsRouting(true);
      let newDestination: Destination | null = null;

      const nominatimUrl =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1` +
        `&q=${encodeURIComponent(query)}`;

      const nominatimResponse = await fetch(nominatimUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "EchoPath/1.0 (Hackathon navigation prototype)",
        },
      });

      if (nominatimResponse.ok) {
        const nominatimData = (await nominatimResponse.json()) as NominatimResult[];
        if (nominatimData.length) {
          const first = nominatimData[0];
          newDestination = {
            name: first.display_name,
            latitude: Number(first.lat),
            longitude: Number(first.lon),
          };
        }
      }

      if (!newDestination) {
        const photonUrl = `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(query)}`;
        const photonResponse = await fetch(photonUrl, {
          headers: { Accept: "application/json" },
        });

        if (photonResponse.ok) {
          const photonData = (await photonResponse.json()) as PhotonResult;
          const feature = photonData.features?.[0];
          const coordinates = feature?.geometry?.coordinates;

          if (coordinates) {
            const displayName = [
              feature.properties?.name,
              feature.properties?.city,
              feature.properties?.state,
              feature.properties?.country,
            ]
              .filter(Boolean)
              .join(", ");

            newDestination = {
              name: displayName || query,
              latitude: coordinates[1],
              longitude: coordinates[0],
            };
          }
        }
      }

      if (!newDestination) {
        setDestination(null);
        setLastGuidance("Destination not found. Try a more specific place name.");
        speak("Destination not found. Try a more specific place name.");
        return null;
      }

      setDestination(newDestination);
      setLastGuidance(`Destination set: ${newDestination.name}`);
      speak("Destination found.");
      return newDestination;
    } catch {
      setLastGuidance("Failed to search destination.");
      speak("Failed to search destination.");
      return null;
    } finally {
      setIsRouting(false);
    }
  };

  const buildRoute = async (start: LatLon, end: Destination): Promise<RouteStep[] | null> => {
    const url =
      `https://router.project-osrm.org/route/v1/foot/` +
      `${start.longitude},${start.latitude};${end.longitude},${end.latitude}` +
      `?overview=false&alternatives=false&steps=true`;

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const data = (await response.json()) as OsrmResponse;

    if (data.code !== "Ok" || !data.routes?.length || !data.routes[0].legs.length) {
      return null;
    }

    const stepData = data.routes[0].legs[0].steps;
    const parsed = stepData.map((step) => {
      const maneuverLocation: LatLon = {
        latitude: step.maneuver.location[1],
        longitude: step.maneuver.location[0],
      };

      return {
        instruction: getInstruction(
          step.maneuver.type,
          step.maneuver.modifier,
          step.name,
          step.distance
        ),
        distanceMeters: step.distance,
        location: maneuverLocation,
      };
    });

    return parsed;
  };

  const stopMacroNavigation = () => {
    locationWatchRef.current?.remove();
    locationWatchRef.current = null;
    setNavigationEnabled(false);
    setLastGuidance("Navigation stopped.");
  };

  const handleLocationUpdate = (nextLocation: LatLon) => {
    setCurrentLocation(nextLocation);

    if (!navigationEnabledRef.current || currentStepIndexRef.current >= routeStepsRef.current.length) {
      return;
    }

    const nextStep = routeStepsRef.current[currentStepIndexRef.current];
    const distanceToStep = distanceMetersBetween(nextLocation, nextStep.location);

    if (distanceToStep <= 12) {
      const upcomingIndex = currentStepIndexRef.current + 1;

      if (upcomingIndex >= routeStepsRef.current.length) {
        setCurrentStepIndex(upcomingIndex);
        setLastGuidance("You have arrived.");
        speak("You have arrived.");
        stopMacroNavigation();
        return;
      }

      setCurrentStepIndex(upcomingIndex);
    }
  };

  const startMacroNavigation = async () => {
    let selectedDestination = destination;
    if (!selectedDestination && destinationQuery.trim()) {
      selectedDestination = await searchDestination(destinationQuery);
    }

    if (!selectedDestination) {
      setLastGuidance("Search and select a destination first.");
      speak("Search and select a destination first.");
      return;
    }

    try {
      setIsRouting(true);
      const start = await getCurrentLocationWithPermission();
      if (!start) {
        return;
      }

      const steps = await buildRoute(start, selectedDestination);
      if (!steps?.length) {
        setLastGuidance("Could not build walking route.");
        speak("Could not build walking route.");
        return;
      }

      setRouteSteps(steps);
      setCurrentStepIndex(0);
      lastStepSpokenRef.current = -1;
      setNavigationEnabled(true);
      setLastGuidance(steps[0].instruction);
      speak(steps[0].instruction);

      locationWatchRef.current?.remove();
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (position) => {
          handleLocationUpdate({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      setLastGuidance(`Failed to start navigation: ${reason}`);
      speak("Failed to start navigation. Check location and destination.");
    } finally {
      setIsRouting(false);
    }
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

  const detectDestinationCommand = (transcript: string): string | null => {
    const normalized = transcript.toLowerCase().trim();

    for (const prefix of DESTINATION_COMMAND_PREFIXES) {
      const index = normalized.indexOf(prefix);
      if (index !== -1) {
        const afterPrefix = transcript
          .slice(index + prefix.length)
          .replace(/^[\s,:-]+/, "")
          .replace(/[?.!,]+$/g, "")
          .trim();

        return afterPrefix.length ? afterPrefix : null;
      }
    }

    return null;
  };

  const applyCommand = (command: AppCommand) => {
    if (command === "start navigation") {
      void startMacroNavigation();
      return;
    }

    if (command === "stop navigation") {
      stopMacroNavigation();
      speak("Navigation stopped.");
      return;
    }

    if (command === "repeat") {
      speak(lastGuidance);
      return;
    }

    setLastGuidance(
      "Available commands: start navigation, stop navigation, repeat, help."
    );
    speak(
      "Available commands: start navigation, stop navigation, repeat, help."
    );
  };

  const requestPermissionsAndStart = async () => {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
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
      contextualStrings: [...COMMANDS, "set destination to", "navigate to", "go to"],
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

    const destinationFromVoice = detectDestinationCommand(transcript);
    if (destinationFromVoice) {
      setLastGuidance(`Setting destination to ${destinationFromVoice}`);
      speak(`Setting destination to ${destinationFromVoice}`);
      void searchDestination(destinationFromVoice);
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

  useEffect(() => {
    if (!navigationEnabled || currentStepIndex >= routeSteps.length) {
      return;
    }

    if (lastStepSpokenRef.current === currentStepIndex) {
      return;
    }

    const step = routeSteps[currentStepIndex];
    setLastGuidance(step.instruction);
    speak(step.instruction);
    lastStepSpokenRef.current = currentStepIndex;
  }, [currentStepIndex, navigationEnabled, routeSteps]);

  useEffect(() => {
    routeStepsRef.current = routeSteps;
    currentStepIndexRef.current = currentStepIndex;
    navigationEnabledRef.current = navigationEnabled;
  }, [routeSteps, currentStepIndex, navigationEnabled]);

  useEffect(() => {
    const initLocation = async () => {
      try {
        const hasPermission = await ensureLocationPermission();
        if (!hasPermission) {
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setLastGuidance("Location services are off. Turn on device location/GPS.");
          return;
        }

        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          setLocationFromCoords(lastKnown.coords);
        }

        passiveLocationWatchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 2,
            timeInterval: 2000,
          },
          (nextPosition) => {
            setLocationFromCoords(nextPosition.coords);
          }
        );
      } catch {
        setLastGuidance("Waiting for GPS fix. Set emulator location or check GPS settings.");
      }
    };

    void initLocation();
  }, []);

  useEffect(() => {
    return () => {
      locationWatchRef.current?.remove();
      passiveLocationWatchRef.current?.remove();
    };
  }, []);

  if (activePage === "camera") {
    return (
      <View style={styles.container}>
        <CameraPage />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back to home page"
          onPress={() => setActivePage("home")}
          style={({ pressed }) => [styles.linkButton, pressed && styles.buttonPressed]}
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

      <Text style={styles.label}>Destination:</Text>
      <TextInput
        value={destinationQuery}
        onChangeText={setDestinationQuery}
        placeholder="Type destination (e.g. Times Square)"
        style={styles.input}
      />
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search destination"
          onPress={() => {
            void searchDestination();
          }}
          style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}
          disabled={isRouting}
        >
          <Text style={styles.smallButtonText}>Search</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start route"
          onPress={() => {
            void startMacroNavigation();
          }}
          style={({ pressed }) => [
            styles.smallButton,
            styles.smallButtonPrimary,
            pressed && styles.buttonPressed,
          ]}
          disabled={isRouting}
        >
          <Text style={styles.smallButtonPrimaryText}>Start Route</Text>
        </Pressable>
      </View>

      <Text style={styles.value} numberOfLines={2}>
        {destination ? `Destination: ${destination.name}` : "Destination: not set"}
      </Text>

      <Text style={styles.label}>Last heard:</Text>
      <Text style={styles.value}>{lastTranscript}</Text>
      <Text style={styles.label}>Guidance:</Text>
      <Text style={styles.value}>{lastGuidance}</Text>
      <Text style={styles.value}>
        Step: {routeSteps.length ? `${Math.min(currentStepIndex + 1, routeSteps.length)}/${routeSteps.length}` : "-"}
      </Text>
      <Text style={styles.value}>
        Location: {currentLocation ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}` : locationPermissionGranted ? "Waiting for GPS fix" : "Unknown"}
      </Text>
      <Text style={styles.value}>
        GPS accuracy: {currentLocationAccuracyMeters !== null ? `${Math.round(currentLocationAccuracyMeters)} m` : "Unknown"}
      </Text>

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
        Commands: start navigation, stop navigation, repeat, help, set destination to ...
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go to camera page"
        onPress={() => setActivePage("camera")}
        style={({ pressed }) => [styles.linkButton, pressed && styles.buttonPressed]}
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
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#98A2B3",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 6,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  smallButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#98A2B3",
    paddingVertical: 10,
    alignItems: "center",
  },
  smallButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#344054",
  },
  smallButtonPrimary: {
    backgroundColor: "#175CD3",
    borderColor: "#175CD3",
  },
  smallButtonPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
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
