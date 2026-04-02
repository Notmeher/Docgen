# PocketFlow Tutorial Generator - React Frontend

A modern React-based web interface for the PocketFlow Tutorial Generator, built with Vite, Tailwind CSS, and React Router.

## Features

- 🎯 **Tutorial Generation**: Generate comprehensive tutorials from codebases
- 📊 **Real-time Progress Monitoring**: Track generation progress with live updates
-  **Tutorial Browsing**: View and navigate generated documentation
- 🎨 **Modern UI**: Clean, responsive interface with Tailwind CSS
- 📱 **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- 🔄 **Interactive Diagrams**: Mermaid.js diagrams with zoom and pan controls
-  **Fast Development**: Vite for instant hot reload

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Running FastAPI backend (see main project README)

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The development server will start on `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Layout.jsx      # Main layout with navigation
│   │   └── MermaidDiagram.jsx  # Interactive diagram component
│   ├── contexts/           # React context providers
│   │   └── ApiContext.jsx  # API connection state management
│   ├── pages/              # Page components
│   │   ├── GenerateTutorial.jsx    # Tutorial generation form
│   │   ├── MonitorGeneration.jsx   # Progress monitoring
│   │   └── ViewTutorials.jsx       # Tutorial browser
│   ├── utils/              # Utility functions
│   │   └── api.js          # API service layer
│   ├── App.jsx             # Main app component with routing
│   ├── main.jsx            # React entry point
│   └── index.css           # Tailwind CSS imports
├── index.html              # HTML template
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind configuration
├── vite.config.js          # Vite configuration
└── README.md               # This file
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

## API Integration

The frontend communicates with the FastAPI backend running on `http://localhost:8000`. Key endpoints:

- `POST /generate-tutorial` - Start tutorial generation
- `GET /tutorial-status/{task_id}` - Check generation progress  
- `GET /tutorials` - List available tutorials
- `GET /tutorial-file/{path}` - Get tutorial file content

## Key Features

### Tutorial Generation

- **Local Directory**: Browse and select local codebases
- **Repository Input**: Enter GitHub repository URLs
- **Real-time Validation**: Instant feedback on inputs
- **Progress Tracking**: Live updates during generation

### Progress Monitoring

- **Status Updates**: Real-time generation progress
- **Auto-refresh**: Automatic status polling
- **Timeline View**: Visual progress indicator
- **Error Handling**: Detailed error messages and recovery options

### Tutorial Browsing

- **File Tree**: Navigate tutorial structure
- **Markdown Rendering**: Rich content display
- **Code Highlighting**: Syntax-highlighted code blocks
- **Interactive Diagrams**: Zoomable Mermaid.js diagrams

### Diagram Features

- **Pan & Zoom**: Mouse drag and scroll wheel support
- **Fullscreen Mode**: Expand diagrams for detailed viewing
- **Reset Controls**: Return to default view
- **Mobile Support**: Touch-friendly controls

## Styling

Built with Tailwind CSS for:

- Responsive design system
- Consistent spacing and colors
- Dark mode support (planned)
- Component utilities
- Custom animations

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Development

### Code Style

- ESLint for code quality
- Prettier for formatting (recommended)
- React best practices
- Functional components with hooks

### State Management

- React Context for global state
- Local state for component-specific data
- Custom hooks for reusable logic

### Performance

- Vite for fast builds and HMR
- React.memo for component optimization
- Lazy loading for large components
- Efficient re-renders with proper dependencies

## Troubleshooting

### Common Issues

1. **Backend Connection**: Ensure FastAPI server is running on port 8000
2. **CORS Errors**: Check backend CORS configuration
3. **Build Failures**: Clear node_modules and reinstall dependencies
4. **Diagram Rendering**: Verify Mermaid.js CDN availability

### Development Mode

```bash
# Clear cache and restart
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Contributing

1. Follow React best practices
2. Use TypeScript for new components (migration planned)
3. Add proper PropTypes or TypeScript interfaces
4. Test on multiple browsers and screen sizes
5. Maintain responsive design principles

## Deployment

The frontend can be deployed to any static hosting service:

- Netlify
- Vercel  
- GitHub Pages
- AWS S3 + CloudFront
- Traditional web servers

Build the project and deploy the `dist/` folder contents.

---

For backend setup and API documentation, see the main project README.