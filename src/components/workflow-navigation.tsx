'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkflowStep = 'blueprint' | 'title' | 'chapters';

interface WorkflowNavigationProps {
  projectId: string;
  currentStep: WorkflowStep;
  completedSteps?: WorkflowStep[];
  projectHasOutline?: boolean;
  projectHasTitle?: boolean;
}

const steps: { id: WorkflowStep; label: string; path: (projectId: string) => string }[] = [
  { id: 'blueprint', label: 'Blueprint', path: (id) => `/dashboard/co-author/${id}` },
  { id: 'title', label: 'Title', path: (id) => `/dashboard/co-author/${id}/title-generator` },
  { id: 'chapters', label: 'Chapters', path: (id) => `/dashboard/co-author/${id}/chapters` },
];

export function WorkflowNavigation({
  projectId,
  currentStep,
  completedSteps = [],
  projectHasOutline = false,
  projectHasTitle = false,
}: WorkflowNavigationProps) {
  const router = useRouter();

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const previousStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;
  const nextStep = currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1] : null;

  const canGoBack = currentStepIndex > 0;
  const canGoForward = 
    (currentStep === 'blueprint' && projectHasOutline) ||
    (currentStep === 'title' && projectHasTitle);

  const isStepCompleted = (stepId: WorkflowStep) => {
    if (stepId === 'blueprint') return projectHasOutline;
    if (stepId === 'title') return projectHasTitle;
    return completedSteps.includes(stepId);
  };

  const canNavigateToStep = (stepId: WorkflowStep) => {
    if (stepId === currentStep) return true;
    if (stepId === 'blueprint') return true;
    if (stepId === 'title') return projectHasOutline;
    if (stepId === 'chapters') return projectHasOutline && projectHasTitle;
    return false;
  };

  const handleNavigate = (stepId: WorkflowStep) => {
    if (!canNavigateToStep(stepId)) return;
    const step = steps.find((s) => s.id === stepId);
    if (step) {
      router.push(step.path(projectId));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => previousStep && handleNavigate(previousStep.id)}
          disabled={!canGoBack}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {previousStep ? previousStep.label : 'Previous'}
        </Button>

        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const canNavigate = canNavigateToStep(step.id);
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => handleNavigate(step.id)}
                  disabled={!canNavigate}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    !canNavigate && 'cursor-not-allowed opacity-50',
                    step.id === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : isStepCompleted(step.id)
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {isStepCompleted(step.id) && step.id !== currentStep && (
                    <Check className="h-3 w-3" />
                  )}
                  <span>{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => nextStep && handleNavigate(nextStep.id)}
          disabled={!canGoForward}
        >
          {nextStep ? nextStep.label : 'Next'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Step {currentStepIndex + 1} of {steps.length}
      </div>
    </div>
  );
}
