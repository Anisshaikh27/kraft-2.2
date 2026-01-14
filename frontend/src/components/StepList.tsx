import { CheckCircle, Circle, Clock, Loader2 } from "lucide-react";
import { Step } from "../types";

interface StepsListProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
}

export function StepsList({ steps, currentStep, onStepClick }: StepsListProps) {
  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4 h-full overflow-auto">
      <h2 className="text-lg font-semibold mb-4 text-gray-100">Build Steps</h2>
      
      {steps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mb-2" />
          <p>Generating project structure...</p>
        </div>
      )}
      
      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
              currentStep === step.id
                ? "bg-gray-800 border border-gray-700"
                : "hover:bg-gray-800"
            } ${
              step.status === "completed" 
                ? "opacity-70" 
                : step.status === "in-progress"
                ? "ring-2 ring-indigo-500"
                : ""
            }`}
            onClick={() => onStepClick(step.id)}
          >
            <div className="flex items-center gap-2">
              {step.status === "completed" ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : step.status === "in-progress" ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-600 flex-shrink-0" />
              )}
              <h3 className="font-medium text-gray-100 text-sm">{step.title}</h3>
            </div>
            {step.description && (
              <p className="text-xs text-gray-400 mt-2 ml-7">{step.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}