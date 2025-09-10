// Console Filter Script - Add this to your HTML head to filter extension errors
(function() {
  'use strict';
  
  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Function to check if error is from problematic extension
  function isExtensionError(message) {
    if (typeof message !== 'string') return false;
    
    const extensionPatterns = [
      'chrome-extension://pejdijmoenmkgeppbflobdenhhabjlaj',
      'net::ERR_FILE_NOT_FOUND',
      'completion_list.html',
      'utils.js',
      'extensionState.js',
      'heuristicsRedefinitions.js'
    ];
    
    return extensionPatterns.some(pattern => message.includes(pattern));
  }
  
  // Override console.error
  console.error = function(...args) {
    const message = args.join(' ');
    if (!isExtensionError(message)) {
      originalError.apply(console, args);
    }
  };
  
  // Override console.warn
  console.warn = function(...args) {
    const message = args.join(' ');
    if (!isExtensionError(message)) {
      originalWarn.apply(console, args);
    }
  };
  
  // Override window.onerror for uncaught errors
  window.addEventListener('error', function(event) {
    if (isExtensionError(event.message || event.filename || '')) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });
  
  console.log('🔧 Console filter active - Extension errors will be hidden');
})();
