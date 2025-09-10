// Centralized error handling utility
import ExtensionDetector from "./extension-detector"

export interface ErrorInfo {
  message: string
  code?: string
  context?: string
  timestamp: Date
  userAgent?: string
  url?: string
}

export class AppError extends Error {
  public code?: string
  public context?: string
  public timestamp: Date
  public userAgent?: string
  public url?: string

  constructor(message: string, code?: string, context?: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.context = context
    this.timestamp = new Date()
    this.userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    this.url = typeof window !== 'undefined' ? window.location.href : undefined
  }
}

export const errorHandler = {
  // Handle Firebase authentication errors
  handleAuthError: (error: any, context: string = 'Authentication'): string => {
    let userMessage = 'An authentication error occurred'
    
    if (error?.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          userMessage = 'No account found with this email address'
          break
        case 'auth/wrong-password':
          userMessage = 'Incorrect password'
          break
        case 'auth/email-already-in-use':
          userMessage = 'An account with this email already exists'
          break
        case 'auth/weak-password':
          userMessage = 'Password is too weak. Please choose a stronger password'
          break
        case 'auth/invalid-email':
          userMessage = 'Please enter a valid email address'
          break
        case 'auth/too-many-requests':
          userMessage = 'Too many failed attempts. Please try again later'
          break
        case 'auth/network-request-failed':
          userMessage = 'Network error. Please check your internet connection'
          break
        case 'auth/user-disabled':
          userMessage = 'This account has been disabled'
          break
        default:
          userMessage = error.message || 'Authentication failed'
      }
    }

    // Log error for debugging
    console.error(`[${context}] Error:`, {
      code: error?.code,
      message: error?.message,
      context,
      timestamp: new Date().toISOString()
    })

    return userMessage
  },

  // Handle Firebase Firestore errors
  handleFirestoreError: (error: any, context: string = 'Firestore'): string => {
    let userMessage = 'A database error occurred'
    
    if (error?.code) {
      switch (error.code) {
        case 'permission-denied':
          userMessage = 'Access denied. You may not have permission to perform this action'
          break
        case 'unavailable':
          userMessage = 'Service temporarily unavailable. Please try again'
          break
        case 'deadline-exceeded':
          userMessage = 'Request timed out. Please try again'
          break
        case 'not-found':
          userMessage = 'The requested data was not found'
          break
        case 'already-exists':
          userMessage = 'This data already exists'
          break
        case 'resource-exhausted':
          userMessage = 'Service quota exceeded. Please try again later'
          break
        default:
          userMessage = error.message || 'Database operation failed'
      }
    }

    // Log error for debugging
    console.error(`[${context}] Firestore Error:`, {
      code: error?.code,
      message: error?.message,
      context,
      timestamp: new Date().toISOString()
    })

    return userMessage
  },

  // Handle network errors
  handleNetworkError: (error: any, context: string = 'Network'): string => {
    let userMessage = 'A network error occurred'
    
    if (error?.message) {
      if (error.message.includes('fetch')) {
        userMessage = 'Failed to connect to the server. Please check your internet connection'
      } else if (error.message.includes('timeout')) {
        userMessage = 'Request timed out. Please try again'
      } else {
        userMessage = error.message
      }
    }

    // Log error for debugging
    console.error(`[${context}] Network Error:`, {
      message: error?.message,
      context,
      timestamp: new Date().toISOString()
    })

    return userMessage
  },

  // Handle React/JavaScript errors
  handleReactError: (error: any, context: string = 'React'): string => {
    let userMessage = 'An application error occurred'
    
    if (error?.message) {
      if (error.message.includes('useEffect')) {
        userMessage = 'Component error. Please refresh the page'
      } else if (error.message.includes('render')) {
        userMessage = 'Display error. Please refresh the page'
      } else {
        userMessage = error.message
      }
    }

    // Log error for debugging
    console.error(`[${context}] React Error:`, {
      message: error?.message,
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString()
    })

    return userMessage
  },

  // Generic error handler
  handleError: (error: any, context: string = 'Application'): string => {
    if (error instanceof AppError) {
      return error.message
    }

    // Filter out Chrome extension errors
    if (errorHandler.isExtensionError(error)) {
      console.warn(`[${context}] Chrome extension error ignored:`, {
        message: error?.message,
        filename: error?.filename,
        context,
        timestamp: new Date().toISOString()
      })
      return '' // Return empty string to indicate this should be ignored
    }

    // Try to determine error type and handle accordingly
    if (error?.code && error.code.startsWith('auth/')) {
      return errorHandler.handleAuthError(error, context)
    }
    
    if (error?.code && error.code.startsWith('firestore/')) {
      return errorHandler.handleFirestoreError(error, context)
    }
    
    if (error?.message && error.message.includes('fetch')) {
      return errorHandler.handleNetworkError(error, context)
    }
    
    if (error?.message && (error.message.includes('useEffect') || error.message.includes('render'))) {
      return errorHandler.handleReactError(error, context)
    }

    // Default error handling
    const userMessage = error?.message || 'An unexpected error occurred'
    
    console.error(`[${context}] Generic Error:`, {
      message: error?.message,
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString()
    })

    return userMessage
  },

  // Check if error is from Chrome extension
  isExtensionError: (error: any): boolean => {
    // Check for completion_list errors specifically
    if (error?.message?.includes('completion_list.html') || 
        error?.filename?.includes('completion_list.html') ||
        error?.target?.src?.includes('completion_list.html')) {
      return true
    }
    
    return ExtensionDetector.isExtensionError(error)
  },

  // Log error for analytics/monitoring
  logError: (error: ErrorInfo) => {
    // In production, you might want to send this to an error tracking service
    console.error('Application Error:', error)
    
    // Example: Send to error tracking service
    // if (process.env.NODE_ENV === 'production') {
    //   // Send to Sentry, LogRocket, etc.
    // }
  }
}

// Global error boundary handler
export const globalErrorHandler = {
  handleUnhandledRejection: (event: PromiseRejectionEvent) => {
    // Filter out Chrome extension errors
    if (errorHandler.isExtensionError(event.reason)) {
      console.warn('Chrome extension error ignored (Promise Rejection):', event.reason)
      return
    }
    
    console.error('Unhandled Promise Rejection:', event.reason)
    errorHandler.logError({
      message: event.reason?.message || 'Unhandled Promise Rejection',
      context: 'Global',
      timestamp: new Date()
    })
  },

  handleError: (event: ErrorEvent) => {
    // Filter out Chrome extension errors
    if (errorHandler.isExtensionError(event)) {
      console.warn('Chrome extension error ignored (Global Error):', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
      return
    }
    
    console.error('Global Error:', event.error)
    errorHandler.logError({
      message: event.error?.message || event.message,
      context: 'Global',
      timestamp: new Date(),
      url: event.filename
    })
  }
}

// Initialize global error handlers
export const initializeErrorHandling = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', globalErrorHandler.handleUnhandledRejection)
    window.addEventListener('error', globalErrorHandler.handleError)
  }
}
