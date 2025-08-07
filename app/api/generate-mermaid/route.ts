import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { networkOutput } = await request.json()

    if (!networkOutput) {
      return NextResponse.json({ error: "Missing network output" }, { status: 400 })
    }

    const prompt = `Convert the following Bayesian network description into a Mermaid flowchart diagram code. In the node labels, also mention the conditional probability numbers within every node, node names without unclear abbreviations
ALL INFORMATION ABOUT THE NETWORK MUST BE PRESENT IN THE DIAGRAM, INCLUDING NUMBERS, NAMES, CONNECTIONS
CRITICAL FORMATTING REQUIREMENTS:
1. Generate ONLY pure Mermaid syntax - NO markdown code blocks
2. Do NOT include \`\`\`mermaid or \`\`\` anywhere in your response
3. Start directly with "flowchart TD" 
4. Each node and connection MUST be on a separate line
5. Use clear node names without spaces (use underscores or camelCase)
6. Use rectangular boxes: NodeName["Display Name"]
7. Use arrows for dependencies: ParentNode --> ChildNode

BAYESIAN NETWORK DESCRIPTION:
${networkOutput}

RESPOND WITH ONLY THE MERMAID CODE - NO EXPLANATIONS, NO MARKDOWN FORMATTING.

Correct example:
flowchart TD
    A["Node A"]
    B["Node B"] 
    A --> B`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.1, // Lower temperature for more consistent formatting
      maxTokens: 1000,
    })

    // Clean up the response thoroughly
    let mermaidCode = text.trim()

    // Remove any markdown code block syntax
    mermaidCode = mermaidCode.replace(/```mermaid\s*/g, "")
    mermaidCode = mermaidCode.replace(/```\s*/g, "")

    // Remove any duplicate "flowchart TD" declarations
    const lines = mermaidCode.split("\n")
    const cleanedLines = []
    let foundFlowchartTD = false

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine === "flowchart TD") {
        if (!foundFlowchartTD) {
          cleanedLines.push(trimmedLine)
          foundFlowchartTD = true
        }
        // Skip duplicate flowchart TD declarations
      } else if (trimmedLine) {
        cleanedLines.push(line)
      }
    }

    // Ensure it starts with flowchart TD
    if (!foundFlowchartTD) {
      cleanedLines.unshift("flowchart TD")
    }

    mermaidCode = cleanedLines.join("\n")

    return NextResponse.json({ mermaidCode })
  } catch (error) {
    console.error("Error generating Mermaid code:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate Mermaid diagram",
      },
      { status: 500 },
    )
  }
}
