import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { AuthModalProvider } from './context/AuthModalContext';
import { CreateCommunityModalProvider } from './context/CreateCommunityModalContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import './reddit.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <ConfirmProvider>
                <AuthModalProvider>
                  <CreateCommunityModalProvider>
                    <App />
                  </CreateCommunityModalProvider>
                </AuthModalProvider>
              </ConfirmProvider>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);