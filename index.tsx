import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log(
  'SUPABASE URL:',
  import.meta.env.VITE_SUPABASE_URL
);

console.log(
  'SUPABASE KEY:',
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);