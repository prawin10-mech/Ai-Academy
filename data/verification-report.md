# Verification report

Date checked: 2026-09-29. Method: each page was opened with WebFetch and its title and structure read. Direct curl from the shell was blocked by the egress proxy for learn.deeplearning.ai and huggingface.co (HTTP 403 on CONNECT), so no HTTP codes came from curl. "Opened" below means WebFetch returned the real page.

Cost rule: "Free" only where the page said so (LangChain Academy pages). DeepLearning.AI pages show "free audit" plus a paid plan, so they are marked "Check page for terms". Docs and articles show no price line, so they are also "Check page for terms".

## Existing links

| Course id | URL | Result | Date |
|---|---|---|---|
| agents-dlai | https://learn.deeplearning.ai/courses/agentic-ai | OK. "Agentic AI", Andrew Ng, 5 modules. | 2026-09-29 |
| agents-mcp | https://learn.deeplearning.ai/courses/mcp-build-rich-context-ai-apps-with-anthropic | OK. 12 lessons plus quiz. | 2026-09-29 |
| agents-hf | https://huggingface.co/learn/agents-course | OK. "AI Agents Course", chapters 0 to 4 plus bonus units. | 2026-09-29 |
| rag-dlai | https://learn.deeplearning.ai/courses/retrieval-augmented-generation | OK. Module 1 lessons shown. | 2026-09-29 |
| llm-hf | https://huggingface.co/learn/llm-course | NOT CONFIRMED on the exact URL: HTTP 429 (rate limit) on 3 tries. The child page https://huggingface.co/learn/llm-course/chapter1/1 opened fine and showed the full chapter list (chapters 0 to 12). Treat as working, recheck later. | 2026-09-29 |
| llm-dlai-prompt | https://learn.deeplearning.ai/courses/chatgpt-prompt-eng | OK. 10 items, ends with graded quiz. | 2026-09-29 |

## New entries

| Course id | URL | What was seen | Date |
|---|---|---|---|
| agents-effective | https://www.anthropic.com/engineering/building-effective-agents | Opened. Sections: workflows (chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer), agents, 2 appendices. | 2026-09-29 |
| agents-langgraph-academy | https://academy.langchain.com/courses/intro-to-langgraph | Opened. "Foundation: Introduction to LangGraph - Python", shows Free, 6 hours video, modules on state, memory, human-in-the-loop, deployment. | 2026-09-29 |
| agents-langgraph-dlai | https://learn.deeplearning.ai/courses/ai-agents-in-langgraph | Opened. 10 items, Harrison Chase and Rotem Weiss. Free audit or paid plan. | 2026-09-29 |
| agents-crewai-dlai | https://learn.deeplearning.ai/courses/multi-ai-agent-systems-with-crewai | Opened. 20 items. Free audit or paid plan. | 2026-09-29 |
| agents-autogen-dlai | https://learn.deeplearning.ai/courses/ai-agentic-design-patterns-with-autogen | Opened. 9 items, made with Microsoft. Free audit or paid plan. | 2026-09-29 |
| agents-tools-writing | https://www.anthropic.com/engineering/writing-tools-for-agents | Opened. "Writing effective tools for AI agents". | 2026-09-29 |
| agents-mcp-server | https://modelcontextprotocol.io/docs/develop/build-server | Opened. Weather server tutorial. Also opened: /docs/getting-started/intro and /docs/learn/architecture. | 2026-09-29 |
| agents-anthropic-courses | https://github.com/anthropics/courses | Opened. Repo exists, 5 courses: api fundamentals, prompt engineering tutorial, real world prompting, prompt evaluations, tool use. | 2026-09-29 |
| rag-agentic-llamaindex | https://learn.deeplearning.ai/courses/building-agentic-rag-with-llamaindex | Opened. 7 items, Jerry Liu. Free audit or paid plan. | 2026-09-29 |
| rag-advanced-eval | https://learn.deeplearning.ai/courses/building-evaluating-advanced-rag | Opened. 7 items incl. RAG triad, sentence-window, auto-merging. | 2026-09-29 |
| rag-mongodb-atlas | https://www.mongodb.com/docs/atlas/atlas-vector-search/rag/ | Opened. "Retrieval-Augmented Generation (RAG) with MongoDB", tutorial with Node.js tab. | 2026-09-29 |
| llm-tools-openai | https://developers.openai.com/api/docs/guides/function-calling | Opened ("Function calling | OpenAI API"). Also opened https://developers.openai.com/api/docs/guides/structured-outputs. The old platform.openai.com URL redirects (302) here. | 2026-09-29 |
| llm-owasp-top10 | https://genai.owasp.org/llm-top-10/ | Opened. OWASP LLM Top 10 (2025), LLM01 to LLM10. Also opened https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks. | 2026-09-29 |
| ops-langsmith-eval | https://academy.langchain.com/courses/intro-to-langsmith | Opened. "Foundation: Introduction to Agent Observability & Evaluations", Free, 7.5 hours, 5 modules. | 2026-09-29 |
| ops-evals-claude | https://platform.claude.com/docs/en/test-and-evaluate/develop-tests | Opened. "Define success criteria and build evaluations". | 2026-09-29 |
| ops-cost-caching | https://platform.claude.com/docs/en/build-with-claude/prompt-caching | Opened ("Prompt caching"). Also opened https://platform.claude.com/docs/en/build-with-claude/batch-processing (50 percent discount). docs.claude.com URLs redirect (302) to platform.claude.com. | 2026-09-29 |

## Checked and dropped

- MongoDB University course pages (learn.mongodb.com/courses/using-atlas-vector-search-for-rag-applications and /vector-search-fundamentals): need JavaScript, content could not be read. Dropped.
- https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/ : returned only a shell page. Dropped. https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-quick-start/ : 404.

## Opened but not used (spare candidates)

- https://docs.ragas.io/en/stable/ (RAG and agent metrics)
- https://learn.deeplearning.ai/courses/quality-safety-llm-applications
- https://learn.deeplearning.ai/courses/red-teaming-llm-applications
- https://learn.deeplearning.ai/courses/automated-testing-llmops
- https://learn.deeplearning.ai/courses/evaluating-ai-agents
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
