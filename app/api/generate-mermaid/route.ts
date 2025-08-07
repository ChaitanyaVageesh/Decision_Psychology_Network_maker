import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  let mermaidCode: string | null = null
  let judgeVerdict: string | null = null
  let bayesNet: string | null = null

  try {
    const { bayesNetOutput } = await request.json()
    bayesNet = bayesNetOutput

    if (!bayesNet) {
      return NextResponse.json({ error: "Missing Bayesian network output" }, { status: 400 })
    }

    // Generate Mermaid code
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
${bayesNet}

RESPOND WITH ONLY THE MERMAID CODE - NO EXPLANATIONS, NO MARKDOWN FORMATTING.

Correct example:
flowchart TD
    A["Node A"]
    B["Node B"] 
    A --> B
    `
    const { text: initialText } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.1,
      maxTokens: 4000,
    })
    
    mermaidCode = mermaidCode.replace(/```/g, "")

    // Clean-up: remove duplicates and ensure the header
    const lines = mermaidCode.split("\n")
    const cleanedLines: string[] = []
    let foundHeader = false
    for (const line of lines) {
      const t = line.trim()
      if (t.toLowerCase() === "flowchart td") {
        if (!foundHeader) {
          cleanedLines.push("flowchart TD")
          foundHeader = true
        }
      } else if (t.length > 0) {
        cleanedLines.push(line)
      }
    }
    if (!foundHeader) cleanedLines.unshift("flowchart TD")
    mermaidCode = cleanedLines.join("\n")

    // Judge if all requirements are met
    const judgePrompt = `
Audit this Mermaid diagram for a Bayesian network:
- Does every node clearly name all its possible states and explicitly mention CPT/probability values?
- Are all connections present as per the Bayesian network structure?
If anything is missing, say what/where/how. Otherwise say: "VALID: All nodes, states, CPTs, and edges present and explicit."
-- Mermaid code --
${mermaidCode}
    `
    const { text: judgeText } = await generateText({
      model: openai("gpt-4o"),
      prompt: judgePrompt,
      temperature: 0.1,
      maxTokens: 500,
    })
    judgeVerdict = judgeText.trim()

    if (judgeVerdict.startsWith("VALID")) {
      return NextResponse.json({
        mermaidCode,
        judgeVerdict,
      })
    } else {
      // Correction step
      const fixPrompt = `
Here is an expert LLM judge's feedback for the Mermaid diagram above:
${judgeVerdict}
Regenerate the Mermaid diagram. Fix everything listed, and obey all previous requirements.
-- Bayesian Network --
${bayesNet}
Respond ONLY with correct, pure Mermaid code (no explanations or markdown).
`
      const { text: fixedText } = await generateText({
        model: openai("gpt-4o"),
        prompt: fixPrompt,
        temperature: 0.08,
        maxTokens: 2000,
      })
      mermaidCode = fixedText.trim().replace(/```/g, "")
      // Retidy again as before
      const lines2 = mermaidCode.split("\n")
      const cleanedLines2: string[] = []
      let foundHeader2 = false
      for (const line of lines2) {
        const t = line.trim()
        if (t.toLowerCase() === "flowchart td") {
          if (!foundHeader2) {
            cleanedLines2.push("flowchart TD")
            foundHeader2 = true
          }
        } else if (t.length > 0) {
          cleanedLines2.push(line)
        }
      }
      if (!foundHeader2) cleanedLines2.unshift("flowchart TD")
      mermaidCode = cleanedLines2.join("\n")

      // Rejudge final
      const { text: finalJudgeText } = await generateText({
        model: openai("gpt-4o"),
        prompt: judgePrompt.replace('${mermaidCode}', mermaidCode),
        temperature: 0.1,
        maxTokens: 500,
      })
      judgeVerdict = finalJudgeText.trim()

      return NextResponse.json({
        mermaidCode,
        judgeVerdict,
      })
    }
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to generate Mermaid diagram",
      mermaidCode,
      judgeVerdict,
      bayesNet,
      fallbackSuggestion: "Check output from Bayesian Network generator and re-run.",
    }, { status: 500 })
  }
}
