import { Calendar, Clock, Flame, RotateCcw, Plus, Play } from "lucide-react";
import { format, addDays } from "date-fns";
import Link from "next/link";

export default function TodayPage() {
  const today = new Date();
  const tomorrow = addDays(today, 1);

  const todaysPlan = [
    {
      id: "1",
      title: "Reel: \"3 Hidden Notion Features\"",
      platform: "Instagram Reels",
      priority: "high",
      estimatedMinutes: 45,
      status: "pending",
      stages: ["Script", "Film", "Edit", "Caption", "Publish"],
    },
    {
      id: "2",
      title: "Carousel: \"My Morning Routine\"",
      platform: "Instagram Carousel",
      priority: "medium",
      estimatedMinutes: 30,
      status: "pending",
      stages: ["Design", "Caption", "Publish"],
    },
    {
      id: "3",
      title: "Tweet Thread: \"Productivity Myths\"",
      platform: "X (Twitter)",
      priority: "low",
      estimatedMinutes: 20,
      status: "pending",
      stages: ["Write", "Thread", "Publish"],
    },
  ];

  const totalMinutes = todaysPlan.reduce((sum, item) => sum + item.estimatedMinutes, 0);

  return (
    <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Today</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {format(today, "EEEE, MMMM d")} · {totalMinutes} min planned
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh Plan
          </button>
          <Link href="/studio/new" className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create New</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Time Budget</span>
          </div>
          <div className="text-3xl font-bold">{totalMinutes} min</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-1">
            <Flame className="h-4 w-4" />
            <span className="text-sm">Priority Items</span>
          </div>
          <div className="text-3xl font-bold">{todaysPlan.filter(p => p.priority === "high").length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Total Tasks</span>
          </div>
          <div className="text-3xl font-bold">{todaysPlan.length}</div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Today's Plan</h2>
        {todaysPlan.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold">{item.title}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.priority === "high"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : item.priority === "medium"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{item.platform}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{item.estimatedMinutes} min</span>
                  </span>
                </div>
                <div className="flex items-center space-x-2 flex-wrap">
                  {item.stages.map((stage) => (
                    <span
                      key={stage}
                      className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      {stage}
                    </span>
                  ))}
                </div>
              </div>
              <button className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 flex items-center space-x-2">
                <Play className="h-4 w-4" />
                <span>Start</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-semibold mb-2">Fallback Ideas</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          If you finish early or need a backup: Quick Q&A Reel from recent comments, Behind-the-scenes Story, or Tip Tuesday carousel.
        </p>
      </div>
    </div>
  );
}