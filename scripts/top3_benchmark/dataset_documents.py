"""
Creator Platform Retrieval Benchmark - Document Corpus (Part 1 of 3: English core)

Design notes
------------
* Documents mimic real Creator Platform artifacts: captions, hooks, scripts,
  ideas, audience comments, voice samples, strategy notes, lessons learned,
  performance insights, reusable snippets, and memory/RAG chunks.
* Each document is authored in ONE language/script so language routing is
  unambiguous. Code-mixed documents live in part 3.
* Graded relevance is expressed per query in dataset_queries.py via
  `relevant` (grade 2) and `related` (grade 1) id lists.
* Leakage control: no query string is ever a verbatim substring of a document.
  Verified by scripts/top3_benchmark/verify_dataset.py.
"""

DOCUMENTS = [
    # ------------------------------------------------------------------
    # English — hooks
    # ------------------------------------------------------------------
    {"id": "d_en_hook_001", "lang": "en", "category": "hook",
     "text": "Most creators burn out because they optimise for output instead of recovery. Here is the fix that actually worked for me."},
    {"id": "d_en_hook_002", "lang": "en", "category": "hook",
     "text": "Your first ten videos will flop. That is not a bug in your content, it is the platform price of admission."},
    {"id": "d_en_hook_003", "lang": "en", "category": "hook",
     "text": "I analysed eleven years of my own posting data and found the single metric that predicted growth better than views."},
    {"id": "d_en_hook_004", "lang": "en", "category": "hook",
     "text": "Nobody talks about the editing decision that quietly doubled my retention: cutting every single pause."},
    {"id": "d_en_hook_005", "lang": "en", "category": "hook",
     "text": "Stop opening with a greeting. The average viewer decides in under two seconds whether your video deserves their time."},

    # ------------------------------------------------------------------
    # English — captions
    # ------------------------------------------------------------------
    {"id": "d_en_cap_001", "lang": "en", "category": "caption",
     "text": "Batching week is the closest thing a solo creator has to a secret weapon. Twelve pieces out of one Sunday, zero weekday burnout."},
    {"id": "d_en_cap_002", "lang": "en", "category": "caption",
     "text": "Reminder that your content does not need to be perfect, it needs to exist. Draft in public and let the algorithm find your angle."},
    {"id": "d_en_cap_003", "lang": "en", "category": "caption",
     "text": "Six months ago I could not afford a microphone. Today the same microphone paid for itself twice over. Gear is a loan, not a lifestyle."},
    {"id": "d_en_cap_004", "lang": "en", "category": "caption",
     "text": "The comment section taught me more than any course ever did. My three best video ideas came directly from audience replies."},
    {"id": "d_en_cap_005", "lang": "en", "category": "caption",
     "text": "Posting daily felt productive until I checked retention. Weekly output with real editing beat daily output with none every single time."},
    {"id": "d_en_cap_006", "lang": "en", "category": "caption",
     "text": "If your niche feels saturated, you are competing at the wrong layer. Own the specific question nobody else answers properly."},

    # ------------------------------------------------------------------
    # English — short-form scripts
    # ------------------------------------------------------------------
    {"id": "d_en_scr_001", "lang": "en", "category": "script",
     "text": "Scene one: state the mistake. Scene two: show the cost of that mistake with a real number. Scene three: the fix in under fifteen seconds. Scene four: invite the save."},
    {"id": "d_en_scr_002", "lang": "en", "category": "script",
     "text": "Open on a whiteboard mid-sentence with no introduction. Say the surprising claim, pause, then justify it with evidence before anyone can swipe."},
    {"id": "d_en_scr_003", "lang": "en", "category": "script",
     "text": "Structure for a forty second tutorial: problem in four seconds, demonstration in twenty, one-line recap, then a single call to action for comments."},
    {"id": "d_en_scr_004", "lang": "en", "category": "script",
     "text": "Use a before and after split screen. Show the raw footage on the left and the graded result on the right, then explain only the two changes that mattered."},

    # ------------------------------------------------------------------
    # English — content ideas
    # ------------------------------------------------------------------
    {"id": "d_en_idea_001", "lang": "en", "category": "idea",
     "text": "Series idea: a weekly teardown where I take one creator's worst performing post and rewrite the hook live on camera."},
    {"id": "d_en_idea_002", "lang": "en", "category": "idea",
     "text": "Comparison video contrasting three budgets for the same home studio setup, ending with a tier most beginners should actually pick."},
    {"id": "d_en_idea_003", "lang": "en", "category": "idea",
     "text": "Documentary style short following one freelancer for a month, filming the moment a client ghosts them and how they recover."},
    {"id": "d_en_idea_004", "lang": "en", "category": "idea",
     "text": "Experiment idea: publish the same script in two different languages for two weeks and compare completion rates directly."},

    # ------------------------------------------------------------------
    # English — audience comments
    # ------------------------------------------------------------------
    {"id": "d_en_com_001", "lang": "en", "category": "comment",
     "text": "This is the first explanation that actually matched what I see in my dashboard. Every other tutorial skipped the setup part entirely."},
    {"id": "d_en_com_002", "lang": "en", "category": "comment",
     "text": "Would you ever consider doing a version of this for people who are completely camera shy? The written format might suit me better."},
    {"id": "d_en_com_003", "lang": "en", "category": "comment",
     "text": "I have been doing this for two years and never connected retention to topic selection. That reframes how I plan a month of uploads."},
    {"id": "d_en_com_004", "lang": "en", "category": "comment",
     "text": "Small correction: the trick only works for short form. Long form viewers tolerate a slower opening because they already chose you."},

    # ------------------------------------------------------------------
    # English — creator voice samples
    # ------------------------------------------------------------------
    {"id": "d_en_voice_001", "lang": "en", "category": "voice",
     "text": "I write the way I talk. Short sentences. No thesaurus. If a paragraph needs simplifying twice, it gets deleted, not polished."},
    {"id": "d_en_voice_002", "lang": "en", "category": "voice",
     "text": "My tone is blunt and a bit dry. I open with the problem instead of a warm up, and I almost never use exclamation marks."},
    {"id": "d_en_voice_003", "lang": "en", "category": "voice",
     "text": "House style rule: one idea per paragraph, and every piece ends with a concrete next step rather than a vague encouragement."},

    # ------------------------------------------------------------------
    # English — content strategy notes
    # ------------------------------------------------------------------
    {"id": "d_en_strat_001", "lang": "en", "category": "strategy",
     "text": "Three pillars for the quarter: evergreen search content for compounding reach, short commentary for community, and monthly long form as the anchor."},
    {"id": "d_en_strat_002", "lang": "en", "category": "strategy",
     "text": "Cadence decision: two deep uploads a week plus daily low effort replies. Depth builds authority, replies build a return audience."},
    {"id": "d_en_strat_003", "lang": "en", "category": "strategy",
     "text": "Repurposing ladder: one long interview becomes four shorts, one carousel, one newsletter section and five quote posts. Never publish the cut-downs first."},
    {"id": "d_en_strat_004", "lang": "en", "category": "strategy",
     "text": "Stop treating every platform the same. The same script becomes a fast cut with captions for short form and a slower narrative edit for long form."},

    # ------------------------------------------------------------------
    # English — lessons learned
    # ------------------------------------------------------------------
    {"id": "d_en_less_001", "lang": "en", "category": "lesson",
     "text": "Lesson: publishing during a launch week halved my average retention because the audience was splitting between two topics. Never launch and teach in the same week."},
    {"id": "d_en_less_002", "lang": "en", "category": "lesson",
     "text": "Lesson: chasing the newest platform cost me eight months of compounding. Switch platforms with evidence, never with hype."},
    {"id": "d_en_less_003", "lang": "en", "category": "lesson",
     "text": "Lesson: buying an expensive camera before learning to light made my videos worse. Fix the cheap variable first."},
    {"id": "d_en_less_004", "lang": "en", "category": "lesson",
     "text": "Lesson: replying to every comment for the first hour after posting measurably improved distribution on two of three platforms I tested."},

    # ------------------------------------------------------------------
    # English — performance insights
    # ------------------------------------------------------------------
    {"id": "d_en_perf_001", "lang": "en", "category": "performance",
     "text": "Retention curve analysis: videos under twenty seconds held eighty percent of viewers past the halfway mark, while sixty second videos dropped to thirty percent."},
    {"id": "d_en_perf_002", "lang": "en", "category": "performance",
     "text": "Save rate outperformed view count as a leading indicator. Posts with a save rate above three percent kept growing for weeks after publication."},
    {"id": "d_en_perf_003", "lang": "en", "category": "performance",
     "text": "Impressions grew fastest on posts published between seven and nine in the morning local time, though click through stayed flat, meaning distribution shifted but interest did not."},
    {"id": "d_en_perf_004", "lang": "en", "category": "performance",
     "text": "Average watch time correlated more strongly with comment volume than with likes. Conversation is the real engagement currency."},

    # ------------------------------------------------------------------
    # English — reusable snippets
    # ------------------------------------------------------------------
    {"id": "d_en_snip_001", "lang": "en", "category": "snippet",
     "text": "Reusable hook template: everyone gets the first part wrong, here is the second part that finally made it work for my channel."},
    {"id": "d_en_snip_002", "lang": "en", "category": "snippet",
     "text": "Reusable closing line: if this saved you an hour, the next one takes two minutes to watch, so stay close."},
    {"id": "d_en_snip_003", "lang": "en", "category": "snippet",
     "text": "Reusable title formula: the number plus the audience plus the outcome, for example five settings that doubled my posting speed."},

    # ------------------------------------------------------------------
    # English — memory / RAG chunks
    # ------------------------------------------------------------------
    {"id": "d_en_mem_001", "lang": "en", "category": "memory",
     "text": "The creator described their workflow as Sunday planning, weekday filming, and Wednesday editing, with all publishing happening on Friday afternoon."},
    {"id": "d_en_mem_002", "lang": "en", "category": "memory",
     "text": "Earlier in the conversation the creator mentioned that their audience skews toward working professionals aged twenty five to forty, mostly on mobile."},
    {"id": "d_en_mem_003", "lang": "en", "category": "memory",
     "text": "A past decision worth remembering: the creator rejected a high paying brand deal because it conflicted with the educational positioning of the channel."},
    {"id": "d_en_mem_004", "lang": "en", "category": "memory",
     "text": "Note recorded after the analytics review: the top five percent of videos by views all shared the same opening visual, which was a plain whiteboard."},
]
