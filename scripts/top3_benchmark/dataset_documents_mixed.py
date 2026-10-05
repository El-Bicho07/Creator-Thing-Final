"""
Creator Platform Retrieval Benchmark - Document Corpus (Part 3 of 3)

Tanglish (Tamil written in Latin script), Hinglish (Hindi in Latin script),
and explicitly code-mixed documents.

These documents are essential for the cross-script and code-mixed phenomena
the benchmark must cover: a Tanglish query should retrieve Tanglish content,
a Hinglish query should retrieve Hinglish content, and mixed-language
content must be findable by mixed-language queries.
"""

DOCUMENTS = [
    # ------------------------------------------------------------------
    # Tanglish (Tamil in Latin script)
    # ------------------------------------------------------------------
    {"id": "d_tan_hook_001", "lang": "tanglish", "category": "hook",
     "text": "Nee rendu perum padurom, rendu keer padakkum illa. Ketbare tha solradhu konjam slow-a irundhu."},
    {"id": "d_tan_hook_002", "lang": "tanglish", "category": "hook",
     "text": "Enna docu pola tha nambungal, athu sonnaal ponnadhu tha nambakoodhu illa. Illiya sollathu tha trust aakudhu."},
    {"id": "d_tan_cap_001", "lang": "tanglish", "category": "caption",
     "text": "Idhukku weekend la rendu padungala epdi create pannungal, apparam ettu padungal epdi kuraindha paksei prep pannidhu."},
    {"id": "d_tan_cap_002", "lang": "tanglish", "category": "caption",
     "text": "Tamil la aval uthaippu vida padakkum illa. English la irukkura content ku epdi varaikum naan mathukkiren."},
    {"id": "d_tan_scr_001", "lang": "tanglish", "category": "script",
     "text": "Opening la oru greeting venam. First sentence la problem-a solli, rendu second la answer-a start pannu."},
    {"id": "d_tan_idea_001", "lang": "tanglish", "category": "idea",
     "text": "Tamil tech audience-ku oru free course epdi start pannalan nu idea. Beginner-l ku针对性的 content vendum."},
    {"id": "d_tan_com_001", "lang": "tanglish", "category": "comment",
     "text": "Idha first time la oru Tamil tech video paathen. But English la full detailed a explanation irundhu, indha epdi sollanum theriyadhu."},
    {"id": "d_tan_voice_001", "lang": "tanglish", "category": "voice",
     "text": "Enna padurom, appadi than solren. Full sentences la oru sol-a maathu pudurom, purdha rendu sol pannanum."},
    {"id": "d_tan_strat_001", "lang": "tanglish", "category": "strategy",
     "text": "Naan English audience-ku content vendu vendu solren, but Tamil audience ku same video da oru Tamil subtitle a add pannren."},
    {"id": "d_tan_less_001", "lang": "tanglish", "category": "lesson",
     "text": "Lesson: oru Tamil video ku English title vechirathu watch time konjam diminish aayidhu. Match the language of the title to the script."},
    {"id": "d_tan_perf_001", "lang": "tanglish", "category": "performance",
     "text": "Analytics la paathathu Tamil content ku engagement indri kattra varaikkum mela maatru Vaa pathi."},
    {"id": "d_tan_mem_001", "lang": "tanglish", "category": "memory",
     "text": "Creator solraan: audience la 60 percent Tamil, 30 percent English, 10 percent Hindi vera level la pesraargal."},

    # ------------------------------------------------------------------
    # Hinglish (Hindi in Latin script)
    # ------------------------------------------------------------------
    {"id": "d_hin_hook_001", "lang": "hinglish", "category": "hook",
     "text": "Log daily post karte hain lekin retention gir jaati hai. Reason simple hai: har post me energy invest nahi hoti."},
    {"id": "d_hin_hook_002", "lang": "hinglish", "category": "hook",
     "text": "Maine 6 mahine me ek cheez change ki aur meri watch time double ho gayi, aur wo camera ya editing nahi thi."},
    {"id": "d_hin_cap_001", "lang": "hinglish", "category": "caption",
     "text": "Is mahine ka target tha 15 reels, aur honestly mile 9. But 9 dhang ke reels 15 weak se zyada kaam karti hain."},
    {"id": "d_hin_cap_002", "lang": "hinglish", "category": "caption",
     "text": "Hindi me tech content kam hai isliye jo bana rahe hain unka waitlist banta hai. Demand hai, supply nahi."},
    {"id": "d_hin_scr_001", "lang": "hinglish", "category": "script",
     "text": "Pehle problem batao, phir cost dikhao, phir solution. Solution pehle batana kaam nahi karta, pehle problem feel honi chahiye."},
    {"id": "d_hin_idea_001", "lang": "hinglish", "category": "idea",
     "text": "Ek series idea: har week kisi creator ka sabse weak video leke uska hook rewrite karunga on camera."},
    {"id": "d_hin_com_001", "lang": "hinglish", "category": "comment",
     "text": "Bhai ye sabse helpful video hai, especially wo part jo aapne lighting ke baare me bataya. Maine isse try kiya, difference hai."},
    {"id": "d_hin_voice_001", "lang": "hinglish", "category": "voice",
     "text": "Meri writing style chhoti sentences aur simple words hai. Main English bohot kam use karta hun, sentence ke end me ek clear step deta hun."},
    {"id": "d_hin_strat_001", "lang": "hinglish", "category": "strategy",
     "text": "Strategy simple hai: 2 long educational videos, 5 short clips, aur daily comments reply. Consistency ka matlab quality ko sustain karna hai."},
    {"id": "d_hin_less_001", "lang": "hinglish", "category": "lesson",
     "text": "Seekha: thumbnail ko perfect banane me time laga, lekin pehle 3 second ka hook fix karna zyada faayda deta tha."},
    {"id": "d_hin_perf_001", "lang": "hinglish", "category": "performance",
     "text": "Analytics me dekha ki Hindi audience comment zyada karti hai, save bhi karti hai, but like kam karti hai compared to English."},
    {"id": "d_hin_mem_001", "lang": "hinglish", "category": "memory",
     "text": "Creator ne bataya ki unka target audience working professionals hai, 25 se 40 age group, aur wo mostly mobile pe dekhte hain."},

    # ------------------------------------------------------------------
    # Code-mixed (Tamil + English and Hindi + English)
    # ------------------------------------------------------------------
    {"id": "d_mix_ta_001", "lang": "code_mixed_ta", "category": "caption",
     "text": "Tamil audience ku English maathiri tech explain panninja la theriyadhu. So mixed language la solran, transliteration use pannama illa."},
    {"id": "d_mix_ta_002", "lang": "code_mixed_ta", "category": "hook",
     "text": "Seven day productivity system follow karala? Tamil la explain panninjaal output illa, sappadu illa solradhu."},
    {"id": "d_mix_ta_003", "lang": "code_mixed_ta", "category": "memory",
     "text": "Creator plan: Monday-la shoot, Wednesday-la edit, Friday-la publish. Weekend-la next three episodes plan pannradhu."},
    {"id": "d_mix_ta_004", "lang": "code_mixed_ta", "category": "lesson",
     "text": "Important lesson: Tamil fonts render pannatha viddaiyum proba vayirundhulladhuku, thaar vazhiya clean-a irundhu nakai."},
    {"id": "d_mix_hi_001", "lang": "code_mixed_hi", "category": "caption",
     "text": "Hindi medium ke saath English tools use karta hun, lekin audience connect Hindi mein hoti hai, isliye script Hindi mein rakhta hun."},
    {"id": "d_mix_hi_002", "lang": "code_mixed_hi", "category": "hook",
     "text": "Free laptop mila tha keila, lekin free software tools se professional content banna mumkin tha—sirf patience chahiye."},
    {"id": "d_mix_hi_003", "lang": "code_mixed_hi", "category": "memory",
     "text": "Creator ka setup: budget camera, ring light, aur ek laptop—sab affordable. Subscriptions pehle saal zero tha."},
    {"id": "d_mix_hi_004", "lang": "code_mixed_hi", "category": "strategy",
     "text": "Niche decide karne ke liye maine 30 din data dekha: mere top 3 videos sab education aur tool reviews ke the, lifestyle nahi."},
    {"id": "d_mix_en_001", "lang": "code_mixed_en", "category": "memory",
     "text": "Between Hindi and Tamil content, English subtitles gave the best reach, but pure vernacular builds the stronger community."},
    {"id": "d_mix_en_002", "lang": "code_mixed_en", "category": "lesson",
     "text": "Recording in two languages doubled my setup time; the smarter path was one script, two voiceovers recorded in a single session."},
]
