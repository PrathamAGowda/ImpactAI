import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  View,
  Pressable,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [glowAnim]);

  const animatedShadow = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 25],
  });

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.background}
    >
      {/* Glowing circles */}
      <View style={[styles.glowCircle, styles.circle1]} />
      <View style={[styles.glowCircle, styles.circle2]} />

      {/* Main glowing text */}
      <Animated.Text
        style={[
          styles.text,
          {
            textShadowRadius: animatedShadow,
          },
        ]}
      >
        No Emergency Detected
      </Animated.Text>

      {/* Faces Button at Bottom */}
      <View style={styles.buttonWrapper}>
        <Pressable style={styles.button} onPress={() => router.push('/faces')}>
          <Text style={styles.buttonText}>View Faces</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#39FF14',
    fontSize: 32,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 3,
    textShadowColor: '#00ff88',
    textShadowOffset: { width: 0, height: 0 },
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.3,
  },
  circle1: {
    width: width * 0.7,
    height: width * 0.7,
    backgroundColor: '#00ffcc',
    top: -80,
    left: -80,
  },
  circle2: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: '#7f00ff',
    bottom: -60,
    right: -60,
  },
  buttonWrapper: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
  button: {
    backgroundColor: '#544adf',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
