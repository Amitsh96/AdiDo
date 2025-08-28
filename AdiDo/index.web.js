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
let events = [];

// Create the main app HTML
function createApp() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div id="app" style="
      min-height: 100vh; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a202c;
    ">
      <!-- Login Screen -->
      <div id="loginScreen" style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 20px;
        min-height: 100vh;
        position: relative;
      ">
        <div style="
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          padding: 48px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          width: 100%;
          max-width: 400px;
          text-align: center;
        ">
          <div style="
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            margin: 0 auto 24px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
          ">📋</div>
          <h1 style="
            font-size: 32px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
          ">AdiDo</h1>
          <p style="
            font-size: 16px;
            color: #64748b;
            margin-bottom: 32px;
            font-weight: 400;
          ">Your intelligent task & grocery companion</p>
          
          <div style="margin-bottom: 16px;">
        
            <input type="email" id="emailInput" placeholder="Email address" style="
              width: 100%;
              height: 56px;
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 0 20px;
              margin-bottom: 16px;
              background-color: #f8fafc;
              font-size: 16px;
              transition: all 0.2s;
              box-sizing: border-box;
              outline: none;
            ">
            
            <input type="password" id="passwordInput" placeholder="Password" style="
              width: 100%;
              height: 56px;
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 0 20px;
              margin-bottom: 24px;
              background-color: #f8fafc;
              font-size: 16px;
              transition: all 0.2s;
              box-sizing: border-box;
              outline: none;
            ">
        
            <button id="authButton" style="
              width: 100%;
              height: 56px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 16px;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            ">Sign In</button>
            
            <button id="switchModeButton" style="
              background: none;
              border: none;
              color: #667eea;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            ">Don't have an account? Sign Up</button>
          </div>
        
          <div id="authError" style="
            color: #ef4444;
            font-size: 14px;
            margin-top: 12px;
            display: none;
            font-weight: 500;
          "></div>
        </div>
      </div>

      <!-- Main Screen -->
      <div id="mainScreen" style="
        display: none;
        min-height: 100vh;
        background: #f8fafc;
      ">
        <div id="navigation" style="
          display: flex;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          padding: 8px;
          position: sticky;
          top: 0;
          z-index: 10;
          gap: 4px;
        ">
          <button class="nav-tab active" data-tab="todos" style="
            flex: 1;
            padding: 12px 20px;
            border: none;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 14px;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          ">📝 Todo</button>
          <button class="nav-tab" data-tab="grocery" style="
            flex: 1;
            padding: 12px 20px;
            border: none;
            background: rgba(100, 116, 139, 0.1);
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
          ">🛒 Grocery</button>
          <button class="nav-tab" data-tab="events" style="
            flex: 1;
            padding: 12px 20px;
            border: none;
            background: rgba(100, 116, 139, 0.1);
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
          ">📅 Events</button>
          <button class="nav-tab" data-tab="profile" style="
            flex: 1;
            padding: 12px 20px;
            border: none;
            background: rgba(100, 116, 139, 0.1);
            color: #64748b;
            font-size: 14px;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
          ">👤 Profile</button>
        </div>
        
        <div id="content" style="
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        ">
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
      <div style="
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        margin-bottom: 24px;
      ">
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 24px;
        ">
          <div style="
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
          ">
            <span style="font-size: 20px;">📝</span>
          </div>
          <h2 style="
            color: #1a202c;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          ">Todo Tasks</h2>
        </div>
        
        <div style="
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        ">
          <input type="text" id="todoInput" placeholder="What needs to be done?" style="
            flex: 1;
            height: 56px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 0 20px;
            background-color: #f8fafc;
            font-size: 16px;
            transition: all 0.2s;
            outline: none;
            box-sizing: border-box;
          ">
          <button id="addTodoBtn" style="
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">+</button>
        </div>
      </div>
      <div id="todosList" style="
        display: flex;
        flex-direction: column;
        gap: 12px;
      "></div>
    `;
    
    document.getElementById('addTodoBtn').addEventListener('click', addTodo);
    document.getElementById('todoInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTodo();
    });
    
    renderTodos();
    
  } else if (tab === 'grocery') {
    content.innerHTML = `
      <div style="
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        margin-bottom: 24px;
      ">
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 24px;
        ">
          <div style="
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
          ">
            <span style="font-size: 20px;">🛒</span>
          </div>
          <h2 style="
            color: #1a202c;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          ">Shopping List</h2>
        </div>
        
        <div style="
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          align-items: center;
        ">
          <input type="text" id="groceryInput" placeholder="What do you need to buy?" style="
            flex: 1;
            height: 56px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 0 20px;
            background-color: #f8fafc;
            font-size: 16px;
            transition: all 0.2s;
            outline: none;
            box-sizing: border-box;
          ">
          
          <div style="
            display: flex;
            align-items: center;
            background-color: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            height: 56px;
            padding: 0 4px;
          ">
            <button id="quantityDownBtn" style="
              width: 40px;
              height: 48px;
              border: none;
              background: none;
              color: #64748b;
              font-size: 18px;
              font-weight: bold;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              transition: all 0.2s;
            ">−</button>
            <input type="text" id="quantityInput" placeholder="1" value="1" style="
              width: 48px;
              height: 48px;
              border: none;
              background: none;
              padding: 0;
              text-align: center;
              font-size: 16px;
              font-weight: 600;
              outline: none;
              color: #1a202c;
            ">
            <button id="quantityUpBtn" style="
              width: 40px;
              height: 48px;
              border: none;
              background: none;
              color: #64748b;
              font-size: 18px;
              font-weight: bold;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              transition: all 0.2s;
            ">+</button>
          </div>
          
          <button id="addGroceryBtn" style="
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">+</button>
        </div>
      </div>
      <div id="groceriesList" style="
        display: flex;
        flex-direction: column;
        gap: 12px;
      "></div>
    `;
    
    document.getElementById('addGroceryBtn').addEventListener('click', addGrocery);
    document.getElementById('groceryInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addGrocery();
    });
    
    // Quantity control event listeners
    document.getElementById('quantityUpBtn').addEventListener('click', () => {
      const quantityInput = document.getElementById('quantityInput');
      let currentValue = parseInt(quantityInput.value) || 1;
      quantityInput.value = currentValue + 1;
    });
    
    document.getElementById('quantityDownBtn').addEventListener('click', () => {
      const quantityInput = document.getElementById('quantityInput');
      let currentValue = parseInt(quantityInput.value) || 1;
      if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
      }
    });
    
    // Ensure only numbers in quantity input
    document.getElementById('quantityInput').addEventListener('input', (e) => {
      let value = e.target.value.replace(/[^0-9]/g, '');
      if (value === '' || parseInt(value) < 1) {
        value = '1';
      }
      e.target.value = value;
    });
    
    renderGroceries();
    
  } else if (tab === 'events') {
    content.innerHTML = `
      <h2 style="color: #333; margin-bottom: 20px;">Events</h2>
      <div style="
        background-color: white;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #ddd;
        margin-bottom: 20px;
      ">
        <input type="text" id="eventNameInput" placeholder="Event name..." style="
          width: 100%;
          height: 50px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 0 15px;
          background-color: white;
          margin-bottom: 15px;
          box-sizing: border-box;
        ">
        
        <textarea id="eventDescriptionInput" placeholder="Event description..." style="
          width: 100%;
          height: 80px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          background-color: white;
          margin-bottom: 15px;
          box-sizing: border-box;
          resize: vertical;
          font-family: Arial, sans-serif;
        "></textarea>
        
        <input type="text" id="eventLocationInput" placeholder="Location..." style="
          width: 100%;
          height: 50px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 0 15px;
          background-color: white;
          margin-bottom: 15px;
          box-sizing: border-box;
        ">
        
        <div style="display: flex; margin-bottom: 15px; align-items: center;">
          <input type="date" id="eventDateInput" style="
            flex: 1;
            height: 50px;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 0 15px;
            background-color: white;
            margin-right: 10px;
            box-sizing: border-box;
          ">
          <input type="time" id="eventTimeInput" style="
            flex: 1;
            height: 50px;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 0 15px;
            background-color: white;
            box-sizing: border-box;
          ">
        </div>
        
        <button id="addEventBtn" style="
          width: 100%;
          height: 50px;
          background-color: #FF9500;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
        ">Add Event</button>
      </div>
      <div id="eventsList"></div>
    `;
    
    document.getElementById('addEventBtn').addEventListener('click', addEvent);
    document.getElementById('eventNameInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addEvent();
    });
    
    renderEvents();
    
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

async function addEvent() {
  const nameInput = document.getElementById('eventNameInput');
  const descriptionInput = document.getElementById('eventDescriptionInput');
  const locationInput = document.getElementById('eventLocationInput');
  const dateInput = document.getElementById('eventDateInput');
  const timeInput = document.getElementById('eventTimeInput');
  
  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();
  const location = locationInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;
  
  if (name && date && currentUser) {
    try {
      const eventDateTime = new Date(`${date}T${time || '00:00'}`);
      
      await addDoc(collection(db, 'events'), {
        name: name,
        description: description || '',
        location: location || '',
        datetime: eventDateTime,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      
      // Clear inputs
      nameInput.value = '';
      descriptionInput.value = '';
      locationInput.value = '';
      dateInput.value = '';
      timeInput.value = '';
    } catch (error) {
      console.error('Error adding event:', error);
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

function renderEvents() {
  const eventsList = document.getElementById('eventsList');
  if (!eventsList) return;
  
  // Sort events by datetime
  const sortedEvents = [...events].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  
  eventsList.innerHTML = sortedEvents.map(event => {
    const eventDate = new Date(event.datetime);
    const isUpcoming = eventDate > new Date();
    const dateStr = eventDate.toLocaleDateString();
    const timeStr = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `
      <div style="
        background-color: white;
        padding: 20px;
        margin-bottom: 15px;
        border-radius: 12px;
        border: 1px solid #ddd;
        border-left: 4px solid ${isUpcoming ? '#FF9500' : '#ccc'};
      ">
        <div style="display: flex; justify-content: between; align-items: flex-start;">
          <div style="flex: 1;">
            <h3 style="
              margin: 0 0 8px 0;
              color: ${isUpcoming ? '#333' : '#666'};
              font-size: 18px;
            ">${event.name}</h3>
            
            ${event.description ? `
              <p style="
                margin: 0 0 12px 0;
                color: #666;
                line-height: 1.4;
              ">${event.description}</p>
            ` : ''}
            
            <div style="
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              margin-bottom: 8px;
            ">
              <div style="
                display: flex;
                align-items: center;
                color: #666;
                font-size: 14px;
              ">
                📅 ${dateStr} at ${timeStr}
              </div>
              
              ${event.location ? `
                <div style="
                  display: flex;
                  align-items: center;
                  color: #666;
                  font-size: 14px;
                ">
                  📍 ${event.location}
                </div>
              ` : ''}
            </div>
          </div>
          
          <button onclick="deleteEvent('${event.id}')" style="
            width: 30px;
            height: 30px;
            border: none;
            background: none;
            color: #FF3B30;
            font-size: 20px;
            cursor: pointer;
            margin-left: 10px;
          ">×</button>
        </div>
      </div>
    `;
  }).join('');
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
  try {
    await deleteDoc(doc(db, 'todos', id));
  } catch (error) {
    console.error('Error deleting todo:', error);
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
  try {
    await deleteDoc(doc(db, 'groceries', id));
  } catch (error) {
    console.error('Error deleting grocery:', error);
  }
};

window.deleteEvent = async (id) => {
  try {
    await deleteDoc(doc(db, 'events', id));
  } catch (error) {
    console.error('Error deleting event:', error);
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
    
    // Set up real-time listeners for events
    const eventsQuery = query(collection(db, 'events'), where('userId', '==', user.uid));
    onSnapshot(eventsQuery, (snapshot) => {
      events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        datetime: doc.data().datetime.toDate() // Convert Firestore Timestamp to Date
      }));
      renderEvents();
    });
    
  } else {
    console.log('User signed out');
    showLoginScreen();
    todos = [];
    groceries = [];
    events = [];
  }
});

// Initialize the app
createApp();