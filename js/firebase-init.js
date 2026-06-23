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

// Global instances (safeguarded for pages that don't load all SDKs)
const auth = typeof firebase.auth === 'function' ? firebase.auth() : null;
const db = typeof firebase.firestore === 'function' ? firebase.firestore() : null;
const storage = typeof firebase.storage === 'function' ? firebase.storage() : null;
