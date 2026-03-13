/**
 * ChooseMyCoverage — Chatbot Integration
 * ========================================
 * High-level API: feed in a raw message, get back a structured response.
 * Drop-in replacement for your existing chat widget's response logic.
 *
 * Usage (browser):
 *   <script src="nlu-engine.js"></script>
 *   <script src="response-handler.js"></script>
 *   <script src="chatbot.js"></script>
 *   const result = CMC_Chatbot.chat("I need auto insurance");
 *   // result.message, result.actions, result.quickReplies, etc.
 *
 * Usage (Node):
 *   const { chat, analyze } = require("./chatbot");
 */

(function () {
  // Resolve dependencies
  let processMessage, buildResponse;

  if (typeof require !== "undefined") {
    // Node.js
    const nlu = require("./nlu-engine");
    const resp = require("./response-handler");
    processMessage = nlu.processMessage;
    buildResponse = resp.buildResponse;
  } else if (typeof window !== "undefined") {
    // Browser
    processMessage = window.CMC_NLU.processMessage;
    buildResponse = window.CMC_Responses.buildResponse;
  }

  // ── Conversation State ──────────────────────────────────────
  const conversationHistory = [];
  let turnCount = 0;

  /**
   * chat(message) → Full response object for the chat widget
   */
  function chat(message) {
    if (!message || typeof message !== "string" || !message.trim()) {
      return {
        message: "I didn't catch that. Could you try again?",
        actions: [],
        quickReplies: ["Get a quote", "File a claim", "Help"],
        primaryIntent: "fallback",
        confidence: 0,
      };
    }

    turnCount++;

    // Run NLU pipeline
    const nluResult = processMessage(message);

    // Build response
    const response = buildResponse(nluResult);

    // Store in history for context
    conversationHistory.push({
      turn: turnCount,
      role: "user",
      message,
      nlu: {
        primaryIntent: nluResult.primaryIntent,
        confidence: nluResult.confidence,
        entities: nluResult.entities,
        isMultiIntent: nluResult.isMultiIntent,
      },
    });

    conversationHistory.push({
      turn: turnCount,
      role: "bot",
      message: response.message,
      intent: response.primaryIntent,
    });

    return response;
  }

  /**
   * analyze(message) → Raw NLU analysis (for debugging / admin tools)
   */
  function analyze(message) {
    return processMessage(message);
  }

  /**
   * getHistory() → Conversation history
   */
  function getHistory() {
    return [...conversationHistory];
  }

  /**
   * reset() → Clear conversation state
   */
  function reset() {
    conversationHistory.length = 0;
    turnCount = 0;
  }

  // ── Export ────────────────────────────────────────────────────
  const api = { chat, analyze, getHistory, reset };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.CMC_Chatbot = api;
  }
})();
