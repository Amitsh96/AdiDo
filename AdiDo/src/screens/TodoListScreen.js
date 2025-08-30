import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { SimpleFirebaseService } from '../services/SimpleFirebaseService';
import { AuthService } from '../services/AuthService';

const TodoListScreen = () => {
  const [todos, setTodos] = useState([]);
  const [inputText, setInputText] = useState('');
  const [user, setUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('personal');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [tags, setTags] = useState([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#667eea');

  const defaultCategories = ['personal', 'work', 'urgent'];
  const priorities = ['low', 'medium', 'high'];
  const tagColors = ['#667eea', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#2196f3', '#00bcd4', '#ff5722'];

  useEffect(() => {
    console.log('TodoListScreen: Setting up auth listener');
    const unsubscribeAuth = AuthService.onAuthStateChanged((user) => {
      console.log('TodoListScreen: Auth state changed', user?.uid);
      setUser(user);
      if (user) {
        console.log('TodoListScreen: Subscribing to todos for user:', user.uid);
        const unsubscribeTodos = SimpleFirebaseService.subscribeTodos(user.uid, (todos) => {
          console.log('TodoListScreen: Received todos:', todos);
          setTodos(todos);
        });
        
        console.log('TodoListScreen: Subscribing to tags for user:', user.uid);
        const unsubscribeTags = SimpleFirebaseService.subscribeTags(user.uid, (tags) => {
          console.log('TodoListScreen: Received tags:', tags);
          setTags(tags);
        });
        
        return () => {
          console.log('TodoListScreen: Unsubscribing from todos and tags');
          unsubscribeTodos();
          unsubscribeTags();
        };
      } else {
        console.log('TodoListScreen: No user, clearing todos and tags');
        setTodos([]);
        setTags([]);
      }
    });

    return unsubscribeAuth;
  }, []);

  const addTodo = async () => {
    console.log('TodoListScreen: addTodo called', inputText, user?.uid);
    if (inputText.trim() && user) {
      try {
        const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.order || 0)) : 0;
        const newTodo = {
          text: inputText.trim(),
          completed: false,
          category: selectedCategory,
          priority: selectedPriority,
          dueDate: dueDate ? new Date(dueDate) : null,
          order: maxOrder + 1,
        };
        console.log('TodoListScreen: Adding todo:', newTodo);
        await SimpleFirebaseService.addTodo(newTodo, user.uid);
        setInputText('');
        setDueDate('');
        setSelectedCategory('personal');
        setSelectedPriority('medium');
        setShowAddModal(false);
        console.log('TodoListScreen: Todo added successfully');
      } catch (error) {
        console.error('TodoListScreen: Error adding todo:', error);
        Alert.alert('Error', `Failed to add todo: ${error.message}`);
      }
    } else {
      console.log('TodoListScreen: Cannot add todo - missing text or user');
    }
  };

  const toggleTodo = async (id) => {
    console.log('TodoListScreen: toggleTodo called', id);
    try {
      const todo = todos.find(t => t.id === id);
      console.log('TodoListScreen: Found todo:', todo);
      await SimpleFirebaseService.updateTodo(id, { completed: !todo.completed });
      console.log('TodoListScreen: Todo toggled successfully');
    } catch (error) {
      console.error('TodoListScreen: Error toggling todo:', error);
      Alert.alert('Error', `Failed to update todo: ${error.message}`);
    }
  };

  const deleteTodo = async (id) => {
    console.log('TodoListScreen: deleteTodo called', id);
    
    const confirmed = window.confirm('Are you sure you want to delete this todo item?');
    
    if (confirmed) {
      try {
        console.log('TodoListScreen: Deleting todo:', id);
        await SimpleFirebaseService.deleteTodo(id);
        console.log('TodoListScreen: Todo deleted successfully');
      } catch (error) {
        console.error('TodoListScreen: Error deleting todo:', error);
        window.alert(`Failed to delete todo: ${error.message}`);
      }
    } else {
      console.log('TodoListScreen: Delete cancelled');
    }
  };

  const addTag = async () => {
    console.log('TodoListScreen: addTag called', newTagName, user?.uid);
    if (newTagName.trim() && user) {
      try {
        const tag = {
          name: newTagName.trim(),
          color: newTagColor,
        };
        console.log('TodoListScreen: Adding tag:', tag);
        await SimpleFirebaseService.addTag(tag, user.uid);
        setNewTagName('');
        setNewTagColor('#667eea');
        setShowTagModal(false);
        console.log('TodoListScreen: Tag added successfully');
      } catch (error) {
        console.error('TodoListScreen: Error adding tag:', error);
        Alert.alert('Error', `Failed to add tag: ${error.message}`);
      }
    } else {
      console.log('TodoListScreen: Cannot add tag - missing name or user');
    }
  };

  const deleteTag = async (tagId) => {
    console.log('TodoListScreen: deleteTag called', tagId);
    
    const confirmed = window.confirm('Are you sure you want to delete this tag?');
    
    if (confirmed) {
      try {
        console.log('TodoListScreen: Deleting tag:', tagId);
        await SimpleFirebaseService.deleteTag(tagId);
        console.log('TodoListScreen: Tag deleted successfully');
      } catch (error) {
        console.error('TodoListScreen: Error deleting tag:', error);
        window.alert(`Failed to delete tag: ${error.message}`);
      }
    } else {
      console.log('TodoListScreen: Tag delete cancelled');
    }
  };

  const getAllCategories = () => {
    const customTagNames = tags.map(tag => tag.name);
    return [...defaultCategories, ...customTagNames];
  };

  const getFilteredTodos = () => {
    let filtered = todos;
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(todo => todo.category === filterCategory);
    }
    
    return filtered.sort((a, b) => {
      if ((a.order || 0) !== (b.order || 0)) {
        return (a.order || 0) - (b.order || 0);
      }
      
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate.seconds * 1000) - new Date(b.dueDate.seconds * 1000);
      }
      
      return 0;
    });
  };

  const formatDate = (date) => {
    if (!date) return null;
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#666666';
    }
  };

  const getCategoryColor = (category) => {
    const defaultColors = {
      work: '#2196f3',
      personal: '#4caf50',
      urgent: '#ff5722'
    };
    
    // Check if it's a default category
    if (defaultColors[category]) {
      return defaultColors[category];
    }
    
    // Check if it's a custom tag
    const customTag = tags.find(tag => tag.name === category);
    if (customTag) {
      return customTag.color;
    }
    
    return '#667eea';
  };

  const renderTodoItem = ({ item }) => (
    <View style={styles.todoItem}>
      <TouchableOpacity
        style={[
          styles.checkbox, 
          { borderColor: getCategoryColor(item.category) },
          item.completed && { backgroundColor: getCategoryColor(item.category) }
        ]}
        onPress={() => toggleTodo(item.id)}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      
      <View style={styles.todoContent}>
        <View style={styles.todoHeader}>
          <Text style={[
            styles.todoText,
            item.completed && styles.todoTextCompleted
          ]}>
            {item.text}
          </Text>
          <View style={[styles.priorityTag, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
        </View>
        
        <View style={styles.todoFooter}>
          <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(item.category) }]}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          {item.dueDate && (
            <Text style={styles.dueDate}>
              Due: {formatDate(item.dueDate)}
            </Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteTodo(item.id)}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  const filteredTodos = getFilteredTodos();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Enhanced Todo List</Text>
        <Text style={styles.counter}>
          {filteredTodos.filter(t => !t.completed).length} remaining
        </Text>
        
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
            {['all', ...getAllCategories()].map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterButton,
                  { backgroundColor: filterCategory === category ? '#667eea' : '#f5f5f5' }
                ]}
                onPress={() => setFilterCategory(category)}
              >
                <Text style={[
                  styles.filterText,
                  { color: filterCategory === category ? 'white' : '#333' }
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity 
            style={styles.tagManageButton}
            onPress={() => setShowTagModal(true)}
          >
            <Text style={styles.tagManageText}>+ Tags</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addButtonText}>✨ Add New Todo</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredTodos}
        renderItem={renderTodoItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Todo</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter todo text..."
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            <View style={styles.inputRow}>
              <Text style={styles.label}>Category:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.pickerContainer}>
                  {getAllCategories().map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.pickerOption,
                        { backgroundColor: selectedCategory === cat ? getCategoryColor(cat) : '#f5f5f5' }
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text style={[
                        styles.pickerText,
                        { color: selectedCategory === cat ? 'white' : '#333' }
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.label}>Priority:</Text>
              <View style={styles.pickerContainer}>
                {priorities.map(pri => (
                  <TouchableOpacity
                    key={pri}
                    style={[
                      styles.pickerOption,
                      { backgroundColor: selectedPriority === pri ? getPriorityColor(pri) : '#f5f5f5' }
                    ]}
                    onPress={() => setSelectedPriority(pri)}
                  >
                    <Text style={[
                      styles.pickerText,
                      { color: selectedPriority === pri ? 'white' : '#333' }
                    ]}>
                      {pri}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.label}>Due Date:</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                value={dueDate}
                onChangeText={setDueDate}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#f5f5f5' }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#333' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#667eea' }]}
                onPress={addTodo}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tag Management Modal */}
      <Modal
        visible={showTagModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTagModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Tags</Text>
            
            {/* Existing Tags */}
            <View style={styles.existingTagsSection}>
              <Text style={styles.label}>Existing Tags:</Text>
              <ScrollView style={styles.existingTagsList}>
                {tags.map(tag => (
                  <View key={tag.id} style={styles.existingTagItem}>
                    <View style={[styles.tagColorIndicator, { backgroundColor: tag.color }]} />
                    <Text style={styles.existingTagName}>{tag.name}</Text>
                    <TouchableOpacity
                      style={styles.deleteTagButton}
                      onPress={() => deleteTag(tag.id)}
                    >
                      <Text style={styles.deleteTagText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {tags.length === 0 && (
                  <Text style={styles.noTagsText}>No custom tags yet</Text>
                )}
              </ScrollView>
            </View>

            {/* Add New Tag */}
            <View style={styles.addTagSection}>
              <Text style={styles.label}>Add New Tag:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter tag name..."
                value={newTagName}
                onChangeText={setNewTagName}
              />
              
              <View style={styles.inputRow}>
                <Text style={styles.label}>Color:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.colorPickerContainer}>
                    {tagColors.map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          newTagColor === color && styles.selectedColorOption
                        ]}
                        onPress={() => setNewTagColor(color)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#f5f5f5' }]}
                onPress={() => setShowTagModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#333' }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#667eea' }]}
                onPress={addTag}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Add Tag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  counter: {
    fontSize: 16,
    marginTop: 5,
    marginBottom: 15,
    color: '#666',
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  tagManageButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  tagManageText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  addButton: {
    backgroundColor: '#667eea',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  todoContent: {
    flex: 1,
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    marginRight: 8,
    color: '#333',
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priorityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  todoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dueDate: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
  },
  deleteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    color: '#333',
  },
  inputRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  existingTagsSection: {
    marginBottom: 20,
    maxHeight: 150,
  },
  existingTagsList: {
    maxHeight: 100,
  },
  existingTagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  tagColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  existingTagName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  deleteTagButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteTagText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
  },
  noTagsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  addTagSection: {
    marginBottom: 20,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: '#333',
    borderWidth: 3,
  },
});

export default TodoListScreen;