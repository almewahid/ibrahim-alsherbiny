<<<<<<< HEAD
// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
=======
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { AuthProvider } from '@/context/AuthContext'
>>>>>>> 4f7006af0bbdca6242ed7f0eafca44864855a2d2

// Render Application
ReactDOM.createRoot(document.getElementById('root')).render(
<<<<<<< HEAD
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
=======
  // <React.StrictMode>
  <AuthProvider>
    <App />
  </AuthProvider>
  // </React.StrictMode>,
)
>>>>>>> 4f7006af0bbdca6242ed7f0eafca44864855a2d2

// Base44 Sandbox HMR Bridge (Keep It!)
if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
<<<<<<< HEAD
}
=======
}
>>>>>>> 4f7006af0bbdca6242ed7f0eafca44864855a2d2
