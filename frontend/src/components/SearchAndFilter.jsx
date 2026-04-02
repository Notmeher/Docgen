import { useState, useMemo } from 'react';
import { Search, Filter, X, Calendar, FileText, FolderOpen } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const SearchAndFilter = ({ 
  tutorials, 
  onFilteredResults,
  className = '' 
}) => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'name', 'files', 'recent'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'date', 'files'
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSortedTutorials = useMemo(() => {
    if (!tutorials || tutorials.length === 0) return [];

    let filtered = [...tutorials];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(tutorial => {
        const nameMatch = tutorial.name.toLowerCase().includes(query);
        const pathMatch = tutorial.path.toLowerCase().includes(query);
        
        // Search in file names if files are loaded
        const fileMatch = tutorial.files?.some(file => 
          file.filename.toLowerCase().includes(query)
        ) || false;

        switch (filterType) {
          case 'name':
            return nameMatch;
          case 'files':
            return fileMatch;
          case 'all':
          default:
            return nameMatch || pathMatch || fileMatch;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created || 0) - new Date(a.created || 0);
        case 'files':
          const aFiles = a.files?.length || a.markdown_files || 0;
          const bFiles = b.files?.length || b.markdown_files || 0;
          return bFiles - aFiles;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [tutorials, searchQuery, filterType, sortBy]);

  // Notify parent component of filtered results
  useMemo(() => {
    if (onFilteredResults) {
      onFilteredResults(filteredAndSortedTutorials);
    }
  }, [filteredAndSortedTutorials, onFilteredResults]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setSortBy('name');
  };

  const getResultsText = () => {
    const total = tutorials?.length || 0;
    const filtered = filteredAndSortedTutorials.length;
    
    if (total === 0) return 'No tutorials available';
    if (filtered === total) return `${total} tutorial${total === 1 ? '' : 's'}`;
    return `${filtered} of ${total} tutorial${total === 1 ? '' : 's'}`;
  };

  const hasActiveFilters = searchQuery.trim() || filterType !== 'all' || sortBy !== 'name';

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      {/* Search bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search tutorials and files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input w-full pl-10 pr-10 py-2"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters & Sorting
            {hasActiveFilters && (
              <span className="ml-2 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-xs px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Reset
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search in
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="form-select w-full text-sm"
              >
                <option value="all">Everything</option>
                <option value="name">Tutorial names only</option>
                <option value="files">File names only</option>
              </select>
            </div>

            {/* Sort by */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-select w-full text-sm"
              >
                <option value="name">Name (A-Z)</option>
                <option value="date">Date (newest first)</option>
                <option value="files">File count (most first)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results summary */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between">
        <div className="flex items-center">
          <FolderOpen className="h-4 w-4 mr-1" />
          <span>{getResultsText()}</span>
        </div>
        
        {searchQuery && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Searching for "{searchQuery}"
          </div>
        )}
      </div>

      {/* Quick stats */}
      {tutorials && tutorials.length > 0 && (
        <div className="px-4 py-2 bg-gray-25 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Total files: {tutorials.reduce((sum, t) => sum + (t.files?.length || t.markdown_files || 0), 0)}
            </span>
            <span>
              {tutorials.filter(t => t.created).length > 0 && (
                <>
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Latest: {new Date(Math.max(...tutorials.filter(t => t.created).map(t => new Date(t.created)))).toLocaleDateString()}
                </>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilter;