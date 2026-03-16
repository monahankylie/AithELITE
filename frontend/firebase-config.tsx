import {initializeApp, getApps, getApp} from "firebase/app";
import {getAuth, type Auth} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};


const isClient = typeof window !== "undefined";
const app = isClient
  ? getApps().length ? getApp() : initializeApp(firebaseConfig)
  : undefined;
const auth = (isClient ? getAuth(app!) : null) as Auth;

// Initialize Firestore with local cache for persistence if on the client
const db = (isClient
  ? initializeFirestore(app!, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : null) as Firestore;

export {app, auth, db};
