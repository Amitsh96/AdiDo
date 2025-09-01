import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from '../../services/FirebaseConfig';

export class RealtimeService {
  static listeners = {};

  static setupRealtimeListeners(currentUser, currentGroupId, callbacks) {
    if (!currentUser) return;

    console.log('Setting up realtime listeners for group ID:', currentGroupId);

    // Clean up existing listeners
    this.cleanupListeners();

    // Setup todos listener
    const todosQuery = currentGroupId === 'personal' 
      ? query(
          collection(db, 'todos'),
          where('userId', '==', currentUser.uid)
        )
      : query(
          collection(db, `groups/${currentGroupId}/todos`),
          orderBy('order', 'asc')
        );

    this.listeners.todos = onSnapshot(todosQuery, (snapshot) => {
      const todos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`[TODOS] Received ${snapshot.docs.length} docs for group ${currentGroupId}`);
      
      if (callbacks.onTodosUpdate) {
        callbacks.onTodosUpdate(todos);
      }
    });

    // Setup groceries listener  
    const groceriesQuery = currentGroupId === 'personal'
      ? query(
          collection(db, 'groceries'),
          where('userId', '==', currentUser.uid)
        )
      : query(
          collection(db, `groups/${currentGroupId}/groceries`),
          orderBy('order', 'asc')
        );

    this.listeners.groceries = onSnapshot(groceriesQuery, (snapshot) => {
      const groceries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`[GROCERIES] Received ${snapshot.docs.length} docs for group ${currentGroupId}`);
      
      if (callbacks.onGroceriesUpdate) {
        callbacks.onGroceriesUpdate(groceries);
      }
    });

    // Setup events listener
    const eventsQuery = query(
      collection(db, 'events'),
      where('userId', '==', currentUser.uid)
    );

    this.listeners.events = onSnapshot(eventsQuery, (snapshot) => {
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`[EVENTS] Received ${snapshot.docs.length} docs for group ${currentGroupId}`);
      
      if (callbacks.onEventsUpdate) {
        callbacks.onEventsUpdate(events);
      }
    });
  }

  static cleanupListeners() {
    Object.values(this.listeners).forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners = {};
  }
}