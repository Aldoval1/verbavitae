// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYQWPWtY17SUP32rDHjOSqSENIAg_x5Tk",
  authDomain: "verba-529f8.firebaseapp.com",
  projectId: "verba-529f8",
  storageBucket: "verba-529f8.firebasestorage.app",
  messagingSenderId: "124024222118",
  appId: "1:124024222118:web:6b472dd9ecc8711fc39f67",
  measurementId: "G-CP19VWFGPJ"
};

// Initialize Firebase using the Compat libraries for easier global integration
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Global instances
const auth = firebase.auth();
const db = firebase.firestore();
