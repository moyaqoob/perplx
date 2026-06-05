import type { RetrievalResult, QueryAnalysis } from "../types"

interface SearchHit {
  url: string
  title: string
  snippet: string
  score: number
  date?: string
  content?: string
}

export async function hybridRetrieve(
  analysis: QueryAnalysis,
): Promise<RetrievalResult[]> {
  const allQueries = [analysis.rewritten, ...analysis.subQueries]
  const seen = new Set<string>()
  const results: RetrievalResult[] = []

  for (const q of allQueries) {
    const hits = await executeHybridSearch(q)
    for (const hit of hits) {
      const key = hit.url.split("#")[0]
      if (!seen.has(key)) {
        seen.add(key)
        results.push({
          url: hit.url,
          title: hit.title,
          content: hit.content ?? hit.snippet,
          snippet: hit.snippet,
          date: hit.date,
          score: hit.score,
        })
      }
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, 60)
}

async function executeHybridSearch(query: string): Promise<SearchHit[]> {
  await sleep(80 + Math.random() * 120)

  const hits = generateMockHits(query)
  return hits
}

function generateMockHits(query: string): SearchHit[] {
  const base: SearchHit[] = [
    {
      url: "https://en.wikipedia.org/wiki/Artificial_intelligence",
      title: "Artificial Intelligence - Wikipedia",
      snippet: "Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals.",
      score: 0.92,
      date: "2025-11-15",
      content: `Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to the natural intelligence displayed by humans or animals. Leading AI textbooks define the field as the study of "intelligent agents": any system that perceives its environment and takes actions that maximize its chance of achieving its goals. Some popular accounts use the term "artificial intelligence" to describe machines that mimic cognitive functions that humans associate with the human mind, such as learning and problem solving. AI applications include advanced web search engines, recommendation systems, understanding human speech, self-driving cars, automated decision-making, and competing at the highest level in strategic game systems.`,
    },
    {
      url: "https://en.wikipedia.org/wiki/Machine_learning",
      title: "Machine Learning - Wikipedia",
      snippet: "Machine learning (ML) is a field of study in artificial intelligence concerned with the development and study of statistical algorithms.",
      score: 0.88,
      date: "2025-09-20",
      content: `Machine learning (ML) is a field of study in artificial intelligence concerned with the development and study of statistical algorithms that can learn from data and generalize to unseen data, and thus perform tasks without explicit instructions. Machine learning algorithms build a model based on training data to make predictions or decisions without being explicitly programmed to do so. Machine learning is used in a wide variety of applications, including medicine, email filtering, speech recognition, and computer vision, where it is difficult or infeasible to develop conventional algorithms to perform the needed tasks.`,
    },
    {
      url: "https://en.wikipedia.org/wiki/Deep_learning",
      title: "Deep Learning - Wikipedia",
      snippet: "Deep learning is a subset of machine learning that uses neural networks with three or more layers.",
      score: 0.85,
      date: "2025-08-10",
      content: `Deep learning is a subset of machine learning that uses neural networks with three or more layers. These neural networks attempt to simulate the behavior of the human brain — albeit far from matching its ability — to learn from large amounts of data. While a neural network with a single layer can still make approximate predictions, additional hidden layers can help to optimize and refine for accuracy. Deep learning drives many artificial intelligence applications and services that improve automation, performing analytical and physical tasks without human intervention.`,
    },
    {
      url: "https://en.wikipedia.org/wiki/Natural_language_processing",
      title: "Natural Language Processing - Wikipedia",
      snippet: "Natural language processing (NLP) is a subfield of linguistics, computer science, and artificial intelligence.",
      score: 0.82,
      date: "2025-07-05",
      content: `Natural language processing (NLP) is a subfield of linguistics, computer science, and artificial intelligence concerned with the interactions between computers and human language, in particular how to program computers to process and analyze large amounts of natural language data. The goal is a computer capable of understanding the contents of documents, including the contextual nuances of the language within them. Challenges in natural language processing frequently involve speech recognition, natural language understanding, and natural language generation.`,
    },
    {
      url: "https://en.wikipedia.org/wiki/Neural_network",
      title: "Neural Network - Wikipedia",
      snippet: "Artificial neural networks are computing systems inspired by biological neural networks.",
      score: 0.79,
      date: "2025-06-18",
      content: `Artificial neural networks are computing systems inspired by biological neural networks that constitute animal brains. Such systems learn to perform tasks by considering examples, generally without being programmed with task-specific rules. An ANN consists of connected units or nodes called artificial neurons, which loosely model the neurons in the brain. Each connection can transmit a signal from one artificial neuron to another. The signal at a connection is a real number, and the output of each neuron is computed by some non-linear function of the sum of its inputs.`,
    },
    {
      url: "https://en.wikipedia.org/wiki/Generative_pre-trained_transformer",
      title: "GPT (Generative Pre-trained Transformer) - Wikipedia",
      snippet: "Generative Pre-trained Transformers (GPT) are a type of large language model based on the transformer architecture.",
      score: 0.76,
      date: "2025-05-22",
      content: `Generative Pre-trained Transformers (GPT) are a type of large language model (LLM) based on the transformer architecture, developed by OpenAI. GPT models are pre-trained on large corpora of text and then fine-tuned for specific tasks. The GPT architecture implements a decoder-only transformer that uses multi-head attention mechanisms. The "Generative" in GPT refers to the model's ability to generate new text, "Pre-trained" indicates the model has been trained on a large corpus before fine-tuning, and "Transformer" refers to the neural network architecture.`,
    },
    {
      url: "https://en.wikipedia.org/wiki/Large_language_model",
      title: "Large Language Model - Wikipedia",
      snippet: "A large language model (LLM) is a language model characterized by its large size, trained on vast amounts of text data.",
      score: 0.74,
      date: "2025-04-12",
      content: `A large language model (LLM) is a language model characterized by its large size, consisting of hundreds of billions of parameters, trained on vast amounts of text data. LLMs are artificial neural networks that use the transformer architecture. They are trained on large datasets of text, enabling them to generate human-like text and perform a wide range of natural language processing tasks. LLMs have been shown to acquire abilities such as translation, summarization, and question answering through the training process.`,
    },
    {
      url: "https://en.wikipedia.org/wiki/Retrieval-augmented_generation",
      title: "Retrieval-Augmented Generation - Wikipedia",
      snippet: "Retrieval-augmented generation (RAG) is a technique that combines information retrieval with text generation.",
      score: 0.71,
      date: "2025-03-08",
      content: `Retrieval-augmented generation (RAG) is a technique that combines information retrieval with text generation, allowing language models to access external knowledge sources during generation. RAG models retrieve relevant documents from a knowledge base and use them as context for generating responses. This approach improves factuality, reduces hallucination, and enables the model to access up-to-date information without retraining. RAG has become a foundational architecture for AI systems that require accurate, verifiable, and current information.`,
    },
  ]

  const queryTerms = query.toLowerCase().split(/\s+/)
  const queryEntity = queryTerms.find((t) => t.length > 3) ?? ""

  return base.map((hit) => {
    const content = (hit.title + " " + hit.snippet + " " + hit.content).toLowerCase()
    const keywordScore = queryTerms.filter((t) => t.length > 2 && content.includes(t)).length / Math.max(queryTerms.filter((t) => t.length > 2).length, 1)

    const semanticScore = content.includes(queryEntity) ? 0.5 : 0
    const combined = (hit.score * 0.6) + (keywordScore * 0.3) + (semanticScore * 0.1)

    return {
      ...hit,
      score: Math.min(combined + Math.random() * 0.05, 1),
    }
  }).sort((a, b) => b.score - a.score)
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
