import { FileText, Plus, Search, Filter } from "lucide-react";
import Link from "next/link";

const studioSessions = [
  {
    id: "1",
    title: "Reel: 3 Hidden Notion Features",
    status: "in_progress",
    currentStage: "Script",
    progress: 40,
    updatedAt: "2 hours ago",
    platform: "Instagram Reels",
  },
  {
    id: "2",
    title: "YouTube: Building a SaaS in 30 Days",
    status: "draft",
    currentStage: "Research",
    progress: 15,
    updatedAt: "Yesterday",
    platform: "YouTube",
  },
  {
    id: "3",
    title: "LinkedIn: My Productivity Stack",
    status: "completed",
    currentStage: "Published",
    progress: 100,
    updatedAt: "3 days ago",
    platform: "LinkedIn",
  },
];

const stages = [
  "Research",
  "Angles",
  "Narrative",
  "Script",
  "Visuals",
  "Shot List",
  "Copy",
];

export default function StudioPage() {
  return (
    <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Studio</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Your 7-stage content production pipeline
          </p>
        </div>
        <Link
          href="/studio/new"
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {stages.map((stage) => (
          <span
            key={stage}
            className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            {stage}
          </span>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {studioSessions.map((session) => (
          <Link
            key={session.id}
            href={`/studio/${session.id}`}
            className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{session.title}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{session.platform}</span>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  session.status === "in_progress"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : session.status === "completed"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {session.status.replace("_", " ")}
              </span>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500 dark:text-gray-400">Progress</span>
                <span className="font-medium">{session.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all"
                  style={{ width: `${session.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Current: {session.currentStage}</span>
              <span>{session.updatedAt}</span>
            </div>
          </Link>
        ))}
      </div>

      {studioSessions.length === 0 && (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No projects yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Start your first content project in the Studio
          </p>
          <Link
            href="/studio/new"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </Link>
        </div>
      )}
    </div>
  );
}