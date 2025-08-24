// App.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  Alert,
  SafeAreaView,
} from "react-native";
import { db } from "./firebase";
import { ref as dbRef, onValue, set } from "firebase/database";
import { Accelerometer, AccelerometerMeasurement } from "expo-sensors";
import * as Location from "expo-location";

interface BMSAIData {
  Latitude?: number;
  Longitude?: number;
  sosMode?: boolean;
  tilt?: boolean;
}

const ACC_UPDATE_INTERVAL_MS = 100;
const FALL_THRESHOLD_MS2 = 15;
const FALL_COOLDOWN_MS = 2000;
const TILT_WINDOW_MS = 10000; // 10 seconds to wait for tilt after fall

const LOCATION_UPDATE_INTERVAL_MS = 3000; // 3 seconds

const App: React.FC = () => {
  const [data, setData] = useState<BMSAIData>({});
  const [sosLoading, setSosLoading] = useState(false);

  const gravityRef = useRef({ x: 0, y: 0, z: 0 });
  const lastFallRef = useRef<number>(0);
  const waitingForTiltRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const nodeRef = dbRef(db, "BMSAI");
    const unsubscribe = onValue(nodeRef, (snapshot) => {
      const val: BMSAIData = snapshot.val() || {};
      setData(val);

      if (val.tilt && waitingForTiltRef.current) {
        triggerSosFromFallAndTilt();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Accelerometer.setUpdateInterval(ACC_UPDATE_INTERVAL_MS);

    const sub = Accelerometer.addListener((acc: AccelerometerMeasurement) => {
      const ax = acc.x ?? 0;
      const ay = acc.y ?? 0;
      const az = acc.z ?? 0;

      const alpha = 0.9;
      gravityRef.current.x = alpha * gravityRef.current.x + (1 - alpha) * ax;
      gravityRef.current.y = alpha * gravityRef.current.y + (1 - alpha) * ay;
      gravityRef.current.z = alpha * gravityRef.current.z + (1 - alpha) * az;

      const lx = ax - gravityRef.current.x;
      const ly = ay - gravityRef.current.y;
      const lz = az - gravityRef.current.z;

      const magG = Math.sqrt(lx * lx + ly * ly + lz * lz);
      const magMs2 = magG * 9.80665;

      const now = Date.now();
      if (
        magMs2 >= FALL_THRESHOLD_MS2 &&
        now - lastFallRef.current > FALL_COOLDOWN_MS
      ) {
        lastFallRef.current = now;
        console.log("FALL_DETECTED:", magMs2.toFixed(3));
        waitForTiltAfterFall();
      }
    });

    return () => sub.remove();
  }, []);

  // Start waiting for tilt after fall
  function waitForTiltAfterFall() {
    if (waitingForTiltRef.current) clearTimeout(waitingForTiltRef.current);

    waitingForTiltRef.current = setTimeout(() => {
      console.log("Tilt not detected within 10s → no SOS triggered");
      waitingForTiltRef.current = null;
    }, TILT_WINDOW_MS);

    console.log("Waiting for tilt up to 10s...");
  }

  // Fall + tilt → trigger SOS
  async function triggerSosFromFallAndTilt() {
    if (!waitingForTiltRef.current) return;
    clearTimeout(waitingForTiltRef.current);
    waitingForTiltRef.current = null;

    try {
      await set(dbRef(db, "BMSAI/sosMode"), true);
      setData((prev) => ({ ...prev, sosMode: true }));
      console.log("SOS TRIGGERED: Fall + Tilt detected together");
    } catch (err) {
      console.error("Error setting SOS:", err);
    }
  }

  // Manual toggle
  const toggleSosManually = async () => {
    setSosLoading(true);
    try {
      const newVal = !data.sosMode;
      await set(dbRef(db, "BMSAI/sosMode"), newVal);
      setData((prev) => ({ ...prev, sosMode: newVal }));
      console.log("Manual SOS toggle ->", newVal);
    } catch (err) {
      console.error("Error toggling SOS manually:", err);
      Alert.alert("Error", "Could not update SOS.");
    } finally {
      setSosLoading(false);
    }
  };

  // 🔹 Location updater
  useEffect(() => {
    let interval: NodeJS.Timeout;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required.");
        return;
      }

      interval = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          await set(dbRef(db, "BMSAI/Latitude"), loc.coords.latitude);
          await set(dbRef(db, "BMSAI/Longitude"), loc.coords.longitude);

          setData((prev) => ({
            ...prev,
            Latitude: loc.coords.latitude,
            Longitude: loc.coords.longitude,
          }));

          console.log(
            `Updated location: ${loc.coords.latitude}, ${loc.coords.longitude}`
          );
        } catch (err) {
          console.error("Error updating location:", err);
        }
      }, LOCATION_UPDATE_INTERVAL_MS);
    })();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const sosActive = data.sosMode ?? false;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Pressable
          onPress={toggleSosManually}
          style={({ pressed }) => [
            styles.circle,
            sosActive ? styles.circleRed : styles.circleLightGreen,
            pressed && styles.pressed,
          ]}
          android_ripple={{ color: "rgba(0,0,0,0.12)", radius: 120 }}
          disabled={sosLoading}
        >
          <Text
            style={[
              styles.buttonText,
              sosActive ? styles.buttonTextActive : styles.buttonTextInactive,
            ]}
          >
            SOS MODE
          </Text>
        </Pressable>

        <View style={styles.info}>
          <Text style={styles.label}>
            📍 Latitude:{" "}
            <Text style={styles.value}>{data.Latitude ?? "N/A"}</Text>
          </Text>
          <Text style={styles.label}>
            📍 Longitude:{" "}
            <Text style={styles.value}>{data.Longitude ?? "N/A"}</Text>
          </Text>
          <Text style={styles.label}>
            🚨 SOS Mode:{" "}
            <Text style={[styles.value, sosActive ? styles.warn : styles.ok]}>
              {sosActive ? "Active" : "Inactive"}
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#000",
  },
  circle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  circleLightGreen: {
    backgroundColor: "#00ff11ff",
  },
  circleRed: {
    backgroundColor: "#ff5252",
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  buttonText: {
    fontWeight: "800",
    fontSize: 22,
    letterSpacing: 1,
  },
  buttonTextInactive: {
    color: "#000",
  },
  buttonTextActive: {
    color: "#fff",
  },
  info: {
    marginTop: 30,
    alignItems: "center",
  },
  label: {
    color: "#fff",
    fontSize: 18,
    marginVertical: 6,
  },
  value: {
    color: "#fff",
    fontWeight: "600",
  },
  warn: {
    color: "#ffdddd",
  },
  ok: {
    color: "#00ff11ff",
  },
});
