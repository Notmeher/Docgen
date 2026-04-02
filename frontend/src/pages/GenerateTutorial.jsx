import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Github, 
  Folder, 
  AlertCircle, 
  CheckCircle, 
  Info,
  HelpCircle,
  Eye,
  Home
} from 'lucide-react';
import { useApi } from '../contexts/ApiContext';
import { apiService } from '../utils/api';

const GenerateTutorial = () => {
  const navigate = useNavigate();
  const { isConnected, startTutorialGeneration } = useApi();
  const [sourceType, setSourceType] = useState('github');
  const [formData, setFormData] = useState({
    repoUrl: '',
    localDir: '',
    projectName: '',
    githubToken: '',
    outputDir: 'output',
    language: 'english',
    maxFileSize: 100000,
    maxAbstractions: 10,
    useCache: true,
    generateReadme: false,
    includePatterns: '',
    excludePatterns: ''
  });
  
  const [directoryValidation, setDirectoryValidation] = useState({
    exists: false,
    totalFiles: 0,
    codeFiles: 0,
    sampleFiles: [],
    error: null
  });

  const [confirmations, setConfirmations] = useState({
    emptyDir: false,
    noCodeFiles: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate local directory (simulated - would need Node.js backend integration for real file system access)
  useEffect(() => {
    if (sourceType === 'local' && formData.localDir.trim()) {
      // In a real implementation, you'd call a backend API to validate the directory
      // For now, we'll simulate validation
      validateLocalDirectory(formData.localDir.trim());
    }
  }, [formData.localDir, sourceType]);

  const validateLocalDirectory = async (path) => {
    try {
      // Convert pattern strings to arrays (backend expects arrays)
      const includePatterns = formData.includePatterns 
        ? formData.includePatterns.split(',').map(p => p.trim()).filter(p => p)
        : null;
      const excludePatterns = formData.excludePatterns 
        ? formData.excludePatterns.split(',').map(p => p.trim()).filter(p => p)
        : null;
      
      // Call backend API to validate directory using the API service
      const result = await apiService.validateDirectory(path, {
        includePatterns,
        excludePatterns,
        maxFileSize: formData.maxFileSize
      });
      
      if (result.success) {
        setDirectoryValidation(result.data);
      } else {
        setDirectoryValidation({
          exists: false,
          totalFiles: 0,
          codeFiles: 0,
          sampleFiles: [],
          error: result.error || 'Failed to validate directory'
        });
      }
    } catch (error) {
      console.error('Error validating directory:', error);
      setDirectoryValidation({
        exists: false,
        totalFiles: 0,
        codeFiles: 0,
        sampleFiles: [],
        error: 'Failed to validate directory. Make sure the backend server is running on port 8000.'
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleShowCurrentDirectory = () => {
    // In a real app, this would call a backend API to get the current directory
    toast.info('Current directory: C:\\Users\\YourName\\Projects', {
      duration: 4000,
    });
  };

  const handleUseCurrentDirectory = () => {
    // In a real app, this would get the actual current directory
    handleInputChange('localDir', 'C:\\Users\\YourName\\Projects\\current-project');
    toast.success('Current directory set');
  };

  const canSubmit = () => {
    if (!isConnected) return false;
    
    if (sourceType === 'github') {
      return formData.repoUrl.trim() !== '';
    } else {
      if (!formData.localDir.trim() || !directoryValidation.exists) return false;
      
      // Check confirmations for edge cases
      if (directoryValidation.totalFiles === 0 && !confirmations.emptyDir) return false;
      if (directoryValidation.codeFiles === 0 && directoryValidation.totalFiles > 0 && !confirmations.noCodeFiles) return false;
      
      return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canSubmit()) {
      toast.error('Please complete the form validation');
      return;
    }

    setIsSubmitting(true);

    const requestData = {
      repo_url: sourceType === 'github' ? formData.repoUrl : null,
      local_dir: sourceType === 'local' ? formData.localDir : null,
      project_name: formData.projectName || null,
      github_token: formData.githubToken || null,
      output_dir: formData.outputDir,
      max_file_size: formData.maxFileSize,
      language: formData.language,
      use_cache: formData.useCache,
      max_abstraction_num: formData.maxAbstractions,
      generate_readme: formData.generateReadme
    };

    // Add patterns if provided
    if (formData.includePatterns.trim()) {
      requestData.include_patterns = formData.includePatterns
        .split('\n')
        .map(p => p.trim())
        .filter(p => p);
    }

    if (formData.excludePatterns.trim()) {
      requestData.exclude_patterns = formData.excludePatterns
        .split('\n')
        .map(p => p.trim())
        .filter(p => p);
    }

    try {
      const result = await startTutorialGeneration(requestData);
      
      if (result.success) {
        toast.success(`Tutorial generation started! Task ID: ${result.data.task_id}`);
        navigate('/monitor');
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error) {
      toast.error('Failed to start tutorial generation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showEmptyDirWarning = sourceType === 'local' && directoryValidation.exists && directoryValidation.totalFiles === 0;
  const showNoCodeWarning = sourceType === 'local' && directoryValidation.exists && directoryValidation.totalFiles > 0 && directoryValidation.codeFiles === 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900"> Generate New Tutorial</h1>
        <p className="mt-2 text-gray-600">
          Generate comprehensive tutorials from GitHub repositories or local codebases
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Source Selection */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📂 Choose Your Source</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
              sourceType === 'github' ? 'border-primary-600 ring-2 ring-primary-600' : 'border-gray-300'
            }`}>
              <input
                type="radio"
                className="sr-only"
                value="github"
                checked={sourceType === 'github'}
                onChange={(e) => setSourceType(e.target.value)}
              />
              <Github className="h-6 w-6 text-gray-400 mr-3" />
              <div className="flex flex-col">
                <span className="block text-sm font-medium text-gray-900">GitHub Repository</span>
                <span className="block text-sm text-gray-500">Analyze code from a public or private GitHub repository</span>
              </div>
            </label>

            <label className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
              sourceType === 'local' ? 'border-primary-600 ring-2 ring-primary-600' : 'border-gray-300'
            }`}>
              <input
                type="radio"
                className="sr-only"
                value="local"
                checked={sourceType === 'local'}
                onChange={(e) => setSourceType(e.target.value)}
              />
              <Folder className="h-6 w-6 text-gray-400 mr-3" />
              <div className="flex flex-col">
                <span className="block text-sm font-medium text-gray-900">Local Directory</span>
                <span className="block text-sm text-gray-500">Analyze code from a folder on your computer</span>
              </div>
            </label>
          </div>

          {sourceType === 'github' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-400 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">GitHub Repository</h3>
                  <p className="text-sm text-blue-700 mt-1">Analyze code from a public or private GitHub repository</p>
                </div>
              </div>
            </div>
          )}

          {sourceType === 'local' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <div className="flex">
                <Info className="h-5 w-5 text-green-400 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-green-800">Local Directory</h3>
                  <p className="text-sm text-green-700 mt-1">Analyze code from a folder on your computer</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {sourceType === 'github' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repository URL
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://github.com/owner/repo"
                    value={formData.repoUrl}
                    onChange={(e) => handleInputChange('repoUrl', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Token (optional)
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={formData.githubToken}
                    onChange={(e) => handleInputChange('githubToken', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Required for private repos or to avoid rate limits</p>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📁 Local Directory Path
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="C:\Users\YourName\Documents\MyProject or /path/to/your/project"
                    value={formData.localDir}
                    onChange={(e) => handleInputChange('localDir', e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the full path to your local project directory
                  </p>
                </div>

                {/* Quick Actions */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">💡 Quick Actions:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary text-sm flex items-center justify-center"
                      onClick={handleShowCurrentDirectory}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Show Current Directory
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary text-sm flex items-center justify-center"
                      onClick={handleUseCurrentDirectory}
                    >
                      <Home className="h-4 w-4 mr-1" />
                      Use Current Directory
                    </button>
                  </div>
                </div>

                {/* Path Examples */}
                <details className="bg-gray-50 rounded-md p-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 flex items-center">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Path Examples & Help
                  </summary>
                  <div className="mt-3 space-y-3 text-sm text-gray-600">
                    <div>
                      <p className="font-medium">Windows Examples:</p>
                      <code className="block bg-gray-100 p-2 rounded text-xs mt-1">C:\Users\YourName\Documents\MyProject</code>
                      <code className="block bg-gray-100 p-2 rounded text-xs mt-1">C:\dev\my-python-project</code>
                    </div>
                    <div>
                      <p className="font-medium">Unix/Linux Examples:</p>
                      <code className="block bg-gray-100 p-2 rounded text-xs mt-1">/home/username/projects/my-project</code>
                      <code className="block bg-gray-100 p-2 rounded text-xs mt-1">/Users/username/Documents/code/project</code>
                    </div>
                    <div>
                      <p className="font-medium">💡 Tips:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Use forward slashes (/) or double backslashes (\\) in paths</li>
                        <li>Avoid paths with spaces if possible</li>
                        <li>Make sure you have read permission for the directory</li>
                      </ul>
                    </div>
                  </div>
                </details>

                {/* Directory Validation */}
                {formData.localDir.trim() && directoryValidation && (
                  <div className="border rounded-md p-4">
                    {directoryValidation.exists ? (
                      <div>
                        <div className="flex items-center text-green-600 mb-3">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          <span className="font-medium">Directory found: {formData.localDir}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="bg-gray-50 rounded p-3">
                            <p className="text-sm font-medium text-gray-700">Total Files</p>
                            <p className="text-2xl font-bold text-gray-900">{directoryValidation.totalFiles}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-3">
                            <p className="text-sm font-medium text-gray-700">Code Files</p>
                            <p className="text-2xl font-bold text-gray-900">{directoryValidation.codeFiles}</p>
                          </div>
                        </div>
                        {directoryValidation.sampleFiles && directoryValidation.sampleFiles.length > 0 && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Sample files:</span> {directoryValidation.sampleFiles.join(', ')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center text-red-600 mb-2">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          <span className="font-medium">{directoryValidation.error || 'Directory not found'}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p className="font-medium">Troubleshooting:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs mt-1">
                            <li>Check if the path is correct</li>
                            <li>Ensure you have permission to access the directory</li>
                            <li>Try using forward slashes (/) instead of backslashes (\)</li>
                            <li>Make sure the backend server is running on port 8000</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Confirmations */}
                {showEmptyDirWarning && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-800">Directory is empty - tutorial generation may not produce meaningful results</p>
                        <label className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            checked={confirmations.emptyDir}
                            onChange={(e) => setConfirmations(prev => ({ ...prev, emptyDir: e.target.checked }))}
                          />
                          <span className="ml-2 text-sm text-yellow-800">Continue with empty directory anyway</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {showNoCodeWarning && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-800">No common code files detected - tutorial may be limited</p>
                        <label className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            checked={confirmations.noCodeFiles}
                            onChange={(e) => setConfirmations(prev => ({ ...prev, noCodeFiles: e.target.checked }))}
                          />
                          <span className="ml-2 text-sm text-yellow-800">Continue without common code files anyway</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name (optional)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="My Awesome Project"
                value={formData.projectName}
                onChange={(e) => handleInputChange('projectName', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Will be derived from repo/directory if not provided</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Directory
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.outputDir}
                onChange={(e) => handleInputChange('outputDir', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Base directory for tutorial output</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tutorial Language
              </label>
              <select
                className="form-select"
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
              >
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
                <option value="french">French</option>
                <option value="german">German</option>
                <option value="chinese">Chinese</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max File Size (bytes)
              </label>
              <input
                type="number"
                className="form-input"
                min="1000"
                max="1000000"
                step="10000"
                value={formData.maxFileSize}
                onChange={(e) => handleInputChange('maxFileSize', parseInt(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Abstractions
              </label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="50"
                value={formData.maxAbstractions}
                onChange={(e) => handleInputChange('maxAbstractions', parseInt(e.target.value))}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="use-cache"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={formData.useCache}
                onChange={(e) => handleInputChange('useCache', e.target.checked)}
              />
              <label htmlFor="use-cache" className="ml-2 block text-sm text-gray-900">
                Use LLM Caching
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="generate-readme"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={formData.generateReadme}
                onChange={(e) => handleInputChange('generateReadme', e.target.checked)}
              />
              <label htmlFor="generate-readme" className="ml-2 block text-sm text-gray-900">
                📄 Generate README.md (Professional GitHub-style)
              </label>
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <details className="card">
          <summary className="cursor-pointer text-lg font-medium text-gray-900">
            Advanced File Filtering
          </summary>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Patterns (leave empty for defaults)
              </label>
              <textarea
                className="form-input"
                rows="4"
                placeholder="*.py&#10;*.js&#10;*.md"
                value={formData.includePatterns}
                onChange={(e) => handleInputChange('includePatterns', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">File patterns to include, one per line</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exclude Patterns (leave empty for defaults)
              </label>
              <textarea
                className="form-input"
                rows="4"
                placeholder="*test*&#10;*docs/*&#10;*.log"
                value={formData.excludePatterns}
                onChange={(e) => handleInputChange('excludePatterns', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">File patterns to exclude, one per line</p>
            </div>
          </div>
        </details>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit() || isSubmitting}
            className={`btn btn-primary px-8 py-3 text-lg ${
              (!canSubmit() || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              ' Generate Tutorial'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GenerateTutorial;