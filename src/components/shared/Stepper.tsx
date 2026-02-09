import React from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export interface StepperProps {
  currentStep: number;
  totalSteps: number;
  isRunning: boolean;
  speed: number;
  description: string;
  onStepForward: () => void;
  onStepBackward: () => void;
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  disabled?: boolean;
}

export function Stepper({
  currentStep,
  totalSteps,
  isRunning,
  speed,
  description,
  onStepForward,
  onStepBackward,
  onRun,
  onPause,
  onReset,
  onSpeedChange,
  disabled = false,
}: StepperProps) {
  return (
    <div className="bg-white border-t border-slate-200 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Description */}
        <div className="mb-4 min-h-[3rem] flex items-center">
          <p className="text-sm text-slate-700">
            {description || 'Ready to execute...'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Step info */}
          <div className="text-sm text-slate-600 min-w-[100px]">
            Step {currentStep} / {totalSteps}
          </div>

          {/* Main controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              disabled={disabled || currentStep === 0}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onStepBackward}
              disabled={disabled || currentStep === 0}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Step Backward"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {isRunning ? (
              <button
                onClick={onPause}
                disabled={disabled}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                title="Pause"
              >
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onRun}
                disabled={disabled || currentStep >= totalSteps}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Run"
              >
                <Play className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onStepForward}
              disabled={disabled || currentStep >= totalSteps}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Step Forward"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Speed control */}
          <div className="flex items-center gap-3 ml-8">
            <label className="text-sm text-slate-600">Speed:</label>
            <input
              type="range"
              min="1"
              max="10"
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="w-32"
              disabled={disabled}
            />
            <span className="text-sm text-slate-600 min-w-[20px]">{speed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
