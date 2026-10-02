# Instagram Comment Analyzer

This project fetches comments and replies from posts managed by a connected Instagram professional account, filters spam and translates emojis, then uses Gemini to categorize the results into Themes, Questions, Complaints, and Opportunities.

## Setup

1. Install Node.js 20 or later, then run `npm install`.
2. Copy `.env.example` to `.env` and set the credentials for your Meta professional account and Gemini API.
3. In Meta for Developers, configure Instagram Graph API access and grant the token the permissions required to read the account's media and comments, including `instagram_basic` and `instagram_manage_comments`.
4. Run `npm test` to execute the local tests, then run `npm start` and open `http://localhost:3000`.

## Dashboard

Paste a permalink from the connected account into the dashboard. The analyzer follows Graph API pagination for the account's media, top-level comments, and replies, then classifies all fetched entries in batches of 25. Posts from accounts you do not manage are not available through this integration.
