const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, 'src', 'screens', 'CatalogScreen.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove selectedCategoryRef.current = selectedCategory at line ~313
content = content.replace(
  '  const selectedCategoryRef = useRef(selectedCategory)\r\n  selectedCategoryRef.current = selectedCategory\r\n  const hasCategoryHistoryRef = useRef(false)',
  '  const selectedCategoryRef = useRef(selectedCategory)\r\n  const hasCategoryHistoryRef = useRef(false)\r\n\r\n  useEffect(() => {\r\n    selectedCategoryRef.current = selectedCategory\r\n  })'
);

// 2. Remove handleBackToCategoriesRef.current = handleBackToCategories at line ~557
content = content.replace(
  '\r\n  const handleBackToCategoriesRef = useRef(handleBackToCategories)\r\n  handleBackToCategoriesRef.current = handleBackToCategories\r\n\r\n  useEffect(() => {\r\n    const handlePopState = () => {\r\n      if (selectedCategoryRef.current) {\r\n        handleBackToCategoriesRef.current()\r\n      }\r\n    }\r\n    window.addEventListener(\'popstate\', handlePopState)\r\n    return () => window.removeEventListener(\'popstate\', handlePopState)\r\n  }, [])',
  '\r\n  const handleBackToCategoriesRef = useRef(handleBackToCategories)\r\n\r\n  useEffect(() => {\r\n    handleBackToCategoriesRef.current = handleBackToCategories\r\n  }, [handleBackToCategories])\r\n\r\n  useEffect(() => {\r\n    const handlePopState = () => {\r\n      if (selectedCategoryRef.current) {\r\n        handleBackToCategoriesRef.current()\r\n      }\r\n    }\r\n    window.addEventListener(\'popstate\', handlePopState)\r\n    return () => window.removeEventListener(\'popstate\', handlePopState)\r\n  }, [])'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched successfully.');
