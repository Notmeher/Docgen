import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, List } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const TableOfContents = ({ content, className = '' }) => {
  const { isDark } = useTheme();
  const [headings, setHeadings] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!content) return;

    // Extract headings from markdown content
    const extractHeadings = () => {
      const lines = content.split('\n');
      const headingsList = [];

      lines.forEach((line, index) => {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const title = match[2].trim();
          const id = slugify(title);
          
          headingsList.push({
            id,
            title,
            level,
            lineNumber: index + 1
          });
        }
      });

      return headingsList;
    };

    setHeadings(extractHeadings());
  }, [content]);

  useEffect(() => {
    // Set up intersection observer to track active heading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-100px 0px -80% 0px',
        threshold: 0.1
      }
    );

    // Observe all heading elements
    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  const handleHeadingClick = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const getIndentClass = (level) => {
    const indentMap = {
      1: 'ml-0',
      2: 'ml-3',
      3: 'ml-6',
      4: 'ml-9',
      5: 'ml-12',
      6: 'ml-15'
    };
    return indentMap[level] || 'ml-0';
  };

  const getFontClass = (level) => {
    const fontMap = {
      1: 'text-sm font-semibold',
      2: 'text-sm font-medium',
      3: 'text-xs font-medium',
      4: 'text-xs',
      5: 'text-xs',
      6: 'text-xs'
    };
    return fontMap[level] || 'text-xs';
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 flex items-center justify-between text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <div className="flex items-center">
          <List className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
          <span className="font-medium text-gray-900 dark:text-gray-100">Table of Contents</span>
        </div>
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>

      {!isCollapsed && (
        <div className="p-4 max-h-96 overflow-y-auto">
          <nav>
            <ul className="space-y-1">
              {headings.map((heading) => (
                <li key={heading.id} className={getIndentClass(heading.level)}>
                  <button
                    onClick={() => handleHeadingClick(heading.id)}
                    className={`
                      w-full text-left px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                      ${activeId === heading.id
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 border-l-2 border-primary-400 dark:border-primary-500'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                      }
                      ${getFontClass(heading.level)}
                    `}
                    title={heading.title}
                  >
                    <span className="block truncate">
                      {heading.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {/* Quick stats */}
      {!isCollapsed && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-25 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {headings.length} sections • Level {Math.min(...headings.map(h => h.level))}-{Math.max(...headings.map(h => h.level))}
          </p>
        </div>
      )}
    </div>
  );
};

// Utility function to create URL-friendly slugs (same as in MarkdownRenderer)
const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

export default TableOfContents;