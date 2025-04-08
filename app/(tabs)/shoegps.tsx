import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebaseConfig';

export default function HomeScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    // References for latitude and longitude in Firebase
    const latRef = ref(database, 'BMSAI/Latitude');
    const lonRef = ref(database, 'BMSAI/Longitude');

    // Listener for latitude changes
    const unsubscribeLat = onValue(latRef, (snapshot) => {
      const lat = snapshot.val();
      setLocation((prev) => ({
        latitude: lat,
        longitude: prev?.longitude ?? 0,
      }));
    });

    // Listener for longitude changes
    const unsubscribeLon = onValue(lonRef, (snapshot) => {
      const lon = snapshot.val();
      setLocation((prev) => ({
        latitude: prev?.latitude ?? 0,
        longitude: lon,
      }));
    });

    // Clean up listeners on unmount
    return () => {
      unsubscribeLat();
      unsubscribeLon();
    };
  }, []);

  // Animate map to new region when location changes
  useEffect(() => {
    if (location && mapRef.current) {
      const region: Region = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      mapRef.current.animateToRegion(region, 1000); // Animate over 1 second
    }
  }, [location]);

  // Display a loader until we have valid location data
  if (!location || location.latitude === 0 || location.longitude === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
    >
      <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
