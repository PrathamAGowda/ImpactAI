import { View, Text, Pressable } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import styles from '@/styles/indexstyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { initializeApp } from 'firebase/app';
import { ref, set, getDatabase, onValue, get } from 'firebase/database';
import { Accelerometer } from 'expo-sensors';

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

const index = () => {
    const firebaseConfig = {
        apiKey: "AIzaSyApW9BFZldgMVhZHNmCq1tCSJ1kt-ZyJTY",
        databaseURL: "https://esp32-80472-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "esp32-80472",
    };

    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);
    const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sosMode, setSosMode] = useState<boolean>(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isDropped, setDrop] = useState<boolean>(false);
    const [isTilted, setTilt] = useState<boolean>(false);
    const isTiltedRef = useRef(isTilted);

    Accelerometer.addListener(accelerometerData => {
        if(Math.sqrt(Math.pow(accelerometerData.x, 2) + Math.pow(accelerometerData.y, 2) + Math.pow(accelerometerData.z, 2)) >= 3) {
            setDrop(true);
        }
    });

    useEffect(() => {
        isTiltedRef.current = isTilted;
    }, [isTilted]);

    useEffect(() => {
        if (!isDropped) return;
    
        let counter = 0;
        const interval = setInterval(() => {
            const currentTilted = isTiltedRef.current;
            console.log(`Check ${counter + 1}: drop=${isDropped}, tilted=${currentTilted}`);
    
            if (isDropped && currentTilted) {
                toggleSOSMode();
                clearInterval(interval);
            }
    
            counter++;
            if (counter >= 10) {
                clearInterval(interval);
                console.log("🔁 Done checking after 10 seconds.");
                setDrop(false);
            }
        }, 1000);
    
        return () => clearInterval(interval);
    }, [isDropped]);

    useEffect(() => {
        const tiltModeRef = ref(database, 'BMSAI/tilt');
        const unsubscribe = onValue(tiltModeRef, (snapshot) => {
            const value = snapshot.val();
            setTilt(value);
            console.log('Tilt Mode updated:', value);
        });

        return () => unsubscribe();
    }, []);

    // 1. Listen to Firebase sosMode changes
    useEffect(() => {
        const sosModeRef = ref(database, 'BMSAI/sosMode');
        const unsubscribe = onValue(sosModeRef, (snapshot) => {
            const value = snapshot.val();
            setSosMode(value);
            console.log('SOS Mode updated:', value);
        });

        return () => unsubscribe();
    }, []);

    // 2. Location tracking and sending logic
    useEffect(() => {
        let locationSub: Location.LocationSubscription | null = null;

        const startLocationTracking = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setError('Permission to access location was denied');
                    return;
                }

                // Get initial position
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                updateLocation(location.coords);

                // Watch for position changes
                locationSub = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        distanceInterval: 10,
                        timeInterval: 5000,
                    },
                    (newLocation) => {
                        updateLocation(newLocation.coords);
                    }
                );
            } catch (err: any) {
                setError(err.message);
                console.error('Location error:', err);
            }
        };

        const updateLocation = (coords: Coordinates) => {
            setCurrentLocation({
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: coords.accuracy,
            });
            
            // Send to Firebase if in SOS mode
            if (sosMode) {
                sendLocationToFirebase(coords);
            }
        };

        const sendLocationToFirebase = async (coords: Coordinates) => {
            try {
                const bmsaiRef = ref(database, 'BMSAI');
                const snapshot = await get(bmsaiRef);
                const existingData = snapshot.exists() ? snapshot.val() : {};
        
                const updatedData = {
                    ...existingData,
                    Latitude: coords.latitude,
                    Longitude: coords.longitude,
                };
        
                await set(bmsaiRef, updatedData);
                console.log("Location merged and updated at", new Date().toISOString());
            } catch (error) {
                console.error("Error updating location:", error);
            }
        };

        // Start periodic sending when in SOS mode
        const startPeriodicSending = () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                if (currentLocation) {
                    sendLocationToFirebase(currentLocation);
                }
            }, 5000);
        };

        // Stop periodic sending when not in SOS mode
        const stopPeriodicSending = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        startLocationTracking();
        
        if (sosMode) {
            startPeriodicSending();
        } else {
            stopPeriodicSending();
        }

        return () => {
            if (locationSub) locationSub.remove();
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [sosMode]); // Re-run when sosMode changes

    // 3. Toggle SOS mode
    const toggleSOSMode = async () => {
        const newMode = !sosMode;
        try {
            await set(ref(database, 'BMSAI/sosMode'), newMode);
        } catch (error) {
            console.error("Error toggling SOS mode:", error);
        }
    };

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>
                <Pressable 
                    style={styles.button} 
                    onPress={toggleSOSMode}
                >
                    <Text style={styles.text}>
                        {sosMode ? 'Disable SOS Mode' : 'Enable SOS Mode'}
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
                <Text style={styles.text}>SOS Mode: {sosMode ? 'ACTIVE' : 'INACTIVE'}</Text>
            </View>
        </SafeAreaView>
    );
};

export default index;