import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';

interface Face {
  filename: string;
  name: string;
}

export default function Faces() {
  const [faces, setFaces] = useState<Face[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const serverURL = 'http://192.168.35.28:5000'; // 🔁 Replace with your actual IP

  const fetchFaces = async () => {
    try {
      const response = await fetch(`${serverURL}/faces`);
      const data = await response.json();
      // Only update if data changes
      if (JSON.stringify(data) !== JSON.stringify(faces)) {
        setFaces(data);
      }
    } catch (error) {
      console.error("Failed to fetch faces:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaces();
    const interval = setInterval(() => {
      fetchFaces();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchFaces} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Captured Faces</Text>
        <Pressable style={styles.homeButton} onPress={() => router.push('/')}>
          <Text style={styles.homeButtonText}>Home</Text>
        </Pressable>
      </View>

      {loading ? (
  <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 50 }} />
      ) : (
        faces.slice().reverse().map((face, idx) => (
          <View key={idx} style={styles.faceContainer}>
            <Image
              source={{ uri: `${serverURL}/faces/${face.filename}` }}
              style={styles.image}
              resizeMode="cover"
            />
            <Text style={styles.faceName}>{face.name}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 10,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 60,
    backgroundColor: '#1e1e1e',
    minHeight: '100%',
  },
  header: {
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  homeButton: {
    backgroundColor: '#544adf',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  homeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  faceContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  image: {
    width: 300,
    height: 300,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  faceName: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
