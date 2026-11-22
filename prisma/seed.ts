import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not configured. Add it to your local .env file.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const companies = [
  { slug: "openai", name: "OpenAI", type: "BOTH" as const, description: "AI research and deployment company building general-purpose models.", website: "https://openai.com", headquarters: "San Francisco, United States" },
  { slug: "anthropic", name: "Anthropic", type: "BOTH" as const, description: "AI safety and research company developing the Claude model family.", website: "https://anthropic.com", headquarters: "San Francisco, United States" },
  { slug: "google-deepmind", name: "Google DeepMind", type: "BOTH" as const, description: "Research laboratory advancing AI through the Gemini model family.", website: "https://deepmind.google", headquarters: "London, United Kingdom" },
  { slug: "deepseek", name: "DeepSeek", type: "BOTH" as const, description: "AI research company focused on efficient open and hosted language models.", website: "https://deepseek.com", headquarters: "Hangzhou, China" },
  { slug: "mistral-ai", name: "Mistral AI", type: "BOTH" as const, description: "AI company building open-weight and hosted foundation models.", website: "https://mistral.ai", headquarters: "Paris, France" },
  { slug: "meta-ai", name: "Meta AI", type: "BOTH" as const, description: "Research organization building the open-weight Llama model family.", website: "https://ai.meta.com", headquarters: "Menlo Park, United States" },
];

const providers = [
  { slug: "openai-api", name: "OpenAI API", description: "Direct hosted access to OpenAI models.", website: "https://platform.openai.com", region: "Global", companySlug: "openai" },
  { slug: "anthropic-api", name: "Anthropic API", description: "Direct hosted access to Claude models.", website: "https://console.anthropic.com", region: "Global", companySlug: "anthropic" },
  { slug: "google-vertex-ai", name: "Google Vertex AI", description: "Managed model access through Google Cloud Vertex AI.", website: "https://cloud.google.com/vertex-ai", region: "Global", companySlug: "google-deepmind" },
  { slug: "deepseek-api", name: "DeepSeek API", description: "Direct hosted access to DeepSeek chat and reasoning models.", website: "https://platform.deepseek.com", region: "Asia Pacific", companySlug: "deepseek" },
  { slug: "mistral-api", name: "Mistral API", description: "Direct hosted access to Mistral models.", website: "https://console.mistral.ai", region: "Global", companySlug: "mistral-ai" },
  { slug: "together-ai", name: "Together AI", description: "Cloud inference for a broad catalog of open models.", website: "https://together.ai", region: "Global", companySlug: null },
  { slug: "openrouter", name: "OpenRouter", description: "Unified API routing across multiple model providers.", website: "https://openrouter.ai", region: "Global", companySlug: null },
];

const models = [
  { slug: "gpt-4-1", name: "GPT-4.1", companySlug: "openai", type: "MULTIMODAL" as const, contextWindow: 1047576, modalities: ["text", "image"], capabilities: ["coding", "reasoning", "vision", "tool use"], description: "General-purpose multimodal model with a long context window.", featured: true },
  { slug: "claude-sonnet-4", name: "Claude Sonnet 4", companySlug: "anthropic", type: "MULTIMODAL" as const, contextWindow: 200000, modalities: ["text", "image"], capabilities: ["coding", "reasoning", "vision", "tool use"], description: "Balanced Claude model for coding, analysis, and agentic work.", featured: true },
  { slug: "gemini-2-5-pro", name: "Gemini 2.5 Pro", companySlug: "google-deepmind", type: "MULTIMODAL" as const, contextWindow: 1000000, modalities: ["text", "image", "audio", "video"], capabilities: ["reasoning", "coding", "vision", "long context"], description: "Multimodal reasoning model with support for large context inputs.", featured: true },
  { slug: "deepseek-r1", name: "DeepSeek R1", companySlug: "deepseek", type: "TEXT" as const, contextWindow: 65536, modalities: ["text"], capabilities: ["reasoning", "math", "coding"], description: "Reasoning-focused model trained for complex problem solving.", featured: true },
  { slug: "mistral-large", name: "Mistral Large", companySlug: "mistral-ai", type: "MULTIMODAL" as const, contextWindow: 128000, modalities: ["text", "image"], capabilities: ["reasoning", "coding", "function calling"], description: "Flagship Mistral model for multilingual and enterprise workloads.", featured: false },
  { slug: "llama-4-maverick", name: "Llama 4 Maverick", companySlug: "meta-ai", type: "MULTIMODAL" as const, contextWindow: 10000000, modalities: ["text", "image"], capabilities: ["reasoning", "vision", "open weights"], description: "Open-weight mixture-of-experts model for research and applications.", featured: false },
];

const benchmarks = [
  { slug: "mmlu-pro", name: "MMLU-Pro", category: "KNOWLEDGE" as const, description: "Broad expert-level knowledge and reasoning evaluation.", sourceUrl: "https://arxiv.org/abs/2406.01574" },
  { slug: "swe-bench-verified", name: "SWE-bench Verified", category: "CODING" as const, description: "Evaluation of real-world software engineering issue resolution.", sourceUrl: "https://www.swebench.com/" },
  { slug: "math-500", name: "AIME-style Math 500", category: "MATH" as const, description: "Curated mathematical reasoning problem set.", sourceUrl: null },
  { slug: "gpqa-diamond", name: "GPQA Diamond", category: "REASONING" as const, description: "Graduate-level, difficult science question benchmark.", sourceUrl: "https://arxiv.org/abs/2311.12022" },
];

const providerLinks = [
  { modelSlug: "gpt-4-1", providerSlug: "openai-api", providerModelId: "gpt-4.1", input: "2.000000", output: "8.000000" },
  { modelSlug: "gpt-4-1", providerSlug: "openrouter", providerModelId: "openai/gpt-4.1", input: "2.000000", output: "8.000000" },
  { modelSlug: "claude-sonnet-4", providerSlug: "anthropic-api", providerModelId: "claude-sonnet-4-20250514", input: "3.000000", output: "15.000000" },
  { modelSlug: "claude-sonnet-4", providerSlug: "openrouter", providerModelId: "anthropic/claude-sonnet-4", input: "3.000000", output: "15.000000" },
  { modelSlug: "gemini-2-5-pro", providerSlug: "google-vertex-ai", providerModelId: "gemini-2.5-pro", input: "1.250000", output: "10.000000" },
  { modelSlug: "deepseek-r1", providerSlug: "deepseek-api", providerModelId: "deepseek-reasoner", input: "0.550000", output: "2.190000" },
  { modelSlug: "mistral-large", providerSlug: "mistral-api", providerModelId: "mistral-large-latest", input: "2.000000", output: "6.000000" },
  { modelSlug: "llama-4-maverick", providerSlug: "together-ai", providerModelId: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8", input: "0.270000", output: "0.850000" },
];

const scoreRows = [
  ["gpt-4-1", "mmlu-pro", "79.2000", 3], ["gpt-4-1", "swe-bench-verified", "54.6000", 2],
  ["claude-sonnet-4", "mmlu-pro", "78.1000", 4], ["claude-sonnet-4", "swe-bench-verified", "72.7000", 1],
  ["gemini-2-5-pro", "mmlu-pro", "84.0000", 1], ["gemini-2-5-pro", "gpqa-diamond", "84.0000", 1],
  ["deepseek-r1", "math-500", "97.3000", 1], ["deepseek-r1", "gpqa-diamond", "71.5000", 4],
  ["mistral-large", "mmlu-pro", "72.0000", 6], ["llama-4-maverick", "mmlu-pro", "80.5000", 2],
] as const;

async function main() {
  for (const company of companies) {
    await prisma.company.upsert({ where: { slug: company.slug }, create: company, update: {} });
  }

  const companyBySlug = new Map((await prisma.company.findMany()).map((company) => [company.slug, company]));
  for (const provider of providers) {
    const { companySlug, ...providerData } = provider;
    const company = companySlug ? companyBySlug.get(companySlug) : null;
    await prisma.provider.upsert({
      where: { slug: provider.slug },
      create: { ...providerData, companyId: company?.id ?? null },
      update: {},
    });
  }

  for (const model of models) {
    const { companySlug, ...modelData } = model;
    const company = companyBySlug.get(companySlug);
    if (!company) throw new Error(`Missing company ${companySlug}`);
    await prisma.model.upsert({
      where: { slug: model.slug },
      create: { ...modelData, companyId: company.id },
      update: {},
    });
  }

  for (const benchmark of benchmarks) {
    await prisma.benchmark.upsert({ where: { slug: benchmark.slug }, create: benchmark, update: {} });
  }

  const [modelRows, providerRows, benchmarkRows] = await Promise.all([
    prisma.model.findMany(), prisma.provider.findMany(), prisma.benchmark.findMany(),
  ]);
  const modelBySlug = new Map(modelRows.map((row) => [row.slug, row]));
  const providerBySlug = new Map(providerRows.map((row) => [row.slug, row]));
  const benchmarkBySlug = new Map(benchmarkRows.map((row) => [row.slug, row]));

  for (const link of providerLinks) {
    const model = modelBySlug.get(link.modelSlug);
    const provider = providerBySlug.get(link.providerSlug);
    if (!model || !provider) throw new Error(`Missing model or provider for ${link.modelSlug}`);
    await prisma.modelProvider.upsert({
      where: { modelId_providerId: { modelId: model.id, providerId: provider.id } },
      create: {
        modelId: model.id, providerId: provider.id, providerModelId: link.providerModelId,
        inputPricePerMillion: link.input, outputPricePerMillion: link.output,
      },
      update: {},
    });
  }

  for (const [modelSlug, benchmarkSlug, score, rank] of scoreRows) {
    const model = modelBySlug.get(modelSlug);
    const benchmark = benchmarkBySlug.get(benchmarkSlug);
    if (!model || !benchmark) throw new Error(`Missing model or benchmark for ${modelSlug}`);
    await prisma.benchmarkScore.upsert({
      where: { modelId_benchmarkId: { modelId: model.id, benchmarkId: benchmark.id } },
      create: { modelId: model.id, benchmarkId: benchmark.id, score, rank, evaluatedAt: new Date("2026-10-01T00:00:00.000Z") },
      update: {},
    });
  }

  console.info("Seed complete: 6 companies, 7 providers, 6 models, 4 benchmarks, 8 model-provider links, 10 benchmark scores (illustrative sample data).");
}

main()
  .catch(() => {
    // Database driver errors can include connection details; keep them out of logs.
    console.error("Seed failed. Check database connectivity and seed data.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
