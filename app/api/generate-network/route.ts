import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  let bayesNet: string | null = null
  let judgeVerdict: string | null = null

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

    const prompt = `You are a cognitive modeler and an expert in psychometric network analysis. Your task is not merely to build a Bayesian Network; it is to architect a dynamic cognitive simulation of a specific persona's decision-making process, for the situation given below

SITUATION DESCRIPTION:
${situationDescription}

JSON DATA:
${JSON.stringify(parsedJson, null, 2)}

Please generate a Bayesian network that includes:

The output must be a highly detailed, reconfigurable Bayesian Network (RBN) that reveals the why behind a choice, not just the what. Guiding Principles for This Model: Causal Reasoning Over Correlation: Every connection must represent a plausible psychological or situational cause. You will be required to justify this causality. Model the Conflict, Not Just the Preference: Real decisions involve trade-offs. The network's core logic must identify and model the primary conflict within the persona (I will be providing examples for the case of war, please take the idea behind these nodes for ur input situation, and do not copy these nodes as is. e.g., Public Opinion vs. Economic Factors, Ethical Considerations  vs.  Strategic interests). This is the engine of interesting decisions. Synthesize, Don't Just List: The model must synthesize low-level data (e.g., City, Occupation) into higher-level abstract concepts that serve  (e.g., Analytical_thinking_Index, Peacekeeping_index). Step 1: The Persona Core Synthesis & Psychological Driver Before defining any nodes, formulate a "Persona Core Synthesis." This is a mandatory, multi-part analysis that will serve as the logical constitution for your entire network. 1. Foundational Narrative (2-3 sentences): Briefly describe this person's life as it relates to the decision. What does their core thinking look like? 2. Primary Psychological Driver: From their OCEAN traits, what are some of the most dominant psychological force driving their consumer behavior? (e.g., Desire_for_fame, Risk Aversion). 3. The Core Conflict: Based on the persona's full attribute set, what is the central trade-off they grapple with when making this decision? State it clearly (e.g., For the case of responding to war, "The core conflict is between their geopolitical threat of seeing a growing rival, which pushes them toward lower peacekeeping_index, and their High Socio-Economic_status concern, which creates a desire for High Stay_neutral and high peacekeeping_index."). Step 2: Network Architecture & Generation You will build the network in two distinct, sequential phases that mimic a human thought process. Phase 1: The Context & Elimination Engine (This phase filters the world of possibilities down to a set of viable archetypes.) Root (Evidence) Nodes: These are the provided Demographics, Psychographics, and Geographic inputs. Model them correctly: the observed state has a probability of 1.0, and all other states are 0.0. Synthesized Context Nodes: Create at least two inferred nodes that synthesize the root evidence. Example 1: From Occupation, Location, create a Situation_context node (States: Business_minded, Morally_inclined, Politically_influenced, more). Elimination Criteria Nodes: These are the broad, practical filters this persona would apply first. They are children of the Root and Synthesized nodes. Examples: Cognitive_biases (States: Interfering, Stay_neutral), Analytical_Skills (States: High, Medium, Low). Phase 2: The Value-Based Selection Engine (This phase decides which of the viable options is the most desirable.) Value Driver Nodes: These nodes represent the persona's psychological values and are directly influenced by their OCEAN traits and their Core Conflict. These are the heart of the model.  The Final Choice Node - " Decision_about_war": This is the culminating output of the network. Give the possible answer -yes/no/any other creative response the person would have.  Step 3: Justification-First Parameterization For every single Probabilistic Node (all nodes except the Root Evidence), you must provide the following: Node Name & Type: (e.g., Risk_aversion, Synthesized) Possible States: Causal Justification Rationale: This is the most critical part. Before showing the CPT, provide a bullet-point rationale explaining how you derived the probabilities. Explicitly reference the Persona Core Synthesis, especially the Core Conflict. Explain the influence of each parent node. Example Rationale for Need_for_Social_Validation node: "- Parent Risk_aversion=High: This strongly decreases the probability of High risk scenario of war needs, as this persona is threatened by any hit on the social status." "- Parent Political_Pressure=Severe: This creates a conflict. In this case, do a deeper thinking like a human, on what factor would win, in psychology." "- Core Conflict Link: This directly models the persona's conflict between social desires and financial limitations." Conditional Probability Table (CPT): The table of probabilities derived from your rationale. Step 4: Output Structure Return your complete analysis in the following exact order: Persona Core Synthesis (Narrative, Driver, Conflict) Network Architecture Visualization (Simple list of edges: [Parent] -> [Child]) Phase 1 Node Details (Context & Elimination) Phase 2 Node Details (Value-Based Selection) Reconfiguration Guide: A short paragraph explaining how a user could change the Core Conflict and which subsequent CPT rationales they would need to revisit, making the network truly dynamic.

Make sure the network is practical and can be used for probabilistic inference in the described situation.`

    // Generate Bayesian Network
    const { text: bnText } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.7,
      maxTokens: 6000,
    })
    bayesNet = bnText.trim()

    // Judge the network for CPTs, states, and edges
    const judgePrompt = `
Your job is to strictly audit the following Bayesian Network specification. These must all be present:
1. Each non-evidence node: complete list of possible states
2. Every node: explicit Conditional Probability Table (CPT) covering all parent states (need numbers adding all states) up to 1 
3. Every node: all parent-child connections (edges)
4. No missing details for the above

If missing, enumerate node, what's missing, and how to fix. If all present, say: "VALID: All CPTs, states, and connections present and explicit for every node."
--- Output ---
${bayesNet}
    `
    const { text: judgeText } = await generateText({
      model: openai("gpt-4o"),
      prompt: judgePrompt,
      temperature: 0.1,
      maxTokens: 700,
    })
    judgeVerdict = judgeText.trim()

    if (judgeVerdict.startsWith("VALID")) {
      return NextResponse.json({
        bayesNet,
        judgeVerdict,
      })
    } else {
      // Correction step: pass all feedback as explicit improvements
      const fixPrompt = `
Revise and regenerate the Bayesian Network specification. Incorporate each missing element or fix advised below, making sure every node, connection, and CPT is complete and clearly listed.
LLM Judge FEEDBACK:
${judgeVerdict}

The original situation:
${situationDescription}
JSON DATA:
${JSON.stringify(parsedJson, null, 2)}
[...instructions from first prompt...]
`
      const { text: fixedNetText } = await generateText({
        model: openai("gpt-4o"),
        prompt: fixPrompt,
        temperature: 0.65,
        maxTokens: 2200,
      })
      bayesNet = fixedNetText.trim()

      // Re-judge improved output
      const { text: fixedJudgeText } = await generateText({
        model: openai("gpt-4o"),
        prompt: judgePrompt.replace('${bayesNet}', bayesNet),
        temperature: 0.1,
        maxTokens: 700,
      })
      judgeVerdict = fixedJudgeText.trim()

      return NextResponse.json({
        bayesNet,
        judgeVerdict,
      })
    }
  } catch (error) {
    // Always respond with what’s available
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to generate Bayesian network",
      bayesNet,
      judgeVerdict,
    }, { status: 500 })
  }
}
