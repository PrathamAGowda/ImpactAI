import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';

export default function ButtonsScreen() {
  const router = useRouter();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[
          styles.emergencyText,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        🚨 Emergency Detected 🚨
      </Animated.Text>

      <Pressable style={styles.button} onPress={() => router.push('/phonegps')}>
        <Text style={styles.buttonText}>Phone GPS</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => router.push('/shoegps')}>
        <Text style={styles.buttonText}>Shoe GPS</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => router.push('/camera')}>
        <Text style={styles.buttonText}>Camera</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => router.push('/faces')}>
        <Text style={styles.buttonText}>Faces</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#423f3f',
  },
  emergencyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff4d4d',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    padding: 12,
    marginVertical: 10,
    backgroundColor: '#544adf',
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
