"""
Creator Platform Retrieval Benchmark - Query Set (Part 2 of 2)

Cross-lingual and code-mixed phenomena:
    ta_en  (Tamil script query    -> English document)
    en_ta  (English query         -> Tamil script document)
    hi_en  (Hindi script query    -> English document)
    en_hi  (English query         -> Hindi script document)
    tanglish_ta (Tanglish query   -> Tamil script document)
    tanglish_en (Tanglish query   -> English document)
    ta_tanglish (Tamil script q.  -> Tanglish document)
    hinglish_hi (Hinglish query   -> Hindi script document)
    hinglish_en (Hinglish query   -> English document)
    hi_hinglish (Hindi script q.  -> Hinglish document)
    code_mixed (Tamil+English / Hindi+English mixed query -> matching doc)
    cross_lingual (same intent, different language on each side)

These are the phenomena that matter most for the Creator Platform: a Tamil
creator searching in Tamil must find English content and vice versa, and
Tanglish / Hinglish typing habits must still retrieve the right material.
"""

QUERIES = [
    # ------------------------------------------------------------------
    # Tamil script query -> English document  (ta_en)   12
    # ------------------------------------------------------------------
    {"id": "q_x_ta_en_001", "text": "எந்த வீடியோவின் தொடக்கமே முக்கியம் என்பதை ஏன் கூறுகிறீர்கள்", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_hook_005"], "related": ["d_en_scr_002"]},
    {"id": "q_x_ta_en_002", "text": "ஆரம்பத்தில் வணக்கம் சொல்லுவது ஏன் தீங்கு செய்கிறது", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_hook_005", "d_en_hook_002"], "related": []},
    {"id": "q_x_ta_en_003", "text": "ஒரே நாளில் பல உள்ளடக்கங்களை உருவாக்கும் முறை", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_cap_001"], "related": ["d_en_mem_001"]},
    {"id": "q_x_ta_en_004", "text": "பார்வையாளர் கேள்விகளிலிருந்து தலைப்புகள் எப்படி கிடைக்கும்", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_cap_004"], "related": ["d_en_idea_001"]},
    {"id": "q_x_ta_en_005", "text": "சேமிப்பு விகிதம் ஏன் முக்கிய அளவுகோலாக உள்ளது", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_perf_002"], "related": ["d_en_perf_004"]},
    {"id": "q_x_ta_en_006", "text": "நான்கு பகுதிகள் கொண்ட வீடியோ அமைப்பு", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_scr_001", "d_en_scr_003"], "related": []},
    {"id": "q_x_ta_en_007", "text": "நீங்கள் பயன்படுத்தும் எழுத்துரு பாணி", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_voice_002"], "related": ["d_en_voice_001"]},
    {"id": "q_x_ta_en_008", "text": "நீங்கள் ஏன் பழைய பதிவை மீண்டும் பயன்படுத்துகிறீர்கள்", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_strat_003"], "related": []},
    {"id": "q_x_ta_en_009", "text": "பார்வையாளர் அமைப்பு பற்றிய தகவல்", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_mem_002"], "related": ["d_hin_mem_001"]},
    {"id": "q_x_ta_en_010", "text": "கேமரா வாங்குவதற்கு முன் ஒளி குறிப்பிட வேண்டும்", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_less_003"], "related": []},
    {"id": "q_x_ta_en_011", "text": "தினமும் பதிவு இடுவதால் ஏற்படும் தேய்வு", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_cap_005", "d_en_hook_001"], "related": []},
    {"id": "q_x_ta_en_012", "text": "நீங்கள் மூன்று அமைப்புக் கொள்கை பயன்படுத்துகிறீர்கள்", "lang": "ta",
     "phenomenon": "ta_en", "relevant": ["d_en_strat_001"], "related": ["d_en_strat_002"]},

    # ------------------------------------------------------------------
    # English query -> Tamil script document  (en_ta)   12
    # ------------------------------------------------------------------
    {"id": "q_x_en_ta_001", "text": "why technical content is scarce in Tamil", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_cap_002"], "related": ["d_ta_idea_001"]},
    {"id": "q_x_en_ta_002", "text": "how to avoid broken font rendering", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_voice_002"], "related": ["d_mix_ta_004"]},
    {"id": "q_x_en_ta_003", "text": "four part video structure explanation", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_scr_002"], "related": []},
    {"id": "q_x_en_ta_004", "text": "first three seconds drop off rate in Tamil content", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_perf_001"], "related": []},
    {"id": "q_x_en_ta_005", "text": "audience language preferences Tamil versus English", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_mem_001", "d_tan_mem_001"], "related": ["d_ta_cap_002"]},
    {"id": "q_x_en_ta_006", "text": "series with a single topic per episode", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_idea_001"], "related": []},
    {"id": "q_x_en_ta_007", "text": "editing faster improved revenue", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_less_001"], "related": []},
    {"id": "q_x_en_ta_008", "text": "writing style with short sentences in Tamil", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_voice_001"], "related": []},
    {"id": "q_x_en_ta_009", "text": "comment about the clearest explanation", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_com_001"], "related": []},
    {"id": "q_x_en_ta_010", "text": "first Tamil video performed poorly then title change fixed it", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_mem_002"], "related": []},
    {"id": "q_x_en_ta_011", "text": "content repurposing strategy for regional languages", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_strat_001"], "related": ["d_ta_cap_003"]},
    {"id": "q_x_en_ta_012", "text": "wide reach versus deep community in vernacular", "lang": "en",
     "phenomenon": "en_ta", "relevant": ["d_ta_strat_001"], "related": ["d_mix_en_001"]},

    # ------------------------------------------------------------------
    # Hindi script query -> English document  (hi_en)   10
    # ------------------------------------------------------------------
    {"id": "q_x_hi_en_001", "text": "कमरा और रोशनी का क्या असर है", "lang": "hi",
     "phenomenon": "hi_en", "relevant": ["d_en_less_003", "d_hi_cap_003"], "related": []},
    {"id": "q_x_hi_en_002", "text": "दर्शकों की उम्र और कौन सा उपकरण उपयोग करते हैं", "lang": "hi",
     "phenomenon": "hi_en", "relevant": ["d_en_mem_002"], "related": []},
    {"id": "q_x_hi_en_003", "text": "ब्रांड साझेदारी क्यों नहीं लेना चाहिए", "lang": "hi",
     "phenomenon": "hi_en", "relevant": ["d_en_mem_003"], "related": []},
    {"id": "q_x_hi_en_004", "text": "हर सप्ताह कितना सामग्री बनानी चाहिए", "lang": "hi",
     "phenomenon": "hi_en", "relevant": ["d_en_hook_001"], "related": ["d_en_strat_002"]},
    {"id": "q_x_hi_en_005", "text": "शीर्षक में संख्या और दर्शक और परिणाम", "lang": "hi",
     "phenomenon": "hi_en", "relevant": ["d_en_snip_003"], "related": []},
    {"id": "q_x_hi_en_006", "text": "पहले मिनट में सिंडर टाइम का प्रभाव", "lang": "hi",
     "phenomenon": "hi_en", "relevant": ["d_en_perf_003"], "related": []},
    {"id": "q_x_hi_en_007", "text": "लंबी सामग्री का कई रूपों में पुनः उपयोग", "lang": "hi",
     "phenomenon": "hi_en", "relevant": ["d_en_strat_003"], "related": []},
    {"id": "q_x_hi_en_008", "text": "आरोप लगाने के बजाय प्रमाण से प्लेटफ़ॉर्म बदलना", "lang": "hi",
     "phenomenon": "hi_en", "relevant": ["d_en_less_002"], "related": []},
    {"id": "q_x_hi_en_009", "text": "टिप्पणी का संख्या पसंदीदा से अधिक महत्वपूर्ण है", "lang": "hi",
     "phenomenon": "hi_en", "relevant": ["d_en_perf_004"], "related": []},
    {"id": "q_x_hi_en_010", "text": "कहानी से शुरुआत करने वाला हुक", "lang": "hi",
     "phenomenon": "hi_en", "relevant": ["d_en_hook_002"], "related": []},

    # ------------------------------------------------------------------
    # English query -> Hindi script document  (en_hi)   10
    # ------------------------------------------------------------------
    {"id": "q_x_en_hi_001", "text": "why technical videos are rare in Hindi", "lang": "en",
     "phenomenon": "en_hi", "relevant": ["d_hi_cap_002"], "related": ["d_hin_cap_002"]},
    {"id": "q_x_en_hi_002", "text": "lighting before buying an expensive camera", "lang": "en",
     "phenomenon": "en_hi", "relevant": ["d_hi_cap_003"], "related": []},
    {"id": "q_x_en_hi_003", "text": "audience is working professionals using mobile", "lang": "en",
     "phenomenon": "en_hi", "relevant": ["d_hi_mem_001"], "related": []},
    {"id": "q_x_en_hi_004", "text": "declined a sponsorship to protect channel identity", "lang": "en",
     "phenomenon": "en_hi", "relevant": ["d_hi_mem_002"], "related": []},
    {"id": "q_x_en_hi_005", "text": "three pillar content strategy breakdown", "lang": "en",
     "phenomenon": "en_hi", "relevant": ["d_hi_strat_001"], "related": ["d_hin_strat_001"]},
    {"id": "q_x_en_hi_006", "text": "posts people saved performed best", "lang": "en",
     "phenomenon": "en_hi", "relevant": ["d_hi_perf_001"], "related": []},
    {"id": "q_x_en_hi_007", "text": "writing plainly without fancy vocabulary", "lang": "en",
     "phenomenon": "en_hi", "relevant": ["d_hi_voice_001"], "related": []},
    {"id": "q_x_en_hi_008", "text": "state the problem then the cost then the fix", "lang": "en",
     "phenomenon": "en_hi", "relevant": ["d_hi_scr_001"], "related": []},
    {"id": "q_x_en_hi_009", "text": "weekly rewrite series of weak videos", "lang": "en",
     "phenomenon": "en_hi", "relevant": ["d_hi_idea_001"], "related": []},
    {"id": "q_x_en_hi_010", "text": "reels target versus actual number produced", "lang": "en",
     "phenomenon": "en_hi", "relevant": ["d_hi_cap_001"], "related": ["d_hin_cap_001"]},

    # ------------------------------------------------------------------
    # Tanglish query -> Tamil script document  (tanglish_ta)   12
    # ------------------------------------------------------------------
    {"id": "q_x_tan_ta_001", "text": "tamil la aval uthaippu vida kuraiya padakkum illa", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_cap_002"], "related": ["d_ta_idea_001"]},
    {"id": "q_x_tan_ta_002", "text": "edikkum neram konjam kuraindha revenue perusu aayidhu", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_less_001"], "related": []},
    {"id": "q_x_tan_ta_003", "text": "mutru vandhu mela vilaiya vasai pogakoodu pothu", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_perf_001"], "related": []},
    {"id": "q_x_tan_ta_004", "text": "naalu pakutiya vida vaivechchalai", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_scr_002"], "related": []},
    {"id": "q_x_tan_ta_005", "text": "eluthuru sivaive kuraiya vaasalama epdi venkumnu solradhu", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_voice_002"], "related": ["d_mix_ta_004"]},
    {"id": "q_x_tan_ta_006", "text": "paruvaiga|k keeleerukkum illa endha keluppadi theriyum", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_com_002"], "related": []},
    {"id": "q_x_tan_ta_007", "text": "natpeuru oru kurapporeyla irukkura thodar", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_idea_001"], "related": []},
    {"id": "q_x_tan_ta_008", "text": "epdhiya vizhiyaal padalatchi kelkkirukkalaam", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_mem_001"], "related": ["d_tan_mem_001"]},
    {"id": "q_x_tan_ta_009", "text": "matittaalaik konjam kondu nattitta nu konjam vannaar", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_mem_002"], "related": []},
    {"id": "q_x_tan_ta_010", "text": "paattu kalanum mikaiya illa solradhu appadi", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_voice_001"], "related": []},
    {"id": "q_x_tan_ta_011", "text": "English audience ku rendum kuraiya adutha padungal", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_strat_001"], "related": ["d_ta_cap_003"]},
    {"id": "q_x_tan_ta_012", "text": "pul keeleerkalukku keezhaiya theriyavanum illa", "lang": "tanglish",
     "phenomenon": "tanglish_ta", "relevant": ["d_ta_com_001"], "related": []},

    # ------------------------------------------------------------------
    # Tanglish query -> English document  (tanglish_en)   8
    # ------------------------------------------------------------------
    {"id": "q_x_tan_en_001", "text": "weekend la ethu video create pannunga nu plan", "lang": "tanglish",
     "phenomenon": "tanglish_en", "relevant": ["d_en_mem_001"], "related": ["d_en_cap_001"]},
    {"id": "q_x_tan_en_002", "text": "yoga schedule epdi vechirathu epdi decide pannunga", "lang": "tanglish",
     "phenomenon": "tanglish_en", "relevant": ["d_en_strat_002"], "related": []},
    {"id": "q_x_tan_en_003", "text": "engum ponnungalum illa first three seconds la leave pannuvaru", "lang": "tanglish",
     "phenomenon": "tanglish_en", "relevant": ["d_en_hook_005"], "related": ["d_en_perf_001"]},
    {"id": "q_x_tan_en_004", "text": "audience la settle pannava pothu save pannuva", "lang": "tanglish",
     "phenomenon": "tanglish_en", "relevant": ["d_en_perf_002"], "related": []},
    {"id": "q_x_tan_en_005", "text": "epdi solra vendum nu oru sample idea venum", "lang": "tanglish",
     "phenomenon": "tanglish_en", "relevant": ["d_en_snip_001"], "related": ["d_en_snip_003"]},
    {"id": "q_x_tan_en_006", "text": "vandiya brand deal enna kaaranal virandhippo", "lang": "tanglish",
     "phenomenon": "tanglish_en", "relevant": ["d_en_mem_003"], "related": []},
    {"id": "q_x_tan_en_007", "text": "deep work nu best enga pannanum", "lang": "tanglish",
     "phenomenon": "tanglish_en", "relevant": ["d_en_mem_004"], "related": []},
    {"id": "q_x_tan_en_008", "text": "long form epdi enjoy vendu seiyal不及 short form la epdi use cheyy", "lang": "tanglish",
     "phenomenon": "tanglish_en", "relevant": ["d_en_strat_003"], "related": ["d_en_strat_004"]},

    # ------------------------------------------------------------------
    # Tamil script query -> Tanglish document  (ta_tanglish)   6
    # ------------------------------------------------------------------
    {"id": "q_x_ta_tan_001", "text": "எழுத்துரு சிதைவைத் தவிர்ப்பதற்கான வழி", "lang": "ta",
     "phenomenon": "ta_tanglish", "relevant": ["d_mix_ta_004"], "related": ["d_ta_voice_002"]},
    {"id": "q_x_ta_tan_002", "text": "ஒரே பதிவை இரண்டு மொழிகளில் தயாரிப்பதற்கான வழி", "lang": "ta",
     "phenomenon": "ta_tanglish", "relevant": ["d_mix_en_002"], "related": ["d_ta_strat_001"]},
    {"id": "q_x_ta_tan_003", "text": "வருடம் மூன்று திட்டமிட்டால் பதிவுகள் பலமாக இல்லை", "lang": "ta",
     "phenomenon": "ta_tanglish", "relevant": ["d_mix_hi_004"], "related": []},
    {"id": "q_x_ta_tan_004", "text": "திங்கள் வரும் நாளில் கைப்பந்த தயாரிப்பு", "lang": "ta",
     "phenomenon": "ta_tanglish", "relevant": ["d_mix_ta_003"], "related": ["d_ta_cap_001"]},
    {"id": "q_x_ta_tan_005", "text": "தமிழும் ஆங்கிலும் இணைந்து விளக்குதல்", "lang": "ta",
     "phenomenon": "ta_tanglish", "relevant": ["d_mix_ta_001"], "related": []},
    {"id": "q_x_ta_tan_006", "text": "ஏழு நாள் உற்பத்தி முறையைப் பின்பற்றிய பின் விளைவு", "lang": "ta",
     "phenomenon": "ta_tanglish", "relevant": ["d_mix_ta_002"], "related": []},

    # ------------------------------------------------------------------
    # Hinglish query -> Hindi script document  (hinglish_hi)   10
    # ------------------------------------------------------------------
    {"id": "q_x_hin_hi_001", "text": "daily post karne se retention gir jaati hai kyun", "lang": "hinglish",
     "phenomenon": "hinglish_hi", "relevant": ["d_hi_hook_003"], "related": []},
    {"id": "q_x_hin_hi_002", "text": "camera se pehle lighting seekho", "lang": "hinglish",
     "phenomenon": "hinglish_hi", "relevant": ["d_hi_cap_003"], "related": ["d_en_less_003"]},
    {"id": "q_x_hin_hi_003", "text": "teen khambo wali strategy", "lang": "hinglish",
     "phenomenon": "hinglish_hi", "relevant": ["d_hi_strat_001"], "related": ["d_hin_strat_001"]},
    {"id": "q_x_hin_hi_004", "text": "save karne wale post kitne prabhavshali the", "lang": "hinglish",
     "phenomenon": "hinglish_hi", "relevant": ["d_hi_perf_001"], "related": []},
    {"id": "q_x_hin_hi_005", "text": "comment zyada karte hai like kam", "lang": "hinglish",
     "phenomenon": "hinglish_hi", "relevant": ["d_hi_perf_001"], "related": ["d_hin_perf_001"]},
    {"id": "q_x_hin_hi_006", "text": "chhoti vaakya simple shabd", "lang": "hinglish",
     "phenomenon": "hinglish_hi", "relevant": ["d_hi_voice_001"], "related": []},
    {"id": "q_x_hin_hi_007", "text": "ek hi hafte me launch aur tutorial dena galat tha", "lang": "hinglish",
     "phenomenon": "hinglish_hi", "relevant": ["d_hi_less_001"], "related": []},
    {"id": "q_x_hin_hi_008", "text": "sabse kam dekhe jane wale video ki wajah", "lang": "hinglish",
     "phenomenon": "hinglish_hi", "relevant": ["d_hi_hook_002"], "related": []},
    {"id": "q_x_hin_hi_009", "text": "shahar me rehne wale professional hain", "lang": "hinglish",
     "phenomenon": "hinglish_hi", "relevant": ["d_hi_mem_001"], "related": []},
    {"id": "q_x_hin_hi_010", "text": "15 ka target 9 hi bane", "lang": "hinglish",
     "phenomenon": "hinglish_hi", "relevant": ["d_hi_cap_001"], "related": ["d_hin_cap_001"]},

    # ------------------------------------------------------------------
    # Hinglish query -> English document  (hinglish_en)   8
    # ------------------------------------------------------------------
    {"id": "q_x_hin_en_001", "text": "content pillar strategy kya hoti hai", "lang": "hinglish",
     "phenomenon": "hinglish_en", "relevant": ["d_en_strat_001"], "related": ["d_en_strat_002"]},
    {"id": "q_x_hin_en_002", "text": "long interview ko chhote clips me kaise badlein", "lang": "hinglish",
     "phenomenon": "hinglish_en", "relevant": ["d_en_strat_003"], "related": []},
    {"id": "q_x_hin_en_003", "text": "save rate se views se zyada accha signal hai", "lang": "hinglish",
     "phenomenon": "hinglish_en", "relevant": ["d_en_perf_002"], "related": []},
    {"id": "q_x_hin_en_004", "text": "thumbnail banane me time laga hook fix karna zyada faayda diya", "lang": "hinglish",
     "phenomenon": "hinglish_en", "relevant": ["d_hin_less_001", "d_en_hook_005"], "related": []},
    {"id": "q_x_hin_en_005", "text": "pehle teen second me problem batao", "lang": "hinglish",
     "phenomenon": "hinglish_en", "relevant": ["d_en_scr_001"], "related": []},
    {"id": "q_x_hin_en_006", "text": "sabse zyada save hone wale video kaun se the", "lang": "hinglish",
     "phenomenon": "hinglish_en", "relevant": ["d_en_perf_002"], "related": ["d_en_hook_003"]},
    {"id": "q_x_hin_en_007", "text": "brand offer kyun reject kiya", "lang": "hinglish",
     "phenomenon": "hinglish_en", "relevant": ["d_en_mem_003"], "related": []},
    {"id": "q_x_hin_en_008", "text": "sunday planning weekday filming wednesday editing", "lang": "hinglish",
     "phenomenon": "hinglish_en", "relevant": ["d_en_mem_001"], "related": ["d_en_strat_002"]},

    # ------------------------------------------------------------------
    # Hindi script query -> Hinglish document  (hi_hinglish)   6
    # ------------------------------------------------------------------
    {"id": "q_x_hi_hin_001", "text": "निश्चित मीडियम के साथ अंग्रेज़ी उपकरणों का उपयोग", "lang": "hi",
     "phenomenon": "hi_hinglish", "relevant": ["d_mix_hi_001"], "related": []},
    {"id": "q_x_hi_hin_002", "text": "मुफ्त सॉफ़्टवेयर से पेशेवर सामग्री बनाना", "lang": "hi",
     "phenomenon": "hi_hinglish", "relevant": ["d_mix_hi_002"], "related": []},
    {"id": "q_x_hi_hin_003", "text": "कम बजट का सेटअप कैसा है", "lang": "hi",
     "phenomenon": "hi_hinglish", "relevant": ["d_mix_hi_003"], "related": []},
    {"id": "q_x_hi_hin_004", "text": "निश का फ़ैसला कैसे लिया जाता है", "lang": "hi",
     "phenomenon": "hi_hinglish", "relevant": ["d_mix_hi_004"], "related": []},
    {"id": "q_x_hi_hin_005", "text": "एक ही दो भाषाओं में आवाज़ दर्ज करना", "lang": "hi",
     "phenomenon": "hi_hinglish", "relevant": ["d_mix_en_002"], "related": []},
    {"id": "q_x_hi_hin_006", "text": "अंग्रेज़ी उपशीर्षकों से सबसे अच्छी पहुँच", "lang": "hi",
     "phenomenon": "hi_hinglish", "relevant": ["d_mix_en_001"], "related": []},

    # ------------------------------------------------------------------
    # Code-mixed queries  (Tamil+English, Hindi+English)   14
    # ------------------------------------------------------------------
    {"id": "q_x_mix_001", "text": "Tamil audience ku English mathiri tech explain panninja theriyadhu", "lang": "code_mixed_ta",
     "phenomenon": "code_mixed", "relevant": ["d_mix_ta_001"], "related": []},
    {"id": "q_x_mix_002", "text": "seven day productivity system follow panninja output illa", "lang": "code_mixed_ta",
     "phenomenon": "code_mixed", "relevant": ["d_mix_ta_002"], "related": []},
    {"id": "q_x_mix_003", "text": "Monday shoot Wednesday edit Friday publish plan", "lang": "code_mixed_ta",
     "phenomenon": "code_mixed", "relevant": ["d_mix_ta_003"], "related": ["d_en_mem_001"]},
    {"id": "q_x_mix_004", "text": "Tamil fonts render pannatha problem vayirundhu", "lang": "code_mixed_ta",
     "phenomenon": "code_mixed", "relevant": ["d_mix_ta_004"], "related": ["d_ta_voice_002"]},
    {"id": "q_x_mix_005", "text": "Hindi medium aur English tools saath use karta hun", "lang": "code_mixed_hi",
     "phenomenon": "code_mixed", "relevant": ["d_mix_hi_001"], "related": []},
    {"id": "q_x_mix_006", "text": "free laptop mila tha free software se professional content bana", "lang": "code_mixed_hi",
     "phenomenon": "code_mixed", "relevant": ["d_mix_hi_002"], "related": []},
    {"id": "q_x_mix_007", "text": "budget camera ring light laptop setup affordable", "lang": "code_mixed_hi",
     "phenomenon": "code_mixed", "relevant": ["d_mix_hi_003"], "related": []},
    {"id": "q_x_mix_008", "text": "niche decide karne ke liye 30 din ka data dekha", "lang": "code_mixed_hi",
     "phenomenon": "code_mixed", "relevant": ["d_mix_hi_004"], "related": []},
    {"id": "q_x_mix_009", "text": "English subtitles se best reach but vernacular se strong community", "lang": "code_mixed_en",
     "phenomenon": "code_mixed", "relevant": ["d_mix_en_001"], "related": []},
    {"id": "q_x_mix_010", "text": "one script two voiceovers single session", "lang": "code_mixed_en",
     "phenomenon": "code_mixed", "relevant": ["d_mix_en_002"], "related": []},
    {"id": "q_x_mix_011", "text": "Tamil la audience பார்வையாளர் கேள்விகளிலிருந்து video ideas", "lang": "code_mixed_ta",
     "phenomenon": "code_mixed", "relevant": ["d_ta_cap_003"], "related": ["d_tan_cap_001"]},
    {"id": "q_x_mix_012", "text": "Hindi audience engagement आँकड़े comments ज़्यादा", "lang": "code_mixed_hi",
     "phenomenon": "code_mixed", "relevant": ["d_hin_perf_001"], "related": ["d_hi_perf_001"]},
    {"id": "q_x_mix_013", "text": "தமிழ் transcription எழுத்துரு problem", "lang": "code_mixed_ta",
     "phenomenon": "code_mixed", "relevant": ["d_ta_voice_002"], "related": ["d_mix_ta_004"]},
    {"id": "q_x_mix_014", "text": "budget setup for Indian creators starting out", "lang": "code_mixed_en",
     "phenomenon": "code_mixed", "relevant": ["d_mix_hi_003"], "related": ["d_hi_cap_003"]},
]
