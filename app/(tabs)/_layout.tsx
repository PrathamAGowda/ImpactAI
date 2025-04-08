import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, BackHandler } from 'react-native';
import { ref, onValue } from 'firebase/database';
import * as Notifications from 'expo-notifications';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { database } from '@/lib/firebaseConfig'; // ✅ import Firebase setup

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  // Ask notification permissions on mount
  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  // Firebase SOS listener
  useEffect(() => {
    const sosRef = ref(database, 'BMSAI/sosMode');

    const unsubscribe = onValue(sosRef, async (snapshot) => {
      const value = snapshot.val();
      if (value === true) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 Emergency Alert',
            body: 'SOS mode activated!',
            sound: true,
          },
          trigger: null,
        });

        router.replace('/buttons');
      } else {
        router.replace('/');
      }
    });

    return () => sosRef.off?.(); // Cleanup listener
  }, []);

  // Global Android back handler to exit app
  useEffect(() => {
    const backAction = () => {
      if (Platform.OS === 'android') {
        BackHandler.exitApp(); // Exit app instead of navigating
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarStyle: { display: 'none' },
          href: null,
        }}
      />

      <Tabs.Screen
        name="buttons"
        options={{
          title: 'Button',
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="phonegps"
        options={{
          href: null,
          title: 'PhoneGPS',
        }}
      />
      <Tabs.Screen
        name="shoegps"
        options={{
          href: null,
          title: 'ShoeGPS',
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          href: null,
          title: 'Camera',
        }}
      />
      <Tabs.Screen
        name="faces"
        options={{
          href: null,
          title: 'Faces',
        }}
      />
    </Tabs>
  );
}
