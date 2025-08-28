console.log('AdiDo Test - JavaScript is loading!');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded');
  
  const root = document.getElementById('root');
  if (root) {
    console.log('Root element found');
    root.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: #f0f0f0;
        font-family: Arial, sans-serif;
      ">
        <h1 style="color: #007AFF; font-size: 48px; margin-bottom: 20px;">AdiDo Test</h1>
        <p style="color: #666; font-size: 18px;">If you can see this, the app is working!</p>
        <button onclick="alert('Button clicked!')" style="
          background-color: #007AFF;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 8px;
          font-size: 16px;
          margin-top: 20px;
          cursor: pointer;
        ">Test Button</button>
      </div>
    `;
  } else {
    console.error('Root element not found!');
  }
});