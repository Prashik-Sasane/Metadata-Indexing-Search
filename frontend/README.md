# 🎨 Frontend - DSA Metadata Search System

Modern React + TypeScript frontend with Tailwind CSS for the DSA-powered metadata search system.

## ✨ Features

### 🎯 Core Functionality
- **Trie-Powered Autocomplete**: Real-time prefix suggestions as you type
- **Advanced Filtering**: Size range, tags, Top-K queries, and sorting
- **Performance Metrics**: Real-time display of DSA execution times
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile
- **Glass Morphism UI**: Modern glass-card design with backdrop blur effects

### 🎨 UI/UX Highlights
- **Gradient Backgrounds**: Beautiful gradient hero sections and buttons
- **Smooth Animations**: Fade-in, slide-up, and pulse animations
- **Hover Effects**: Interactive cards that lift and glow on hover
- **Loading States**: Skeleton loaders and spinners for better UX
- **Empty States**: Helpful messages when no data is available
- **Error Handling**: User-friendly error messages with recovery options

### 📊 Dashboard Features
- **Statistics Cards**: Total files, storage, speed, and DSA count
- **Interactive Charts**: Bar charts and pie charts with Recharts
- **Performance Table**: Complete DSA complexity analysis
- **Real-time Updates**: Live data from backend APIs

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend running on port 3000

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file (already created)
# .env file contains: VITE_API_URL=http://localhost:3000/api/v1

# Start development server
npm run dev
```

The app will be available at: **http://localhost:5173**

## 🎨 Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Query** - Data fetching and caching
- **React Router** - Client-side routing
- **Recharts** - Data visualization
- **Axios** - HTTP client

## 📁 Project Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts           # Axios API client with interceptors
│   ├── components/
│   │   ├── Header.tsx          # Navigation header with active states
│   │   └── SearchBar.tsx       # Autocomplete search with Trie
│   ├── pages/
│   │   ├── Dashboard.tsx       # Statistics and charts
│   │   ├── Search.tsx          # Advanced search with filters
│   │   └── FileDetail.tsx      # File metadata viewer
│   ├── App.tsx                 # Main app with routing
│   ├── main.tsx                # React entry point
│   ├── index.css               # Tailwind directives and custom styles
│   └── vite-env.d.ts           # Vite environment type declarations
├── public/
├── index.html
├── package.json
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
├── tsconfig.json
├── vite.config.ts
└── .env                        # Environment variables
```

## 🎨 Tailwind Configuration

### Custom Colors
```javascript
colors: {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    // ... up to 900
    600: '#2563eb', // Main primary color
  }
}
```

### Custom Animations
```javascript
animation: {
  'fade-in': 'fadeIn 0.5s ease-in-out',
  'slide-up': 'slideUp 0.3s ease-out',
  'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}
```

### Custom Components
- `.glass-card` - Glass morphism card with backdrop blur
- `.btn-primary` - Gradient button with hover effects
- `.btn-secondary` - Outlined button with hover states
- `.input-field` - Styled input with focus rings
- `.badge` - Pill-shaped badges for tags and labels

## 🌟 Key Components

### Header
- Sticky navigation with backdrop blur
- Active route highlighting
- Responsive mobile-friendly design
- Icon + text navigation items

### SearchBar
- Debounced autocomplete (300ms)
- Trie-powered suggestions from backend
- Loading spinner during search
- Beautiful dropdown with icons
- Click-to-select functionality

### Dashboard
- Hero section with gradient background
- 4 animated statistics cards
- Bar chart for file statistics
- Pie chart for DSA distribution
- Performance characteristics table

### Search Page
- Advanced filter panel (collapsible)
- Real-time search execution
- Performance metrics badge
- Responsive results table
- Pagination controls
- Empty and error states

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Production
npm run build            # Build for production
npm run preview          # Preview production build

# Linting
npm run lint             # Run ESLint
```

## 🎯 API Integration

All API calls go through the centralized API client:

```typescript
import { searchAPI, fileAPI } from './api/client';

// Search with filters
const results = await searchAPI.search({
  prefix: 'projects/',
  sizeMin: 1000,
  sizeMax: 100000,
  tag: 'production',
  topK: 10,
  sort: 'size'
});

// Get suggestions
const suggestions = await searchAPI.getSuggestions('proj', 10);

// Get statistics
const stats = await searchAPI.getStats();
```

## 🎨 Design System

### Colors
- **Primary**: Blue (#2563eb) - Actions, links, highlights
- **Success**: Green (#10b981) - Performance, confirmations
- **Warning**: Orange (#f59e0b) - Warnings, alerts
- **Error**: Red (#ef4444) - Errors, deletions
- **Neutral**: Slate (#64748b) - Text, borders

### Spacing
- Cards: `p-6` (24px) padding
- Sections: `gap-6` (24px) gaps
- Buttons: `px-6 py-3` padding

### Typography
- Headings: `text-4xl font-bold` (36px)
- Subheadings: `text-xl font-semibold` (20px)
- Body: `text-base` (16px)
- Small: `text-sm` (14px)

### Border Radius
- Cards: `rounded-2xl` (16px)
- Buttons: `rounded-xl` (12px)
- Inputs: `rounded-xl` (12px)
- Badges: `rounded-full` (9999px)

## 📱 Responsive Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md, lg)
- **Desktop**: > 1024px (xl, 2xl)

Grid layouts adapt:
```
Mobile: 1 column
Tablet: 2 columns
Desktop: 3-4 columns
```

## 🔍 Search Features

### Trie Autocomplete
- Activates after 2 characters
- 300ms debounce to reduce API calls
- Shows up to 10 suggestions
- Click suggestion to search immediately

### Advanced Filters
1. **Prefix**: Search by file path prefix
2. **Size Range**: Min and max size in bytes
3. **Tags**: Filter by metadata tags
4. **Top-K**: Get top K results using Heap
5. **Sort**: By size or most recent

### Performance Display
Shows real-time metrics:
- Execution time
- Search type used
- Number of index lookups
- Speed comparison

## 🚀 Performance Optimizations

- **React Query Caching**: Automatic caching and refetching
- **Debounced Search**: 300ms delay to reduce API calls
- **Lazy Loading**: Components loaded on demand
- **Code Splitting**: Automatic by Vite
- **Memoization**: React Query prevents unnecessary re-renders

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173

# Or use different port
npm run dev -- --port 3001
```

### Tailwind Not Working
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Verify config files exist
ls tailwind.config.js postcss.config.js
```

### API Connection Issues
```bash
# Check .env file
cat .env

# Verify backend is running
curl http://localhost:3000/api/v1/health

# Update API URL in .env if needed
VITE_API_URL=http://localhost:YOUR_PORT/api/v1
```

## 📚 Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Recharts Documentation](https://recharts.org/en-US)
- [Vite Documentation](https://vitejs.dev/guide/)

## 🎯 Next Steps

1. ✅ Setup Tailwind CSS
2. ✅ Create modern UI components
3. ✅ Implement animations and transitions
4. ⏳ Add dark mode support
5. ⏳ Implement infinite scroll
6. ⏳ Add file upload UI
7. ⏳ Create admin dashboard
8. ⏳ Add user authentication UI

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**
