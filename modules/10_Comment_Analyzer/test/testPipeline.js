require('dotenv').config();
const { processComment } = require('../src/hustleBot');
const { classifyComment } = require('../src/nlpPipeline');

const mockInstagramComments = [
  {
    id: "ic_001",
    user: "alex_tech",
    text: "Can I get pricing for the enterprise tier? Need this for a team of 10! 🔥",
  },
  {
    id: "ic_002",
    user: "crypto_spammer_99",
    text: "DM me on WhatsApp +12345678 to double your crypto investments now! 💰",
  },
  {
    id: "ic_003",
    user: "sad_user",
    text: "The login button is completely broken on the iOS app update. Please fix asap 😡👎",
  },
  {
    id: "ic_004",
    user: "fan_girl",
    text: "This new update looks so clean and awesome!! Loving the UI design ❤️😍👏",
  },
  {
    id: "ic_005",
    user: "agency_owner",
    text: "We run a marketing agency with 50+ clients and would love to partner with you guys. Who can I talk to?",
  },
  {
    id: "ic_006",
    user: "bot_account",
    text: "Promoted on @top_influencer_page send pic on inbox",
  }
];

async function runTestPipeline() {
  console.log("=================================================");
  console.log("   TESTING INSTAGRAM COMMENT PROCESSING PIPELINE  ");
  console.log("=================================================\n");

  for (const item of mockInstagramComments) {
    console.log(`-------------------------------------------------`);
    console.log(`[Input Comment] (@${item.user}): "${item.text}"`);

    // Step 1: Pre-processing (Spam & Emoji filter)
    const preprocessed = processComment(item.text);
    if (preprocessed.isSpam) {
      console.log(`[Hustle Bot] 🚨 SPAM BLOCKED -> Reason: ${preprocessed.spamReason}`);
      continue;
    }

    console.log(`[Hustle Bot] Filter Passed -> Processed Text: "${preprocessed.processedText}"`);

    // Step 2: NLP Classification
    const classification = await classifyComment(preprocessed.processedText);
    console.log(`[NLP Classification Result]:`);
    console.log(`  - Category:    ${classification.category}`);
    console.log(`  - SubCategory: ${classification.subCategory || 'N/A'}`);
    console.log(`  - Sentiment:   ${classification.sentiment || 'N/A'}`);
    console.log(`  - Actionable:  ${classification.actionable}`);
    console.log(`  - Summary:     ${classification.summary || 'N/A'}`);
  }

  console.log(`-------------------------------------------------`);
  console.log("\nPipeline Batch Test Completed Successfully!");
}

runTestPipeline();
