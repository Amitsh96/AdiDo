// Import Firebase directly
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';

console.log('Loading AdiDo...');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtFFJIFHxqFW54WliDHcWo0_3YQfClQBY",
  authDomain: "adido-3155.firebaseapp.com",
  projectId: "adido-3155",
  storageBucket: "adido-3155.firebasestorage.app",
  messagingSenderId: "175404203921",
  appId: "1:175404203921:web:da66b9aecb5dd2a9a82430"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global state
let currentUser = null;
let todos = [];
let groceries = [];

// Create the main app HTML
function createApp() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div id="app" style="
      min-height: 100vh; 
      background-color: #f5f5f5; 
      font-family: Arial, sans-serif;
    ">
      <!-- Login Screen -->
      <div id="loginScreen" style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 20px;
        min-height: 100vh;
      ">
        <h1 style="
          font-size: 48px;
          font-weight: bold;
          color: #007AFF;
          margin-bottom: 10px;
        ">AdiDo</h1>
        <p style="
          font-size: 16px;
          color: #666;
          margin-bottom: 40px;
        ">Your shared todo & grocery lists</p>
        
        <input type="email" id="emailInput" placeholder="Email" style="
          width: 300px;
          height: 50px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 0 15px;
          margin-bottom: 15px;
          background-color: white;
        ">
        
        <input type="password" id="passwordInput" placeholder="Password" style="
          width: 300px;
          height: 50px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 0 15px;
          margin-bottom: 15px;
          background-color: white;
        ">
        
        <button id="authButton" style="
          width: 330px;
          height: 50px;
          background-color: #007AFF;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: bold;
          margin-top: 10px;
          cursor: pointer;
        ">Sign In</button>
        
        <button id="switchModeButton" style="
          background: none;
          border: none;
          color: #007AFF;
          font-size: 16px;
          margin-top: 20px;
          cursor: pointer;
        ">Don't have an account? Sign Up</button>
        
        <div id="authError" style="
          color: #FF3B30;
          margin-top: 15px;
          display: none;
        "></div>
      </div>

      <!-- Main Screen -->
      <div id="mainScreen" style="display: none;">
        <div id="navigation" style="
          display: flex;
          background-color: white;
          border-bottom: 1px solid #ddd;
          padding: 0;
        ">
          <button class="nav-tab active" data-tab="todos" style="
            flex: 1;
            padding: 15px;
            border: none;
            background: white;
            color: #007AFF;
            font-size: 16px;
            border-bottom: 2px solid #007AFF;
            cursor: pointer;
          ">Todo</button>
          <button class="nav-tab" data-tab="grocery" style="
            flex: 1;
            padding: 15px;
            border: none;
            background: white;
            color: #666;
            font-size: 16px;
            border-bottom: 2px solid transparent;
            cursor: pointer;
          ">Grocery</button>
          <button class="nav-tab" data-tab="profile" style="
            flex: 1;
            padding: 15px;
            border: none;
            background: white;
            color: #666;
            font-size: 16px;
            border-bottom: 2px solid transparent;
            cursor: pointer;
          ">Profile</button>
        </div>
        
        <div id="content" style="padding: 20px;">
          <!-- Content will be loaded here -->
        </div>
      </div>
    </div>
  `;

  setupEventListeners();
}

// Event listeners
function setupEventListeners() {
  let isSignUp = false;
  
  // Auth button
  document.getElementById('authButton').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('authError');
    
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }

    try {
      console.log('Attempting authentication...', isSignUp ? 'Sign Up' : 'Sign In', email);
      
      if (isSignUp) {
        console.log('Creating new user...');
        const result = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Sign up successful:', result.user.uid);
        showError('Account created successfully!', false);
      } else {
        console.log('Signing in existing user...');
        const result = await signInWithEmailAndPassword(auth, email, password);
        console.log('Sign in successful:', result.user.uid);
      }
    } catch (error) {
      console.error('Authentication error:', error.code, error.message);
      let message = 'Authentication failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/missing-password') {
        message = 'Please enter a password.';
      } else {
        message = `Error: ${error.message}`;
      }
      
      showError(message);
    }
  });
  
  // Switch mode button
  document.getElementById('switchModeButton').addEventListener('click', () => {
    isSignUp = !isSignUp;
    const authButton = document.getElementById('authButton');
    const switchButton = document.getElementById('switchModeButton');
    
    if (isSignUp) {
      authButton.textContent = 'Sign Up';
      switchButton.textContent = 'Already have an account? Sign In';
    } else {
      authButton.textContent = 'Sign In';
      switchButton.textContent = "Don't have an account? Sign Up";
    }
  });

  // Navigation tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      // Update active tab
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active');
        t.style.color = '#666';
        t.style.borderBottom = '2px solid transparent';
      });
      
      e.target.classList.add('active');
      e.target.style.color = '#007AFF';
      e.target.style.borderBottom = '2px solid #007AFF';
      
      // Load content
      loadTabContent(e.target.dataset.tab);
    });
  });
}

function showError(message, isError = true) {
  const errorDiv = document.getElementById('authError');
  errorDiv.textContent = message;
  errorDiv.style.color = isError ? '#FF3B30' : '#34C759';
  errorDiv.style.display = 'block';
}

function showMainScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display = 'block';
  loadTabContent('todos');
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('mainScreen').style.display = 'none';
}

function loadTabContent(tab) {
  const content = document.getElementById('content');
  
  if (tab === 'todos') {
    content.innerHTML = `
      <h2 style="color: #333; margin-bottom: 20px;">Todo List</h2>
      <div style="display: flex; margin-bottom: 20px;">
        <input type="text" id="todoInput" placeholder="Add a new todo..." style="
          flex: 1;
          height: 50px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 0 15px;
          background-color: white;
          margin-right: 10px;
        ">
        <button id="addTodoBtn" style="
          width: 50px;
          height: 50px;
          background-color: #007AFF;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 24px;
          font-weight: bold;
          cursor: pointer;
        ">+</button>
      </div>
      <div id="todosList"></div>
    `;
    
    document.getElementById('addTodoBtn').addEventListener('click', addTodo);
    document.getElementById('todoInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTodo();
    });
    
    renderTodos();
    
  } else if (tab === 'grocery') {
    content.innerHTML = `
      <h2 style="color: #333; margin-bottom: 20px;">Grocery List</h2>
      <div style="display: flex; margin-bottom: 20px;">
        <input type="text" id="groceryInput" placeholder="Add grocery item..." style="
          flex: 1;
          height: 50px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 0 15px;
          background-color: white;
          margin-right: 10px;
        ">
        <input type="text" id="quantityInput" placeholder="Qty" value="1" style="
          width: 60px;
          height: 50px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 0 10px;
          background-color: white;
          margin-right: 10px;
          text-align: center;
        ">
        <button id="addGroceryBtn" style="
          width: 50px;
          height: 50px;
          background-color: #34C759;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 24px;
          font-weight: bold;
          cursor: pointer;
        ">+</button>
      </div>
      <div id="groceriesList"></div>
    `;
    
    document.getElementById('addGroceryBtn').addEventListener('click', addGrocery);
    document.getElementById('groceryInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addGrocery();
    });
    
    renderGroceries();
    
  } else if (tab === 'profile') {
    content.innerHTML = `
      <h2 style="color: #333; margin-bottom: 20px;">Profile</h2>
      <div style="
        background-color: white;
        padding: 30px;
        border-radius: 12px;
        border: 1px solid #ddd;
        text-align: center;
        margin-bottom: 30px;
      ">
        <h3>Welcome, ${currentUser?.email || 'User'}!</h3>
        <p style="color: #666;">Shared with your partner</p>
      </div>
      
      <button id="logoutBtn" style="
        width: 100%;
        padding: 15px;
        background-color: #FF3B30;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
      ">Logout</button>
    `;
    
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Logout error:', error);
      }
    });
  }
}

async function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();
  
  if (text && currentUser) {
    try {
      await addDoc(collection(db, 'todos'), {
        text: text,
        completed: false,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      input.value = '';
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  }
}

async function addGrocery() {
  const textInput = document.getElementById('groceryInput');
  const quantityInput = document.getElementById('quantityInput');
  const text = textInput.value.trim();
  const quantity = quantityInput.value || '1';
  
  if (text && currentUser) {
    try {
      await addDoc(collection(db, 'groceries'), {
        text: text,
        quantity: quantity,
        completed: false,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      textInput.value = '';
      quantityInput.value = '1';
    } catch (error) {
      console.error('Error adding grocery:', error);
    }
  }
}

function renderTodos() {
  const todosList = document.getElementById('todosList');
  if (!todosList) return;
  
  todosList.innerHTML = todos.map(todo => `
    <div style="
      display: flex;
      align-items: center;
      background-color: white;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 8px;
      border: 1px solid #ddd;
    ">
      <button onclick="toggleTodo('${todo.id}')" style="
        width: 24px;
        height: 24px;
        border-radius: 12px;
        border: 2px solid #007AFF;
        background-color: ${todo.completed ? '#007AFF' : 'white'};
        color: white;
        margin-right: 15px;
        cursor: pointer;
      ">${todo.completed ? '✓' : ''}</button>
      
      <span style="
        flex: 1;
        font-size: 16px;
        color: ${todo.completed ? '#999' : '#333'};
        text-decoration: ${todo.completed ? 'line-through' : 'none'};
      ">${todo.text}</span>
      
      <button onclick="deleteTodo('${todo.id}')" style="
        width: 30px;
        height: 30px;
        border: none;
        background: none;
        color: #FF3B30;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
      ">×</button>
    </div>
  `).join('');
}

function renderGroceries() {
  const groceriesList = document.getElementById('groceriesList');
  if (!groceriesList) return;
  
  groceriesList.innerHTML = groceries.map(grocery => `
    <div style="
      display: flex;
      align-items: center;
      background-color: white;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 8px;
      border: 1px solid #ddd;
    ">
      <button onclick="toggleGrocery('${grocery.id}')" style="
        width: 24px;
        height: 24px;
        border-radius: 12px;
        border: 2px solid #34C759;
        background-color: ${grocery.completed ? '#34C759' : 'white'};
        color: white;
        margin-right: 15px;
        cursor: pointer;
      ">${grocery.completed ? '✓' : ''}</button>
      
      <div style="flex: 1;">
        <div style="
          font-size: 16px;
          color: ${grocery.completed ? '#999' : '#333'};
          text-decoration: ${grocery.completed ? 'line-through' : 'none'};
          margin-bottom: 2px;
        ">${grocery.text}</div>
        <div style="
          font-size: 12px;
          color: ${grocery.completed ? '#999' : '#666'};
        ">Qty: ${grocery.quantity}</div>
      </div>
      
      <button onclick="deleteGrocery('${grocery.id}')" style="
        width: 30px;
        height: 30px;
        border: none;
        background: none;
        color: #FF3B30;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
      ">×</button>
    </div>
  `).join('');
}

// Global functions for onclick handlers
window.toggleTodo = async (id) => {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    try {
      await updateDoc(doc(db, 'todos', id), {
        completed: !todo.completed
      });
    } catch (error) {
      console.error('Error toggling todo:', error);
    }
  }
};

window.deleteTodo = async (id) => {
  if (confirm('Are you sure you want to delete this todo item?')) {
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  }
};

window.toggleGrocery = async (id) => {
  const grocery = groceries.find(g => g.id === id);
  if (grocery) {
    try {
      await updateDoc(doc(db, 'groceries', id), {
        completed: !grocery.completed
      });
    } catch (error) {
      console.error('Error toggling grocery:', error);
    }
  }
};

window.deleteGrocery = async (id) => {
  if (confirm('Are you sure you want to delete this grocery item?')) {
    try {
      await deleteDoc(doc(db, 'groceries', id));
    } catch (error) {
      console.error('Error deleting grocery:', error);
    }
  }
};

// Set up Firebase auth listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    console.log('User signed in:', user.email);
    showMainScreen();
    
    // Set up real-time listeners for todos
    const todosQuery = query(collection(db, 'todos'), where('userId', '==', user.uid));
    onSnapshot(todosQuery, (snapshot) => {
      todos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderTodos();
    });
    
    // Set up real-time listeners for groceries
    const groceriesQuery = query(collection(db, 'groceries'), where('userId', '==', user.uid));
    onSnapshot(groceriesQuery, (snapshot) => {
      groceries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderGroceries();
    });
    
  } else {
    console.log('User signed out');
    showLoginScreen();
    todos = [];
    groceries = [];
  }
});

// Initialize the app
createApp();