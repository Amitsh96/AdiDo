import AsyncStorage from '@react-native-async-storage/async-storage';

const TODOS_KEY = 'ADIDO_TODOS';
const GROCERIES_KEY = 'ADIDO_GROCERIES';

export const StorageService = {
  async saveTodos(todos) {
    try {
      await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(todos));
    } catch (error) {
      console.error('Error saving todos:', error);
    }
  },

  async loadTodos() {
    try {
      const todosJson = await AsyncStorage.getItem(TODOS_KEY);
      return todosJson ? JSON.parse(todosJson) : [];
    } catch (error) {
      console.error('Error loading todos:', error);
      return [];
    }
  },

  async saveGroceries(groceries) {
    try {
      await AsyncStorage.setItem(GROCERIES_KEY, JSON.stringify(groceries));
    } catch (error) {
      console.error('Error saving groceries:', error);
    }
  },

  async loadGroceries() {
    try {
      const groceriesJson = await AsyncStorage.getItem(GROCERIES_KEY);
      return groceriesJson ? JSON.parse(groceriesJson) : [];
    } catch (error) {
      console.error('Error loading groceries:', error);
      return [];
    }
  },

  async clearAllData() {
    try {
      await AsyncStorage.multiRemove([TODOS_KEY, GROCERIES_KEY]);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  },
};