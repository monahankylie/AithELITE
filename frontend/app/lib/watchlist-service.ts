import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove, // Added arrayRemove
  query,
  where,
  serverTimestamp,
  addDoc,
  increment,
  FieldValue, // Added FieldValue
  deleteDoc,
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
   * Fetches a specific list by its ID
   */
  async fetchListById(userId: string, listId: string): Promise<UserList | null> {
    if (!db) throw new Error("Firestore not initialized");

    const listRef = doc(db, "users", userId, "lists", listId);
    const snap = await getDoc(listRef);

    if (!snap.exists()) return null;

    return {
      id: snap.id,
      name: snap.data().name || "Untitled List",
      playerIds: snap.data().playerIds || [],
    };
  }

  /**
   * Creates a new list in /users/{userId}/lists and updates the user profile index
   */
  async createList(userId: string, name: string, playerIds: string[] = []): Promise<{ id: string; addedCount: number }> {
    if (!db) throw new Error("Firestore not initialized");

    const listsRef = collection(db, "users", userId, "lists");
    const docRef = await addDoc(listsRef, {
      name,
      playerIds,
      createdAt: serverTimestamp(),
    });

    // Sync metadata to user profile for efficient indexing using dot notation to avoid overwriting the whole map
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      [`watchlistIndex.${docRef.id}`]: {
        name,
        count: playerIds.length
      }
    });

    return { id: docRef.id, addedCount: playerIds.length };
  }

  /**
   * Adds player IDs to an existing list and increments the count in the profile index
   * Returns information about how many were added vs how many were already there
   */
  async addPlayersToList(userId: string, listId: string, playerIds: string[]): Promise<{ addedCount: number; alreadyPresentCount: number }> {
    if (!db) throw new Error("Firestore not initialized");

    const listRef = doc(db, "users", userId, "lists", listId);
    
    // 1. Fetch the current list to get existing player IDs
    const listSnap = await getDoc(listRef);
    if (!listSnap.exists()) {
      throw new Error(`Watchlist ${listId} not found.`);
    }
    const existingPlayerIds: string[] = listSnap.data().playerIds || [];

    // 2. Determine which player IDs are actually new
    const newUniquePlayerIds = playerIds.filter(id => !existingPlayerIds.includes(id));
    const alreadyPresentCount = playerIds.length - newUniquePlayerIds.length;

    if (newUniquePlayerIds.length === 0) {
      // No new unique players to add, so don't perform any writes
      console.log("No new unique players to add to list:", listId);
      return { addedCount: 0, alreadyPresentCount }; 
    }

    // 3. Update the list document with only the new unique player IDs
    await updateDoc(listRef, {
      playerIds: arrayUnion(...newUniquePlayerIds),
    });

    // 4. Update count in the user profile index by the number of truly new players
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      [`watchlistIndex.${listId}.count`]: increment(newUniquePlayerIds.length)
    });

    return { addedCount: newUniquePlayerIds.length, alreadyPresentCount };
  }

  /**
   * Removes player IDs from an existing list and decrements the count in the profile index
   */
  async removePlayersFromList(userId: string, listId: string, playerIds: string[]): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const listRef = doc(db, "users", userId, "lists", listId);
    
    // 1. Fetch the current list to get existing player IDs
    const listSnap = await getDoc(listRef);
    if (!listSnap.exists()) {
      throw new Error(`Watchlist ${listId} not found.`);
    }
    const existingPlayerIds: string[] = listSnap.data().playerIds || [];

    // 2. Determine which player IDs are actually in the list and should be removed
    const playersToRemove = playerIds.filter(id => existingPlayerIds.includes(id));

    if (playersToRemove.length === 0) {
      console.log("No matching players to remove from list:", listId);
      return;
    }

    // 3. Update the list document by removing the players
    await updateDoc(listRef, {
      playerIds: arrayRemove(...playersToRemove),
    });

    // 4. Update count in the user profile index by decrementing the number of removed players
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      [`watchlistIndex.${listId}.count`]: increment(-playersToRemove.length)
    });
  }

  /**
   * Renames a list and updates its name in the profile index
   */
  async renameList(userId: string, listId: string, newName: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const listRef = doc(db, "users", userId, "lists", listId);
    await updateDoc(listRef, {
      name: newName,
    });

    // Update name in the user profile index
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      [`watchlistIndex.${listId}.name`]: newName
    });
  }

  /**
   * Deletes a list and removes its entry from the profile index
   */
  async deleteList(userId: string, listId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const listRef = doc(db, "users", userId, "lists", listId);
    await deleteDoc(listRef); // Assuming deleteDoc is also imported or available

    // Remove entry from the user profile index
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      [`watchlistIndex.${listId}`]: FieldValue.delete()
    });
  }
}

export const watchlistService = new WatchlistService();
