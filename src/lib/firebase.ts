// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWfHPsEOU50o5oLLNKF0YycHlyNF6gjKA",
  authDomain: "vtu-assistant-rkmf1.firebaseapp.com",
  projectId: "vtu-assistant-rkmf1",
  storageBucket: "vtu-assistant-rkmf1.appspot.com",
  messagingSenderId: "998939257663",
  appId: "1:998939257663:web:1b33f669b722eaa991c18a"
};


// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);

export { app, auth };
