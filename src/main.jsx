import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './app/AuthContext';
import { router } from './app/router';
import { FilterProvider } from './app/FilterContext';
import { installChunkReloadHandler } from './utils/chunkReload';
import './styles.css';

installChunkReloadHandler();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <FilterProvider>
        <RouterProvider router={router} />
      </FilterProvider>
    </AuthProvider>
  </React.StrictMode>,
);
