import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import '@fontsource-variable/inter';
import '../styles/global.css';
import { AuthProvider } from '../features/auth/AuthProvider';
import { routeConfig } from './router';
import { NetworkNotice } from './NetworkNotice';

const router = createBrowserRouter(routeConfig);

createRoot(document.getElementById('root')!).render(
  <StrictMode><NetworkNotice /><AuthProvider><RouterProvider router={router} /></AuthProvider></StrictMode>,
);
