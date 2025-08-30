import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from './FirebaseConfig';

const TODOS_COLLECTION = 'todos';
const GROCERIES_COLLECTION = 'groceries';
const EVENTS_COLLECTION = 'events';
const TAGS_COLLECTION = 'tags';

export const SimpleFirebaseService = {
  // Todos
  async addTodo(todo, userId) {
    try {
      console.log('Adding todo:', todo, 'for user:', userId);
      const docRef = await addDoc(collection(db, TODOS_COLLECTION), {
        ...todo,
        userId,
        dueDate: todo.dueDate || null,
        category: todo.category || 'personal',
        priority: todo.priority || 'medium',
        order: todo.order || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Todo added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding todo:', error);
      throw error;
    }
  },

  async updateTodo(todoId, updates) {
    try {
      console.log('Updating todo:', todoId, updates);
      const todoRef = doc(db, TODOS_COLLECTION, todoId);
      await updateDoc(todoRef, {
        ...updates,
        updatedAt: new Date()
      });
      console.log('Todo updated successfully');
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  },

  async deleteTodo(todoId) {
    try {
      console.log('Deleting todo:', todoId);
      const todoRef = doc(db, TODOS_COLLECTION, todoId);
      await deleteDoc(todoRef);
      console.log('Todo deleted successfully');
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  },

  subscribeTodos(userId, callback) {
    console.log('Subscribing to SHARED todos for user:', userId);
    const todosQuery = query(
      collection(db, TODOS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(todosQuery, (snapshot) => {
      console.log('Received todos update, doc count:', snapshot.docs.length);
      const todos = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Todo doc:', doc.id, data);
        return {
          id: doc.id,
          ...data
        };
      });
      // Return ALL todos instead of filtering by userId for sharing
      callback(todos);
    }, (error) => {
      console.error('Error in todos subscription:', error);
    });
  },

  // Groceries
  async addGrocery(grocery, userId) {
    try {
      console.log('Adding grocery:', grocery, 'for user:', userId);
      const docRef = await addDoc(collection(db, GROCERIES_COLLECTION), {
        ...grocery,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Grocery added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding grocery:', error);
      throw error;
    }
  },

  async updateGrocery(groceryId, updates) {
    try {
      console.log('Updating grocery:', groceryId, updates);
      const groceryRef = doc(db, GROCERIES_COLLECTION, groceryId);
      await updateDoc(groceryRef, {
        ...updates,
        updatedAt: new Date()
      });
      console.log('Grocery updated successfully');
    } catch (error) {
      console.error('Error updating grocery:', error);
      throw error;
    }
  },

  async deleteGrocery(groceryId) {
    try {
      console.log('Deleting grocery:', groceryId);
      const groceryRef = doc(db, GROCERIES_COLLECTION, groceryId);
      await deleteDoc(groceryRef);
      console.log('Grocery deleted successfully');
    } catch (error) {
      console.error('Error deleting grocery:', error);
      throw error;
    }
  },

  subscribeGroceries(userId, callback) {
    console.log('Subscribing to SHARED groceries for user:', userId);
    const groceriesQuery = query(
      collection(db, GROCERIES_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(groceriesQuery, (snapshot) => {
      console.log('Received groceries update, doc count:', snapshot.docs.length);
      const groceries = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Grocery doc:', doc.id, data);
        return {
          id: doc.id,
          ...data
        };
      });
      // Return ALL groceries instead of filtering by userId for sharing
      callback(groceries);
    }, (error) => {
      console.error('Error in groceries subscription:', error);
    });
  },

  // Events
  async addEvent(event, userId) {
    try {
      console.log('Adding event:', event, 'for user:', userId);
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
        ...event,
        userId,
        dueDate: event.dueDate || null,
        category: event.category || 'personal',
        priority: event.priority || 'medium',
        order: event.order || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Event added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  },

  async updateEvent(eventId, updates) {
    try {
      console.log('Updating event:', eventId, updates);
      const eventRef = doc(db, EVENTS_COLLECTION, eventId);
      await updateDoc(eventRef, {
        ...updates,
        updatedAt: new Date()
      });
      console.log('Event updated successfully');
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },

  async deleteEvent(eventId) {
    try {
      console.log('Deleting event:', eventId);
      const eventRef = doc(db, EVENTS_COLLECTION, eventId);
      await deleteDoc(eventRef);
      console.log('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  },

  subscribeEvents(userId, callback) {
    console.log('Subscribing to SHARED events for user:', userId);
    const eventsQuery = query(
      collection(db, EVENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(eventsQuery, (snapshot) => {
      console.log('Received events update, doc count:', snapshot.docs.length);
      const events = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Event doc:', doc.id, data);
        return {
          id: doc.id,
          ...data
        };
      });
      // Return ALL events instead of filtering by userId for sharing
      callback(events);
    }, (error) => {
      console.error('Error in events subscription:', error);
    });
  },

  // Tags
  async addTag(tag, userId) {
    try {
      console.log('Adding tag:', tag, 'for user:', userId);
      const docRef = await addDoc(collection(db, TAGS_COLLECTION), {
        name: tag.name,
        color: tag.color || '#667eea',
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Tag added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding tag:', error);
      throw error;
    }
  },

  async deleteTag(tagId) {
    try {
      console.log('Deleting tag:', tagId);
      const tagRef = doc(db, TAGS_COLLECTION, tagId);
      await deleteDoc(tagRef);
      console.log('Tag deleted successfully');
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  },

  subscribeTags(userId, callback) {
    console.log('Subscribing to tags for user:', userId);
    const tagsQuery = query(
      collection(db, TAGS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(tagsQuery, (snapshot) => {
      console.log('Received tags update, doc count:', snapshot.docs.length);
      const tags = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Tag doc:', doc.id, data);
        return {
          id: doc.id,
          ...data
        };
      });
      // Return ALL tags instead of filtering by userId for sharing
      callback(tags);
    }, (error) => {
      console.error('Error in tags subscription:', error);
    });
  }
};