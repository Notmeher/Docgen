import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg transition-colors duration-200 
        bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 
        dark:focus:ring-offset-gray-800
        ${className}
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative w-5 h-5">
        <Sun 
          className={`
            absolute inset-0 w-5 h-5 text-yellow-500 transition-all duration-300
            ${theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'}
          `}
        />
        <Moon 
          className={`
            absolute inset-0 w-5 h-5 text-blue-400 transition-all duration-300
            ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}
          `}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;