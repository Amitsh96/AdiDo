import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../services/FirebaseConfig';

export class EventService {
  static async addEvent(eventData, currentUser, currentGroupId) {
    try {
      const eventDateTime = new Date(`${eventData.date}T${eventData.time || '00:00'}`);
      
      await addDoc(collection(db, 'events'), {
        name: eventData.name,
        description: eventData.description || '',
        location: eventData.location || '',
        datetime: eventDateTime,
        userId: currentUser.uid,
        groupId: currentGroupId === 'personal' ? null : currentGroupId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }

  static async updateEvent(eventId, eventData) {
    try {
      const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);
      
      await updateDoc(doc(db, 'events', eventId), {
        name: eventData.name,
        description: eventData.description,
        location: eventData.location,
        datetime: eventDateTime,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  static async deleteEvent(eventId) {
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  static getFilteredEvents(events, currentUser, currentGroupId) {
    if (!events) return [];

    return events
      .filter(event => {
        if (currentGroupId === 'personal') {
          return !event.groupId;
        } else {
          return !event.isPrivate || event.userId === currentUser?.uid;
        }
      })
      .sort((a, b) => {
        const aDate = a.datetime?.seconds ? new Date(a.datetime.seconds * 1000) : new Date(a.datetime);
        const bDate = b.datetime?.seconds ? new Date(b.datetime.seconds * 1000) : new Date(b.datetime);
        return aDate - bDate;
      });
  }

  static formatEventDate(datetime) {
    if (!datetime) return '';
    
    const date = datetime.seconds ? new Date(datetime.seconds * 1000) : new Date(datetime);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > 1) return `In ${diffDays} days`;
    
    return date.toLocaleDateString();
  }
}