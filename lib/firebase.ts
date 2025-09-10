// Re-export everything from the modular structure
export * from './firebase/index'

// Keep the default export for backward compatibility
import app from './firebase/config'
export default app
