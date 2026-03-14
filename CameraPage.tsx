import { StyleSheet, Text, View } from "react-native";

export default function CameraPage() {
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
