import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export default function CameraScreen() {
  // Replace with your ESP32-CAM's IP address
  const ESP32_CAM_STREAM_URL = 'http://<esp32-cam-ip>/stream';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32-CAM Stream</Text>
      <WebView
        source={{ uri: ESP32_CAM_STREAM_URL }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  title: {
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 20,
  },
  webview: {
    width: '100%',
    height: '100%',
  },
});
