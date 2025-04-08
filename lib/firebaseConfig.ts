// lib/firebaseConfig.ts (or wherever you're keeping it)
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database"; // 👈 ADD THIS

const firebaseConfig = {
  apiKey: "AIzaSyApW9BFZldgMVhZHNmCq1tCSJ1kt-ZyJTY",
  authDomain: "esp32-80472.firebaseapp.com",
  databaseURL: "https://esp32-80472-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "esp32-80472",
  storageBucket: "esp32-80472.firebasestorage.app",
  messagingSenderId: "414582722572",
  appId: "1:414582722572:web:1669241bee8bd619ad9e29",
  measurementId: "G-SQFE8WJEXC"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app); // 👈 ADD THIS LINE

export { app, analytics, database }; // 👈 export database
