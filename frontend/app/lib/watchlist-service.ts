import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  addDoc,
  increment,
  deleteField,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase-config";

export interface UserList {
  id: string;
  name: string;
  playerIds: string[];
  tags: string[];
  favorite: boolean;
}

class WatchlistService {
  private sanitizeName(name: string) {
    return name.trim();
  }

  private sanitizeTags(tags: string[] = []) {
    return Array.from(
      new Set(
        tags
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ).slice(0, 8);
  }

  private mapList(id: string, data: Record<string, unknown>): UserList {
    return {
      id,
      name: typeof data.name === "string" && data.name.trim() ? data.name : "Untitled List",
      playerIds: Array.isArray(data.playerIds) ? (data.playerIds as string[]) : [],
      tags: this.sanitizeTags(Array.isArray(data.tags) ? (data.tags as string[]) : []),
      favorite: Boolean(data.favorite),
    };
  }

  /**
   * Fetches all lists for a specific user from /users/{userId}/lists
   * (Keep this for when we need the full player ID list)
   */
  async fetchUserLists(userId: string): Promise<UserList[]> {
    if (!db) throw new Error("Firestore not initialized");

    const listsRef = collection(db, "users", userId, "lists");
    const snap = await getDocs(listsRef);

    return snap.docs.map((d) => this.mapList(d.id, d.data() as Record<string, unknown>));
  }

  /**
   * Fetches a specific list by its ID
   */
  async fetchListById(userId: string, listId: string): Promise<UserList | null> {
    if (!db) throw new Error("Firestore not initialized");

    const listRef = doc(db, "users", userId, "lists", listId);
    const snap = await getDoc(listRef);

    if (!snap.exists()) return null;

    return this.mapList(snap.id, snap.data() as Record<string, unknown>);
  }

  /**
   * Creates a new list in /users/{userId}/lists and updates the user profile index
   */
  async createList(
    userId: string,
    name: string,
    playerIds: string[] = [],
    options: { tags?: string[]; favorite?: boolean } = {},
  ): Promise<{ id: string; addedCount: number }> {
    if (!db) throw new Error("Firestore not initialized");

    const sanitizedName = this.sanitizeName(name);
    if (!sanitizedName) throw new Error("List name is required.");

    const tags = this.sanitizeTags(options.tags);
    const favorite = Boolean(options.favorite);

    const listsRef = collection(db, "users", userId, "lists");
    const docRef = await addDoc(listsRef, {
      name: sanitizedName,
      playerIds,
      tags,
      favorite,
      createdAt: serverTimestamp(),
    });

    const userRef = doc(db, "users", userId);
    const batch = writeBatch(db);
    batch.update(userRef, {
      [`watchlistIndex.${docRef.id}`]: {
        name: sanitizedName,
        count: playerIds.length,
        tags,
        favorite,
      },
    });

    if (favorite) {
      const existingLists = await this.fetchUserLists(userId);
      for (const list of existingLists.filter((item) => item.id !== docRef.id)) {
        batch.update(doc(db, "users", userId, "lists", list.id), { favorite: false });
        batch.update(userRef, {
          [`watchlistIndex.${list.id}.favorite`]: false,
        });
      }
    }

    await batch.commit();

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
    const sanitizedName = this.sanitizeName(newName);
    if (!sanitizedName) throw new Error("List name is required.");

    const listRef = doc(db, "users", userId, "lists", listId);
    await updateDoc(listRef, {
      name: sanitizedName,
    });

    // Update name in the user profile index
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      [`watchlistIndex.${listId}.name`]: sanitizedName
    });
  }

  async updateListTags(userId: string, listId: string, tags: string[]): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const sanitizedTags = this.sanitizeTags(tags);
    const listRef = doc(db, "users", userId, "lists", listId);
    const userRef = doc(db, "users", userId);

    const batch = writeBatch(db);
    batch.update(listRef, { tags: sanitizedTags });
    batch.update(userRef, {
      [`watchlistIndex.${listId}.tags`]: sanitizedTags,
    });
    await batch.commit();
  }

  async setFavoriteList(userId: string, listId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const lists = await this.fetchUserLists(userId);
    const userRef = doc(db, "users", userId);
    const batch = writeBatch(db);

    for (const list of lists) {
      const isTarget = list.id === listId;
      batch.update(doc(db, "users", userId, "lists", list.id), { favorite: isTarget });
      batch.update(userRef, {
        [`watchlistIndex.${list.id}.favorite`]: isTarget,
      });
    }

    await batch.commit();
  }

  async clearFavoriteList(userId: string, listId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const listRef = doc(db, "users", userId, "lists", listId);
    const userRef = doc(db, "users", userId);

    const batch = writeBatch(db);
    batch.update(listRef, { favorite: false });
    batch.update(userRef, {
      [`watchlistIndex.${listId}.favorite`]: false,
    });
    await batch.commit();
  }

  /**
   * Deletes a list and removes its entry from the profile index
   */
  async deleteList(userId: string, listId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const batch = writeBatch(db);
    const listRef = doc(db, "users", userId, "lists", listId);
    const userRef = doc(db, "users", userId);

    // 1. Delete the actual list document
    batch.delete(listRef);

    // 2. Remove the index entry from the user profile
    batch.update(userRef, {
      [`watchlistIndex.${listId}`]: deleteField()
    });

    // 3. Commit both operations atomically
    await batch.commit();
  }
}

export const watchlistService = new WatchlistService();
