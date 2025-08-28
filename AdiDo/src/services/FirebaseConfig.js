// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtFFJIFHxqFW54WliDHcWo0_3YQfClQBY",
  authDomain: "adido-3155.firebaseapp.com",
  projectId: "adido-3155",
  storageBucket: "adido-3155.firebasestorage.app",
  messagingSenderId: "175404203921",
  appId: "1:175404203921:web:da66b9aecb5dd2a9a82430"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;