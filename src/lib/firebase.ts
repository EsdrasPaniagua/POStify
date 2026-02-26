import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDPhrN4S-xQ1fUfkHvQp33tcpa5LcI1el8",
  authDomain: "postify-4c544.firebaseapp.com",
  projectId: "postify-4c544",
  storageBucket: "postify-4c544.firebasestorage.app",
  messagingSenderId: "56504875241",
  appId: "1:56504875241:web:c6c6ec5fbe992fcdfa9878"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);