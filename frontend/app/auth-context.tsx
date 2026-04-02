/**
 * AUTH CONTEXT
 * This file provides a global authentication state for the entire application.
 * It listens to Firebase Auth changes and fetches additional user profile data from Firestore.
 * Components can use the `useAuth` hook to access the current user, their profile, and loading state.
 */
import React, {createContext, useContext, useEffect, useState} from "react";
import {onAuthStateChanged, type User} from "firebase/auth";
import {doc, onSnapshot} from "firebase/firestore";
import {auth, db} from "../firebase-config";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  organization?: string;
  role?: string;
  watchlistIndex?: Record<string, { name: string; count: number; tags?: string[]; favorite?: boolean }>;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        
        // Use onSnapshot for real-time updates and to avoid extra manual fetches
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile({
              firstName: firebaseUser.displayName?.split(" ")[0] || "User",
              lastName: firebaseUser.displayName?.split(" ").slice(1).join(" ") || "",
              email: firebaseUser.email || "",
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return <AuthContext.Provider value={{user, profile, loading}}>{children}</AuthContext.Provider>;
};
