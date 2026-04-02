import { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

const MermaidDiagram = ({ chart, className = '' }) => {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadMermaid = async () => {
      try {
        if (window.mermaid) {
          setMermaidLoaded(true);
          return;
        }

        // Load Mermaid from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
        script.onload = () => {
          window.mermaid.initialize({ 
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            flowchart: {
              useMaxWidth: false,
              htmlLabels: true
            }
          });
          setMermaidLoaded(true);
        };
        script.onerror = () => {
          setError('Failed to load Mermaid library');
        };
        document.head.appendChild(script);
      } catch (err) {
        setError('Error loading Mermaid: ' + err.message);
      }
    };

    loadMermaid();
  }, []);

  useEffect(() => {
    if (!mermaidLoaded || !chart || !containerRef.current) return;

    const renderDiagram = async () => {
      try {
        setError(null);
        const element = containerRef.current.querySelector('.mermaid-content');
        if (!element) return;

        // Clear previous content
        element.innerHTML = '';

        // Generate unique ID for the diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render the diagram
        const { svg } = await window.mermaid.render(id, chart);
        element.innerHTML = svg;

        // Reset zoom and position when new diagram is rendered
        setZoom(1);
        setPosition({ x: 0, y: 0 });

      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('Failed to render diagram: ' + err.message);
      }
    };

    renderDiagram();
  }, [mermaidLoaded, chart]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleResetView = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (!mermaidLoaded) {
    return (
      <div className={`bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
          <span className="ml-2 text-gray-600">Loading diagram...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border-2 border-red-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <p className="text-red-800 font-medium">Failed to render diagram</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <details className="mt-2">
            <summary className="text-red-700 cursor-pointer text-sm">Show diagram source</summary>
            <pre className="text-red-600 text-xs mt-2 bg-red-100 p-2 rounded overflow-x-auto">
              {chart}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  const containerClasses = `
    relative bg-white border rounded-lg overflow-hidden
    ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : className}
  `;

  const contentClasses = `
    w-full h-full overflow-hidden cursor-${isDragging ? 'grabbing' : 'grab'}
  `;

  return (
    <div className={containerClasses}>
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex space-x-1 bg-white rounded-md shadow-sm border p-1">
        <button
          onClick={handleZoomIn}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={handleFullscreen}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute top-2 left-2 z-10 bg-white rounded-md shadow-sm border px-2 py-1">
          <span className="text-xs text-gray-600">{Math.round(zoom * 100)}%</span>
        </div>
      )}

      {/* Diagram container */}
      <div 
        ref={containerRef}
        className={contentClasses}
        style={{ 
          height: isFullscreen ? '100vh' : '400px',
          minHeight: isFullscreen ? '100vh' : '300px'
        }}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        <div
          className="mermaid-content w-full h-full flex items-center justify-center transition-transform duration-200"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        />
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div
          className="absolute inset-0 bg-black bg-opacity-50 -z-10"
          onClick={handleFullscreen}
        />
      )}

      {/* Instructions */}
      <div className="absolute bottom-2 left-2 z-10 bg-white bg-opacity-90 rounded text-xs text-gray-600 px-2 py-1">
        <span>Drag to pan • Scroll to zoom • Click controls to adjust view</span>
      </div>
    </div>
  );
};

export default MermaidDiagram;