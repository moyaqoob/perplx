import type { RerankedSource } from "../types"

export async function* generateAnswer(
  prompt: string,
  sources: RerankedSource[],
): AsyncGenerator<string> {
  const segments = buildMockResponse(sources)

  for (const segment of segments) {
    await sleep(25 + Math.random() * 35)
    yield segment
  }
}

function buildMockResponse(sources: RerankedSource[]): string[] {
  const hasAI = sources.some((s) =>
    s.title.toLowerCase().includes("artificial intelligence") ||
    s.content.toLowerCase().includes("artificial intelligence")
  )
  const hasML = sources.some((s) =>
    s.title.toLowerCase().includes("machine learning") ||
    s.content.toLowerCase().includes("machine learning")
  )
  const hasDL = sources.some((s) =>
    s.title.toLowerCase().includes("deep learning") ||
    s.content.toLowerCase().includes("deep learning")
  )
  const hasNLP = sources.some((s) =>
    s.title.toLowerCase().includes("natural language") ||
    s.content.toLowerCase().includes("natural language processing")
  )
  const hasNN = sources.some((s) =>
    s.title.toLowerCase().includes("neural network") ||
    s.content.toLowerCase().includes("neural network")
  )
  const hasGPT = sources.some((s) =>
    s.title.toLowerCase().includes("gpt") ||
    s.content.toLowerCase().includes("generative pre-trained")
  )
  const hasLLM = sources.some((s) =>
    s.title.toLowerCase().includes("large language model") ||
    s.content.toLowerCase().includes("language model")
  )
  const hasRAG = sources.some((s) =>
    s.title.toLowerCase().includes("retrieval-augmented") ||
    s.content.toLowerCase().includes("retrieval-augmented generation")
  )

  const source = (id: number) => `[${id}]`
  const findId = (keyword: string): number => {
    const s = sources.find((s) =>
      s.title.toLowerCase().includes(keyword) ||
      s.content.toLowerCase().includes(keyword)
    )
    return s?.id ?? 1
  }

  const segments: string[] = []

  segments.push("Based on the search results, here is a comprehensive overview of the topic.")

  segments.push("\n\n")

  if (hasAI) {
    const id = findId("artificial intelligence")
    segments.push(`**Artificial Intelligence (AI)** refers to the simulation of human intelligence in machines that are programmed to think and learn like humans ${source(id)}. AI systems perceive their environment and take actions to achieve goals. The field has evolved significantly since its inception in the 1950s and now powers everything from recommendation systems to autonomous vehicles.`)
  }

  if (hasML) {
    const id = findId("machine learning")
    segments.push(`\n\n**Machine Learning (ML)** is a core subfield of AI that focuses on algorithms that improve through experience ${source(id)}. ML algorithms build models from training data to make predictions or decisions without being explicitly programmed. Key paradigms include supervised learning (labeled data), unsupervised learning (finding patterns), and reinforcement learning (learning through rewards).`)
  }

  if (hasDL) {
    const id = findId("deep learning")
    segments.push(`\n\n**Deep Learning** extends machine learning using neural networks with multiple layers ${source(id)}. These deep neural networks can model complex patterns in data and have driven breakthroughs in image recognition, speech processing, and game playing. The "deep" refers to the multiple hidden layers that progressively extract higher-level features from raw input.`)
  }

  if (hasNLP) {
    const id = findId("natural language")
    segments.push(`\n\n**Natural Language Processing (NLP)** enables computers to understand, interpret, and generate human language ${source(id)}. NLP combines computational linguistics with statistical models to process text and speech. Modern NLP is dominated by transformer-based models that can handle tasks like translation, sentiment analysis, and question answering with human-level performance.`)
  }

  if (hasNN) {
    const id = findId("neural network")
    segments.push(`\n\n**Neural Networks** are computing systems inspired by biological neural networks in the brain ${source(id)}. They consist of interconnected nodes (neurons) organized in layers. Each connection has a weight that adjusts during training. The universal approximation theorem shows that neural networks can approximate any continuous function, making them extraordinarily versatile for learning tasks.`)
  }

  if (hasGPT) {
    const id = findId("gpt")
    segments.push(`\n\n**Generative Pre-trained Transformers (GPT)** represent a breakthrough in language AI ${source(id)}. These models use the transformer architecture with multi-head attention mechanisms. GPT models are pre-trained on massive text corpora and then fine-tuned for specific tasks. The "generative" aspect allows them to produce coherent, contextually relevant text across a wide range of topics and styles.`)
  }

  if (hasLLM) {
    const id = findId("large language model")
    segments.push(`\n\n**Large Language Models (LLMs)** are neural networks with hundreds of billions of parameters trained on internet-scale text data ${source(id)}. These models exhibit emergent abilities — capabilities not present in smaller models — including in-context learning, reasoning, and code generation. LLMs form the foundation of modern AI assistants and have transformed how humans interact with machines.`)
  }

  if (hasRAG) {
    const id = findId("retrieval-augmented")
    segments.push(`\n\n**Retrieval-Augmented Generation (RAG)** combines information retrieval with text generation to improve accuracy and reduce hallucination ${source(id)}. RAG systems retrieve relevant documents from a knowledge base and use them as context for generation. This architecture is what powers systems like Perplexity, enabling them to provide cited, verifiable answers grounded in real-time web content rather than relying solely on parametric knowledge.`)
  }

  if (hasAI && hasML && hasDL) {
    segments.push(`\n\n**Summary**: AI is the broad field of creating intelligent machines. ML is the subset that learns from data. DL is the subset of ML using deep neural networks. Together with NLP, neural networks, and LLMs, these technologies form the modern AI stack that powers everything from search engines to autonomous systems ${source(findId("artificial intelligence"))}${source(findId("machine learning"))}${source(findId("deep learning"))}.`)
  }

  segments.push("\n\n")
  segments.push("Hope this helps! Let me know if you'd like to dive deeper into any specific aspect.")

  return segments
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
