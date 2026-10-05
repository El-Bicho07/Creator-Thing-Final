# AI Output Evaluation Rubric — Creator SaaS Platform

*Defines quantifiable evaluation criteria for testing AI generation quality across all product features.*

---

## Evaluation Dimensions & Scoring (1–5 Scale)

| Dimension | Description | Score 1 (Fail) | Score 3 (Acceptable) | Score 5 (Excellent) |
|:---|:---|:---|:---|:---|
| **Relevance & Intent** | Degree to which output aligns with topic, niche, target audience, and user request | Off-topic or ignores target audience constraints | Relevant but generic topic coverage | Direct, highly specific alignment with niche and audience |
| **Voice Match Score** | Similarity to creator's analyzed voice profile (pacing, vocabulary, tone, syntax) | Generic AI tone ("In today's fast-paced world...") | Matches tone keywords but misses specific pacing | Indistinguishable from creator's actual writing style |
| **Hook Strength** | Ability of hook/opening line to grab attention, create curiosity gap, or state value | Weak statement or cliché opening | Clear topic statement | Powerful curiosity gap, story trigger, or punchy stat |
| **Faithfulness & Accuracy** | Adherence to provided background facts, research sources, or transcript context | Hallucinates facts or contradicts input | Factually accurate without deep detail | Highly accurate, well-grounded with precise citations |
| **Actionability & Value** | Practical utility for the creator's workflow and end-audience engagement | Abstract advice or fluff | Usable draft requiring light editing | Publish-ready content requiring zero structural edits |
| **Effort / Time Fit** | Alignment of generated script/plan with creator's specified time budget | Overly complex execution plan | Realistic plan requiring moderate effort | Efficient, high-impact content plan matching time budget |

---

## Quality Thresholds

- **Acceptable Release Criteria:** Overall mean score $\ge 4.0$ across all 6 dimensions.
- **Voice Match Threshold:** Voice match score must evaluate $\ge 80\%$ via the Voice Replicator validator (`apps/api/app/voice/validators.py`).
- **Zero Generic AI Phrases:** Generation rejected if containing flagged clichés ("Delve", "In conclusion", "Game-changer", "Tapestry").
