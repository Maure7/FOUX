import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');

  return currentScreen === 'editor' ? (
    <Editor onNavigate={setCurrentScreen} />
  ) : (
    <Dashboard onNavigate={setCurrentScreen} />
  );
}
