import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

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
export const db = getDatabase(app);
