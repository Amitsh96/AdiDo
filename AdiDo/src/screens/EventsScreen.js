import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SimpleFirebaseService } from '../services/SimpleFirebaseService';
import { AuthService } from '../services/AuthService';

// Custom DatePicker component for web
const DatePickerInput = ({ value, onDateChange, style }) => {
  const handleDateChange = (event) => {
    onDateChange(event.target.value);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date)) return '';
      return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    } catch {
      return '';
    }
  };

  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={formatDateForInput(value)}
        onChange={handleDateChange}
        style={{
          ...style,
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '15px',
          fontSize: '16px',
          backgroundColor: 'white',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    );
  } else {
    // Fallback for mobile - keep as TextInput
    return (
      <TextInput
        style={style}
        placeholder="Date (YYYY-MM-DD)"
        value={value}
        onChangeText={onDateChange}
      />
    );
  }
};

const EventsScreen = () => {
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form fields
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState(() => {
    // Set default date to today
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });

  useEffect(() => {
    console.log('EventsScreen: Setting up auth listener');
    const unsubscribeAuth = AuthService.onAuthStateChanged((user) => {
      console.log('EventsScreen: Auth state changed', user?.uid);
      setUser(user);
      if (user) {
        console.log('EventsScreen: Subscribing to events for user:', user.uid);
        const unsubscribeEvents = SimpleFirebaseService.subscribeEvents(user.uid, (events) => {
          console.log('EventsScreen: Received events:', events);
          setEvents(events);
        });
        
        return () => {
          console.log('EventsScreen: Unsubscribing from events');
          unsubscribeEvents();
        };
      } else {
        console.log('EventsScreen: No user, clearing events');
        setEvents([]);
      }
    });

    return unsubscribeAuth;
  }, []);

  const addEvent = async () => {
    console.log('EventsScreen: addEvent called', eventName, eventDescription, eventDate);
    
    if (!eventName.trim()) {
      window.alert('Please enter an event name');
      return;
    }
    
    if (!eventDate.trim()) {
      window.alert('Please select an event date');
      return;
    }

    // Validate date format
    try {
      const testDate = new Date(eventDate);
      if (isNaN(testDate)) {
        window.alert('Please enter a valid date');
        return;
      }
    } catch (error) {
      window.alert('Please enter a valid date');
      return;
    }

    if (user) {
      try {
        const newEvent = {
          name: eventName.trim(),
          description: eventDescription.trim(),
          date: eventDate.trim(), // Date will be in YYYY-MM-DD format from picker
          completed: false,
        };
        console.log('EventsScreen: Adding event:', newEvent);
        await SimpleFirebaseService.addEvent(newEvent, user.uid);
        
        // Clear form
        setEventName('');
        setEventDescription('');
        setEventDate(new Date().toISOString().split('T')[0]); // Reset to today
        setShowAddForm(false);
        
        console.log('EventsScreen: Event added successfully');
      } catch (error) {
        console.error('EventsScreen: Error adding event:', error);
        window.alert(`Failed to add event: ${error.message}`);
      }
    } else {
      console.log('EventsScreen: Cannot add event - no user');
    }
  };

  const toggleEvent = async (id) => {
    console.log('EventsScreen: toggleEvent called', id);
    try {
      const event = events.find(e => e.id === id);
      console.log('EventsScreen: Found event:', event);
      await SimpleFirebaseService.updateEvent(id, { completed: !event.completed });
      console.log('EventsScreen: Event toggled successfully');
    } catch (error) {
      console.error('EventsScreen: Error toggling event:', error);
      window.alert(`Failed to update event: ${error.message}`);
    }
  };

  const deleteEvent = async (id) => {
    console.log('EventsScreen: deleteEvent called', id);
    
    const confirmed = window.confirm('Are you sure you want to delete this event?');
    
    if (confirmed) {
      try {
        console.log('EventsScreen: Deleting event:', id);
        await SimpleFirebaseService.deleteEvent(id);
        console.log('EventsScreen: Event deleted successfully');
      } catch (error) {
        console.error('EventsScreen: Error deleting event:', error);
        window.alert(`Failed to delete event: ${error.message}`);
      }
    } else {
      console.log('EventsScreen: Delete cancelled');
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };

  const getDaysUntil = (dateString) => {
    try {
      const eventDate = new Date(dateString);
      const today = new Date();
      const diffTime = eventDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return `${Math.abs(diffDays)} days ago`;
      } else if (diffDays === 0) {
        return 'Today!';
      } else if (diffDays === 1) {
        return 'Tomorrow';
      } else {
        return `in ${diffDays} days`;
      }
    } catch (error) {
      return '';
    }
  };

  const renderEventItem = ({ item }) => (
    <View style={styles.eventItem}>
      <TouchableOpacity
        style={[styles.checkbox, item.completed && styles.checkboxChecked]}
        onPress={() => toggleEvent(item.id)}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      
      <View style={styles.eventInfo}>
        <Text style={[styles.eventName, item.completed && styles.eventNameCompleted]}>
          {item.name}
        </Text>
        {item.description ? (
          <Text style={[styles.eventDescription, item.completed && styles.eventDescriptionCompleted]}>
            {item.description}
          </Text>
        ) : null}
        <Text style={[styles.eventDate, item.completed && styles.eventDateCompleted]}>
          {formatDate(item.date)} • {getDaysUntil(item.date)}
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteEvent(item.id)}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Events</Text>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Text style={styles.addButtonText}>{showAddForm ? '−' : '+'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.counter}>
          {events.filter(e => !e.completed).length} upcoming events
        </Text>
      </View>

      {showAddForm && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            placeholder="Event name (required)"
            value={eventName}
            onChangeText={setEventName}
          />
          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            value={eventDescription}
            onChangeText={setEventDescription}
            multiline
          />
          <View style={styles.datePickerContainer}>
            <Text style={styles.dateLabel}>Event Date:</Text>
            <DatePickerInput
              value={eventDate}
              onDateChange={setEventDate}
              style={styles.input}
            />
          </View>
          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.saveButton} onPress={addEvent}>
              <Text style={styles.saveButtonText}>Add Event</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => {
                setShowAddForm(false);
                setEventName('');
                setEventDescription('');
                setEventDate(new Date().toISOString().split('T')[0]); // Reset to today
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={events.sort((a, b) => new Date(a.date) - new Date(b.date))}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No events yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your first event using the + button</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 32,
    height: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  counter: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  addForm: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: 'white',
  },
  datePickerContainer: {
    marginBottom: 15,
  },
  dateLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  eventNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventDescriptionCompleted: {
    color: '#999',
  },
  eventDate: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  eventDateCompleted: {
    color: '#999',
  },
  deleteButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default EventsScreen;