import { TrendingUp, MessageSquare, BarChart3, Lightbulb, Users, Target } from "lucide-react";

export default function GrowthPage() {
  const metrics = [
    { label: "Total Views (30d)", value: "124.5K", change: "+12%", trend: "up" },
    { label: "Engagement Rate", value: "4.2%", change: "+0.3%", trend: "up" },
    { label: "New Followers", value: "2,847", change: "-5%", trend: "down" },
    { label: "Content Published", value: "18", change: "+2", trend: "up" },
  ];

  const commentThemes = [
    { theme: "How-to requests", count: 47, sentiment: "positive", examples: ["How do you set up...", "Can you show..."] },
    { theme: "Feature requests", count: 32, sentiment: "neutral", examples: ["Add support for...", "Wish there was..."] },
    { theme: "Praise/Thanks", count: 89, sentiment: "positive", examples: ["This helped so much!", "Great explanation!"] },
    { theme: "Criticism/Bugs", count: 12, sentiment: "negative", examples: ["Didn't work for me", "Missing step 3"] },
  ];

  const contentOpportunities = [
    {
      title: "Notion Database Templates Deep Dive",
      source: "47 comments asking for templates",
      potential: "High",
      format: "YouTube + Reels",
    },
    {
      title: "Advanced Formulas for Beginners",
      source: "Comment thread with 23 replies",
      potential: "Medium",
      format: "Carousel + Thread",
    },
    {
      title: "Notion vs Obsidian Comparison",
      source: "Recurring question in DMs",
      potential: "High",
      format: "Long-form Video",
    },
  ];

  return (
    <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Growth</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Performance Overview (30 days)</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</span>
                <span
                  className={`text-sm font-medium ${
                    metric.trend === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {metric.change}
                </span>
              </div>
              <div className="text-3xl font-bold">{metric.value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2 mb-8">
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Comment Themes</span>
          </h2>
          <div className="space-y-4">
            {commentThemes.map((theme) => (
              <div
                key={theme.theme}
                className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{theme.theme}</h3>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{theme.count} comments</span>
                </div>
                <div className="flex items-center space-x-2 text-xs mb-2">
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      theme.sentiment === "positive"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : theme.sentiment === "negative"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    {theme.sentiment}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {theme.examples.slice(0, 2).join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <Lightbulb className="h-5 w-5" />
            <span>Content Opportunities</span>
          </h2>
          <div className="space-y-4">
            {contentOpportunities.map((opp, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{opp.title}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      opp.potential === "High"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    {opp.potential} Potential
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{opp.source}</p>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {opp.format}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">Top Performing Content</h2>
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            Detailed analytics and content performance breakdown coming soon.
          </p>
        </div>
      </section>
    </div>
  );
}