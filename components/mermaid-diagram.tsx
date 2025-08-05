"use client"

import { useEffect, useRef } from "react"
import mermaid from "mermaid"

interface MermaidDiagramProps {
  code: string
}

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (elementRef.current && code) {
      // Initialize mermaid with configuration
      mermaid.initialize({
        startOnLoad: true,
        theme: "default",
        securityLevel: "loose",
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: "basis",
        },
      })

      // Clear previous content
      elementRef.current.innerHTML = ""

      // Generate unique ID for this diagram
      const id = `mermaid-${Date.now()}`

      // Render the diagram
      mermaid
        .render(id, code)
        .then(({ svg }) => {
          if (elementRef.current) {
            elementRef.current.innerHTML = svg
          }
        })
        .catch((error) => {
          console.error("Mermaid rendering error:", error)
          if (elementRef.current) {
            elementRef.current.innerHTML = `<div class="text-red-500 p-4 border border-red-200 rounded">
            Error rendering diagram: ${error.message}
          </div>`
          }
        })
    }
  }, [code])

  return (
    <div className="w-full">
      <div
        ref={elementRef}
        className="mermaid-container bg-white p-4 rounded-lg border overflow-auto"
        style={{ minHeight: "300px" }}
      />
    </div>
  )
}
