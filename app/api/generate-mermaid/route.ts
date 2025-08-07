import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { networkOutput } = await request.json()

    if (!networkOutput) {
      return NextResponse.json({ error: "Missing network output" }, { status: 400 })
    }

    // === STEP 1: Generate Mermaid code ===
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

    const { text: initialText } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.1,
      maxTokens: 1000,
    })

    let mermaidCode = initialText.trim()

    // Remove any markdown code block syntax
    mermaidCode = mermaidCode.replace(/```/g, "")

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
      } else if (trimmedLine) {
        cleanedLines.push(line)
      }
    }

    if (!foundFlowchartTD) {
      cleanedLines.unshift("flowchart TD")
    }

    mermaidCode = cleanedLines.join("\n")

    // === STEP 2: LLM Judge Step ===
    const judgePrompt = `
Act as an expert in Bayesian networks and diagram verification.

Given the original Bayesian network description and the generated Mermaid diagram code, check if ALL the following are included:
- Every node, with correct, clear labels (no missing variables)
- Every connection (parent-child relationships)
- Every Conditional Probability Distribution (CPD) value or table, as numbers within nodes

If any required element is missing, give a brief explanation listing exactly what’s absent and how to improve (e.g. "Node 'Weather' is missing its CPDs. Add 'Weather' node with probability values."), otherwise say: "VALID: All nodes, connections, and CPDs present."

Original Description:
---
${networkOutput}

Mermaid Code:
---
${mermaidCode}
    `

    const { text: judgeVerdictRaw } = await generateText({
      model: openai("gpt-4o"),
      prompt: judgePrompt,
      temperature: 0.0,
      maxTokens: 400,
    })

    const judgeVerdict = judgeVerdictRaw.trim()

    if (judgeVerdict.startsWith("VALID")) {
      // First attempt is good!
      return NextResponse.json({
        mermaidCode,
        judgeVerdict,
      })
    } else {
      // === STEP 3: FIX ATTEMPT using LLM Judge feedback ===
      const fixPrompt = `You just generated the following Mermaid flowchart code for a Bayesian network. However, here is feedback from an expert LLM judge which tells you what to specifically improve or add.

*** Feedback from judge: ***
${judgeVerdict}

Your task:
- Regenerate improved Mermaid code that fully and strictly incorporates the suggestions, improvements, or elements listed above, in addition to all prior requirements.
- Start directly with "flowchart TD", place each node/connection on a separate line, and use clear node names (no spaces; use underscores or camelCase).
- Include all missing nodes, connections, CPDs or numbers wherever relevant.

Bayesian Network Description:
---
${networkOutput}

Respond ONLY with the corrected pure Mermaid code, with no explanations, markdown or code block formatting.
`

      const { text: fixedText } = await generateText({
        model: openai("gpt-4o"),
        prompt: fixPrompt,
        temperature: 0.1,
        maxTokens: 1100,
      })

      let fixedMermaidCode = fixedText.trim()
      fixedMermaidCode = fixedMermaidCode.replace(/```
      fixedMermaidCode = fixedMermaidCode.replace(/```\s*/g, "")
      const fixedLines = fixedMermaidCode.split("\n")
      const fixedCleanedLines = []
      let fixedFoundFlowchartTD = false

      for (const line of fixedLines) {
        const trimmedLine = line.trim()
        if (trimmedLine === "flowchart TD") {
          if (!fixedFoundFlowchartTD) {
            fixedCleanedLines.push(trimmedLine)
            fixedFoundFlowchartTD = true
          }
        } else if (trimmedLine) {
          fixedCleanedLines.push(line)
        }
      }

      if (!fixedFoundFlowchartTD) {
        fixedCleanedLines.unshift("flowchart TD")
      }

      fixedMermaidCode = fixedCleanedLines.join("\n")

      // Re-evaluate the improved code
      const rejudgePrompt = `
Act as an expert in Bayesian networks and diagram verification.

Given the original Bayesian network description and the (improved) Mermaid diagram code, check strictly if ALL of the following are now included:
- Every node, with correct, clear labels (no missing variables)
- Every connection (parent-child relationships)
- Every Conditional Probability Distribution (CPD) value or table, as numbers within nodes

If any required element is still missing, give a brief explanation listing exactly what’s absent and how to improve, otherwise say: "VALID: All nodes, connections, and CPDs present."

Original Description:
---
${networkOutput}

Mermaid Code:
---
${fixedMermaidCode}
      `
      const { text: finalJudgeVerdictRaw } = await generateText({
        model: openai("gpt-4o"),
        prompt: rejudgePrompt,
        temperature: 0.0,
        maxTokens: 400,
      })

      const finalJudgeVerdict = finalJudgeVerdictRaw.trim()

      return NextResponse.json({
        // Return best correction attempt and final feedback
        mermaidCode: fixedMermaidCode,
        judgeVerdict: finalJudgeVerdict,
        previousAttempt: {
          mermaidCode,
          judgeVerdict,
        },
      })
    }
  } catch (error) {
    // In unusual catastrophic failure, fallback to old behavior
    console.error("Error generating Mermaid code or judging:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate or validate Mermaid diagram",
        fallbackSuggestion: "Try re-sending your Bayesian network description, or ensure it is clearly formatted.",
      },
      { status: 500 },
    )
  }
}


