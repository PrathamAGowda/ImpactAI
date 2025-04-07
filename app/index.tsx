import { View, Text, Pressable } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import styles from '@/styles/indexstyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';

const { initializeApp } = require("firebase/app");
const { ref, get, set, getDatabase } = require("firebase/database");

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

const index = () => {
    const firebaseConfig = {
        apiKey: "AIzaSyApW9BFZldgMVhZHNmCq1tCSJ1kt-ZyJTY",
        authDomain: "esp32-80472.firebaseapp.com",
        databaseURL: "https://esp32-80472-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "esp32-80472",
        storageBucket: "esp32-80472.firebasestorage.app",
        messagingSenderId: "414582722572",
        appId: "1:414582722572:web:1669241bee8bd619ad9e29",
        measurementId: "G-SQFE8WJEXC",
    };

    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
    const [isSending, setIsSending] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Function to send location to Firebase
    const sendLocationToFirebase = async () => {
        if (!currentLocation) return;
        
        try {
            const folderRef = ref(database, "BMSAI");
            const snapshot = await get(folderRef);
            
            if (snapshot.exists()) {
                const folderData = snapshot.val();
                await set(folderRef, {
                    ...folderData,
                    Latitude: currentLocation.latitude,
                    Longitude: currentLocation.longitude,
                });
                console.log("Successfully updated location at", new Date().toISOString());
            }
        } catch (error) {
            console.error("Error updating location:", error);
        }
    };

    // Toggle periodic sending
    const togglePeriodicSending = () => {
        if (isSending) {
            // Stop sending
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setIsSending(false);
            console.log("Stopped periodic location updates");
        } else {
            // Start sending every 5 seconds (adjust as needed)
            const interval = 5000; // 5 seconds in milliseconds
            sendLocationToFirebase(); // Send immediately
            intervalRef.current = setInterval(sendLocationToFirebase, interval);
            setIsSending(true);
            console.log(`Started periodic location updates every ${interval/1000} seconds`);
        }
    };

    // Start location tracking
    const startLocationTracking = async () => {
        try {
            // Request permission
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Permission to access location was denied');
                return;
            }

            // Get initial position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setCurrentLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy || NaN,
            });

            // Set up watcher for continuous updates
            const sub = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10, // Update every 10 meters
                    timeInterval: 5000, // Update every 5 seconds
                },
                (newLocation) => {
                    setCurrentLocation({
                        latitude: newLocation.coords.latitude,
                        longitude: newLocation.coords.longitude,
                        accuracy: newLocation.coords.accuracy || NaN,
                    });
                    setError(null);
                }
            );
            setLocationSubscription(sub);
            
        } catch (err : any) {
            setError(err.message);
            console.error('Location error:', err);
        }
    };

    // Stop location tracking
    const stopLocationTracking = () => {
        if (locationSubscription) {
            locationSubscription.remove();
            setLocationSubscription(null);
        }
    };

    // Clean up intervals and subscriptions when component unmounts
    useEffect(() => {
        startLocationTracking();
        return () => {
            stopLocationTracking();
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const setSOSMode = async () => {
            try {
                const folderRef = ref(database, "BMSAI");
                const snapshot = await get(folderRef);
                
                if (snapshot.exists()) {
                    const folderData = snapshot.val();
                    await set(folderRef, {
                        ...folderData,
                        sosMode : isSending
                    });
                }
            } catch (error) {
                console.log(error);
            }
        };
        setSOSMode();
    },[isSending])

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>
                <Pressable 
                    style={styles.button} 
                    onPress={togglePeriodicSending}
                >
                    <Text style={styles.text}>
                        {isSending ? 'Disable SOS Mode' : 'Enable SOS Mode'}
                    </Text>
                </Pressable>

                {currentLocation ? (
                    <>
                        <Text style={styles.text}>
                            Latitude: {currentLocation.latitude.toFixed(7)}
                        </Text>
                        <Text style={styles.text}>
                            Longitude: {currentLocation.longitude.toFixed(7)}
                        </Text>
                        <Text style={styles.text}>
                            Accuracy: {currentLocation.accuracy?.toFixed(2)} meters
                        </Text>
                    </>
                ) : (
                    <Text style={styles.text}>Getting location...</Text>
                )}

                {error && <Text style={[styles.text, {color: 'red'}]}>Error: {error}</Text>}
            </View>
        </SafeAreaView>
    );
};

export default index;