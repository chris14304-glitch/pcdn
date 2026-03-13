/**
 * ChooseMyCoverage — Response Handler
 * =====================================
 * Maps resolved intents to contextual responses.
 * Handles multi-intent composition, follow-ups, and action buttons.
 */

// ════════════════════════════════════════════════════════════════
// RESPONSE TEMPLATES
// ════════════════════════════════════════════════════════════════

const RESPONSES = {

  // ─── QUOTE FUNNEL ───────────────────────────────────────────
  get_auto_quote: {
    responses: [
      "I'd love to help you get an auto insurance quote! We compare rates from top carriers to find you the best price.",
      "Let's get you a great auto rate! We'll walk you through a quick wizard — it only takes a few minutes.",
      "Absolutely — getting an auto quote is easy. I'll guide you through our quote wizard to compare rates from multiple carriers.",
    ],
    followUp: "Ready to get started? Just click the button below and enter your zip code!",
    actions: [{ label: "Get Auto Quote →", type: "quote", flow: "auto" }],
    quickReplies: ["What do I need?", "How long does it take?", "Is it really free?"],
  },

  get_home_quote: {
    responses: [
      "I'd be happy to help you get a homeowners insurance quote! We'll find you the best coverage at the right price.",
      "Let's protect your home! Our quote wizard compares rates from top carriers to save you money.",
      "Great — home insurance is important. Let me help you compare rates from our carrier partners.",
    ],
    followUp: "Click below to start your home insurance quote!",
    actions: [{ label: "Get Home Quote →", type: "quote", flow: "home" }],
    quickReplies: ["What coverage do I need?", "How much does it cost?", "What's covered?"],
  },

  get_renters_quote: {
    responses: [
      "Renters insurance is a smart move — and it's more affordable than most people think! Let's get you a quote.",
      "I can help with a renters quote! Most renters policies start under $20/month and protect your belongings, plus provide liability coverage.",
      "Absolutely! Renters insurance covers your personal property, liability, and even temporary housing if something happens to your place.",
    ],
    followUp: "Ready to see your rates? Start your quote below!",
    actions: [{ label: "Get Renters Quote →", type: "quote", flow: "renters" }],
    quickReplies: ["What does it cover?", "How much is it?", "Do I really need it?"],
  },

  get_bundle_quote: {
    responses: [
      "Bundling is the best way to save! Combining your auto with home or renters insurance can save you up to 25%.",
      "Great idea — bundling policies is one of the biggest discounts we offer. Let's see how much you can save!",
      "Bundle and save! Our multi-policy discount can significantly lower your overall premium.",
    ],
    followUp: "Click below to start your bundle quote and see your savings!",
    actions: [{ label: "Get Bundle Quote →", type: "quote", flow: "bundle" }],
    quickReplies: ["How much can I save?", "What can I bundle?", "Any other discounts?"],
  },

  get_generic_quote: {
    responses: [
      "I'd be happy to help you get a quote! We offer auto, home, renters, and bundle insurance. Which type are you looking for?",
      "Let's find you the right coverage! What type of insurance are you interested in?",
      "Great — getting a quote is quick and free. What kind of insurance do you need?",
    ],
    quickReplies: ["Auto Insurance", "Home Insurance", "Renters Insurance", "Bundle & Save"],
  },

  // ─── CLAIMS ─────────────────────────────────────────────────
  file_claim: {
    responses: [
      "I'm sorry to hear about your situation. Let's get your claim filed right away. You can file directly from your dashboard or I can guide you through the process.",
      "I hope everyone is okay. Filing a claim is straightforward — you'll need your policy number, incident details, and any photos or documentation you have.",
      "Let's get this taken care of. You can file your claim online through your dashboard, and our claims team will be assigned within 24 hours.",
    ],
    followUp: "If you're logged in, head to Claims → File Claim in your dashboard. You can also call us at (801) 555-1234 for immediate assistance.",
    actions: [
      { label: "File Claim in Dashboard", type: "navigate", path: "/dashboard" },
      { label: "Call Claims: (801) 555-1234", type: "phone", number: "8015551234" },
    ],
    quickReplies: ["What do I need to file?", "How long does it take?", "Talk to someone"],
  },

  claim_status: {
    responses: [
      "You can check your claim status anytime in your dashboard under Claims → Claims Status. It shows your timeline, adjuster info, and next steps.",
      "Your claim status and timeline are available in the Claims section of your dashboard. You'll see every update from filing through settlement.",
      "To check your claim, log into your dashboard and go to Claims Status. If you need direct help, your adjuster's contact info is listed there too.",
    ],
    followUp: "Would you like to go to your dashboard to check?",
    actions: [{ label: "Go to Dashboard →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["Talk to my adjuster", "How long does it take?", "File a new claim"],
  },

  // ─── BILLING & PAYMENTS ─────────────────────────────────────
  make_payment: {
    responses: [
      "You can make a payment right from your dashboard under Billing → Payments. We accept credit/debit cards, ACH bank transfers, and you can also set up auto-pay.",
      "Paying your bill is easy — head to the Payments section in your dashboard. You can make a one-time payment or enroll in auto-pay to never miss one.",
      "You have several payment options: pay online in your dashboard, set up automatic payments, or pay by phone at (801) 555-1234.",
    ],
    actions: [{ label: "Make Payment →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["Set up auto-pay", "When is my bill due?", "Payment methods"],
  },

  billing_question: {
    responses: [
      "I can help with your billing question! Your payment history, upcoming bills, and invoice details are all available in your dashboard under Billing.",
      "Billing details including due dates, payment history, and invoices are available in your dashboard. If you see an unexpected charge, our support team can review it.",
    ],
    followUp: "What specifically would you like help with — your due date, a charge, or something else?",
    actions: [{ label: "View Billing →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["Why did my rate go up?", "When is my bill due?", "I was overcharged", "Set up auto-pay"],
  },

  // ─── POLICY MANAGEMENT ──────────────────────────────────────
  policy_change: {
    responses: [
      "You can request policy changes through your dashboard under Support → submit a service request, or I can help point you in the right direction.",
      "Policy changes like adjusting coverage, limits, or deductibles can be submitted through your dashboard. Most changes take effect within 24 hours.",
    ],
    followUp: "What would you like to change on your policy?",
    actions: [{ label: "Go to Dashboard →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["Change coverage limits", "Change deductible", "Add coverage", "Remove coverage"],
  },

  add_vehicle: {
    responses: [
      "Adding a vehicle to your policy is easy! You can submit a request through your dashboard under Support, or start a new quote if you'd like to compare rates.",
      "I can help with that! To add a vehicle, you'll need the VIN (optional), year, make, model, and how it's used. You can submit this through your dashboard.",
    ],
    followUp: "Head to your dashboard to submit an add-vehicle request, or would you like to get a fresh quote with the new vehicle included?",
    actions: [
      { label: "Go to Dashboard →", type: "navigate", path: "/dashboard" },
      { label: "Get New Quote →", type: "quote", flow: "auto" },
    ],
    quickReplies: ["Get a new quote", "What info do I need?", "Will it cost more?"],
  },

  remove_vehicle: {
    responses: [
      "To remove a vehicle from your policy, submit a service request through your dashboard. Your premium will be adjusted at the next billing cycle.",
      "I can help with removing a vehicle. Head to your dashboard and submit a policy change request under Support.",
    ],
    actions: [{ label: "Go to Dashboard →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["Will I get a refund?", "When does it take effect?", "I sold my car"],
  },

  add_driver: {
    responses: [
      "Adding a driver is straightforward! Submit a request through your dashboard — you'll need their name, age, gender, license info, and whether they're a driver or household member.",
      "I can help with that! New drivers can be added through a service request in your dashboard. Keep in mind that adding a young driver may affect your premium.",
    ],
    actions: [{ label: "Go to Dashboard →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["Will my rate change?", "What info is needed?", "Teen driver tips"],
  },

  remove_driver: {
    responses: [
      "To remove a driver from your policy, submit a service request through your dashboard. This may lower your premium depending on who's being removed.",
      "I can help with that. Submit a driver removal request in your dashboard under Support.",
    ],
    actions: [{ label: "Go to Dashboard →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["Will my rate go down?", "When does it take effect?"],
  },

  address_change: {
    responses: [
      "Moving? You can update your address through your dashboard under Support → submit a service request for 'Change Address'. Your rate may adjust based on the new location.",
      "You'll want to update your address as soon as possible — your rates and coverage can depend on where you live. Submit the change through your dashboard.",
    ],
    actions: [{ label: "Update Address →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["Will my rate change?", "Moving to a new state", "When should I update?"],
  },

  cancel_policy: {
    responses: [
      "I understand. Before canceling, keep in mind that a lapse in coverage can increase future rates. If cost is a concern, we may be able to adjust your coverage or find discounts.",
      "We'd hate to see you go. If you do need to cancel, you can submit a cancellation request through your dashboard. Would you like to explore other options first?",
    ],
    followUp: "Is there something specific prompting the cancellation? We might be able to help.",
    actions: [{ label: "Go to Dashboard →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["It's too expensive", "I found cheaper", "I'm moving", "Just exploring options"],
  },

  // ─── DOCUMENTS ──────────────────────────────────────────────
  get_id_card: {
    responses: [
      "You can download or view your insurance ID card anytime from your dashboard under Documents. It's available as a digital card you can save to your phone.",
      "Your proof of insurance / ID card is in your dashboard under Documents. You can download, print, or email it to yourself.",
    ],
    actions: [{ label: "Get ID Card →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["Download my card", "Email it to me", "I need it for the DMV"],
  },

  get_documents: {
    responses: [
      "All your policy documents, declarations pages, and certificates are available in your dashboard under Documents. You can download or print any of them.",
      "Your documents are in the Documents section of your dashboard. This includes your declarations page, policy details, and any endorsements.",
    ],
    actions: [{ label: "View Documents →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["Dec page", "Proof of insurance", "Policy details"],
  },

  // ─── COVERAGE QUESTIONS ─────────────────────────────────────
  coverage_question: {
    responses: [
      "Great question! I can help explain your coverage. We have detailed articles in our Help Center covering every type of coverage, or I can give you a quick overview right here.",
      "Insurance terms can be confusing — happy to explain! What specifically would you like to know about? I cover everything from liability to comprehensive to deductibles.",
    ],
    followUp: "What coverage would you like to learn about?",
    actions: [{ label: "Visit Help Center →", type: "navigate", path: "/help" }],
    quickReplies: ["What is comprehensive?", "What is liability?", "What is a deductible?", "What covers my car?"],
  },

  // ─── DISCOUNTS ──────────────────────────────────────────────
  discount_question: {
    responses: [
      "We offer several discounts! The most popular are: multi-policy bundle (up to 25% off), safe driver, auto-pay & paperless, anti-theft device, defensive driving course, and more.",
      "Great question — everyone loves saving money! Check your dashboard under Discounts to see which ones you already have and which ones you may qualify for.",
    ],
    followUp: "You can view all your current and eligible discounts in your dashboard.",
    actions: [{ label: "View Discounts →", type: "navigate", path: "/dashboard" }],
    quickReplies: ["Bundle discount", "Safe driver", "How do I qualify?", "Get a quote"],
  },

  // ─── NAVIGATION ─────────────────────────────────────────────
  navigate_dashboard: {
    responses: [
      "Your dashboard is where you can manage everything — policies, claims, billing, documents, and more. Click below to go there!",
      "Head to your dashboard to manage your account, make payments, view policies, and more.",
    ],
    actions: [{ label: "Go to Dashboard →", type: "navigate", path: "/dashboard" }],
  },

  talk_to_agent: {
    responses: [
      "I completely understand wanting to talk to a person. You can reach our team by phone at (801) 555-1234, or submit a support request through your dashboard and we'll get back to you within one business day.",
      "Of course! Our support team is available at (801) 555-1234 during business hours (Mon-Fri 8am-6pm MST). You can also send a message through your dashboard and we'll respond promptly.",
    ],
    actions: [
      { label: "Call (801) 555-1234", type: "phone", number: "8015551234" },
      { label: "Go to Dashboard →", type: "navigate", path: "/dashboard" },
    ],
    quickReplies: ["What are your hours?", "Email instead", "Submit a request"],
  },

  // ─── SOCIAL ─────────────────────────────────────────────────
  greeting: {
    responses: [
      "Hey there! Welcome to Choose My Coverage. I'm here to help with quotes, claims, billing, policy questions, and more. What can I do for you?",
      "Hi! Thanks for visiting. I can help you get a quote, manage your policy, file a claim, or answer any insurance questions. How can I help today?",
      "Hello! I'm your insurance assistant. Whether you need a quote, have a billing question, or need to file a claim, I've got you covered. What's on your mind?",
    ],
    quickReplies: ["Get a quote", "File a claim", "Make a payment", "Talk to someone"],
  },

  thanks: {
    responses: [
      "You're welcome! Is there anything else I can help you with?",
      "Happy to help! Let me know if you have any other questions.",
      "Glad I could help! Don't hesitate to ask if anything else comes up.",
    ],
    quickReplies: ["That's all, thanks!", "I have another question", "Get a quote"],
  },

  goodbye: {
    responses: [
      "Thanks for chatting! Have a great day, and don't hesitate to reach out anytime.",
      "Take care! We're here whenever you need us.",
      "Goodbye! If you think of anything else, we're just a click away.",
    ],
  },

  // ─── GENERAL HELP ───────────────────────────────────────────
  general_help: {
    responses: [
      "I'm here to help! Here's what I can assist with:\n\n• **Get a quote** — auto, home, renters, or bundle\n• **File a claim** — report an incident\n• **Make a payment** — pay your bill or set up auto-pay\n• **Policy changes** — add/remove vehicles, drivers, update address\n• **Documents** — ID cards, declarations pages\n• **Coverage questions** — what's covered, deductibles, discounts\n\nWhat would you like help with?",
    ],
    quickReplies: ["Get a quote", "File a claim", "Make a payment", "Policy change", "Talk to someone"],
  },

  // ─── FALLBACK ───────────────────────────────────────────────
  fallback: {
    responses: [
      "I'm not quite sure what you're looking for, but I'm happy to help! Could you rephrase that, or pick one of the options below?",
      "Hmm, I didn't catch that. I can help with quotes, claims, billing, policy changes, and coverage questions. What do you need?",
      "I want to make sure I help you with the right thing. Could you tell me more about what you're looking for?",
    ],
    quickReplies: ["Get a quote", "File a claim", "Make a payment", "Policy question", "Talk to someone"],
  },
};


// ════════════════════════════════════════════════════════════════
// RESPONSE BUILDER
// ════════════════════════════════════════════════════════════════

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildResponse(nluResult) {
  const { intents, entities, primaryIntent } = nluResult;
  const parts = [];

  // Build primary response
  const primaryDef = RESPONSES[primaryIntent] || RESPONSES.fallback;
  parts.push({
    intent: primaryIntent,
    message: pickRandom(primaryDef.responses),
    followUp: primaryDef.followUp || null,
    actions: primaryDef.actions || [],
    quickReplies: primaryDef.quickReplies || [],
    confidence: intents[0]?.confidence || 0,
  });

  // If multi-intent, add secondary response (abbreviated)
  if (intents.length > 1) {
    const secondaryIntent = intents[1].intent;
    const secondaryDef = RESPONSES[secondaryIntent] || null;
    if (secondaryDef && secondaryIntent !== primaryIntent) {
      parts.push({
        intent: secondaryIntent,
        message: pickRandom(secondaryDef.responses),
        followUp: null, // keep it brief
        actions: secondaryDef.actions || [],
        quickReplies: [], // only show quick replies for primary
        confidence: intents[1].confidence,
        isSecondary: true,
      });
    }
  }

  // Compose final response object
  const primary = parts[0];
  let fullMessage = primary.message;
  if (primary.followUp) fullMessage += "\n\n" + primary.followUp;

  if (parts.length > 1) {
    fullMessage += "\n\n---\n\nAlso, regarding your other question: " + parts[1].message;
  }

  // Merge actions from all parts
  const allActions = parts.flatMap(p => p.actions);
  // Deduplicate actions by label
  const seenLabels = new Set();
  const uniqueActions = allActions.filter(a => {
    if (seenLabels.has(a.label)) return false;
    seenLabels.add(a.label);
    return true;
  });

  return {
    message: fullMessage,
    actions: uniqueActions,
    quickReplies: primary.quickReplies,
    parts,
    entities,
    primaryIntent,
    isMultiIntent: parts.length > 1,
    confidence: primary.confidence,
    timestamp: Date.now(),
  };
}


// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildResponse, RESPONSES, pickRandom };
}

if (typeof window !== "undefined") {
  window.CMC_Responses = { buildResponse, RESPONSES };
}
