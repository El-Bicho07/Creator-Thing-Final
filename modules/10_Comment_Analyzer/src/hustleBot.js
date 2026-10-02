const emojiMap = require('unicode-emoji-json/data-by-emoji.json');

// List of regex patterns to catch common spam patterns
const SPAM_PATTERNS = [
  /\b(crypto|bitcoin|forex|whatsapp|dm me|check my bio|make money|investment|binary options)\b/i,
  /\b(promoted on|send pic on|inbox me|earn \$?\d+)\b/i,
  /\bhttps?:\/\/\S+/i, // URL links in comments are often promotional spam
  /(?:😍{4,}|🔥{4,}|👏{4,}|❤️{4,})/u, // Excessive repeated emoji spam
];

/**
 * Filter and preprocess comment text.
 * @param {string} text
 * @returns {{ isSpam: boolean, spamReason?: string, processedText: string }}
 */
function processComment(text) {
  if (!text) {
    return { isSpam: false, processedText: "" };
  }

  // 1. Spam Filtering
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isSpam: true,
        spamReason: `Matched spam pattern: ${pattern}`,
        processedText: text
      };
    }
  }

  // 2. Emoji Translation
  // Replace unicode emojis with text descriptions [emoji: description]
  let translatedText = text;

  // Use regex matching unicode emoji code points
  const emojiRegex = /(\p{Extended_Pictographic})/gu;
  translatedText = translatedText.replace(emojiRegex, (match) => {
    if (emojiMap[match] && emojiMap[match].name) {
      return ` [emoji: ${emojiMap[match].name}] `;
    }
    return match;
  });

  // Clean up double spaces
  translatedText = translatedText.replace(/\s+/g, ' ').trim();

  return {
    isSpam: false,
    processedText: translatedText
  };
}

module.exports = {
  processComment
};
