# Syndicate (Creator Collaboration Finder)

## Problem Statement
Creators struggle to discover relevant people for meaningful collaborations. Without a structured way to find creators with overlapping audiences and complementary skills, outreach is often cold, inefficient, and ineffective.

## Solution Overview
Syndicate is a client-side workspace that helps independent creators find collaborators, understand why a match works, and draft a tailored pitch. It uses a 100-point deterministic scoring algorithm based on field adjacency, shared interests, audience size ratio, platform compatibility, and goal alignment to rank potential collaborators.

## Features
- **Instant Discovery**: Automatically ranks a seeded catalog of creators without requiring a full profile setup.
- **Match Analysis**: Explains exactly why a match works (e.g., shared audience, complementary skills) using a comprehensive scoring breakdown.
- **Project Blueprints**: Provides actionable collaboration ideas based on shared interests and platforms (e.g., "A shared resource", "Made together").
- **Pitch Drafter**: Generates personalized outreach drafts (casual or formal) using the selected project blueprint.
- **Save & Manage**: Bookmark creators and save outreach drafts locally to your browser.
- **Pure Client-Side**: No backend required; runs entirely in the browser using static files and `localStorage`.

## Tech Stack
- Vanilla HTML5
- Vanilla CSS3 (Custom properties, grid, flexbox, zero external dependencies)
- Vanilla JavaScript (ES5/ES6, hash-based routing, DOM event delegation)
- No frameworks, no build tools, no CDNs.

## How to run locally
1. Clone the repository.
2. Navigate to this directory (`26_Creator_Collaboration_Finder`).
3. Double-click `index.html` to open it in your browser (using the `file://` protocol), or serve it using a local HTTP server (e.g., `npx serve`, `python -m http.server`, or VS Code Live Server).

## Testing Instructions
- **Routing**: Click around the navigation bar to ensure `#` hash routing works (Discover, Saved, Projects, How it works).
- **Profile Creation**: Click "Create profile", use a preset (e.g., "Technical Writer"), and watch the Discovery grid re-rank instantly based on the new profile.
- **Interaction**: Click "See why we match" on any creator card to open the slide-over drawer.
- **Drafting**: In the drawer, select a project idea, switch to the "Message draft" tab, toggle between Casual and Formal, and click "Save to Projects". Check the "Projects" page to see your saved drafts.
