import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
  serverTimestamp,
  addDoc,
  increment,
} from "firebase/firestore";
import { db } from "../../firebase-config";

export interface UserList {
  id: string;
  name: string;
  playerIds: string[];
}

class WatchlistService {
  /**
   * Fetches all lists for a specific user from /users/{userId}/lists
   * (Keep this for when we need the full player ID list)
   */
  async fetchUserLists(userId: string): Promise<UserList[]> {
    if (!db) throw new Error("Firestore not initialized");

    const listsRef = collection(db, "users", userId, "lists");
    const snap = await getDocs(listsRef);

    return snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name || "Untitled List",
      playerIds: d.data().playerIds || [],
    }));
  }

  /**
   * Creates a new list in /users/{userId}/lists and updates the user profile index
   */
  async createList(userId: string, name: string, playerIds: string[] = []): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");

    const listsRef = collection(db, "users", userId, "lists");
    const docRef = await addDoc(listsRef, {
      name,
      playerIds,
      createdAt: serverTimestamp(),
    });

    // Sync metadata to user profile for efficient indexing
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      watchlistIndex: {
        [docRef.id]: {
          name,
          count: playerIds.length
        }
      }
    }, { merge: true });

    return docRef.id;
  }

  /**
   * Adds player IDs to an existing list and increments the count in the profile index
   */
  async addPlayersToList(userId: string, listId: string, playerIds: string[]): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const listRef = doc(db, "users", userId, "lists", listId);
    await updateDoc(listRef, {
      playerIds: arrayUnion(...playerIds),
    });

    // Update count in the user profile index
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      [`watchlistIndex.${listId}.count`]: increment(playerIds.length)
    });
  }
}

export const watchlistService = new WatchlistService();
