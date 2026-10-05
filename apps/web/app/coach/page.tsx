import { Target, Star, AlertTriangle, Lightbulb, BookOpen } from "lucide-react";

export default function CoachPage() {
  const scorecard = [
    { dimension: "Hook Strength", score: 4, max: 5, description: "Opening grabs attention" },
    { dimension: "Pacing & Flow", score: 3, max: 5, description: "Rhythm keeps viewers engaged" },
    { dimension: "Voice Match", score: 5, max: 5, description: "Sounds authentically like you" },
    { dimension: "Value Delivery", score: 4, max: 5, description: "Delivers on the promise" },
  ];

  const recentLessons = [
    {
      title: "Lead with the problem, not the greeting",
      insight: "Your last Reel lost 60% of viewers in the first 3 seconds with 'Hey guys, today I want to talk about...'",
      action: "Start directly with the pain point or curiosity hook",
      date: "2 days ago",
    },
    {
      title: "Shorter sentences = higher retention",
      insight: "Analysis shows your best-performing content averages 12 words/sentence vs 18 in lower performers",
      action: "Edit scripts for punchier, shorter sentences",
      date: "1 week ago",
    },
  ];

  return (
    <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Coach</h1>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Content Scorecard</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Review your latest draft against the 4-dimension quality framework
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {scorecard.map((item) => (
            <div
              key={item.dimension}
              className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{item.dimension}</h3>
                <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {item.score}/{item.max}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-primary-600 rounded-full"
                  style={{ width: `${(item.score / item.max) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <span className="font-medium">Overall Score</span>
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {scorecard.reduce((sum, s) => sum + s.score, 0) / scorecard.length}/5
            </span>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Actionable Lessons</h2>
        <div className="space-y-4">
          {recentLessons.map((lesson, index) => (
            <div
              key={index}
              className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Lightbulb className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{lesson.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{lesson.insight}</p>
                  <div className="flex items-center space-x-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-yellow-700 dark:text-yellow-400">Action:</span>
                    <span className="text-gray-600 dark:text-gray-300">{lesson.action}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{lesson.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Review a Draft</h2>
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Paste a draft or link to get a full scorecard analysis with voice matching and improvement suggestions.
          </p>
          <button className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700">
            Analyze Content
          </button>
        </div>
      </section>
    </div>
  );
}