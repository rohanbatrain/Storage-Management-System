import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import { ChatProvider } from './contexts/ChatContext'
import './index.css'

const isElectron = navigator.userAgent.toLowerCase().includes('electron');
const isFileProtocol = window.location.protocol === 'file:';
const Router = (isElectron || isFileProtocol) ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Router>
            <ChatProvider>
                <App />
            </ChatProvider>
        </Router>
    </React.StrictMode>,
)
