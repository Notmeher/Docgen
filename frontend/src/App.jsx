import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import GenerateTutorial from './pages/GenerateTutorial';
import MonitorGeneration from './pages/MonitorGeneration';
import ViewTutorials from './pages/ViewTutorials';
import { ApiProvider } from './contexts/ApiContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <ApiProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <Layout>
              <Routes>
                <Route path="/" element={<GenerateTutorial />} />
                <Route path="/generate" element={<GenerateTutorial />} />
                <Route path="/monitor" element={<MonitorGeneration />} />
                <Route path="/tutorials" element={<ViewTutorials />} />
              </Routes>
            </Layout>
            <Toaster 
              position="top-right" 
              toastOptions={{
                className: 'dark:bg-gray-800 dark:text-gray-100',
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-color)',
                }
              }}
            />
          </div>
        </Router>
      </ApiProvider>
    </ThemeProvider>
  );
}

export default App;