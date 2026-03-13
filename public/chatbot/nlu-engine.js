/**
 * ChooseMyCoverage — Rule-Based NLU Engine
 * =========================================
 * Production conversational intent system for insurance chatbots.
 * Zero AI API calls. 100% deterministic rule-based scoring.
 *
 * Architecture:
 *   Raw message
 *     → Normalize (lowercase, strip punctuation, expand contractions)
 *     → Spell-correct (Levenshtein + insurance dictionary)
 *     → Tokenize (unigrams + bigrams + trigrams)
 *     → Synonym expansion (insurance-specific thesaurus)
 *     → Pattern matching (regex + keyword scoring per intent)
 *     → Multi-intent extraction (top N intents above threshold)
 *     → Entity extraction (zip, VIN, policy number, dollar amounts, dates)
 *     → Response routing (intent → handler → response)
 */

// ════════════════════════════════════════════════════════════════
// 1. TEXT NORMALIZATION
// ════════════════════════════════════════════════════════════════

const CONTRACTIONS = {
  "i'm": "i am", "i've": "i have", "i'll": "i will", "i'd": "i would",
  "you're": "you are", "you've": "you have", "you'll": "you will", "you'd": "you would",
  "he's": "he is", "she's": "she is", "it's": "it is",
  "we're": "we are", "we've": "we have", "we'll": "we will",
  "they're": "they are", "they've": "they have", "they'll": "they will",
  "that's": "that is", "what's": "what is", "who's": "who is",
  "where's": "where is", "there's": "there is", "here's": "here is",
  "how's": "how is", "let's": "let us",
  "can't": "cannot", "won't": "will not", "don't": "do not",
  "doesn't": "does not", "didn't": "did not", "isn't": "is not",
  "aren't": "are not", "wasn't": "was not", "weren't": "were not",
  "hasn't": "has not", "haven't": "have not", "hadn't": "had not",
  "wouldn't": "would not", "couldn't": "could not", "shouldn't": "should not",
  "needn't": "need not", "mustn't": "must not",
  "gonna": "going to", "wanna": "want to", "gotta": "got to",
  "ain't": "is not", "y'all": "you all",
};

function normalize(text) {
  if (!text || typeof text !== "string") return "";
  let s = text.toLowerCase().trim();
  // Expand contractions
  for (const [contraction, expansion] of Object.entries(CONTRACTIONS)) {
    s = s.replace(new RegExp(`\\b${contraction.replace("'", "'")}\\b`, "gi"), expansion);
    s = s.replace(new RegExp(`\\b${contraction}\\b`, "gi"), expansion);
  }
  // Normalize unicode quotes/dashes
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-");
  // Strip punctuation but keep $ and digits and hyphens in words
  s = s.replace(/[^\w\s$\-]/g, " ");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}


// ════════════════════════════════════════════════════════════════
// 2. SPELL CORRECTION (Levenshtein + Insurance Dictionary)
// ════════════════════════════════════════════════════════════════

const INSURANCE_DICTIONARY = [
  // Insurance terms
  "insurance", "policy", "premium", "deductible", "coverage", "claim", "adjuster",
  "liability", "comprehensive", "collision", "underinsured", "uninsured", "motorist",
  "bodily", "injury", "property", "damage", "personal", "protection", "pip",
  "renters", "homeowners", "dwelling", "replacement", "actual", "value",
  "endorsement", "rider", "umbrella", "bundle", "multi", "discount",
  "declaration", "certificate", "binder", "effective", "expiration", "renewal",
  "cancellation", "lapse", "reinstatement", "subrogation", "depreciation",
  // Vehicle terms
  "vehicle", "automobile", "vin", "mileage", "odometer", "registration",
  "title", "lien", "financed", "leased", "garaged", "commute",
  // Actions
  "quote", "payment", "billing", "invoice", "autopay", "refund",
  "cancel", "change", "update", "add", "remove", "file", "submit",
  "download", "print", "email", "contact", "support", "help",
  // People
  "driver", "operator", "policyholder", "insured", "beneficiary", "agent",
  "underwriter", "claimant", "dependent", "spouse",
  // Incidents
  "accident", "wreck", "crash", "fender", "bender",
  "theft", "stolen", "vandalism", "hail", "flood", "fire", "wind",
  "tornado", "hurricane", "earthquake", "lightning", "burst", "pipe",
  "water", "total", "loss", "salvage", "tow", "roadside",
  // Common English words (prevent over-correction)
  "hello", "the", "and", "for", "are", "but", "not", "you", "all", "can",
  "her", "was", "one", "our", "out", "how", "had", "has", "his", "him",
  "its", "let", "may", "new", "now", "old", "see", "way", "who", "did",
  "get", "got", "make", "like", "just", "over", "such", "take", "year",
  "them", "some", "time", "very", "when", "come", "could", "than", "look",
  "only", "into", "other", "also", "back", "after", "work", "well", "even",
  "want", "because", "any", "these", "give", "most", "tell", "need", "house",
  "try", "ask", "each", "what", "about", "with", "from", "they", "been",
  "have", "many", "said", "will", "much", "then", "them", "would", "like",
  "there", "their", "which", "this", "that", "your", "were", "being",
  "truck", "ride", "rates", "rate", "cost", "price", "pay", "bill", "card",
  "account", "login", "log", "sign", "home", "car", "auto", "run",
  "hit", "bought", "sold", "moved", "charged", "lower", "raise",
  "speak", "talk", "call", "human", "person", "real", "someone",
  "hello", "hi", "hey", "thanks", "thank", "bye", "goodbye",
];

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[m][n];
}

function correctWord(word) {
  if (word.length <= 2) return word;
  // Check if it's already a known word
  if (INSURANCE_DICTIONARY.includes(word)) return word;
  let best = word, bestDist = Infinity;
  const maxDist = word.length <= 4 ? 1 : 2;
  for (const dictWord of INSURANCE_DICTIONARY) {
    if (Math.abs(dictWord.length - word.length) > maxDist) continue;
    const dist = levenshtein(word, dictWord);
    if (dist < bestDist && dist <= maxDist) {
      bestDist = dist;
      best = dictWord;
    }
  }
  return best;
}

function spellCorrect(text) {
  return text.split(" ").map(w => {
    // Don't correct numbers, short words, or words starting with $
    if (/^\d+$/.test(w) || w.length <= 2 || w.startsWith("$")) return w;
    return correctWord(w);
  }).join(" ");
}


// ════════════════════════════════════════════════════════════════
// 3. TOKENIZATION (Unigrams + N-grams)
// ════════════════════════════════════════════════════════════════

function tokenize(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const tokens = { unigrams: [...words], bigrams: [], trigrams: [] };
  for (let i = 0; i < words.length - 1; i++) {
    tokens.bigrams.push(words[i] + " " + words[i + 1]);
  }
  for (let i = 0; i < words.length - 2; i++) {
    tokens.trigrams.push(words[i] + " " + words[i + 1] + " " + words[i + 2]);
  }
  return tokens;
}


// ════════════════════════════════════════════════════════════════
// 4. SYNONYM EXPANSION
// ════════════════════════════════════════════════════════════════

const SYNONYM_MAP = {
  // Accident synonyms
  accident:  ["wreck", "crash", "collision", "fender bender", "smash", "hit", "rear-ended", "rear ended", "sideswipe", "totaled", "total loss", "pileup", "pile-up"],
  theft:     ["stolen", "stole", "robbed", "robbery", "break-in", "break in", "burglary", "burglarized", "broke into"],
  vandalism: ["keyed", "spray painted", "smashed window", "slashed tires", "damaged my car"],
  flood:     ["flooding", "flooded", "water damage", "water leak", "burst pipe", "broken pipe", "sewer backup"],
  fire:      ["burned", "burning", "arson", "smoke damage", "electrical fire"],
  hail:      ["hailstorm", "hail storm", "hail damage", "ice storm"],
  wind:      ["windstorm", "wind storm", "tornado", "hurricane", "cyclone", "storm damage"],

  // Coverage synonyms
  coverage:     ["protection", "covered", "cover", "covers", "insured for", "policy covers"],
  deductible:   ["deductable", "out of pocket", "out-of-pocket", "my portion", "what i pay first"],
  premium:      ["monthly payment", "monthly cost", "rate", "price", "how much", "cost per month", "what do i pay"],
  liability:    ["at fault", "at-fault", "my fault", "i caused", "responsible for"],
  comprehensive:["comp", "full coverage", "everything covered", "non-collision"],
  collision:    ["hit something", "crashed into", "ran into"],

  // Action synonyms
  quote:    ["estimate", "rate", "price check", "how much would", "get a price", "price quote", "free quote", "compare rates", "shop rates"],
  payment:  ["pay", "pay bill", "make payment", "pay my bill", "send payment", "submit payment", "pay online"],
  cancel:   ["stop", "terminate", "end my", "discontinue", "drop", "get rid of"],
  change:   ["update", "modify", "edit", "switch", "adjust", "alter", "revise"],
  add:      ["include", "put on", "attach", "tack on", "add on"],
  remove:   ["take off", "delete", "drop", "take away", "get rid of"],
  file:     ["submit", "report", "open", "start", "initiate", "begin"],
  claim:    ["claims", "claim process", "insurance claim", "file a claim"],
  download: ["print", "get a copy", "pdf", "save", "export"],

  // Vehicle synonyms
  vehicle: ["car", "auto", "automobile", "truck", "suv", "van", "ride", "whip", "wheels"],
  driver:  ["operator", "person driving", "who drives"],

  // Property synonyms
  home:    ["house", "residence", "dwelling", "property", "place"],
  renter:  ["tenant", "renting", "lease", "lessee", "apartment renter"],
  apartment: ["apt", "flat", "unit", "condo", "studio"],

  // General
  help:    ["assist", "assistance", "support", "guide", "guidance", "explain", "tell me about", "how do i", "what is", "what are"],
  agent:   ["representative", "rep", "person", "someone", "human", "real person", "talk to someone", "speak to someone", "live agent"],
  document:["paperwork", "papers", "forms", "documentation", "proof", "id card", "dec page", "declarations page", "certificate"],

  // Discount synonyms
  discount: ["save", "savings", "cheaper", "lower rate", "reduce", "bundle discount", "multi-policy", "safe driver", "good student"],
};

function expandSynonyms(tokens) {
  const expanded = new Set([...tokens.unigrams]);
  const allText = [...tokens.unigrams, ...tokens.bigrams, ...tokens.trigrams];

  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    for (const syn of synonyms) {
      // Check if synonym appears in unigrams (single word) or bigrams/trigrams (multi-word)
      if (syn.includes(" ")) {
        if (allText.some(t => t.includes(syn))) {
          expanded.add(canonical);
        }
      } else {
        if (tokens.unigrams.includes(syn)) {
          expanded.add(canonical);
        }
      }
    }
    // Also add the canonical if it's directly in the text
    if (tokens.unigrams.includes(canonical)) {
      expanded.add(canonical);
    }
  }

  return expanded;
}


// ════════════════════════════════════════════════════════════════
// 5. ENTITY EXTRACTION
// ════════════════════════════════════════════════════════════════

function extractEntities(originalText) {
  const entities = {};
  const text = originalText.toLowerCase();

  // ZIP code
  const zipMatch = originalText.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zipMatch) entities.zip = zipMatch[1];

  // VIN (17 alphanumeric, no I, O, Q)
  const vinMatch = originalText.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
  if (vinMatch) entities.vin = vinMatch[1].toUpperCase();

  // Policy number (CMC-YYYY-NNNNN or similar patterns)
  const policyMatch = originalText.match(/\b((?:CMC|AUT|HOM|RNT)-?\d{4}-?\d{4,6})\b/i);
  if (policyMatch) entities.policyNumber = policyMatch[1].toUpperCase();

  // Dollar amount
  const dollarMatch = text.match(/\$[\d,]+(?:\.\d{2})?|\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars?|bucks?)\b/);
  if (dollarMatch) entities.amount = dollarMatch[0].replace(/[^0-9.]/g, "");

  // Date (various formats)
  const dateMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (dateMatch) entities.date = dateMatch[0];

  // Email
  const emailMatch = originalText.match(/\b[\w.-]+@[\w.-]+\.\w{2,}\b/);
  if (emailMatch) entities.email = emailMatch[0];

  // Phone
  const phoneMatch = originalText.match(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  if (phoneMatch) entities.phone = phoneMatch[0];

  // Insurance type mentioned
  if (/\b(?:auto|car|vehicle|driving)\b/.test(text)) entities.insuranceType = "auto";
  else if (/\b(?:home|house|homeowner|dwelling|property)\b/.test(text)) entities.insuranceType = "home";
  else if (/\b(?:rent|renter|tenant|apartment|condo)\b/.test(text)) entities.insuranceType = "renters";
  else if (/\b(?:bundle|combo|package|both|all)\b/.test(text)) entities.insuranceType = "bundle";

  return entities;
}


// ════════════════════════════════════════════════════════════════
// 6. INTENT DEFINITIONS & SCORING
// ════════════════════════════════════════════════════════════════

/**
 * Each intent has:
 *   - keywords: array of [word/phrase, weight] — matched against expanded token set
 *   - patterns: array of regex — if any matches, adds a bonus
 *   - requiredAny: at least one of these must be present (optional gate)
 *   - boost: flat bonus if pattern matches
 *   - threshold: minimum score to qualify
 *   - category: for grouping/routing
 */

const INTENTS = {
  // ─── QUOTE FUNNEL ───────────────────────────────────────────
  get_auto_quote: {
    category: "quote",
    keywords: [
      ["quote", 4], ["auto", 3], ["vehicle", 3], ["car", 3],
      ["insurance", 2], ["rate", 3], ["price", 3], ["estimate", 3],
      ["compare", 2], ["shop", 2], ["how much", 3], ["cost", 2],
      ["get", 1], ["need", 1], ["want", 1], ["looking for", 2],
      ["new policy", 3], ["switch", 2], ["better rate", 3],
    ],
    patterns: [
      /(?:get|need|want|looking for|start|begin).*(?:auto|car|vehicle).*(?:quote|insurance|rate|price)/,
      /(?:auto|car|vehicle).*(?:quote|rate|price|insurance)/,
      /(?:how much|what would|cost of).*(?:auto|car|vehicle).*(?:insurance|coverage)/,
      /(?:compare|shop).*(?:auto|car).*(?:rate|insurance)/,
      /(?:quote|insure).*(?:my car|my vehicle|my auto)/,
    ],
    boost: 5,
    threshold: 6,
  },

  get_home_quote: {
    category: "quote",
    keywords: [
      ["quote", 4], ["home", 3], ["house", 3], ["homeowner", 3],
      ["property", 2], ["dwelling", 2], ["insurance", 2],
      ["rate", 3], ["price", 3], ["estimate", 3], ["coverage", 2],
      ["how much", 3], ["cost", 2],
    ],
    patterns: [
      /(?:get|need|want|looking for).*(?:home|house|homeowner|property).*(?:quote|insurance|rate)/,
      /(?:home|house|homeowner).*(?:quote|rate|price|insurance|coverage)/,
      /(?:how much|cost of).*(?:home|house|homeowner).*(?:insurance|coverage)/,
      /(?:insure|protect).*(?:my home|my house|my property)/,
    ],
    boost: 5,
    threshold: 6,
  },

  get_renters_quote: {
    category: "quote",
    keywords: [
      ["quote", 4], ["renter", 3], ["renters", 3], ["apartment", 3],
      ["tenant", 3], ["condo", 2], ["insurance", 2],
      ["rate", 3], ["price", 3], ["estimate", 3], ["coverage", 2],
    ],
    patterns: [
      /(?:get|need|want).*(?:renter|renters|tenant|apartment).*(?:quote|insurance|rate)/,
      /(?:renter|renters|tenant|apartment).*(?:quote|rate|price|insurance)/,
      /(?:insure|protect).*(?:my apartment|my rental|my stuff|my belongings)/,
    ],
    boost: 5,
    threshold: 6,
  },

  get_bundle_quote: {
    category: "quote",
    keywords: [
      ["bundle", 6], ["combo", 4], ["package", 3], ["both", 3],
      ["together", 3], ["multi", 3], ["multiple", 2],
      ["auto", 2], ["home", 2], ["renter", 1],
      ["quote", 3], ["rate", 2], ["discount", 3], ["save", 2],
      ["and", 1], ["plus", 2],
    ],
    patterns: [
      /(?:bundle|combine|package).*(?:auto|home|renter|policies)/,
      /(?:auto|car|vehicle).*(?:and|plus|\+|&).*(?:home|house|renter)/,
      /(?:home|house|renter).*(?:and|plus|\+|&).*(?:auto|car|vehicle)/,
      /(?:multi.?policy|multi.?line)/,
      /(?:save|discount).*(?:bundle|multiple|both)/,
      /(?:both|all).*(?:auto|car|home|renter).*(?:insurance|coverage|policies)/,
    ],
    boost: 8,
    threshold: 6,
  },

  get_generic_quote: {
    category: "quote",
    keywords: [
      ["quote", 5], ["rate", 5], ["rates", 5], ["price", 4], ["estimate", 4],
      ["insurance", 2], ["coverage", 2], ["how much", 3],
      ["compare", 3], ["shop", 2], ["get started", 3],
      ["new policy", 3], ["switch", 2], ["sign up", 3],
    ],
    patterns: [
      /(?:get|need|want|can i get|how do i get).*(?:quote|rate|estimate|price)/,
      /(?:how much|what does|cost of).*(?:insurance|coverage|policy)/,
      /(?:compare|shop).*(?:rate|insurance|price|quote)/,
      /(?:get started|sign up|begin|start)/,
    ],
    boost: 4,
    threshold: 5,
  },

  // ─── CLAIMS ─────────────────────────────────────────────────
  file_claim: {
    category: "claims",
    keywords: [
      ["file", 4], ["claim", 5], ["report", 3], ["submit", 3],
      ["accident", 5], ["incident", 3], ["damage", 4],
      ["theft", 5], ["stolen", 5], ["stole", 5], ["vandalism", 4],
      ["wreck", 4], ["crash", 4], ["collision", 4],
      ["flood", 4], ["fire", 4], ["hail", 4], ["wind", 4],
      ["broke into", 4], ["hit and run", 5], ["totaled", 4],
      ["need to file", 4], ["want to file", 4],
      ["burst", 3], ["pipe", 2], ["storm", 3],
      ["hit", 2], ["run", 1], ["involved", 2],
    ],
    patterns: [
      /(?:file|report|submit|start|open|make).*(?:a\s)?claim/,
      /(?:had|got in|was in|involved in).*(?:accident|wreck|crash|collision|fender bender)/,
      /(?:car|vehicle|home|house|apartment).*(?:was|got|been|has).*(?:stolen|broken into|vandalized|damaged|hit|flooded|burned)/,
      /(?:someone|they|he|she|somebody).*(?:hit|stole|broke|damaged|crashed into|rear.?ended)/,
      /(?:tree|branch|pipe|water).*(?:fell|burst|broke|leaked|damaged)/,
      /(?:i need to|i want to|how do i).*(?:file|report|submit).*(?:claim|accident|incident)/,
      /(?:hail|storm|wind|tornado|hurricane).*(?:damage|damaged|hit|struck)/,
      /(?:hit)\s+(?:and)\s+(?:run)/,
      /(?:damage).*(?:from|after|during).*(?:storm|hail|wind|flood|fire)/,
      /(?:somebody|someone).*(?:stole|stolen|robbed|broke)/,
      /(?:there was|had|caught).*(?:a\s)?fire/,
      /(?:fire|smoke|burned|burning).*(?:in|at|my)/,
    ],
    boost: 6,
    threshold: 5,
  },

  claim_status: {
    category: "claims",
    keywords: [
      ["claim", 4], ["status", 5], ["check", 3], ["where", 2],
      ["progress", 3], ["update", 3], ["track", 3],
      ["my claim", 4], ["claim number", 3], ["adjuster", 3],
      ["how long", 3], ["when will", 3], ["any update", 4],
    ],
    patterns: [
      /(?:check|what|where|how).*(?:is|about).*(?:my\s)?claim/,
      /(?:claim|case).*(?:status|progress|update|number)/,
      /(?:any|have|is there).*(?:update|news|progress).*(?:claim|case)/,
      /(?:when will|how long|how soon).*(?:claim|adjuster|payment|check|settlement)/,
      /(?:talk|speak|contact|reach).*(?:adjuster|claims?\s?rep)/,
    ],
    boost: 5,
    threshold: 6,
  },

  // ─── BILLING & PAYMENTS ─────────────────────────────────────
  make_payment: {
    category: "billing",
    keywords: [
      ["payment", 5], ["pay", 5], ["bill", 4], ["billing", 3],
      ["amount due", 4], ["due", 2], ["owe", 3], ["balance", 3],
      ["pay online", 4], ["make a payment", 5], ["pay my bill", 5],
      ["autopay", 3], ["auto pay", 3],
    ],
    patterns: [
      /(?:make|submit|send|process).*(?:a\s)?payment/,
      /(?:pay|paying).*(?:my|the|a).*(?:bill|premium|balance|policy)/,
      /(?:how|where|can i).*(?:pay|make payment)/,
      /(?:set up|start|enroll|enable).*(?:auto.?pay|automatic payment)/,
    ],
    boost: 5,
    threshold: 6,
  },

  billing_question: {
    category: "billing",
    keywords: [
      ["bill", 4], ["invoice", 4], ["charge", 4], ["charged", 5],
      ["premium", 4], ["went up", 4], ["increased", 3], ["too high", 3],
      ["go up", 4], ["why", 2], ["when", 2], ["due date", 4], ["payment history", 3],
      ["refund", 4], ["overcharged", 4], ["double charged", 5],
      ["missed payment", 4], ["late", 3], ["late fee", 4],
    ],
    patterns: [
      /(?:why|how come).*(?:bill|premium|rate|charge|price).*(?:go up|increase|change|higher|so high|so much)/,
      /(?:when|what).*(?:is|was).*(?:my|the).*(?:bill|payment|premium).*(?:due|date)/,
      /(?:i was|got|received).*(?:overcharged|double charged|wrong amount)/,
      /(?:missed|late|forgot|behind on).*(?:payment|bill)/,
      /(?:refund|money back|reimburse|credit)/,
    ],
    boost: 4,
    threshold: 5,
  },

  // ─── POLICY MANAGEMENT ──────────────────────────────────────
  policy_change: {
    category: "policy",
    keywords: [
      ["change", 4], ["update", 4], ["modify", 3], ["edit", 3],
      ["policy", 3], ["coverage", 3], ["limits", 3], ["deductible", 3],
      ["increase", 2], ["decrease", 2], ["raise", 2], ["lower", 2],
      ["switch", 2], ["adjust", 3],
    ],
    patterns: [
      /(?:change|update|modify|adjust|raise|lower|increase|decrease).*(?:my|the).*(?:coverage|limits|deductible|policy|protection)/,
      /(?:want|need|can i).*(?:more|less|higher|lower|different).*(?:coverage|limits|deductible|protection)/,
    ],
    boost: 4,
    threshold: 5,
  },

  add_vehicle: {
    category: "policy",
    keywords: [
      ["add", 5], ["new", 3], ["vehicle", 4], ["car", 4],
      ["truck", 4], ["suv", 3], ["another", 3],
      ["policy", 2], ["bought", 4], ["purchased", 4], ["just got", 3],
      ["leased", 3], ["financed", 3],
    ],
    patterns: [
      /(?:add|put|include).*(?:new|another|a|my).*(?:vehicle|car|truck|suv|auto)/,
      /(?:just|recently).*(?:bought|purchased|got|leased|financed).*(?:new|a|another)?\s*(?:car|vehicle|truck|suv|auto)/,
      /(?:new|another).*(?:vehicle|car).*(?:to|on).*(?:my|the).*(?:policy|insurance)/,
      /(?:bought|purchased|got|leased).*(?:new|a).*(?:car|truck|suv|vehicle|auto)/,
    ],
    boost: 6,
    threshold: 5,
  },

  remove_vehicle: {
    category: "policy",
    keywords: [
      ["remove", 5], ["take off", 4], ["delete", 3],
      ["vehicle", 4], ["car", 4], ["sold", 3], ["traded", 3],
    ],
    patterns: [
      /(?:remove|take off|delete|drop).*(?:a|my|the).*(?:vehicle|car|truck)/,
      /(?:sold|traded|got rid of|totaled|no longer have).*(?:my|the|a).*(?:car|vehicle)/,
    ],
    boost: 5,
    threshold: 6,
  },

  add_driver: {
    category: "policy",
    keywords: [
      ["add", 5], ["driver", 4], ["operator", 4], ["person", 2],
      ["new", 2], ["another", 3], ["teenager", 3], ["teen", 3],
      ["spouse", 3], ["child", 2], ["kid", 2], ["son", 2], ["daughter", 2],
    ],
    patterns: [
      /(?:add|put|include).*(?:new|another|a|my).*(?:driver|operator|person)/,
      /(?:my|our).*(?:teen|teenager|kid|child|son|daughter|spouse|husband|wife).*(?:license|driving|needs?|drive|car)/,
      /(?:got|received|just got|just received).*(?:license|permit)/,
    ],
    boost: 5,
    threshold: 6,
  },

  remove_driver: {
    category: "policy",
    keywords: [
      ["remove", 5], ["take off", 4], ["delete", 3],
      ["driver", 4], ["operator", 4], ["person", 2],
      ["no longer", 3], ["moved out", 3], ["ex", 2],
    ],
    patterns: [
      /(?:remove|take off|delete|drop).*(?:a|my|the).*(?:driver|operator|person)/,
      /(?:no longer|does not|doesn't).*(?:drive|live|need)/,
    ],
    boost: 5,
    threshold: 6,
  },

  address_change: {
    category: "policy",
    keywords: [
      ["address", 5], ["move", 4], ["moved", 4], ["moving", 4],
      ["relocate", 3], ["new address", 5], ["change", 3], ["update", 3],
      ["new home", 3], ["different state", 3], ["zip", 2],
    ],
    patterns: [
      /(?:change|update).*(?:my|the).*(?:address|location|zip)/,
      /(?:i|we|i am|we are).*(?:moved|moving|relocated|relocating)/,
      /(?:new|different).*(?:address|home|apartment|location)/,
    ],
    boost: 5,
    threshold: 5,
  },

  cancel_policy: {
    category: "policy",
    keywords: [
      ["cancel", 5], ["cancellation", 5], ["terminate", 4],
      ["end", 2], ["stop", 3], ["policy", 3], ["insurance", 2],
      ["discontinue", 3], ["drop", 3],
    ],
    patterns: [
      /(?:cancel|terminate|end|stop|discontinue|drop).*(?:my|the|a).*(?:policy|insurance|coverage)/,
      /(?:i want|i need|how do i|can i).*(?:cancel|terminate|end|stop)/,
      /(?:do not|don't).*(?:want|need).*(?:insurance|policy|coverage).*(?:anymore|any more|any longer)/,
    ],
    boost: 5,
    threshold: 6,
  },

  // ─── DOCUMENTS ──────────────────────────────────────────────
  get_id_card: {
    category: "documents",
    keywords: [
      ["id card", 6], ["insurance card", 6], ["proof", 4],
      ["proof of insurance", 6], ["verification", 3],
      ["download", 3], ["print", 3], ["email", 2],
      ["card", 4], ["id", 3],
    ],
    patterns: [
      /(?:get|need|want|where|how|can i).*(?:insurance|id|proof).*(?:card|proof|verification)/,
      /(?:download|print|email|send).*(?:my|the|an?).*(?:id card|insurance card|proof|card)/,
      /(?:proof of).*(?:insurance|coverage|liability)/,
      /(?:my|the|an?).*(?:insurance|id).*card/,
    ],
    boost: 6,
    threshold: 5,
  },

  get_documents: {
    category: "documents",
    keywords: [
      ["document", 4], ["declaration", 4], ["dec page", 5],
      ["declarations page", 5], ["certificate", 3], ["paperwork", 3],
      ["policy document", 4], ["binder", 3], ["download", 3],
    ],
    patterns: [
      /(?:get|need|want|download|view|see).*(?:my|the|a).*(?:document|declaration|dec page|certificate|binder|paperwork)/,
      /(?:where|how).*(?:find|get|see|download).*(?:my|the).*(?:policy|document|declaration|paperwork)/,
    ],
    boost: 4,
    threshold: 5,
  },

  // ─── COVERAGE QUESTIONS ─────────────────────────────────────
  coverage_question: {
    category: "education",
    keywords: [
      ["what is", 3], ["what are", 3], ["explain", 3], ["tell me about", 3],
      ["coverage", 3], ["mean", 2], ["does my policy", 3],
      ["covered", 4], ["cover", 3], ["am i covered", 5],
      ["does insurance", 3], ["will insurance", 3],
      ["comprehensive", 2], ["collision", 2], ["liability", 2],
      ["pip", 2], ["uninsured", 2], ["underinsured", 2],
      ["bodily injury", 2], ["property damage", 2],
      ["replacement cost", 3], ["actual cash value", 3],
      ["deductible", 2], ["endorsement", 2], ["rider", 2],
    ],
    patterns: [
      /(?:what is|what are|what does|explain|tell me about|define|describe).*(?:coverage|comprehensive|collision|liability|pip|deductible|premium|endorsement|rider|umbrella)/,
      /(?:am i|is my|does my|will my|would my).*(?:covered|protected|insured|policy cover)/,
      /(?:does|will|would).*(?:insurance|policy|coverage).*(?:cover|pay for|protect|include)/,
      /(?:what|how much).*(?:does|would).*(?:my|the).*(?:deductible|premium|coverage)/,
      /(?:difference between|vs|versus).*(?:comprehensive|collision|liability|full coverage|replacement|actual cash)/,
    ],
    boost: 4,
    threshold: 5,
  },

  // ─── DISCOUNTS ──────────────────────────────────────────────
  discount_question: {
    category: "education",
    keywords: [
      ["discount", 5], ["save", 4], ["savings", 3], ["cheaper", 4],
      ["lower", 4], ["reduce", 3], ["bundle", 2], ["multi", 2],
      ["safe driver", 4], ["good student", 4], ["military", 3],
      ["paperless", 3], ["autopay", 2], ["anti-theft", 3],
      ["defensive driving", 4], ["low mileage", 3],
      ["rate", 2], ["premium", 2],
    ],
    patterns: [
      /(?:what|any|are there|do you have|how can i).*(?:discount|savings|way to save|lower my|reduce my)/,
      /(?:how|can i).*(?:save|lower|reduce|get.*cheaper|get.*discount)/,
      /(?:qualify|eligible).*(?:discount|savings|lower rate)/,
      /(?:lower|reduce|decrease|bring down).*(?:my|the).*(?:rate|premium|bill|cost|price)/,
      /(?:too expensive|too much|paying too much|can not afford)/,
    ],
    boost: 5,
    threshold: 5,
  },

  // ─── NAVIGATION & ACCOUNT ───────────────────────────────────
  navigate_dashboard: {
    category: "navigation",
    keywords: [
      ["dashboard", 5], ["my account", 5], ["account", 4],
      ["log in", 5], ["login", 5], ["sign in", 5], ["log", 3],
      ["portal", 3], ["manage", 2], ["into", 1],
    ],
    patterns: [
      /(?:go to|take me to|open|access|where is).*(?:my|the).*(?:dashboard|account|portal)/,
      /(?:log|sign).*(?:in|into).*(?:my|the)?.*(?:account|dashboard|portal)?/,
      /(?:how do i|where do i|can i).*(?:log in|sign in|login|access|manage)/,
    ],
    boost: 5,
    threshold: 5,
  },

  talk_to_agent: {
    category: "support",
    keywords: [
      ["agent", 5], ["representative", 4], ["human", 4], ["person", 3],
      ["talk to", 4], ["speak to", 4], ["speak with", 4],
      ["call", 3], ["phone", 3], ["contact", 3],
      ["real person", 5], ["live", 3], ["transfer", 3],
    ],
    patterns: [
      /(?:talk|speak|chat|connect).*(?:to|with).*(?:agent|representative|rep|human|person|someone|somebody)/,
      /(?:real|live|actual).*(?:person|agent|human|representative)/,
      /(?:can i|i want to|i need to|let me|please).*(?:talk|speak|call|contact|reach)/,
      /(?:transfer|escalate|connect me)/,
    ],
    boost: 5,
    threshold: 5,
  },

  // ─── GREETINGS & SMALL TALK ─────────────────────────────────
  greeting: {
    category: "social",
    keywords: [
      ["hello", 6], ["hi", 6], ["hey", 6], ["howdy", 5],
      ["good morning", 6], ["good afternoon", 6], ["good evening", 6],
      ["sup", 4], ["yo", 4], ["what up", 4], ["greetings", 5],
    ],
    patterns: [
      /^(?:hi|hey|hello|howdy|yo|sup|greetings|good\s(?:morning|afternoon|evening|day))(?:\s|!|,|\.)?$/,
      /^(?:hi|hey|hello|howdy|yo|sup|greetings|good\s(?:morning|afternoon|evening|day))(?:\s|!|,)/,
    ],
    boost: 6,
    threshold: 4,
  },

  thanks: {
    category: "social",
    keywords: [
      ["thank", 5], ["thanks", 5], ["appreciate", 4], ["helpful", 3],
      ["great", 2], ["awesome", 2], ["perfect", 2],
    ],
    patterns: [
      /^(?:thanks?|thank you|thx|ty|appreciate it|much appreciated)/,
    ],
    boost: 5,
    threshold: 4,
  },

  goodbye: {
    category: "social",
    keywords: [
      ["bye", 5], ["goodbye", 5], ["see you", 4], ["later", 3],
      ["take care", 4], ["have a good", 3], ["done", 2], ["that is all", 4],
    ],
    patterns: [
      /^(?:bye|goodbye|see you|later|take care|have a good|that is all|all done|i am done|no more questions)/,
    ],
    boost: 5,
    threshold: 4,
  },

  // ─── HELP / GENERAL ─────────────────────────────────────────
  general_help: {
    category: "support",
    keywords: [
      ["help", 4], ["assist", 3], ["support", 3], ["guide", 3],
      ["how do i", 3], ["what can you", 3], ["options", 2],
      ["confused", 3], ["not sure", 3], ["do not know", 3],
    ],
    patterns: [
      /^(?:help|i need help|can you help|help me)/,
      /(?:what can you|how can you|what do you).*(?:do|help|assist)/,
      /(?:i am|i'm).*(?:confused|lost|not sure|unsure|new)/,
      /(?:how does|how do).*(?:this|it|the|your).*(?:work|site|website|process)/,
    ],
    boost: 3,
    threshold: 4,
  },
};


// ════════════════════════════════════════════════════════════════
// 7. INTENT SCORING ENGINE
// ════════════════════════════════════════════════════════════════

function scoreIntents(normalizedText, tokens, expandedTokens, entities) {
  const scores = [];

  for (const [intentName, intent] of Object.entries(INTENTS)) {
    let score = 0;
    let matchedKeywords = [];

    // Keyword scoring against expanded token set
    for (const [keyword, weight] of intent.keywords) {
      if (keyword.includes(" ")) {
        // Multi-word keyword — check bigrams/trigrams or raw text
        if (
          tokens.bigrams.some(b => b.includes(keyword)) ||
          tokens.trigrams.some(t => t.includes(keyword)) ||
          normalizedText.includes(keyword)
        ) {
          score += weight;
          matchedKeywords.push(keyword);
        }
      } else {
        if (expandedTokens.has(keyword)) {
          score += weight;
          matchedKeywords.push(keyword);
        }
      }
    }

    // Pattern matching bonus
    let patternMatched = false;
    if (intent.patterns) {
      for (const pattern of intent.patterns) {
        if (pattern.test(normalizedText)) {
          patternMatched = true;
          break;
        }
      }
    }
    if (patternMatched) {
      score += intent.boost || 3;
    }

    // Entity affinity bonus
    if (entities.insuranceType) {
      if (intentName.includes(entities.insuranceType) || intentName.includes("generic")) {
        score += 2;
      }
    }

    if (score >= (intent.threshold || 5)) {
      scores.push({
        intent: intentName,
        score,
        category: intent.category,
        matchedKeywords,
        patternMatched,
        confidence: Math.min(score / 20, 1.0), // normalize to 0-1
      });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  return scores;
}


// ════════════════════════════════════════════════════════════════
// 8. MULTI-INTENT RESOLVER
// ════════════════════════════════════════════════════════════════

function resolveIntents(scoredIntents, maxIntents = 3) {
  if (scoredIntents.length === 0) return [{ intent: "fallback", confidence: 0, category: "support" }];

  const resolved = [];
  const seenCategories = new Set();

  for (const intent of scoredIntents) {
    if (resolved.length >= maxIntents) break;

    // For the top intent, always include it
    if (resolved.length === 0) {
      resolved.push(intent);
      seenCategories.add(intent.category);
      continue;
    }

    // For secondary intents:
    // Only include if score is at least 60% of the top score
    // and it's a different category (avoid near-duplicates)
    const topScore = resolved[0].score;
    if (intent.score >= topScore * 0.6) {
      // Allow same category only if significantly different intent
      if (!seenCategories.has(intent.category) || intent.score >= topScore * 0.85) {
        resolved.push(intent);
        seenCategories.add(intent.category);
      }
    }
  }

  return resolved;
}


// ════════════════════════════════════════════════════════════════
// 9. MAIN PIPELINE — processMessage()
// ════════════════════════════════════════════════════════════════

function processMessage(rawMessage) {
  // Step 1: Normalize
  const normalized = normalize(rawMessage);

  // Step 2: Spell correct
  const corrected = spellCorrect(normalized);

  // Step 3: Tokenize
  const tokens = tokenize(corrected);

  // Step 4: Expand synonyms
  const expandedTokens = expandSynonyms(tokens);

  // Step 5: Extract entities
  const entities = extractEntities(rawMessage);

  // Step 6: Score all intents
  const scoredIntents = scoreIntents(corrected, tokens, expandedTokens, entities);

  // Step 7: Resolve multi-intent
  const resolvedIntents = resolveIntents(scoredIntents);

  return {
    original: rawMessage,
    normalized,
    corrected,
    tokens: {
      unigrams: tokens.unigrams,
      bigrams: tokens.bigrams,
      trigrams: tokens.trigrams,
      expanded: [...expandedTokens],
    },
    entities,
    intents: resolvedIntents,
    allScored: scoredIntents,
    primaryIntent: resolvedIntents[0]?.intent || "fallback",
    confidence: resolvedIntents[0]?.confidence || 0,
    isMultiIntent: resolvedIntents.length > 1,
    timestamp: Date.now(),
  };
}


// ════════════════════════════════════════════════════════════════
// 10. EXPORTS
// ════════════════════════════════════════════════════════════════

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    processMessage,
    normalize,
    spellCorrect,
    tokenize,
    expandSynonyms,
    extractEntities,
    scoreIntents,
    resolveIntents,
    INTENTS,
    SYNONYM_MAP,
    INSURANCE_DICTIONARY,
  };
}

// Browser global
if (typeof window !== "undefined") {
  window.CMC_NLU = {
    processMessage,
    normalize,
    spellCorrect,
    tokenize,
    expandSynonyms,
    extractEntities,
    scoreIntents,
    resolveIntents,
    INTENTS,
    SYNONYM_MAP,
  };
}
