export interface MissionOption {
  key: "A" | "B" | "C";
  label: string;
  correct?: boolean;
  /** Shown after a wrong pick. Never gives the answer away outright. */
  hint?: string;
}

export interface MissionSystem {
  id: string;
  name: string;
  source: string;
  summary: string;
  symptom: string;
  code: string[];
  /** Index of the line in `code` to highlight as the problem. */
  badLine: number;
  options: MissionOption[];
  fixedMessage: string;
  story: string;
  stats: { value: string; label: string }[];
}

/**
 * Puzzles are simplified illustrations of the problem each system solves, not code from those projects.
 * Stories and stats must stay in line with lib/data/experience.ts and lib/data/projects.ts.
 */
export const missionSystems: MissionSystem[] = [
  {
    id: "navigation",
    name: "Navigation",
    source: "NC State",
    summary: "Retrieval never checks confidence",
    symptom: "Navigation is confidently heading the wrong way. The retriever answers even when nothing matches.",
    code: [
      "def retrieve(query):",
      "    hit, score = index.search(embed(query))",
      "    return hit.text  # score is never checked",
    ],
    badLine: 2,
    options: [
      { key: "A", label: "Search more results: top_k = 50", hint: "More candidates still doesn't stop a weak match. What happens to score?" },
      { key: "B", label: "if score < CONFIDENCE_GATE: return None", correct: true },
      { key: "C", label: "Retry the same query three times", hint: "The same query returns the same weak match. What happens to score?" },
    ],
    fixedMessage: "Low-confidence matches are now rejected.",
    story:
      "At NC State, Shram built the retrieval layer of a RAG pipeline over 200 scientific PDFs, including a cosine-similarity confidence gate.",
    stats: [
      { value: "60%", label: "less manual extraction" },
      { value: "85%", label: "extraction accuracy" },
      { value: "30h", label: "saved per week" },
    ],
  },
  {
    id: "reactor",
    name: "Reactor",
    source: "OpenPRA",
    summary: "Same input, different output",
    symptom: "The reactor model changes on every run, even with identical input, so nothing can be reproduced.",
    code: [
      "fn generate(cfg: &Config) -> Model {",
      "    let mut rng = rand::thread_rng();  // new randomness every run",
      "    build_fault_tree(&mut rng, cfg)",
      "}",
    ],
    badLine: 1,
    options: [
      { key: "A", label: "Cache the last output to disk", hint: "A cache hides the difference. The generator itself is still not repeatable." },
      { key: "B", label: "Sort the XML after generating it", hint: "Sorting tidies the order, but the content still differs. Where does the variation start?" },
      { key: "C", label: "let mut rng = StdRng::seed_from_u64(cfg.seed);", correct: true },
    ],
    fixedMessage: "Same seed, same model, every run.",
    story:
      "On the open-source OpenPRA nuclear-safety platform, Shram designed a Rust model generator with a deterministic, seed-driven pipeline emitting Open-PSA MEF XML.",
    stats: [
      { value: "7", label: "crates in the Cargo workspace" },
      { value: "CI", label: "quality gates, green" },
    ],
  },
  {
    id: "comms",
    name: "Comms",
    source: "ClinicFlow",
    summary: "Malformed LLM JSON loses data",
    symptom: "Comms drop out whenever the LLM returns malformed JSON, and the doctor's note is lost with them.",
    code: [
      "def to_soap_note(transcript):",
      "    reply = llm(transcript)",
      "    return json.loads(reply)  # one bad reply loses the note",
    ],
    badLine: 2,
    options: [
      {
        key: "A",
        label: "except JSONDecodeError: return {\"raw\": transcript}",
        correct: true,
      },
      { key: "B", label: "Raise max_tokens to 8000", hint: "A longer reply can still be malformed. What should happen when parsing fails?" },
      { key: "C", label: "Ask the model nicely to return JSON", hint: "Prompts help, but they guarantee nothing. What should happen when parsing fails?" },
    ],
    fixedMessage: "A malformed reply can no longer lose the note.",
    story:
      "ClinicFlow turns a doctor's voice recording into a structured SOAP note. Shram enforced JSON-only output with a raw-transcript fallback, so a malformed response never silently drops data.",
    stats: [
      { value: "6", label: "clinical keys in the output" },
      { value: "3", label: "stage STT, LLM, TTS pipeline" },
    ],
  },
  {
    id: "life-support",
    name: "Life support",
    source: "Orris Care",
    summary: "An answer ships with no evidence",
    symptom: "Life support is giving guidance with nothing behind it. An answer goes out even when no evidence was found.",
    code: [
      "def answer(question):",
      "    evidence = retrieve(question)",
      "    return llm(question, evidence)  # runs even if evidence is empty",
    ],
    badLine: 2,
    options: [
      { key: "A", label: "Lower the temperature to 0", hint: "A steadier answer with no evidence is still unsupported. What if evidence is empty?" },
      { key: "B", label: "Add a disclaimer to every answer", hint: "A disclaimer doesn't add evidence. What if evidence is empty?" },
      { key: "C", label: "if not evidence: return \"No evidence found.\"", correct: true },
    ],
    fixedMessage: "No evidence, no answer.",
    story:
      "At Orris Care, Shram is building an AI clinical decision support system that returns evidence-backed answers at the point of care, now in beta with practicing clinicians.",
    stats: [
      { value: "3", label: "engineers on the founding team" },
      { value: "Beta", label: "with practicing clinicians" },
    ],
  },
];
