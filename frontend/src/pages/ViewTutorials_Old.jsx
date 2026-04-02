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
  EyeOff
} from 'lucide-react';
import { apiService } from '../utils/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import TableOfContents from '../components/TableOfContents';
import PageNavigation from '../components/PageNavigation';
import SearchAndFilter from '../components/SearchAndFilter';

const ViewTutorials = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    setLoading(true);
    const result = await apiService.getTutorials();
    
    if (result.success) {
      const tutorialList = result.data.tutorials || [];
      setTutorials(tutorialList);
      setFilteredTutorials(tutorialList);
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
      // Fetch files for this tutorial if not already loaded
      const tutorial = filteredTutorials[index];
      if (!tutorial.files) {
        const result = await apiService.listTutorialFiles(tutorial.name);
        if (result.success) {
          // Update both original tutorials and filtered tutorials
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
    
    const result = await apiService.getMarkdownFile(tutorial.name, file.filename);
    
    if (result.success) {
      setFileContent(result.data.content);
    } else {
      toast.error(`Error loading file: ${result.error}`);
      setFileContent('Error loading file content');
    }
    setLoadingFile(false);
  };

  const handleFileNavigation = async (newFileIndex) => {
    const tutorial = filteredTutorials[expandedTutorial];
    if (tutorial && tutorial.files && tutorial.files[newFileIndex]) {
      await handleFileClick(tutorial, tutorial.files[newFileIndex], newFileIndex);
    }
  };

  const handleFilteredResults = (filtered) => {
    setFilteredTutorials(filtered);
    // Reset expansion and selection if current tutorial is filtered out
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
    // This would open the file explorer to the tutorial directory
    toast.info('File explorer functionality would open here');
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">Loading tutorials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900"> Generated Tutorials</h1>
            <p className="mt-2 text-gray-600">
              Browse and view your generated tutorial documentation
            </p>
          </div>
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

      {tutorials.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tutorials found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by generating your first tutorial.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/generate')}
              className="btn btn-primary"
            >
              Generate Tutorial
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          {selectedFile ? (
            /* Reading Mode Layout */
            <div className="max-w-none">
              {/* Top Navigation Bar */}
              <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                    {/* Left: Sidebar toggle and breadcrumb */}
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        title={showSidebar ? "Hide sidebar" : "Show sidebar"}
                      >
                        {showSidebar ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {showSidebar ? 'Focus Mode' : 'Show Files'}
                      </button>
                      
                      <div className="hidden md:flex items-center text-sm text-gray-500">
                        <FolderOpen className="h-4 w-4 mr-1" />
                        {expandedTutorial !== null && filteredTutorials[expandedTutorial]?.name}
                        <ChevronRight className="h-4 w-4 mx-2" />
                        <FileText className="h-4 w-4 mr-1" />
                        {selectedFile.filename}
                      </div>
                    </div>

                    {/* Center: Page navigation */}
                    <div className="hidden lg:flex items-center space-x-4">
                      {expandedTutorial !== null && filteredTutorials[expandedTutorial]?.files && (
                        <div className="flex items-center space-x-2 text-sm">
                          <button
                            onClick={() => handleFileNavigation(Math.max(0, currentFileIndex - 1))}
                            disabled={currentFileIndex === 0}
                            className={`p-2 rounded-lg transition-colors ${
                              currentFileIndex === 0
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          
                          <span className="px-3 py-1 bg-gray-100 rounded-lg text-gray-700 font-medium min-w-[100px] text-center">
                            {currentFileIndex + 1} of {filteredTutorials[expandedTutorial].files.length}
                          </span>
                          
                          <button
                            onClick={() => handleFileNavigation(Math.min(filteredTutorials[expandedTutorial].files.length - 1, currentFileIndex + 1))}
                            disabled={currentFileIndex === filteredTutorials[expandedTutorial].files.length - 1}
                            className={`p-2 rounded-lg transition-colors ${
                              currentFileIndex === filteredTutorials[expandedTutorial].files.length - 1
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right: TOC toggle and file info */}
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setShowToc(!showToc)}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          showToc 
                            ? 'text-primary-700 bg-primary-100 hover:bg-primary-200' 
                            : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                        }`}
                        title={showToc ? "Hide table of contents" : "Show table of contents"}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        TOC
                      </button>

                      {selectedFile.size && (
                        <span className="hidden sm:block text-sm text-gray-500">
                          {formatFileSize(selectedFile.size)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex">
                {/* Collapsible Sidebar */}
                {showSidebar && (
                  <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
                    <div className="h-screen overflow-y-auto">
                      {/* Search and Filter in sidebar */}
                      <div className="p-4 border-b border-gray-200">
                        <SearchAndFilter
                          tutorials={tutorials}
                          onFilteredResults={handleFilteredResults}
                        />
                      </div>

                      {/* Tutorial List */}
                      <div className="p-4">
                        <div className="space-y-2">
                          {filteredTutorials.map((tutorial, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => handleTutorialToggle(index)}
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center">
                        <FolderOpen className="h-4 w-4 text-gray-500 mr-2" />
                        <div>
                          <p className="font-medium text-gray-900">{tutorial.name}</p>
                          <p className="text-sm text-gray-500">
                            {tutorial.files?.length || tutorial.markdown_files || 0} files
                          </p>
                        </div>
                      </div>
                      {expandedTutorial === index ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </button>

                    {expandedTutorial === index && (
                      <div className="border-t">
                        <div className="px-4 py-2 bg-gray-25 border-b">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(tutorial.created)}
                            </div>
                            <button
                              onClick={() => handleOpenInExplorer(tutorial.path)}
                              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Open
                            </button>
                          </div>
                        </div>
                        
                        {tutorial.files && tutorial.files.length > 0 ? (
                          <div className="max-h-60 overflow-y-auto">
                            {tutorial.files.map((file, fileIndex) => (
                              <button
                                key={fileIndex}
                                onClick={() => handleFileClick(tutorial, file, fileIndex)}
                                className={`w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                                  selectedFile === file ? 'bg-primary-50 border-primary-200' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center min-w-0">
                                    <FileText className="h-3 w-3 text-gray-400 mr-2 flex-shrink-0" />
                                    <span className="text-sm font-medium text-gray-900 truncate">
                                      {file.filename}
                                    </span>
                                  </div>
                                  {file.size && (
                                    <span className="text-xs text-gray-500 ml-2">
                                      {formatFileSize(file.size)}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            No files found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                  </div>
                </div>
              </div>
            )}

            {/* File Content Area */}
            <div className={`space-y-4 ${showSidebar ? 'lg:col-span-3' : ''}`}>
              {!showSidebar && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Show tutorial list
                </button>
              )}

              {selectedFile ? (
                <div className="space-y-4">
                  {/* File header with navigation */}
                  <div className="card">
                    <div className="flex items-center justify-between p-4 border-b">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-500 mr-2" />
                        <div>
                          <h3 className="font-medium text-gray-900">{selectedFile.filename}</h3>
                          <p className="text-sm text-gray-500">
                            {expandedTutorial !== null && filteredTutorials[expandedTutorial]?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {selectedFile.size && (
                          <span className="text-sm text-gray-500">
                            {formatFileSize(selectedFile.size)}
                          </span>
                        )}
                        <button
                          onClick={() => setShowToc(!showToc)}
                          className="text-gray-500 hover:text-gray-700"
                          title={showToc ? "Hide table of contents" : "Show table of contents"}
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Page Navigation */}
                    {expandedTutorial !== null && filteredTutorials[expandedTutorial]?.files && (
                      <PageNavigation
                        files={filteredTutorials[expandedTutorial].files}
                        currentFileIndex={currentFileIndex}
                        onFileChange={handleFileNavigation}
                        className="border-b"
                      />
                    )}
                  </div>

                  {/* Content area with TOC */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Table of Contents */}
                    {showToc && (
                      <div className="lg:col-span-1">
                        <div className="sticky top-4">
                          <TableOfContents content={fileContent} />
                        </div>
                      </div>
                    )}

                    {/* File Content */}
                    <div className={showToc ? 'lg:col-span-3' : 'lg:col-span-4'}>
                      <div className="card">
                        <div className="p-6">
                          {loadingFile ? (
                            <div className="flex items-center justify-center py-12">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                              <span className="ml-2 text-gray-600">Loading content...</span>
                            </div>
                          ) : fileContent ? (
                            <div>
                              {selectedFile.filename.endsWith('.md') || selectedFile.filename.endsWith('.markdown') ? (
                                <MarkdownRenderer content={fileContent} />
                              ) : (
                                <pre className="bg-gray-50 border rounded-md p-4 overflow-x-auto text-sm">
                                  <code>{fileContent}</code>
                                </pre>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-500">
                              Failed to load file content
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="flex items-center justify-center py-24">
                    <div className="text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No file selected</h3>
                      <p className="mt-2 text-gray-500">
                        Choose a tutorial and file to view its content
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewTutorials;