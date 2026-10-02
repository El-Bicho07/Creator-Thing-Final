import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

interface StepperProps {
  steps: { title: string; description?: string }[];
  currentStep: number; // 1-indexed
  onStepClick?: (step: number) => void;
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-zinc-800 -z-0" />
        
        {steps.map((step, idx) => {
          const stepNumber = idx + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div
              key={step.title}
              className={cn(
                'flex flex-col items-center relative z-10 group',
                onStepClick && stepNumber <= currentStep ? 'cursor-pointer' : ''
              )}
              onClick={() => onStepClick && stepNumber <= currentStep && onStepClick(stepNumber)}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2',
                  isCompleted
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : isCurrent
                    ? 'border-indigo-500 bg-zinc-900 text-indigo-400 ring-4 ring-indigo-500/20'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-500'
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
              </div>
              <span
                className={cn(
                  'text-xs font-medium mt-2 max-w-[100px] text-center truncate',
                  isCurrent ? 'text-indigo-400 font-semibold' : isCompleted ? 'text-zinc-300' : 'text-zinc-500'
                )}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
