import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MermaidDiagram from './MermaidDiagram';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';

// Import highlight.js CSS for syntax highlighting
import 'highlight.js/styles/github.css';
// Import custom markdown styles
import './MarkdownRenderer.css';

const MarkdownRenderer = ({ content, className = '', isDarkMode = false, onMarkdownLinkClick }) => {
  const [copiedCode, setCopiedCode] = useState(null);
  const [imageErrors, setImageErrors] = useState(new Set());

  const handleCopyCode = async (code, index) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(index);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleImageError = (src) => {
    setImageErrors(prev => new Set([...prev, src]));
  };

  const components = {
    // Custom code block component with copy functionality
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const code = String(children).replace(/\n$/, '');

      // Handle Mermaid diagrams
      if (language === 'mermaid') {
        return <MermaidDiagram chart={code} className="my-6" />;
      }

      // Handle special cases for language detection
      const getLanguageDisplay = (lang) => {
        const languageMap = {
          'js': 'JavaScript',
          'jsx': 'React JSX',
          'ts': 'TypeScript',
          'tsx': 'React TSX',
          'py': 'Python',
          'sh': 'Shell',
          'bash': 'Bash',
          'zsh': 'Zsh',
          'json': 'JSON',
          'yaml': 'YAML',
          'yml': 'YAML',
          'md': 'Markdown',
          'html': 'HTML',
          'css': 'CSS',
          'scss': 'SCSS',
          'sass': 'Sass',
          'sql': 'SQL',
          'dockerfile': 'Dockerfile',
          'gitignore': 'Git Ignore',
        };
        return languageMap[lang] || (lang ? lang.toUpperCase() : 'Code');
      };

      // Inline code
      if (inline) {
        return (
          <code 
            className={`px-2 py-1 rounded-md text-sm font-mono font-medium ${
              isDarkMode 
                ? 'bg-gray-800 text-blue-300 border border-gray-700' 
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
            {...props}
          >
            {children}
          </code>
        );
      }

      // Block code with syntax highlighting
      return (
        <div className="relative my-6 group">
          <div className={`flex items-center justify-between px-4 py-3 rounded-t-lg border-b ${
            isDarkMode 
              ? 'bg-gray-800 text-white border-gray-700' 
              : 'bg-gray-50 text-gray-800 border-gray-200'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-red-500' : 'bg-red-400'}`}></div>
              <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-yellow-500' : 'bg-yellow-400'}`}></div>
              <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-green-500' : 'bg-green-400'}`}></div>
              <span className={`ml-3 text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {getLanguageDisplay(language)}
              </span>
            </div>
            <button
              onClick={() => handleCopyCode(code, `${language}-${node.position?.start.line || Math.random()}`)}
              className={`copy-button flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                isDarkMode
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700 border border-gray-600 hover:border-gray-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white border border-gray-300 hover:border-gray-400 hover:shadow-sm'
              } opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-500`}
              title="Copy to clipboard"
              aria-label="Copy code to clipboard"
            >
              {copiedCode === `${language}-${node.position?.start.line || Math.random()}` ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="overflow-x-auto">
            <SyntaxHighlighter
              style={isDarkMode ? oneDark : oneLight}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius: '0.5rem',
                borderBottomRightRadius: '0.5rem',
                fontSize: '14px',
                lineHeight: '1.5',
                padding: '1.5rem',
                border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                borderTop: 'none',
                backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              }}
              showLineNumbers={code.split('\n').length > 8}
              lineNumberStyle={{
                minWidth: '3em',
                paddingRight: '1.5em',
                color: isDarkMode ? '#6b7280' : '#9ca3af',
                borderRight: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                marginRight: '1.5em',
                textAlign: 'right',
                userSelect: 'none',
                fontSize: '12px',
              }}
              wrapLines={true}
              wrapLongLines={true}
              {...props}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        </div>
      );
    },

    // Enhanced headings with anchor links
    h1: ({ children, ...props }) => (
      <h1 
        className={`text-4xl font-bold mt-12 mb-6 pb-3 border-b-2 scroll-mt-20 ${
          isDarkMode 
            ? 'text-white border-gray-600' 
            : 'text-gray-900 border-gray-200'
        }`}
        id={slugify(String(children))}
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 
        className={`text-2xl font-semibold mt-10 mb-4 pb-2 border-b scroll-mt-20 ${
          isDarkMode 
            ? 'text-gray-100 border-gray-700' 
            : 'text-gray-900 border-gray-100'
        }`}
        id={slugify(String(children))}
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 
        className={`text-xl font-semibold mt-8 mb-3 scroll-mt-20 ${
          isDarkMode ? 'text-gray-100' : 'text-gray-900'
        }`}
        id={slugify(String(children))}
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 
        className={`text-lg font-semibold mt-6 mb-2 scroll-mt-20 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-900'
        }`}
        id={slugify(String(children))}
        {...props}
      >
        {children}
      </h4>
    ),
    h5: ({ children, ...props }) => (
      <h5 
        className={`text-base font-semibold mt-4 mb-2 scroll-mt-20 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-900'
        }`}
        id={slugify(String(children))}
        {...props}
      >
        {children}
      </h5>
    ),
    h6: ({ children, ...props }) => (
      <h6 
        className={`text-sm font-semibold mt-3 mb-1 scroll-mt-20 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-900'
        }`}
        id={slugify(String(children))}
        {...props}
      >
        {children}
      </h6>
    ),

    // Enhanced paragraphs
    p: ({ children, ...props }) => (
      <p className={`mb-5 leading-7 text-base ${
        isDarkMode ? 'text-gray-300' : 'text-gray-700'
      }`} {...props}>
        {children}
      </p>
    ),

    // Enhanced lists
    ul: ({ children, ...props }) => (
      <ul className={`mb-5 ml-6 space-y-2 list-disc ${
        isDarkMode ? 'marker:text-gray-500' : 'marker:text-gray-400'
      }`} {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className={`mb-5 ml-6 space-y-2 list-decimal ${
        isDarkMode ? 'marker:text-gray-500' : 'marker:text-gray-400'
      }`} {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className={`leading-6 ${
        isDarkMode ? 'text-gray-300' : 'text-gray-700'
      }`} {...props}>
        {children}
      </li>
    ),

    // Enhanced links with internal markdown link support
    a: ({ href, children, ...props }) => {
      const isMarkdownLink = href?.endsWith('.md') || href?.endsWith('.markdown');
      const isExternalLink = href?.startsWith('http');
      
      const handleClick = (e) => {
        if (isMarkdownLink && onMarkdownLinkClick) {
          e.preventDefault();
          onMarkdownLinkClick(href);
        }
      };
      
      return (
        <a
          href={href}
          onClick={handleClick}
          className={`font-medium underline decoration-2 underline-offset-2 transition-all duration-200 inline-flex items-center gap-1 ${
            isDarkMode
              ? 'text-blue-400 decoration-blue-400/30 hover:text-blue-300 hover:decoration-blue-300/50'
              : 'text-blue-600 decoration-blue-600/30 hover:text-blue-700 hover:decoration-blue-700/50'
          }`}
          target={isExternalLink ? '_blank' : undefined}
          rel={isExternalLink ? 'noopener noreferrer' : undefined}
          {...props}
        >
          {children}
          {isExternalLink && (
            <ExternalLink className="h-3 w-3 ml-1" />
          )}
        </a>
      );
    },

    // Enhanced blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote 
        className={`border-l-4 pl-6 py-4 my-6 italic rounded-r-lg ${
          isDarkMode
            ? 'border-blue-500 bg-blue-900/20 text-gray-300'
            : 'border-blue-300 bg-blue-50 text-gray-700'
        }`}
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Enhanced tables
    table: ({ children, ...props }) => (
      <div className="my-8 overflow-x-auto rounded-lg shadow-sm">
        <table className={`min-w-full divide-y rounded-lg overflow-hidden ${
          isDarkMode
            ? 'divide-gray-700 border border-gray-700'
            : 'divide-gray-200 border border-gray-200'
        }`} {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }) => (
      <tbody className={`divide-y ${
        isDarkMode 
          ? 'bg-gray-900 divide-gray-700' 
          : 'bg-white divide-gray-200'
      }`} {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }) => (
      <tr className={`transition-colors ${
        isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
      }`} {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }) => (
      <th 
        className={`px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className={`px-6 py-4 text-sm leading-relaxed ${
        isDarkMode ? 'text-gray-300' : 'text-gray-700'
      }`} {...props}>
        {children}
      </td>
    ),

    // Enhanced horizontal rule
    hr: ({ ...props }) => (
      <hr className={`my-12 border-t-2 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`} {...props} />
    ),

    // Enhanced images with error handling
    img: ({ src, alt, ...props }) => {
      if (imageErrors.has(src)) {
        return (
          <div className={`flex items-center justify-center p-8 my-6 rounded-lg border-2 border-dashed ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'
          }`}>
            <div className="text-center">
              <div className={`text-2xl mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>🖼️</div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Image not found: {alt || 'Untitled'}
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="my-8">
          <img 
            src={src} 
            alt={alt}
            className="max-w-full h-auto rounded-xl shadow-lg mx-auto"
            loading="lazy"
            onError={() => handleImageError(src)}
            {...props}
          />
          {alt && (
            <p className={`text-center text-sm mt-3 italic ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {alt}
            </p>
          )}
        </div>
      );
    },

    // Task lists (GitHub-style checkboxes)
    input: ({ type, checked, ...props }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled
            className={`mr-3 h-4 w-4 rounded border-2 ${
              isDarkMode 
                ? 'border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500' 
                : 'border-gray-300 bg-white text-blue-600 focus:ring-blue-500'
            }`}
            {...props}
          />
        );
      }
      return <input type={type} {...props} />;
    },

    // Enhanced strong and emphasis
    strong: ({ children, ...props }) => (
      <strong className={`font-semibold ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`} {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em className={`italic ${
        isDarkMode ? 'text-gray-300' : 'text-gray-700'
      }`} {...props}>
        {children}
      </em>
    ),
  };

  return (
    <div className={`w-full max-w-none ${className} ${
      isDarkMode ? 'dark text-gray-100' : 'text-gray-900'
    }`}>
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Utility function to create URL-friendly slugs for heading anchors
const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

export default MarkdownRenderer;