import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { networkOutput } = await request.json()

    if (!networkOutput) {
      return NextResponse.json({ error: "Missing network output" }, { status: 400 })
    }

    const prompt = `Convert the following Bayesian network description into a Mermaid flowchart diagram code. 

IMPORTANT FORMATTING REQUIREMENTS:
1. Use "flowchart TD" (Top Down) structure
2. Each node and connection MUST be on a separate line
3. Use clear, readable node names (no spaces, use underscores or camelCase)
4. Show the network structure with proper parent-child relationships
5. Use rectangular boxes for nodes: NodeName["Display Name"]
6. Use arrows to show dependencies: ParentNode --> ChildNode
7. Do NOT put everything on one line
8. Make sure the syntax is valid Mermaid code

BAYESIAN NETWORK DESCRIPTION:
${networkOutput}

Generate ONLY the Mermaid code, starting with "flowchart TD" and with each element on a new line. Do not include any explanations or additional text, just the pure Mermaid diagram code.

Example format:
flowchart TD
    A["Node A"]
    B["Node B"]
    C["Node C"]
    A --> B
    A --> C
    B --> C`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.3,
      maxTokens: 1000,
    })

    // Clean up the response to ensure it's valid Mermaid code
    let mermaidCode = text.trim()

    // Ensure it starts with flowchart TD
    if (!mermaidCode.startsWith("flowchart TD")) {
      mermaidCode = "flowchart TD\n" + mermaidCode
    }

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
