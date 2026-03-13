/**
 * ChooseMyCoverage — NLU Engine Test Suite
 * ==========================================
 * 80+ test cases across every intent category.
 */

const { chat, analyze } = require("./chatbot");

let pass = 0, fail = 0, total = 0;

function test(description, message, expectedIntent, opts = {}) {
  total++;
  const result = analyze(message);
  const actual = result.primaryIntent;
  const ok = Array.isArray(expectedIntent)
    ? expectedIntent.includes(actual)
    : actual === expectedIntent;

  // Optional entity check
  let entityOk = true;
  if (opts.entity) {
    for (const [key, val] of Object.entries(opts.entity)) {
      if (result.entities[key] !== val) {
        entityOk = false;
      }
    }
  }

  // Optional multi-intent check
  let multiOk = true;
  if (opts.secondaryIntent) {
    const secondary = result.intents[1]?.intent;
    multiOk = secondary === opts.secondaryIntent;
  }

  if (ok && entityOk && multiOk) {
    pass++;
    console.log(`  ✅ ${description}`);
  } else {
    fail++;
    console.log(`  ❌ ${description}`);
    console.log(`     Input:    "${message}"`);
    console.log(`     Expected: ${JSON.stringify(expectedIntent)}`);
    console.log(`     Got:      ${actual} (confidence: ${result.confidence.toFixed(2)})`);
    if (!entityOk) console.log(`     Entities: ${JSON.stringify(result.entities)}`);
    if (!multiOk) console.log(`     Secondary: ${result.intents[1]?.intent || "none"} (expected: ${opts.secondaryIntent})`);
    if (result.allScored.length > 0) {
      console.log(`     Top 3:    ${result.allScored.slice(0, 3).map(s => `${s.intent}(${s.score})`).join(", ")}`);
    }
  }
}

// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  QUOTE FUNNEL TESTS");
console.log("══════════════════════════════════════════════\n");

test("Direct auto quote request",
  "I want to get an auto insurance quote", "get_auto_quote");

test("Car quote with misspelling",
  "I need car insurence", ["get_auto_quote", "get_generic_quote"]);

test("How much for car insurance",
  "How much does car insurance cost?", "get_auto_quote");

test("Vehicle rate comparison",
  "I want to compare vehicle insurance rates", ["get_auto_quote", "get_generic_quote"]);

test("Home quote request",
  "I need a homeowners insurance quote", "get_home_quote");

test("House coverage question leading to quote",
  "How much is home insurance?", "get_home_quote");

test("Renters quote",
  "I need renters insurance for my apartment", "get_renters_quote");

test("Tenant insurance",
  "Can I get a quote for tenant insurance?", "get_renters_quote");

test("Bundle quote",
  "I want to bundle my auto and home insurance", "get_bundle_quote");

test("Multi-policy discount",
  "Do you have a multi-policy discount?", ["get_bundle_quote", "discount_question"]);

test("Generic quote — no type specified",
  "I want to get a quote", "get_generic_quote");

test("Get started",
  "How do I get started?", ["get_generic_quote", "general_help"]);

test("Compare rates",
  "I want to shop and compare rates", "get_generic_quote");

test("Quote with zip entity",
  "Get me a quote for 84074", "get_generic_quote", { entity: { zip: "84074" } });


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  CLAIMS TESTS");
console.log("══════════════════════════════════════════════\n");

test("Direct file claim",
  "I need to file a claim", "file_claim");

test("Car accident",
  "I was in a car accident", "file_claim");

test("Wreck synonym",
  "I got in a wreck on the highway", "file_claim");

test("Fender bender",
  "I had a fender bender in the parking lot", "file_claim");

test("Rear-ended",
  "Someone rear-ended me at a stoplight", "file_claim");

test("Theft",
  "My car was stolen", "file_claim");

test("Break in / home",
  "Someone broke into my house", "file_claim");

test("Hail damage",
  "My car has hail damage from the storm", "file_claim");

test("Burst pipe",
  "A pipe burst in my basement and flooded everything", "file_claim");

test("Fire damage",
  "There was a fire in my kitchen", "file_claim");

test("Hit and run",
  "I was involved in a hit and run", "file_claim");

test("Claim status check",
  "What's the status of my claim?", "claim_status");

test("Adjuster question",
  "How do I reach my claims adjuster?", "claim_status");

test("How long claim takes",
  "How long will my claim take?", "claim_status");


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  BILLING & PAYMENT TESTS");
console.log("══════════════════════════════════════════════\n");

test("Make a payment",
  "I want to make a payment", "make_payment");

test("Pay my bill",
  "How do I pay my bill?", "make_payment");

test("Auto pay setup",
  "Can I set up autopay?", "make_payment");

test("Why rate increased",
  "Why did my premium go up?", "billing_question");

test("Due date question",
  "When is my bill due?", "billing_question");

test("Overcharged",
  "I was overcharged on my last bill", "billing_question");

test("Refund request",
  "I need a refund", "billing_question");


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  POLICY MANAGEMENT TESTS");
console.log("══════════════════════════════════════════════\n");

test("Add vehicle",
  "I need to add a new car to my policy", "add_vehicle");

test("Just bought a car",
  "I just bought a new truck", "add_vehicle");

test("Remove vehicle",
  "I sold my car and need to remove it", "remove_vehicle");

test("Add driver",
  "I need to add my teenager to my policy", "add_driver");

test("Teen got license",
  "My son just got his license", "add_driver");

test("Remove driver",
  "I need to remove a driver from my policy", "remove_driver");

test("Address change",
  "I moved to a new address", "address_change");

test("Change coverage",
  "I want to increase my liability limits", "policy_change");

test("Lower deductible",
  "Can I lower my deductible?", "policy_change");

test("Cancel policy",
  "I want to cancel my insurance", "cancel_policy");


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  DOCUMENT TESTS");
console.log("══════════════════════════════════════════════\n");

test("ID card request",
  "I need my insurance ID card", "get_id_card");

test("Proof of insurance",
  "How do I get proof of insurance?", "get_id_card");

test("Dec page",
  "Can I get my declarations page?", "get_documents");

test("Download documents",
  "Where do I download my policy documents?", "get_documents");


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  COVERAGE & EDUCATION TESTS");
console.log("══════════════════════════════════════════════\n");

test("What is comprehensive",
  "What is comprehensive coverage?", "coverage_question");

test("Am I covered",
  "Am I covered if someone hits my parked car?", ["coverage_question", "file_claim"]);

test("Liability explanation",
  "Explain liability insurance to me", "coverage_question");

test("Deductible question",
  "What does my deductible mean?", "coverage_question");

test("Discount question",
  "What discounts do you offer?", "discount_question");

test("How to save",
  "How can I lower my rate?", "discount_question");


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  NAVIGATION & SUPPORT TESTS");
console.log("══════════════════════════════════════════════\n");

test("Go to dashboard",
  "Take me to my dashboard", "navigate_dashboard");

test("Log in",
  "How do I log into my account?", "navigate_dashboard");

test("Talk to human",
  "I want to talk to a real person", "talk_to_agent");

test("Speak to someone",
  "Can I speak with an agent?", "talk_to_agent");

test("General help",
  "I need help", "general_help");

test("What can you do",
  "What can you help me with?", "general_help");


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  SOCIAL / GREETING TESTS");
console.log("══════════════════════════════════════════════\n");

test("Hello",
  "Hello", "greeting");

test("Hey there",
  "Hey there!", "greeting");

test("Good morning",
  "Good morning", "greeting");

test("Thanks",
  "Thank you so much!", "thanks");

test("Goodbye",
  "Bye, thanks for your help!", ["goodbye", "thanks"]);


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  MISSPELLING TESTS");
console.log("══════════════════════════════════════════════\n");

test("Misspelled insurance",
  "I need car insurence", ["get_auto_quote", "get_generic_quote"]);

test("Misspelled deductible",
  "What is my deductable?", "coverage_question");

test("Misspelled vehicle",
  "I need to add a vehical", "add_vehicle");

test("Misspelled comprehensive",
  "What is comprhensive coverage", "coverage_question");

test("Misspelled accident",
  "I had an accidnt", "file_claim");


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  SYNONYM TESTS");
console.log("══════════════════════════════════════════════\n");

test("Wreck → accident",
  "I got in a wreck", "file_claim");

test("Crash → accident",
  "There was a crash on I-15", "file_claim");

test("Stolen → theft",
  "Somebody stole my car", "file_claim");

test("Rate → quote",
  "What are your rates?", "get_generic_quote");

test("Ride → vehicle",
  "I need insurance for my ride", ["get_auto_quote", "get_generic_quote"]);


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  MULTI-INTENT TESTS");
console.log("══════════════════════════════════════════════\n");

test("Quote + discount (multi-intent)",
  "I want an auto quote and what discounts do you have?", "get_auto_quote");

test("Claim + status",
  "I need to file a claim, also where is my other claim at?", "file_claim");

test("Payment + billing question",
  "I want to pay my bill, also why did it go up?", "make_payment");


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  ENTITY EXTRACTION TESTS");
console.log("══════════════════════════════════════════════\n");

test("Extracts zip code",
  "I live in 84074 and need a quote", "get_generic_quote", { entity: { zip: "84074" } });

test("Extracts policy number",
  "My policy number is CMC-2026-12345", "fallback", { entity: { policyNumber: "CMC-2026-12345" } });

test("Extracts dollar amount",
  "I was charged $247 on my bill", "billing_question", { entity: { amount: "247" } });


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  EDGE CASE TESTS");
console.log("══════════════════════════════════════════════\n");

test("Empty message",
  "", "fallback");

test("Random gibberish",
  "asdfghjkl qwerty", "fallback");

test("Single word — help",
  "help", "general_help");

test("Single word — quote",
  "quote", "get_generic_quote");

test("Single word — claim",
  "claim", ["file_claim", "claim_status"]);

test("Very long message",
  "I was driving my car on the highway and someone rear ended me at a stoplight and now my bumper is damaged and I need to file a claim and also I want to know how long it will take to get my car fixed and also can I get a rental car while mine is being repaired",
  "file_claim");


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log("  RESPONSE INTEGRATION TESTS");
console.log("══════════════════════════════════════════════\n");

const chatResult = chat("I want to get an auto insurance quote");
total++;
if (chatResult.message && chatResult.message.length > 20 && chatResult.actions.length > 0) {
  pass++;
  console.log("  ✅ chat() returns message + actions for auto quote");
} else {
  fail++;
  console.log("  ❌ chat() response incomplete");
  console.log(`     Message: ${chatResult.message?.substring(0, 60)}...`);
  console.log(`     Actions: ${chatResult.actions?.length}`);
}

const chatResult2 = chat("I was in a wreck and also need to pay my bill");
total++;
if (chatResult2.message && chatResult2.isMultiIntent) {
  pass++;
  console.log("  ✅ chat() handles multi-intent correctly");
} else {
  fail++;
  console.log("  ❌ chat() multi-intent failed");
}


// ══════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════");
console.log(`  RESULTS: ${pass}/${total} passed (${fail} failed)`);
console.log(`  Pass rate: ${((pass / total) * 100).toFixed(1)}%`);
console.log("══════════════════════════════════════════════\n");

process.exit(fail > 0 ? 1 : 0);
