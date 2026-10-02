import json
import random
import os
from datetime import datetime, timedelta, timezone

random.seed(42)

# 18 Realistic Instagram posts across mixed formats for @DevWithArjun
POSTS = [
    # Reels (High reach, viral requests, debate, audio feedback)
    {
        "post_id": "post_01",
        "post_format": "reel",
        "caption": "FastAPI + Next.js is my favorite full-stack stack in 2026. Here's why 👇 #webdev #python #fullstack"
    },
    {
        "post_id": "post_02",
        "post_format": "reel",
        "caption": "Building an AI Agent from scratch with Python and Claude 🤖 Full breakdown in bio #ai #langgraph"
    },
    {
        "post_id": "post_03",
        "post_format": "reel",
        "caption": "Stop using useEffect for data fetching in React! Here is what to do instead ❌ #reactjs #nextjs"
    },
    {
        "post_id": "post_04",
        "post_format": "reel",
        "caption": "Why 90% of developers fail Docker interviews (and the 3 commands to remember) 🐳 #docker #backend"
    },
    {
        "post_id": "post_05",
        "post_format": "reel",
        "caption": "Authentication is broken: Why JWT in localStorage is a huge security risk 🔒 #cybersecurity #webdev"
    },
    {
        "post_id": "post_06",
        "post_format": "reel",
        "caption": "How I cut my Docker image size from 1.4GB down to 88MB in 3 steps 🚀 #devops #docker"
    },
    {
        "post_id": "post_07",
        "post_format": "reel",
        "caption": "SDE-2 Salary Negotiation Blueprint: How to get 40%+ hikes in Indian product companies 💼 #techjobs #careers"
    },
    # Carousels (Deep dives, architectural diagrams, high question & save density)
    {
        "post_id": "post_08",
        "post_format": "carousel",
        "caption": "Top 5 System Design concepts every Senior Dev must know before an interview 🚀 Swipe through for architecture diagrams 👉 #systemdesign #coding"
    },
    {
        "post_id": "post_09",
        "post_format": "carousel",
        "caption": "How I scaled my PostgreSQL database to 500,000 queries per day on a $10 VPS 💡 Complete index guide 👉 #database #postgres"
    },
    {
        "post_id": "post_10",
        "post_format": "carousel",
        "caption": "Next.js 15 Server Actions vs API Routes: When to use which? Architecture breakdown 📂 #nextjs15 #react"
    },
    {
        "post_id": "post_11",
        "post_format": "carousel",
        "caption": "LangGraph vs CrewAI vs Autogen: The 2026 Multi-Agent Comparison Matrix 🤖 Save this for your next AI hackathon! 👉 #aiengineering #agents"
    },
    {
        "post_id": "post_12",
        "post_format": "carousel",
        "caption": "The Ultimate Backend Roadmap for 2026: Zero to Senior SDE in 8 Months 🗺️ #backend #developer"
    },
    {
        "post_id": "post_13",
        "post_format": "carousel",
        "caption": "PostgreSQL Connection Pooling: PgBouncer vs Supabase Supavisor Deep Dive 🏊‍♂️ #sql #database"
    },
    # Static Images / Single Slides (Setup photos, milestone announcements, memes, hot takes)
    {
        "post_id": "post_14",
        "post_format": "image",
        "caption": "My minimal dual-monitor WFH developer desk setup for 2026. What keyboard are you using? ⌨️💻 #desksetup #developerlife"
    },
    {
        "post_id": "post_15",
        "post_format": "image",
        "caption": "We just crossed 100k followers! Thank you all for the love and support ❤️ What should we build next together? #milestone #gratitude"
    },
    {
        "post_id": "post_16",
        "post_format": "image",
        "caption": "Hot take: 90% of SaaS startups do not need Kubernetes. A single $20 Hetzner VPS with Docker Compose will take you to $50k MRR. Change my mind. 🤔 #devops #startup"
    },
    {
        "post_id": "post_17",
        "post_format": "image",
        "caption": "The junior dev pushing straight to main on a Friday evening 😅 We've all been there! #programminghumor #coding"
    },
    {
        "post_id": "post_18",
        "post_format": "image",
        "caption": "Quick cheat sheet: 7 HTTP Status codes every frontend dev mixes up 📄 #cheatsheet #webdevelopment"
    }
]

USERS = [
    "rohit_codes", "priya_techie", "aarav_dev", "ananya_py", "crypto_king_99",
    "bot_promo_expert", "vikram_cloud", "sneha_frontend", "kunal_ml", "rahul_verma_sde",
    "tanvi_uiux", "amit_sysdesign", "dev_guru_india", "divya_swe", "harsh_builds",
    "riya_react", "siddharth_backend", "pooja_sharma", "akash_fullstack", "nikhil_codez",
    "meera_ai", "sanjay_ops", "tarun_ts", "deepak_data", "neha_engineer",
    "freelance_vijay", "shreya_code", "aditya_algos", "varun_cloud_architect", "zoya_tech",
    "free_followers_now", "invest_crypto_fast", "manish_dev", "alok_gupta", "siddhu_react"
]

# Instagram comment templates enriched with request patterns, emojis, mentions, and Hinglish
COMMENT_CATEGORIES = {
    "request": [
        ("Bhai iska part 2 kab aayega? Please make part 2 on LangGraph multi-agent persistence!", ["part 2", "tutorial", "bhai"]),
        ("Bro please make a complete tutorial on real-world WebSockets with FastAPI and Redis pub/sub!", ["tutorial", "bhai"]),
        ("Sir system design roadmap 2026 pe next video mein deep dive banao na with resource links! @rohit_codes dekh bhai", ["next video mein", "banao na", "mention"]),
        ("Bhai yeh kaise kiya? Please ek detailed step-by-step video banao on deploying to Coolify VPS!", ["kaise kiya", "video banao"]),
        ("Can you do a code review breakdown of a production SaaS codebase in the next video? That would be gold.", ["next video mein"]),
        ("Bhai GitHub repo link? Which app did you use to generate those system architecture diagrams?", ["link?", "which app?", "repo"]),
        ("Bhaiya Next.js 15 Server Actions vs traditional API routes pe comparison tutorial chahiye!", ["tutorial", "chahiye"]),
        ("Please create a project video: building a RAG application with Hybrid Search (BM25 + pgvector). @priya_techie", ["tutorial", "mention"]),
        ("Sir link? Can you share the starter template repo link in bio or comments?", ["link?", "repo"]),
        ("Bhai Docker multi-stage builds pe deep dive tutorial bana do please! Part 2 needed urgently.", ["part 2", "tutorial"])
    ],
    "question": [
        ("How do you handle JWT refresh token rotation when Next.js server components don't have write access to cookies? 🤔", ["emoji_question"]),
        ("Is Docker really needed for small SaaS MVPs or is plain systemd on a Hetzner VPS sufficient? @vikram_cloud what do you think?", ["mention", "question"]),
        ("Bhai FastAPI me background tasks better hai ya Celery with Redis for slow LLM calls? 🤔❓", ["emoji_question", "bhai"]),
        ("What is the difference between vector database like Pinecone and using PostgreSQL with pgvector extension? 🧐", ["emoji_question"]),
        ("Why use Pydantic V2 instead of standard dataclasses if performance overhead matters? 🤔", ["emoji_question"]),
        ("How do you mock external LLM calls during automated CI/CD unit testing in pytest? ❓", ["emoji_question"]),
        ("Sir, does Server-Side Rendering (SSR) really hurt TTFB compared to static CDN hosting? 🤔", ["emoji_question"]),
        ("Can we use SQLite in production with WAL mode for a low-concurrency SaaS with 5k users? 🤔 @aarav_dev", ["mention", "emoji_question"]),
        ("How do you monitor LLM hallucinations and token spend in production apps? 🧐", ["emoji_question"])
    ],
    "confusion": [
        ("I followed step 4 in your video but getting CORS error in production even though localhost works fine 😭🤦‍♂️", ["emoji_confusion"]),
        ("Wait, why are we using useMemo here? Won't React Compiler in React 19 optimize this automatically? 🤯", ["emoji_confusion"]),
        ("Samajh nahi aaya, agar JWT stateless hai to logout feature me token invalidate kaise karte hain? 🤷‍♂️", ["emoji_confusion", "hinglish"]),
        ("I am confused between Zustand and Redux Toolkit. In modern Next.js App Router, which one should we pick? 🤔", ["emoji_confusion"]),
        ("Sir, if FastAPI is async, why did the database query block the entire event loop in my test? 😭", ["emoji_confusion"]),
        ("Bhai video me bola tha Docker lightweight hai, but my image is 1.4 GB! What did I do wrong? 🤦‍♂️", ["emoji_confusion", "bhai"]),
        ("Wait, if Next.js components are server by default, why do we need 'use client' just for useState? 🤯", ["emoji_confusion"]),
        ("Confused about database indexes. Does composite index (user_id, created_at) work if I query only created_at? 🤔", ["emoji_confusion"])
    ],
    "pain_point": [
        ("Every tutorial stops at Hello World, no one explains production error handling and structured logging 😭", ["emoji_pain"]),
        ("Frontend state management is such a mess between server state (TanStack Query) and client state 🤦‍♂️ @sneha_frontend", ["mention", "emoji_pain"]),
        ("Struggling with OpenAI rate limits (429) when 50 concurrent users trigger summarization. Completely stuck! 😭", ["emoji_pain"]),
        ("Database migrations in production always terrify me. One mistake and the app goes down 😭", ["emoji_pain"]),
        ("It takes 25 minutes for our Docker build in GitHub Actions because dependency caching keeps missing 🤦‍♂️", ["emoji_pain"]),
        ("Debugging hydration mismatch errors in Next.js is driving me crazy! The error messages are so cryptic 😭", ["emoji_pain"]),
        ("Junior devs at my startup keep writing N+1 queries with SQLAlchemy ORM and killing our database 😭", ["emoji_pain"])
    ],
    "praise": [
        ("Best explanation of async/await in Python I have ever seen! Subscribed instantly 🔥🚀", ["emoji_praise"]),
        ("Bro your system design video helped me crack my SDE-2 interview at Swiggy! Thanks a ton ❤️🙌 @kunal_ml", ["mention", "emoji_praise"]),
        ("Bhai aapka teaching style is top notch 🙌 No fluff, straight to the point 🔥💯", ["emoji_praise", "hinglish"]),
        ("Literally solved the bug I was struggling with for 3 days. You are a lifesaver Arjun bhai! 👏❤️", ["emoji_praise"]),
        ("Crisp, clear and practical. Most creators just read docs, you actually show edge cases 🔥🚀", ["emoji_praise"]),
        ("Your carousels give more value than paid bootcamps charging 50,000 INR! 💯🔥", ["emoji_praise"])
    ],
    "criticism": [
        ("Audio in the last video was too low bhai, had to turn volume to 100%. Please fix your mic setup 🎙️", ["feedback"]),
        ("This architecture will not scale past 10k users, you should have mentioned Redis caching earlier.", ["feedback"]),
        ("Too fast explanation, beginner ke sir ke upar se nikal gaya. Slow down a bit in code walkthroughs.", ["hinglish", "feedback"]),
        ("Why use JavaScript for the example when the title said TypeScript? Misleading thumbnail bro.", ["feedback"])
    ],
    "more_of_this": [
        ("More backend architecture teardowns please! We need realistic production code 🔥", ["emoji_praise"]),
        ("Make this a full series bhai, part 2 kab aayega? Can't wait! 🔥🚀", ["part 2", "emoji_praise"]),
        ("Love these real-world code reviews! Please do one on an open source repo 🙌 @amit_sysdesign", ["mention", "emoji_praise"]),
        ("Do more AI engineering and LLM evaluation content, that's where the industry is going 🚀", ["emoji_praise"])
    ],
    "spam": [
        ("Check bio for crypto trading signals 💸🚀 guaranteed 200% ROI daily!", []),
        ("Dm me to boost followers instantly @promo_hub cheap rates organic growth 🔥", []),
        ("Work from home earning $500/day DM on WhatsApp +18005550199 💰", []),
        ("Free iPhone 16 giveaway link in my bio check now 🎁", [])
    ],
    "emoji_junk": [
        ("🔥🔥🔥", ["emoji_praise"]),
        ("❤️❤️", ["emoji_praise"]),
        ("👏👏👏", ["emoji_praise"]),
        ("🙌🙌", ["emoji_praise"]),
        ("💯", ["emoji_praise"]),
        ("yo", []),
        ("nice", []),
        ("ok", [])
    ]
}

def generate_comments(target_count=300):
    comments = []
    base_time = datetime.now(timezone.utc) - timedelta(days=28)
    
    # Realistic category weights tailored to Instagram post engagement:
    # Requests: 28%
    # Questions: 25%
    # Confusion: 12%
    # Pain points: 14%
    # Praise: 10%
    # More of this: 5%
    # Criticism: 2%
    # Spam: 2%
    # Emoji junk: 2%
    cat_weights = {
        "request": 28,
        "question": 25,
        "pain_point": 14,
        "confusion": 12,
        "praise": 10,
        "more_of_this": 5,
        "criticism": 2,
        "spam": 2,
        "emoji_junk": 2
    }
    categories = list(cat_weights.keys())
    weights = [cat_weights[c] for c in categories]

    # Map posts by format for realistic correlation:
    # Carousels receive more Questions and Pain Points
    # Reels receive more Requests, Praise, and Confusion
    # Images receive more Praise, Spam, or Casual Comments
    reels = [p for p in POSTS if p["post_format"] == "reel"]
    carousels = [p for p in POSTS if p["post_format"] == "carousel"]
    images = [p for p in POSTS if p["post_format"] == "image"]

    for i in range(1, target_count + 1):
        chosen_cat = random.choices(categories, weights=weights, k=1)[0]
        pool = COMMENT_CATEGORIES[chosen_cat]
        base_text, tags = random.choice(pool)

        # Correlate post format
        if chosen_cat in ["question", "pain_point"]:
            post = random.choice(carousels + reels[:3])
        elif chosen_cat in ["request", "confusion"]:
            post = random.choice(reels + carousels[:2])
        elif chosen_cat in ["praise", "more_of_this"]:
            post = random.choice(reels + carousels + images)
        else:
            post = random.choice(POSTS)

        username = random.choice(USERS)

        # Instagram engagement metrics:
        # High viral comments have many likes and reply_counts!
        # When people ask "part 2 kab aayega" or "link?", many people reply "+1", "same", "following"
        if chosen_cat in ["request", "question"]:
            if random.random() < 0.25:
                likes = random.randint(45, 380)
                reply_count = random.randint(8, 42)
            elif random.random() < 0.6:
                likes = random.randint(12, 44)
                reply_count = random.randint(2, 7)
            else:
                likes = random.randint(1, 11)
                reply_count = random.randint(0, 2)
        elif chosen_cat == "praise":
            likes = random.randint(5, 120)
            reply_count = random.randint(0, 3)
        elif chosen_cat in ["spam", "emoji_junk"]:
            likes = random.randint(0, 2)
            reply_count = 0
        else:
            likes = random.randint(0, 25)
            reply_count = random.randint(0, 4)

        # Stagger timestamp over past 28 days
        offset_minutes = random.randint(0, 28 * 24 * 60)
        timestamp = (base_time + timedelta(minutes=offset_minutes)).isoformat()

        comments.append({
            "comment_id": f"c_{1000 + i}",
            "post_id": post["post_id"],
            "post_format": post["post_format"],
            "post_caption": post["caption"],
            "username": f"@{username}",
            "text": base_text,
            "likes": likes,
            "reply_count": reply_count,
            "timestamp": timestamp
        })

    return comments

if __name__ == "__main__":
    data = generate_comments(300)
    out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "demo_comments.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Generated {len(data)} Instagram-native demo comments across {len(POSTS)} posts into {out_path}")
