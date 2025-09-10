// Chrome Extension Error Detector and Manager

export interface ExtensionError {
  extensionId: string
  filename: string
  message: string
  timestamp: Date
  userAgent: string
}

export class ExtensionDetector {
  private static knownExtensions: Map<string, string> = new Map([
    // Common extension IDs and their names
    ['pejdijmoenmkgeppbflobdenhhabjlaj', 'Unknown Extension'],
    // Password managers and form fillers
    ['chrome-extension://completion_list', 'Password Manager/Autocomplete Extension'],
    // Add more known extensions here
  ])

  static detectExtensionError(error: any): ExtensionError | null {
    const extensionId = this.extractExtensionId(error)
    if (!extensionId) return null

    return {
      extensionId,
      filename: error?.filename || error?.target?.src || '',
      message: error?.message || 'Extension resource not found',
      timestamp: new Date(),
      userAgent: navigator.userAgent
    }
  }

  static extractExtensionId(error: any): string | null {
    const patterns = [
      /chrome-extension:\/\/([a-z]{32})\//,
      /chrome-extension:\/\/([a-z]{32})/,
      /moz-extension:\/\/([a-z0-9-]+)\//,
      /moz-extension:\/\/([a-z0-9-]+)/,
      // Add pattern for completion_list errors
      /completion_list\.html/,
      /chrome-extension:\/\/.*completion_list/
    ]

    const errorString = JSON.stringify(error)
    
    for (const pattern of patterns) {
      const match = errorString.match(pattern)
      if (match) {
        // For completion_list errors, return a special identifier
        if (pattern.source.includes('completion_list')) {
          return 'completion_list_extension'
        }
        return match[1]
      }
    }

    return null
  }

  static getExtensionName(extensionId: string): string {
    if (extensionId === 'completion_list_extension') {
      return 'Password Manager/Autocomplete Extension'
    }
    return this.knownExtensions.get(extensionId) || `Unknown Extension (${extensionId})`
  }

  static isExtensionError(error: any): boolean {
    return this.extractExtensionId(error) !== null
  }

  static logExtensionError(error: ExtensionError) {
    console.warn('Chrome Extension Error Detected:', {
      extensionId: error.extensionId,
      extensionName: this.getExtensionName(error.extensionId),
      filename: error.filename,
      message: error.message,
      timestamp: error.timestamp.toISOString(),
      userAgent: error.userAgent
    })
  }

  static getExtensionErrorSummary(): string {
    return `
Chrome Extension Error Detected

This error is caused by a Chrome extension, not your application.
Extension ID: ${this.extractExtensionId}
Extension Name: ${this.getExtensionName}

To resolve:
1. Open chrome://extensions/
2. Find the extension with ID: ${this.extractExtensionId}
3. Disable or update the extension
4. Test in Incognito mode

This error does not affect your application functionality.
    `.trim()
  }
}

// Utility functions for extension error handling
export const extensionUtils = {
  // Filter extension errors from error logs
  filterExtensionErrors: (errors: any[]): any[] => {
    return errors.filter(error => !ExtensionDetector.isExtensionError(error))
  },

  // Check if current environment has extension errors
  hasExtensionErrors: (): boolean => {
    if (typeof window === 'undefined') return false
    
    // Check for common extension error patterns
    const errorPatterns = [
      'chrome-extension://',
      'moz-extension://',
      'net::ERR_FILE_NOT_FOUND'
    ]

    return errorPatterns.some(pattern => 
      window.location.href.includes(pattern) || 
      document.referrer.includes(pattern)
    )
  },

  // Get list of active extensions (if accessible)
  getActiveExtensions: (): string[] => {
    const extensions: string[] = []
    
    // This is limited due to browser security restrictions
    // Only works for extensions that inject content scripts
    
    if (typeof window !== 'undefined') {
      // Check for common extension indicators
      const indicators = [
        'chrome.runtime',
        'browser.runtime',
        '__REACT_DEVTOOLS_GLOBAL_HOOK__',
        '__REDUX_DEVTOOLS_EXTENSION__'
      ]

      indicators.forEach(indicator => {
        if ((window as any)[indicator]) {
          extensions.push(indicator)
        }
      })
    }

    return extensions
  },

  // Create extension error report
  createErrorReport: (error: any): string => {
    const extensionError = ExtensionDetector.detectExtensionError(error)
    if (!extensionError) return ''

    return `
Extension Error Report
=====================

Extension ID: ${extensionError.extensionId}
Extension Name: ${ExtensionDetector.getExtensionName(extensionError.extensionId)}
Error Message: ${extensionError.message}
File: ${extensionError.filename}
Timestamp: ${extensionError.timestamp.toISOString()}
User Agent: ${extensionError.userAgent}

Resolution Steps:
1. Open chrome://extensions/
2. Find extension with ID: ${extensionError.extensionId}
3. Disable the extension temporarily
4. Test your application
5. If error is resolved, update or remove the extension

Note: This error does not affect your application's functionality.
    `.trim()
  }
}

// Export for use in error handler
export default ExtensionDetector
