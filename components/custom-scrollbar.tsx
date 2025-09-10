"use client"

import { useEffect } from "react"

export default function CustomScrollbar() {
  useEffect(() => {
    // Add custom scrollbar styles to the document
    const style = document.createElement("style")
    style.textContent = `
      /* Webkit browsers (Chrome, Safari, Edge) */
      ::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }

      ::-webkit-scrollbar-track {
        background: #1f2937;
        border-radius: 6px;
      }

      ::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #f97316, #ea580c);
        border-radius: 6px;
        border: 2px solid #1f2937;
        transition: all 0.3s ease;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #ea580c, #dc2626);
        transform: scale(1.05);
      }

      ::-webkit-scrollbar-corner {
        background: #1f2937;
      }

      /* Firefox */
      * {
        scrollbar-width: thin;
        scrollbar-color: #f97316 #1f2937;
      }

      /* Custom scrollbar for specific elements */
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(31, 41, 55, 0.5);
        border-radius: 4px;
      }

      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #f97316, #ea580c);
        border-radius: 4px;
        border: 1px solid rgba(31, 41, 55, 0.5);
      }

      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #ea580c, #dc2626);
      }

      /* Horizontal scrollbar */
      .custom-scrollbar::-webkit-scrollbar:horizontal {
        height: 8px;
      }

      /* Thin scrollbar variant */
      .thin-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      .thin-scrollbar::-webkit-scrollbar-track {
        background: rgba(31, 41, 55, 0.3);
        border-radius: 3px;
      }

      .thin-scrollbar::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #f97316, #ea580c);
        border-radius: 3px;
      }

      .thin-scrollbar::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #ea580c, #dc2626);
      }

      /* Dark theme scrollbar */
      .dark-scrollbar::-webkit-scrollbar-track {
        background: #111827;
      }

      .dark-scrollbar::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #f97316, #ea580c);
        border: 1px solid #111827;
      }

      /* Orange accent scrollbar */
      .orange-scrollbar::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #f97316, #ea580c, #dc2626);
        border: 1px solid #1f2937;
      }

      .orange-scrollbar::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #ea580c, #dc2626, #b91c1c);
      }
    `
    
    document.head.appendChild(style)

    // Cleanup function
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  return null
}
