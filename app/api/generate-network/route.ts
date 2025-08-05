import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { jsonData, situationDescription } = await request.json()

    if (!jsonData || !situationDescription) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate JSON
    let parsedJson
    try {
      parsedJson = JSON.parse(jsonData)
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 })
    }

    // Prompt template for generating Bayesian network
    const prompt = `You are an expert in Bayesian networks and probabilistic reasoning. Based on the provided JSON data and situation description, generate a comprehensive Bayesian network.

SITUATION DESCRIPTION:
${situationDescription}

JSON DATA:
${JSON.stringify(parsedJson, null, 2)}

Please generate a Bayesian network that includes:

1. **Network Structure**: Clearly identify all nodes (variables) and their relationships
2. **Node Definitions**: Define each node with its possible states/values
3. **Dependencies**: Explain the causal relationships between nodes
4. **Conditional Probability Tables (CPTs)**: Provide probability distributions for each node given its parents
5. **Network Reasoning**: Explain how this network can be used for decision making in the given situation

Format your response in a clear, structured manner with:
- Node names and descriptions
- Parent-child relationships
- Probability values (use realistic estimates based on the data)
- Clear explanations of the reasoning behind the network structure

Make sure the network is practical and can be used for probabilistic inference in the described situation.`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 2000,
    })

    return NextResponse.json({ output: text })
  } catch (error) {
    console.error("Error generating Bayesian network:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate Bayesian network",
      },
      { status: 500 },
    )
  }
}
