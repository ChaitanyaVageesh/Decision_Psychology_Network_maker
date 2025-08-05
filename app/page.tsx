"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, Brain, Network } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import MermaidDiagram from "@/components/mermaid-diagram"

export default function BayesianNetworkApp() {
  const [jsonData, setJsonData] = useState("")
  const [situationDescription, setSituationDescription] = useState("")
  const [rawOutput, setRawOutput] = useState("")
  const [mermaidCode, setMermaidCode] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/json") {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          // Validate JSON
          JSON.parse(content)
          setJsonData(content)
          setError("")
        } catch (err) {
          setError("Invalid JSON file. Please upload a valid JSON file.")
        }
      }
      reader.readAsText(file)
    } else {
      setError("Please upload a JSON file.")
    }
  }

  const validateJsonInput = (input: string) => {
    try {
      JSON.parse(input)
      return true
    } catch {
      return false
    }
  }

  const handleJsonTextChange = (value: string) => {
    setJsonData(value)
    if (value.trim() && !validateJsonInput(value)) {
      setError("Invalid JSON format.")
    } else {
      setError("")
    }
  }

  const generateBayesianNetwork = async () => {
    if (!jsonData.trim() || !situationDescription.trim()) {
      setError("Please provide both JSON data and situation description.")
      return
    }

    if (!validateJsonInput(jsonData)) {
      setError("Please provide valid JSON data.")
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      // Step 1: Generate Bayesian Network
      const networkResponse = await fetch("/api/generate-network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonData: jsonData,
          situationDescription: situationDescription,
        }),
      })

      if (!networkResponse.ok) {
        throw new Error("Failed to generate Bayesian network")
      }

      const networkResult = await networkResponse.json()
      setRawOutput(networkResult.output)

      // Step 2: Convert to Mermaid
      const mermaidResponse = await fetch("/api/generate-mermaid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          networkOutput: networkResult.output,
        }),
      })

      if (!mermaidResponse.ok) {
        throw new Error("Failed to generate Mermaid diagram")
      }

      const mermaidResult = await mermaidResponse.json()
      setMermaidCode(mermaidResult.mermaidCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            Bayesian Network Generator
          </h1>
          <p className="text-lg text-gray-600">Generate and visualize Bayesian networks from JSON data using AI</p>
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* JSON Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                JSON Data Input
              </CardTitle>
              <CardDescription>Upload a JSON file or paste JSON data directly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="paste" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="paste">Paste JSON</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>

                <TabsContent value="paste" className="space-y-2">
                  <Label htmlFor="json-input">JSON Data</Label>
                  <Textarea
                    id="json-input"
                    placeholder="Paste your JSON data here..."
                    value={jsonData}
                    onChange={(e) => handleJsonTextChange(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </TabsContent>

                <TabsContent value="upload" className="space-y-2">
                  <Label htmlFor="file-upload">Upload JSON File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                    <Upload className="h-4 w-4 text-gray-500" />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Situation Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Situation Description
              </CardTitle>
              <CardDescription>Describe the decision-making scenario</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label htmlFor="situation">Decision Scenario</Label>
              <Textarea
                id="situation"
                placeholder="Describe the situation where this Bayesian network will be used for decision making..."
                value={situationDescription}
                onChange={(e) => setSituationDescription(e.target.value)}
                className="min-h-[200px]"
              />

              <Button
                onClick={generateBayesianNetwork}
                disabled={isProcessing || !jsonData.trim() || !situationDescription.trim()}
                className="w-full"
                size="lg"
              >
                {isProcessing ? "Generating Network..." : "Generate Bayesian Network"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Section */}
        {(rawOutput || mermaidCode) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Raw Output */}
            {rawOutput && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Generated Network</CardTitle>
                  <CardDescription>Raw output from the language model</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 max-h-96 overflow-y-auto">
                      {rawOutput}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mermaid Visualization */}
            {mermaidCode && (
              <Card>
                <CardHeader>
                  <CardTitle>Network Visualization</CardTitle>
                  <CardDescription>Interactive Mermaid diagram</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <MermaidDiagram code={mermaidCode} />

                    {/* Mermaid Code Display */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                        View Mermaid Code
                      </summary>
                      <div className="mt-2 bg-gray-50 p-3 rounded text-xs font-mono">
                        <pre className="whitespace-pre-wrap">{mermaidCode}</pre>
                      </div>
                    </details>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
