import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './app/AuthContext';
import { router } from './app/router';
import { FilterProvider } from './app/FilterContext';
import './styles.css';
import './responsive.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <FilterProvider>
        <RouterProvider router={router} />
      </FilterProvider>
    </AuthProvider>
  </React.StrictMode>,
);
