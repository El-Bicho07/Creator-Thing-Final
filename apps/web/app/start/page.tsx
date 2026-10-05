import { Target, Users, Flag, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function StartPage() {
  const steps = [
    {
      number: "01",
      title: "Define Your Niche",
      description: "Tell us what you create and who you create for",
      icon: Target,
      href: "/start/niche",
    },
    {
      number: "02",
      title: "Know Your Audience",
      description: "Describe your ideal viewer/reader in detail",
      icon: Users,
      href: "/start/audience",
    },
    {
      number: "03",
      title: "Set Your Goals",
      description: "Define what success looks like for you",
      icon: Flag,
      href: "/start/goals",
    },
    {
      number: "04",
      title: "Build Your Voice",
      description: "Share sample content to train your voice profile",
      icon: Sparkles,
      href: "/start/voice",
    },
  ];

  return (
    <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Welcome to Solo Creator OS</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Let's set up your creator operating system. We'll learn your niche, audience, goals,
          and unique voice so every piece of content feels like <em className="font-medium">you</em>.
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((step, index) => (
          <Link
            key={step.title}
            href={step.href}
            className="group flex items-center space-x-6 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-xl font-bold text-primary-700 dark:text-primary-300">
                {step.number}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <step.icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg font-semibold group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
                  {step.title}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">{step.description}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
          </Link>
        ))}
      </div>

      <div className="mt-16 p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50">
        <h2 className="text-lg font-semibold mb-3">What you'll get</h2>
        <ul className="space-y-2 text-gray-600 dark:text-gray-300">
          <li className="flex items-center space-x-2"><span className="text-primary-600">✓</span> Personalized content strategy</li>
          <li className="flex items-center space-x-2"><span className="text-primary-600">✓</span> AI that writes in your voice</li>
          <li className="flex items-center space-x-2"><span className="text-primary-600">✓</span> Daily content recommendations</li>
          <li className="flex items-center space-x-2"><span className="text-primary-600">✓</span> Performance-driven learning loop</li>
        </ul>
      </div>
    </div>
  );
}