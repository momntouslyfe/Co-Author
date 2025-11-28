'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type OfferWorkflowStep = 'blueprint' | 'title' | 'sections';

interface OfferWorkflowNavigationProps {
  projectId: string;
  offerId: string;
  currentStep: OfferWorkflowStep;
  completedSteps?: OfferWorkflowStep[];
  offerHasBlueprint?: boolean;
  offerHasTitle?: boolean;
}

const steps: { id: OfferWorkflowStep; label: string; path: (projectId: string, offerId: string) => string }[] = [
  { id: 'blueprint', label: 'Blueprint', path: (pid, oid) => `/dashboard/offer-workspace/${pid}/${oid}` },
  { id: 'title', label: 'Title', path: (pid, oid) => `/dashboard/offer-workspace/${pid}/${oid}/title-generator` },
  { id: 'sections', label: 'Sections', path: (pid, oid) => `/dashboard/offer-workspace/${pid}/${oid}/sections` },
];

export function OfferWorkflowNavigation({
  projectId,
  offerId,
  currentStep,
  completedSteps = [],
  offerHasBlueprint = false,
  offerHasTitle = false,
}: OfferWorkflowNavigationProps) {
  const router = useRouter();

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const previousStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;
  const nextStep = currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1] : null;

  const canGoBack = currentStepIndex > 0;
  const canGoForward = 
    (currentStep === 'blueprint' && offerHasBlueprint) ||
    (currentStep === 'title' && offerHasTitle);

  const isStepCompleted = (stepId: OfferWorkflowStep) => {
    if (stepId === 'blueprint') return offerHasBlueprint;
    if (stepId === 'title') return offerHasTitle;
    return completedSteps.includes(stepId);
  };

  const canNavigateToStep = (stepId: OfferWorkflowStep) => {
    if (stepId === currentStep) return true;
    if (stepId === 'blueprint') return true;
    if (stepId === 'title') return offerHasBlueprint;
    if (stepId === 'sections') return offerHasBlueprint && offerHasTitle;
    return false;
  };

  const handleNavigate = (stepId: OfferWorkflowStep) => {
    if (!canNavigateToStep(stepId)) return;
    const step = steps.find((s) => s.id === stepId);
    if (step) {
      router.push(step.path(projectId, offerId));
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
