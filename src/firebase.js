// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAk_KiOm3U6oEjsuLcfimZVOGHww0lLJxM",
  authDomain: "obras-track.firebaseapp.com",
  projectId: "obras-track",
  storageBucket: "obras-track.firebasestorage.app",
  messagingSenderId: "374432027411",
  appId: "1:374432027411:web:195dd42e0a015ab52280e6",
  measurementId: "G-1YVLBRR5VQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
