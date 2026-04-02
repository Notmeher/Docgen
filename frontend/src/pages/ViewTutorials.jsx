import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  RefreshCw, 
  FolderOpen, 
  FileText, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  BookOpen,
  Eye,
  EyeOff,
  ChevronLeft,
  Menu,
  X,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { apiService } from '../utils/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import TableOfContents from '../components/TableOfContents';
import PageNavigation from '../components/PageNavigation';
import SearchAndFilter from '../components/SearchAndFilter';
import { useTheme } from '../contexts/ThemeContext';

const ViewTutorials = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [tutorials, setTutorials] = useState([]);
  const [filteredTutorials, setFilteredTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTutorial, setExpandedTutorial] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [fileContent, setFileContent] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTutorials();
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setShowSidebar(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchTutorials = async () => {
    setLoading(true);
    const result = await apiService.getTutorials();
    
    if (result.success) {
      setTutorials(result.data.tutorials || []);
      setFilteredTutorials(result.data.tutorials || []);
    } else {
      toast.error(`Error loading tutorials: ${result.error}`);
    }
    setLoading(false);
  };

  const handleRefresh = () => {
    fetchTutorials();
  };

  const handleTutorialToggle = async (index) => {
    if (expandedTutorial === index) {
      setExpandedTutorial(null);
      setSelectedFile(null);
      setFileContent('');
      setCurrentFileIndex(0);
    } else {
      setExpandedTutorial(index);
      const tutorial = filteredTutorials[index];
      if (!tutorial.files) {
        const result = await apiService.listTutorialFiles(tutorial.name);
        if (result.success) {
          const updatedTutorials = [...tutorials];
          const originalIndex = tutorials.findIndex(t => t.name === tutorial.name);
          if (originalIndex !== -1) {
            updatedTutorials[originalIndex].files = result.data.files;
            setTutorials(updatedTutorials);
          }

          const updatedFiltered = [...filteredTutorials];
          updatedFiltered[index].files = result.data.files;
          setFilteredTutorials(updatedFiltered);
        }
      }
    }
  };

  const handleFileClick = async (tutorial, file, fileIndex = 0) => {
    setSelectedFile(file);
    setCurrentFileIndex(fileIndex);
    setLoadingFile(true);
    
    // Close sidebar on mobile after file selection
    if (isMobile) {
      setShowSidebar(false);
    }
    
    const result = await apiService.getMarkdownFile(tutorial.name, file.filename);
    
    if (result.success) {
      setFileContent(result.data.content);
    } else {
      toast.error(`Error loading file: ${result.error}`);
      setFileContent('Error loading file content');
    }
    setLoadingFile(false);
  };

  const handleMarkdownLinkClick = (href) => {
    // Extract filename from href (could be just "02_file.md" or "./02_file.md")
    const filename = href.split('/').pop();
    
    // Find the file in the current tutorial
    const tutorial = filteredTutorials[expandedTutorial];
    if (tutorial && tutorial.files) {
      const fileIndex = tutorial.files.findIndex(f => f.filename === filename);
      if (fileIndex !== -1) {
        handleFileClick(tutorial, tutorial.files[fileIndex], fileIndex);
        // Scroll to top when navigating
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(`File not found: ${filename}`);
      }
    }
  };

  const handleFileNavigation = async (newFileIndex) => {
    const tutorial = filteredTutorials[expandedTutorial];
    if (tutorial && tutorial.files && tutorial.files[newFileIndex]) {
      await handleFileClick(tutorial, tutorial.files[newFileIndex], newFileIndex);
    }
  };

  const handleFilteredResults = (filtered) => {
    setFilteredTutorials(filtered);
    if (expandedTutorial !== null) {
      const currentTutorial = tutorials[expandedTutorial];
      const isStillVisible = filtered.some(t => t.name === currentTutorial?.name);
      if (!isStillVisible) {
        setExpandedTutorial(null);
        setSelectedFile(null);
        setFileContent('');
      }
    }
  };

  const handleOpenInExplorer = (path) => {
    toast.info('File explorer functionality would open here');
  };

  const handleDeleteTutorial = async (tutorialName, tutorialIndex) => {
    setDeleting(true);
    const result = await apiService.deleteTutorial(tutorialName);
    
    if (result.success) {
      toast.success(`Tutorial "${tutorialName}" deleted successfully`);
      
      // Update state to remove the deleted tutorial
      const updatedTutorials = tutorials.filter(t => t.name !== tutorialName);
      setTutorials(updatedTutorials);
      
      // Update filtered tutorials and handle expanded state properly
      const updatedFiltered = filteredTutorials.filter(t => t.name !== tutorialName);
      setFilteredTutorials(updatedFiltered);
      
      // Reset expanded state if the deleted tutorial was expanded
      if (expandedTutorial === tutorialIndex) {
        setExpandedTutorial(null);
        setSelectedFile(null);
        setFileContent('');
        setCurrentFileIndex(0);
      } else if (expandedTutorial !== null && expandedTutorial > tutorialIndex) {
        // Adjust expanded index if it's after the deleted item
        setExpandedTutorial(expandedTutorial - 1);
      }
      
      setDeleteConfirm(null);
    } else {
      toast.error(`Failed to delete tutorial: ${result.error}`);
    }
    setDeleting(false);
  };

  const confirmDelete = (tutorialName, tutorialIndex) => {
    // Find the tutorial in the current filtered list to get the correct index
    const currentIndex = filteredTutorials.findIndex(t => t.name === tutorialName);
    setDeleteConfirm({ name: tutorialName, index: currentIndex >= 0 ? currentIndex : tutorialIndex });
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const formatFileSize = (size) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading tutorials...</p>
        </div>
      </div>
    );
  }

  if (tutorials.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <FileText className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-4 text-xl font-medium text-gray-900 dark:text-gray-100">No tutorials found</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Get started by generating your first tutorial.
          </p>
          <div className="mt-8">
            <button
              onClick={() => navigate('/generate')}
              className="btn btn-primary px-6 py-3"
            >
              Generate Tutorial
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 w-full">
      {selectedFile ? (
        /* Reading Mode Layout */
        <div className="flex flex-col h-screen">
          {/* Top Navigation Bar */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 z-30">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Left: Menu and breadcrumb */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      showSidebar
                        ? 'text-primary-700 bg-primary-100 hover:bg-primary-200 border border-primary-200'
                        : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm hover:shadow'
                    }`}
                  >
                    {showSidebar ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Focus Mode</span>
                      </>
                    ) : (
                      <>
                        <Menu className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Show Files</span>
                      </>
                    )}
                  </button>
                  
                  <div className="hidden lg:flex items-center text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                    <span className="font-medium text-gray-800 dark:text-gray-200 max-w-[120px] truncate">
                      {expandedTutorial !== null && filteredTutorials[expandedTutorial]?.name}
                    </span>
                    <ChevronRight className="h-3 w-3 mx-2 text-gray-400 dark:text-gray-500" />
                    <span className="truncate max-w-[150px] text-gray-600 dark:text-gray-300">{selectedFile.filename}</span>
                  </div>
                </div>

                {/* Center: Navigation controls */}
                <div className="flex items-center space-x-4">
                  {expandedTutorial !== null && filteredTutorials[expandedTutorial]?.files && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleFileNavigation(Math.max(0, currentFileIndex - 1))}
                        disabled={currentFileIndex === 0}
                        className={`p-2 rounded-lg transition-colors ${
                          currentFileIndex === 0
                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title="Previous file"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      
                      <div className="hidden sm:block px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 font-medium min-w-[100px] text-center">
                        {currentFileIndex + 1} of {filteredTutorials[expandedTutorial].files.length}
                      </div>
                      
                      <button
                        onClick={() => handleFileNavigation(Math.min(filteredTutorials[expandedTutorial].files.length - 1, currentFileIndex + 1))}
                        disabled={currentFileIndex === filteredTutorials[expandedTutorial].files.length - 1}
                        className={`p-2 rounded-lg transition-colors ${
                          currentFileIndex === filteredTutorials[expandedTutorial].files.length - 1
                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title="Next file"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: TOC toggle */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowToc(!showToc)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      showToc 
                        ? 'text-primary-700 bg-primary-100 hover:bg-primary-200' 
                        : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">TOC</span>
                  </button>

                  <button
                    onClick={handleRefresh}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Refresh tutorials"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 transition-all duration-300 ease-in-out ${
              showSidebar 
                ? isMobile 
                  ? 'fixed inset-y-0 left-0 w-72 z-30 transform translate-x-0 shadow-xl' 
                  : 'w-72 opacity-100'
                : isMobile
                  ? 'fixed inset-y-0 left-0 w-72 z-30 transform -translate-x-full'
                  : 'w-0 opacity-0 overflow-hidden'
            }`}>
              {isMobile && showSidebar && (
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity duration-300 ease-in-out"
                  onClick={() => setShowSidebar(false)}
                />
              )}
              
              <div className="relative z-30 h-full flex flex-col bg-white dark:bg-gray-800 transition-all duration-300 ease-in-out">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                        <FolderOpen className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                        Tutorial Files
                      </h2>
                      {isMobile && (
                        <button
                          onClick={() => setShowSidebar(false)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    <SearchAndFilter
                      tutorials={tutorials}
                      onFilteredResults={handleFilteredResults}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 bg-white dark:bg-gray-800">
                    <div className="space-y-1">
                      {filteredTutorials.map((tutorial, index) => (
                        <div key={index} className={`border-2 rounded-xl overflow-hidden transition-all duration-200 ${
                          expandedTutorial === index 
                            ? 'border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 shadow-md' 
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
                        }`}>
                          <div className={`px-3 py-2 flex items-center justify-between transition-colors ${
                            expandedTutorial === index ? 'bg-primary-100/50 dark:bg-primary-800/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}>
                            <button
                              onClick={() => handleTutorialToggle(index)}
                              className="flex items-center flex-1 text-left"
                            >
                              <div className="flex items-center">
                                <div className={`p-1.5 rounded mr-2 ${
                                  expandedTutorial === index ? 'bg-primary-200 dark:bg-primary-700 text-primary-700 dark:text-primary-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}>
                                  <FolderOpen className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                  <p className={`text-sm font-medium ${
                                    expandedTutorial === index ? 'text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'
                                  }`}>{tutorial.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {tutorial.files?.length || tutorial.markdown_files || 0} files • {formatDate(tutorial.created)}
                                  </p>
                                </div>
                              </div>
                            </button>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  confirmDelete(tutorial.name, index);
                                }}
                                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete tutorial"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              {expandedTutorial === index ? (
                                <ChevronDown className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                              )}
                            </div>
                          </div>

                          {expandedTutorial === index && (
                            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                              {tutorial.files && tutorial.files.length > 0 ? (
                                <div className="max-h-60 overflow-y-auto">
                                  {tutorial.files.map((file, fileIndex) => (
                                    <button
                                      key={fileIndex}
                                      onClick={() => handleFileClick(tutorial, file, fileIndex)}
                                      className={`w-full px-3 py-2 text-left transition-all duration-150 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                                        selectedFile === file 
                                          ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700 text-primary-900 dark:text-primary-100' 
                                          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center min-w-0">
                                          <div className={`p-1.5 rounded mr-3 ${
                                            selectedFile === file ? 'bg-primary-200 dark:bg-primary-700' : 'bg-gray-100 dark:bg-gray-700'
                                          }`}>
                                            <FileText className={`h-3 w-3 ${
                                              selectedFile === file ? 'text-primary-700 dark:text-primary-200' : 'text-gray-500 dark:text-gray-400'
                                            }`} />
                                          </div>
                                          <div>
                                            <span className={`text-sm font-medium truncate block ${
                                              selectedFile === file ? 'text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-gray-100'
                                            }`}>
                                              {file.filename}
                                            </span>
                                            {file.size && (
                                              <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                                {formatFileSize(file.size)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {selectedFile === file && (
                                          <div className="flex items-center text-primary-600 dark:text-primary-400">
                                            <Eye className="h-4 w-4" />
                                          </div>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="px-4 py-6 text-center">
                                  <FileText className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                                  <p className="text-sm text-gray-500 dark:text-gray-400">No files found</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            

            {/* Reading Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Main Content */}
              <div className="flex-1 overflow-y-auto">
                <div className={`mx-auto transition-all duration-300 ease-in-out ${
                  isMobile 
                    ? 'px-3 py-4 max-w-full'
                    : showToc && !showSidebar
                      ? 'px-4 py-6 max-w-5xl'
                      : showToc && showSidebar
                        ? 'px-4 py-6 max-w-4xl'
                        : !showToc && showSidebar
                          ? 'px-6 py-6 max-w-6xl'
                          : 'px-8 py-8 max-w-7xl'
                }`}>
                  <div className={`rounded-xl shadow-sm border transition-all duration-300 ease-in-out ${
                    isMobile 
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md'
                  }`}>
                    {loadingFile ? (
                      <div className="flex items-center justify-center py-24">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading content...</p>
                        </div>
                      </div>
                    ) : fileContent ? (
                      <div className={`transition-all duration-300 ease-in-out ${
                        isMobile 
                          ? 'p-3 sm:p-4'
                          : showToc && showSidebar
                            ? 'p-4 lg:p-6'
                            : showToc || showSidebar
                              ? 'p-6 lg:p-8'
                              : 'p-8 lg:p-12'
                      }`}>
                        {selectedFile.filename.endsWith('.md') || selectedFile.filename.endsWith('.markdown') ? (
                          <div className={`w-full max-w-none transition-all duration-300 ease-in-out ${
                            isMobile ? 'text-sm' : 'text-base'
                          }`}>
                            <MarkdownRenderer 
                              content={fileContent} 
                              className="markdown-content"
                              isDarkMode={isDark}
                              onMarkdownLinkClick={handleMarkdownLinkClick}
                            />
                          </div>
                        ) : (
                          <pre className={`bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg overflow-x-auto transition-all duration-300 ease-in-out text-gray-900 dark:text-gray-100 ${
                            isMobile ? 'p-3 text-xs' : 'p-6 text-sm'
                          }`}>
                            <code>{fileContent}</code>
                          </pre>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-24">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                          <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                          <p>Failed to load file content</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Navigation */}
                  {expandedTutorial !== null && filteredTutorials[expandedTutorial]?.files && (
                    <div className="mt-8 transition-all duration-300 ease-in-out">
                      <PageNavigation
                        files={filteredTutorials[expandedTutorial].files}
                        currentFileIndex={currentFileIndex}
                        onFileChange={handleFileNavigation}
                      />
                    </div>
                  )}

                  {/* Reading Progress Bar */}
                  <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 transition-all duration-300 ease-in-out">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
                      <span>Reading Progress</span>
                      <span>
                        {expandedTutorial !== null && filteredTutorials[expandedTutorial]?.files 
                          ? Math.round(((currentFileIndex + 1) / filteredTutorials[expandedTutorial].files.length) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: expandedTutorial !== null && filteredTutorials[expandedTutorial]?.files
                            ? `${((currentFileIndex + 1) / filteredTutorials[expandedTutorial].files.length) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                    {expandedTutorial !== null && filteredTutorials[expandedTutorial]?.files && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                        File {currentFileIndex + 1} of {filteredTutorials[expandedTutorial].files.length} • {selectedFile?.filename}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Table of Contents Sidebar */}
              <div className={`bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex-shrink-0 transition-all duration-300 ease-in-out ${
                showToc && !isMobile 
                  ? 'w-64 opacity-100' 
                  : isMobile && showToc
                    ? 'absolute right-0 top-0 bottom-0 w-72 z-30 opacity-100 shadow-xl'
                    : 'w-0 opacity-0 overflow-hidden'
              }`}>
                {isMobile && showToc && (
                  <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-20"
                    onClick={() => setShowToc(false)}
                  />
                )}
                <div className={`sticky top-0 h-full overflow-y-auto transition-all duration-300 ease-in-out ${
                  isMobile ? 'p-3 z-30 relative' : 'p-3'
                }`}>
                  {showToc && (
                    <div className="transition-all duration-300 ease-in-out">
                      {isMobile && (
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Table of Contents</h3>
                          <button
                            onClick={() => setShowToc(false)}
                            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                      <TableOfContents content={fileContent} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tutorial Selection Mode */
        <div className="min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4"> Generated Tutorials</h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                  Browse and read your generated tutorial documentation with an optimized reading experience
                </p>
              </div>
              
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="btn btn-secondary flex items-center"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="max-w-4xl mx-auto">
              <SearchAndFilter
                tutorials={tutorials}
                onFilteredResults={handleFilteredResults}
              />
              
              <div className="mt-8 space-y-4">
                {filteredTutorials.map((tutorial, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors">
                      <button
                        onClick={() => handleTutorialToggle(index)}
                        className="flex items-center flex-1 text-left"
                      >
                        <FolderOpen className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{tutorial.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {tutorial.files?.length || tutorial.markdown_files || 0} files • {formatDate(tutorial.created)}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center space-x-3 ml-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            console.log('Delete button clicked (main view) for tutorial:', tutorial.name, 'index:', index);
                            confirmDelete(tutorial.name, index);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete tutorial"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        {expandedTutorial === index ? (
                          <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                    </div>

                    {expandedTutorial === index && (
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        {tutorial.files && tutorial.files.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                            {tutorial.files.map((file, fileIndex) => (
                              <button
                                key={fileIndex}
                                onClick={() => handleFileClick(tutorial, file, fileIndex)}
                                className="flex items-center p-3 bg-white dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 rounded-lg text-left transition-colors group"
                              >
                                <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 mr-3 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-900 dark:group-hover:text-primary-200">
                                    {file.filename}
                                  </p>
                                  {file.size && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-primary-700 dark:group-hover:text-primary-300">
                                      {formatFileSize(file.size)}
                                    </p>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                            No files found in this tutorial
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Delete Tutorial</h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300">
                  Are you sure you want to delete the tutorial <span className="font-semibold">"{deleteConfirm.name}"</span>? 
                  This action cannot be undone and will permanently remove all tutorial files.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteTutorial(deleteConfirm.name, deleteConfirm.index)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
                >
                  {deleting && <RefreshCw className="animate-spin h-4 w-4 mr-2" />}
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewTutorials;