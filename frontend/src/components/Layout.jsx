import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Eye, 
  Activity,
  Menu,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useApi } from '../contexts/ApiContext';
import ThemeToggle from './ThemeToggle';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const location = useLocation();
  const { isConnected, isLoading, currentTaskId } = useApi();

  const navigation = [
    {
      name: 'Generate Tutorial',
      href: '/generate',
      icon: Plus,
      current: location.pathname === '/' || location.pathname === '/generate'
    },
    ...(currentTaskId ? [{
      name: 'Monitor Generation',
      href: '/monitor',
      icon: Activity,
      current: location.pathname === '/monitor'
    }] : []),
    {
      name: 'View Tutorials',
      href: '/tutorials',
      icon: Eye,
      current: location.pathname === '/tutorials'
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800 transition-transform transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <Sidebar navigation={navigation} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300 ${desktopSidebarOpen ? 'w-64' : 'w-0'}`}>
        <div className={`flex flex-col transition-all duration-300 ${desktopSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
          <Sidebar navigation={navigation} isCollapsed={!desktopSidebarOpen} />
        </div>
      </div>

        {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="lg:hidden">
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-1.5">
            <div className="flex items-center">
              <button
                className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="ml-3 text-lg font-medium text-gray-900 dark:text-gray-100"> Tutorial Generator</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Connection status */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-2 flex items-center justify-between">
            <div className="flex items-center">
              {/* Desktop sidebar toggle button */}
              <button
                className="hidden lg:flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 mr-4 transition-colors"
                onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
                title={desktopSidebarOpen ? "Hide sidebar" : "Show sidebar"}
              >
                <Menu className="h-5 w-5" />
              </button>
              
              {isLoading ? (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-300 mr-2"></div>
                  Checking connection...
                </div>
              ) : isConnected ? (
                <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Connected to API server
                </div>
              ) : (
                <div className="flex items-center text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Cannot connect to API server. Please ensure the FastAPI server is running on localhost:8000
                </div>
              )}
            </div>
          </div>
        </div>        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const Sidebar = ({ navigation, isCollapsed = false }) => {
  if (isCollapsed) {
    return null;
  }

  return (
    <div className="flex flex-col flex-grow border-r border-gray-200 dark:border-gray-700 pt-5 pb-4 bg-white dark:bg-gray-800 overflow-y-auto">
      <div className="flex items-center justify-between flex-shrink-0 px-4">
        <div className="flex items-center">
          <BookOpen className="h-8 w-8 text-primary-600" />
          <h1 className="ml-2 text-xl font-semibold text-gray-900 dark:text-gray-100">Tutorial Generator</h1>
        </div>
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
      </div>
      <div className="mt-5 flex-grow flex flex-col">
        <nav className="flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  item.current
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
              >
                <Icon
                  className={`${
                    item.current ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                  } mr-3 flex-shrink-0 h-6 w-6`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Layout;