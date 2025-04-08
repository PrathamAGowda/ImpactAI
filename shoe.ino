#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <TinyGPS++.h>
#include <WiFi.h>
#include <FirebaseESP32.h>
// Provide the token generation process info.
#include <addons/TokenHelper.h>
// Provide the RTDB payload printing info and other helper functions.
#include <addons/RTDBHelper.h>

// Create TinyGPS++ object
TinyGPSPlus gps;

// Define the UART pins for GPS (RX: pin 16, TX: pin 17)
#define RXD2 16
#define TXD2 17

// Initialize ADXL345
Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

// WiFi credentials
const char* ssid = "Galaxy A53 5G 247E";
const char* password = "prajwaln";
// const char* ssid = "Pratham's Laptop";
// const char* password = "12345678";

/* 2. Define the API Key */
#define API_KEY "AIzaSyApW9BFZldgMVhZHNmCq1tCSJ1kt-ZyJTY"

/* 3. Define the RTDB URL */
#define DATABASE_URL "https://esp32-80472-default-rtdb.asia-southeast1.firebasedatabase.app/"

/* 4. Define the user Email and password */
#define USER_EMAIL "prajwalnavada.71@gmail.com"
#define USER_PASSWORD "12345678"

// Define Firebase Data object
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long sendDataPrevMillis = 0;

// Constants
const unsigned long timeWindow = 1000;      // 1-second window for taps (unused in touch SOS now)
const unsigned long tapDebounceDelay = 200;   // Not used now in touch SOS
const unsigned long minPressDuration = 30;    // Not used now in touch SOS
const float tapThreshold = 3.0;               // Acceleration change threshold (ΔZ)
const float tiltThreshold = 7.0;
const int requiredTapCount = 3;               // Require 3 taps for activation (accelerometer uses this)

// Pin Definitions
const int touchPin = 15; // Touch sensor pin
const int LED_PIN = 2;   // Built-in LED pin
const int vib_pin = 4;

// Variables for accelerometer
unsigned long lastTapTimeAccel = 0;  // Last tap time for accelerometer
int accelTapCount = 0;               // Tap count for accelerometer
float lastZAccel = 0.0;              // Previous Z-axis acceleration

// Global flags and variables
bool sosMode = false;                // Main SOS mode flag
bool tilt = false;                   // Global variable for tilt

// Variables for touch state tracking (simple rising/falling edge detection)
int touchCount = 0;                  // Tap count for touch
bool touchPressed = false;           // Current state of the touch (pressed or not)

void setup() {
  pinMode(touchPin, INPUT);
  pinMode(vib_pin, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);

  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2); // Communication with the GPS module

  Serial.println("GPS Test with ESP32");

  // Initialize ADXL345
  if (!accel.begin()) {
    Serial.println("Failed to initialize ADXL345!");
    while (1);
  }
  accel.setRange(ADXL345_RANGE_16_G);
  Serial.println("ADXL345 initialized!");

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  Serial.printf("Firebase Client v%s\n\n", FIREBASE_CLIENT_VERSION);

  /* Assign the api key (required) */
  config.api_key = API_KEY;

  /* Assign the user sign-in credentials */
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  /* Assign the RTDB URL (required) */
  config.database_url = DATABASE_URL;

  config.token_status_callback = tokenStatusCallback;
  Firebase.reconnectNetwork(true);
  fbdo.setBSSLBufferSize(4096, 1024); // Adjust buffer size
  Firebase.begin(&config, &auth);
  Firebase.setDoubleDigits(5); // Set decimal precision
}

void loop() {
  unsigned long currentTime = millis();
  sensors_event_t event;
  accel.getEvent(&event);

  // Calculate change in Z-axis acceleration (ΔZ)
  float currentZAccel = event.acceleration.z;
  float deltaZ = abs(currentZAccel - lastZAccel);
  
  // Determine tilt status based on accelerometer data.
  // Here, if the absolute value of the Z-axis acceleration is below tiltThreshold, we consider the device tilted.
  tilt = (abs(currentZAccel) < tiltThreshold);

  // **********************
  // Fetch remote sosMode first
  // **********************
  if (Firebase.ready()) {
    // Get the sosMode value from Firebase
    if (Firebase.getBool(fbdo, F("/BMSAI/sosMode"))) {
      bool remoteSOS = fbdo.boolData();
      // Update local sosMode if the remote value differs
      if (remoteSOS != sosMode) {
        sosMode = remoteSOS;
      }
    } else {
      Serial.printf("Error fetching sosMode: %s\n", fbdo.errorReason().c_str());
    }
  }

  // Process sensor input only when SOS mode is not already active
  if (!sosMode) {
    handleAccelSOS(deltaZ, currentTime);
    handleTouchSOS(currentTime);
  }
  
  // Update built-in LED state based on SOS mode
  digitalWrite(LED_PIN, sosMode ? HIGH : LOW);

  // Update last Z-axis acceleration
  lastZAccel = currentZAccel;

  // Send tilt data to Firebase periodically
  if (Firebase.ready() && (currentTime - sendDataPrevMillis > 3000 || sendDataPrevMillis == 0)) {
    Serial.printf("Set tilt... %s\n", Firebase.setBool(fbdo, F("/BMSAI/tilt"), tilt) ? "ok" : fbdo.errorReason().c_str());
    sendDataPrevMillis = currentTime;
  }
}

void handleTouchSOS(unsigned long currentTime) {
  // Read the touch sensor state directly
  bool currentTouch = (digitalRead(touchPin) == HIGH);

  // Rising edge: sensor is touched
  if (currentTouch && !touchPressed) {
    touchPressed = true;
  }

  // Falling edge: sensor is released (counts as a tap)
  if (!currentTouch && touchPressed) {
    touchPressed = false;
    touchCount++;
    Serial.print("Touch tap count: ");
    Serial.println(touchCount);
    
    // Trigger SOS when the tap count reaches 2
    if (touchCount >= 2) {
      sosMode = true;
      Serial.printf("Set bool... %s\n", Firebase.setBool(fbdo, F("/BMSAI/sosMode"), sosMode) ? "ok" : fbdo.errorReason().c_str());
      Serial.println("Touch-based SOS Activated!");
      Vibon();
      GPSdata();
      touchCount = 0; // Reset the tap counter after activation
    }
  }
}

void handleAccelSOS(float deltaZ, unsigned long currentTime) {
  if (deltaZ > tapThreshold && (currentTime - lastTapTimeAccel > tapDebounceDelay)) {
    if (currentTime - lastTapTimeAccel <= timeWindow) {
      accelTapCount++;
    } else {
      accelTapCount = 1;
    }
    lastTapTimeAccel = currentTime;
    Serial.print("Accelerometer tap count: ");
    Serial.println(accelTapCount);
    
    if (accelTapCount >= requiredTapCount) {
      sosMode = true;
      Serial.printf("Set bool... %s\n", Firebase.setBool(fbdo, F("/BMSAI/sosMode"), sosMode) ? "ok" : fbdo.errorReason().c_str());
      Vibon();
      Serial.println("Accelerometer-based SOS Activated!");
      GPSdata();
      accelTapCount = 0; // Reset counter after activation
    }
  }
}

void GPSdata() {
  // Check if data is available from GPS
  while (Serial2.available() > 0) {
    char data = Serial2.read(); // Read GPS data
    if (gps.encode(data)) {
      // If new location data is available, print it
      if (gps.location.isUpdated()) {
        float latitude = gps.location.lat();
        float longitude = gps.location.lng();
        Serial.print("Latitude: ");
        Serial.println(latitude, 6);
        Serial.print("Longitude: ");
        Serial.println(longitude, 6);
      }
    } else {
      Serial.println("no data");
    }
  } 
}

void Vibon(){
  digitalWrite(vib_pin, HIGH);
  Serial.println("Vibration");
  delay(500);
  digitalWrite(vib_pin, LOW);
}

void Viboff(){
  digitalWrite(vib_pin, HIGH);
  Serial.println("Vibration");
  delay(500);
  digitalWrite(vib_pin, LOW);
}
