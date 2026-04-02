import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Activity,
  FolderOpen
} from 'lucide-react';
import { useApi } from '../contexts/ApiContext';
import { apiService } from '../utils/api';

const MonitorGeneration = () => {
  const navigate = useNavigate();
  const { currentTaskId, clearCurrentTask } = useApi();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!currentTaskId) {
      navigate('/generate');
      return;
    }

    fetchStatus();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStatus();
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTaskId, autoRefresh]);

  const fetchStatus = async () => {
    if (!currentTaskId) return;
    
    setLoading(true);
    const result = await apiService.getTutorialStatus(currentTaskId);
    
    if (result.success) {
      setStatus(result.data);
      
      // Stop auto-refresh if completed or failed
      if (result.data.status === 'completed' || result.data.status === 'error') {
        setAutoRefresh(false);
      }
    } else {
      toast.error(`Error checking status: ${result.error}`);
    }
    setLoading(false);
  };

  const handleRefresh = () => {
    fetchStatus();
  };

  const handleFinish = () => {
    clearCurrentTask();
    navigate('/tutorials');
  };

  const handleTryAgain = () => {
    clearCurrentTask();
    navigate('/generate');
  };

  if (!currentTaskId) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📊 Generation Progress</h1>
        <p className="mt-2 text-gray-600">
          Monitoring tutorial generation task: {currentTaskId}
        </p>
      </div>

      <div className="space-y-6">
        {/* Status Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Current Status</h2>
            <div className="flex items-center space-x-2">
              <label className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-2"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh
              </label>
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

          {status ? (
            <div className="space-y-4">
              <StatusIndicator status={status.status} message={status.message} />
              
              {status.final_output_dir && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center">
                    <FolderOpen className="h-5 w-5 text-green-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Output Directory</p>
                      <code className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                        {status.final_output_dir}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {status.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-red-800 mb-2">Error Details:</h3>
                  <pre className="text-sm text-red-700 bg-red-100 p-3 rounded overflow-x-auto">
                    {status.error}
                  </pre>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                {status.status === 'completed' && (
                  <button
                    onClick={handleFinish}
                    className="btn btn-primary flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    View Tutorials
                  </button>
                )}

                {status.status === 'error' && (
                  <button
                    onClick={handleTryAgain}
                    className="btn btn-primary flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-gray-600">Loading status...</span>
            </div>
          )}
        </div>

        {/* Progress Timeline */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Process Timeline</h2>
          <div className="space-y-4">
            <TimelineStep
              icon={Clock}
              title="Task Queued"
              description="Tutorial generation request received and queued"
              status={status?.status ? 'completed' : 'pending'}
            />
            <TimelineStep
              icon={Activity}
              title="Processing Files"
              description="Analyzing codebase and generating content"
              status={status?.status === 'running' ? 'current' : 
                      status?.status === 'completed' ? 'completed' :
                      status?.status === 'error' ? 'error' : 'pending'}
            />
            <TimelineStep
              icon={CheckCircle}
              title="Tutorial Complete"
              description="Tutorial generation finished successfully"
              status={status?.status === 'completed' ? 'completed' : 'pending'}
            />
          </div>
        </div>

        {/* Task Information */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Task Information</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Task ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{currentTaskId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">{status?.status || 'Loading...'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Message</dt>
              <dd className="mt-1 text-sm text-gray-900">{status?.message || 'Loading...'}</dd>
            </div>
            {status?.final_output_dir && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Output Directory</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{status.final_output_dir}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

const StatusIndicator = ({ status, message }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'queued':
        return {
          icon: Clock,
          iconClass: 'text-yellow-400',
          bgClass: 'bg-yellow-50 border-yellow-200',
          textClass: 'text-yellow-800'
        };
      case 'running':
        return {
          icon: Activity,
          iconClass: 'text-blue-400 animate-pulse',
          bgClass: 'bg-blue-50 border-blue-200',
          textClass: 'text-blue-800'
        };
      case 'completed':
        return {
          icon: CheckCircle,
          iconClass: 'text-green-400',
          bgClass: 'bg-green-50 border-green-200',
          textClass: 'text-green-800'
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconClass: 'text-red-400',
          bgClass: 'bg-red-50 border-red-200',
          textClass: 'text-red-800'
        };
      default:
        return {
          icon: Clock,
          iconClass: 'text-gray-400',
          bgClass: 'bg-gray-50 border-gray-200',
          textClass: 'text-gray-800'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'queued': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className={`border rounded-md p-4 ${config.bgClass}`}>
      <div className="flex items-center">
        <Icon className={`h-6 w-6 mr-3 ${config.iconClass}`} />
        <div className="flex-1">
          <p className={`text-lg font-medium ${config.textClass}`}>
            {getStatusEmoji(status)} {message}
          </p>
        </div>
      </div>
    </div>
  );
};

const TimelineStep = ({ icon: Icon, title, description, status }) => {
  const getStepClass = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'current':
        return 'text-blue-600 bg-blue-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-400 bg-gray-100';
    }
  };

  const getLineClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-200';
      case 'current':
        return 'bg-blue-200';
      case 'error':
        return 'bg-red-200';
      default:
        return 'bg-gray-200';
    }
  };

  return (
    <div className="relative flex items-start">
      <div className="relative flex items-center justify-center flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStepClass(status)}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="ml-4 min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
};

export default MonitorGeneration;