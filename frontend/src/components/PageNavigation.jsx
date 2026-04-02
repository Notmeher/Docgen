import { ChevronLeft, ChevronRight, FileText, MoreHorizontal } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const PageNavigation = ({ 
  files, 
  currentFileIndex, 
  onFileChange, 
  className = '' 
}) => {
  const { isDark } = useTheme();
  
  if (!files || files.length <= 1) {
    return null;
  }

  const currentFile = files[currentFileIndex];
  const hasPrevious = currentFileIndex > 0;
  const hasNext = currentFileIndex < files.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      onFileChange(currentFileIndex - 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onFileChange(currentFileIndex + 1);
    }
  };

  const handleFileSelect = (index) => {
    onFileChange(index);
  };

  const generatePageIndicators = () => {
    const totalPages = files.length;
    const current = currentFileIndex;
    const indicators = [];

    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) {
        indicators.push(i);
      }
    } else {
      if (current <= 3) {
        indicators.push(0, 1, 2, 3, 4, '...', totalPages - 1);
      } else if (current >= totalPages - 4) {
        indicators.push(0, '...', totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
      } else {
        indicators.push(0, '...', current - 1, current, current + 1, '...', totalPages - 1);
      }
    }

    return indicators;
  };

  const pageIndicators = generatePageIndicators();

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <FileText className="h-4 w-4 mr-2" />
          <span>
            Page {currentFileIndex + 1} of {files.length}
          </span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {currentFile?.filename}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={!hasPrevious}
          className={`
            flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
            ${hasPrevious
              ? 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-100'
              : 'text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
            }
          `}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </button>

        <div className="flex items-center space-x-1">
          {pageIndicators.map((indicator, index) => (
            <div key={index}>
              {indicator === '...' ? (
                <span className="px-2 py-1 text-gray-400 dark:text-gray-500">
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              ) : (
                <button
                  onClick={() => handleFileSelect(indicator)}
                  className={`
                    min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors
                    ${indicator === currentFileIndex
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                  title={files[indicator]?.filename}
                >
                  {indicator + 1}
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={!hasNext}
          className={`
            flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
            ${hasNext
              ? 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-100'
              : 'text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
            }
          `}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Reading Progress</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {Math.round(((currentFileIndex + 1) / files.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-primary-600 dark:bg-primary-500 h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${((currentFileIndex + 1) / files.length) * 100}%`
            }}
          />
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center">
          <span>Jump to file</span>
          <ChevronRight className="h-3 w-3 ml-1 transform transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-2 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          {files.map((file, index) => (
            <button
              key={index}
              onClick={() => handleFileSelect(index)}
              className={`
                w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0
                ${index === currentFileIndex ? 'bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium' : 'text-gray-700 dark:text-gray-300'}
              `}
            >
              <div className="flex items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2 min-w-[24px]">
                  {index + 1}.
                </span>
                <span className="truncate">{file.filename}</span>
              </div>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
};

export default PageNavigation;
