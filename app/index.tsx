import { View, Text, Pressable, Linking } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
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

const Index = () => {
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
    const [isDropped, setDrop] = useState<boolean>(false);
    const [isTilted, setTilt] = useState<boolean>(false);
    const isTiltedRef = useRef(isTilted);
    const locationSubRef = useRef<Location.LocationSubscription | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Accelerometer handler
    useEffect(() => {
        const subscription = Accelerometer.addListener(accelerometerData => {
            const acceleration = Math.sqrt(
                Math.pow(accelerometerData.x, 2) + 
                Math.pow(accelerometerData.y, 2) + 
                Math.pow(accelerometerData.z, 2)
            );
            if(acceleration >= 2.5) {
              setDrop(true); 
            }
        });

        return () => subscription.remove();
    }, []);

    // Keep tilt ref updated
    useEffect(() => {
        isTiltedRef.current = isTilted;
    }, [isTilted]);

    // Drop detection handler
    useEffect(() => {
        if (!isDropped) return;
    
        let counter = 0;
        const interval = setInterval(() => {
            console.log(`Check ${counter + 1}: drop=${isDropped}, tilted=${isTiltedRef.current}`);
    
            if (isDropped && isTiltedRef.current) {
                toggleSOSMode();
                clearInterval(interval);
            }
    
            counter++;
            if (counter >= 10) {
                clearInterval(interval);
                console.log("Done checking after 10 seconds.");
                setDrop(false);
            }
        }, 1000);
    
        return () => clearInterval(interval);
    }, [isDropped]);

    // Tilt mode listener
    useEffect(() => {
        const tiltModeRef = ref(database, 'BMSAI/tilt');
        const unsubscribe = onValue(tiltModeRef, (snapshot) => {
            const value = snapshot.val();
            setTilt(value);
            console.log('Tilt Mode updated:', value);
        });

        return () => unsubscribe();
    }, []);

    // SOS mode listener
    useEffect(() => {
        const sosModeRef = ref(database, 'BMSAI/sosMode');
        const unsubscribe = onValue(sosModeRef, (snapshot) => {
            const value = snapshot.val();
            setSosMode(value);
            console.log('SOS Mode updated:', value);
        });

        return () => unsubscribe();
    }, []);

    // Location tracking and sending logic
    const sendLocationToFirebase = useCallback(async (coords: Coordinates) => {
      try {
          const bmsaiRef = ref(database, 'BMSAI');
          
          // Get existing data
          const snapshot = await get(bmsaiRef);
          const currentData = snapshot.exists() ? snapshot.val() : {};
          const updatedData = {
              ...currentData,
              Latitude: coords.latitude,
              Longitude: coords.longitude,
          };
  
          await set(bmsaiRef, updatedData);
          console.log("Location merged and updated at", new Date().toISOString());
      } catch (error) {
          console.error("Error updating location:", error);
      }
  }, [database, sosMode]);

    useEffect(() => {
        let isMounted = true;

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
                if (isMounted) {
                    setCurrentLocation(location.coords);
                    if (sosMode) {
                        sendLocationToFirebase(location.coords);
                    }
                }

                // Watch for position changes
                locationSubRef.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        distanceInterval: 10,  // Only update if moved at least 10 meters
                        timeInterval: 5000     // Only update every 5 seconds minimum
                    },
                    (newLocation) => {
                        if (isMounted) {
                            setCurrentLocation(newLocation.coords);
                            if (sosMode) {
                                sendLocationToFirebase(newLocation.coords);
                            }
                        }
                    }
                );
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message);
                    console.error('Location error:', err);
                }
            }
        };

        const startPeriodicSending = () => {
            stopPeriodicSending();
            intervalRef.current = setInterval(() => {
                if (currentLocation && sosMode) {
                    sendLocationToFirebase(currentLocation);
                }
            }, 5000);
        };

        const stopPeriodicSending = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        startLocationTracking();
        
        if (sosMode) {
            startPeriodicSending();
        }

        return () => {
            isMounted = false;
            if (locationSubRef.current) {
                locationSubRef.current.remove();
            }
            stopPeriodicSending();
        };
    }, [sosMode, sendLocationToFirebase]);

    const toggleSOSMode = async () => {
        const newMode = !sosMode;
        try {
            await set(ref(database, 'BMSAI/sosMode'), newMode);
        } catch (error) {
            console.error("Error toggling SOS mode:", error);
        }
    };

    useEffect(() => {
        if(sosMode){
            // Linking.openURL("tel:1234567890");
        }
    },[sosMode])

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>
                <Pressable 
                    style={[styles.button, {backgroundColor : `${sosMode ? "red" : "lime"}`}]} 
                    onPress={toggleSOSMode}
                >
                    <Text style={[styles.text, {color : `${sosMode ? "white" : "black"}`}]}>
                        {sosMode ? 'Disable SOS Mode' : 'Enable SOS Mode'}
                    </Text>
                </Pressable>

                {currentLocation ? (
                    <View style = {styles.textContainer}>
                        <Text style={styles.statsText}>
                            Latitude: {currentLocation.latitude.toFixed(7)}
                        </Text>
                        <Text style={styles.statsText}>
                            Longitude: {currentLocation.longitude.toFixed(7)}
                        </Text>
                        <Text style={styles.statsText}>
                            Accuracy: {currentLocation.accuracy?.toFixed(2)} meters
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.text}>Getting location...</Text>
                )}

                {error && <Text style={[styles.text, {color: 'red'}]}>Error: {error}</Text>}
                <Text style={[styles.text, {color : `${sosMode ? "red" : "lime"}`}]}>SOS Mode: {sosMode ? 'ACTIVE' : 'INACTIVE'}</Text>
            </View>
        </SafeAreaView>
    );
};

export default Index;