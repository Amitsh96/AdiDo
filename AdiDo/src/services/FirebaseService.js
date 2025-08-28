import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  where 
} from 'firebase/firestore';
import { db } from './FirebaseConfig';

const TODOS_COLLECTION = 'todos';
const GROCERIES_COLLECTION = 'groceries';

export const FirebaseService = {
  // Todos
  async addTodo(todo, userId) {
    try {
      const docRef = await addDoc(collection(db, TODOS_COLLECTION), {
        ...todo,
        userId,
        sharedWith: [], // Array of user IDs who can access this
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding todo:', error);
      throw error;
    }
  },

  async updateTodo(todoId, updates) {
    try {
      const todoRef = doc(db, TODOS_COLLECTION, todoId);
      await updateDoc(todoRef, {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  },

  async deleteTodo(todoId) {
    try {
      const todoRef = doc(db, TODOS_COLLECTION, todoId);
      await deleteDoc(todoRef);
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  },

  subscribeTodos(userId, callback) {
    const todosQuery = query(
      collection(db, TODOS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(todosQuery, (snapshot) => {
      const todos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(todos);
    });
  },

  // Groceries
  async addGrocery(grocery, userId) {
    try {
      const docRef = await addDoc(collection(db, GROCERIES_COLLECTION), {
        ...grocery,
        userId,
        sharedWith: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding grocery:', error);
      throw error;
    }
  },

  async updateGrocery(groceryId, updates) {
    try {
      const groceryRef = doc(db, GROCERIES_COLLECTION, groceryId);
      await updateDoc(groceryRef, {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating grocery:', error);
      throw error;
    }
  },

  async deleteGrocery(groceryId) {
    try {
      const groceryRef = doc(db, GROCERIES_COLLECTION, groceryId);
      await deleteDoc(groceryRef);
    } catch (error) {
      console.error('Error deleting grocery:', error);
      throw error;
    }
  },

  subscribeGroceries(userId, callback) {
    const groceriesQuery = query(
      collection(db, GROCERIES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(groceriesQuery, (snapshot) => {
      const groceries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(groceries);
    });
  },

  // Sharing functionality
  async shareListWith(listType, listId, targetUserId) {
    try {
      const collectionName = listType === 'todo' ? TODOS_COLLECTION : GROCERIES_COLLECTION;
      const docRef = doc(db, collectionName, listId);
      
      // Add the target user to sharedWith array
      await updateDoc(docRef, {
        sharedWith: [...(doc.data().sharedWith || []), targetUserId],
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error sharing list:', error);
      throw error;
    }
  }
};