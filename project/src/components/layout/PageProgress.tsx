
import * as Progress from '@radix-ui/react-progress';

interface PageProgressProps {
  steps: string[];
  currentStep: number;
}

export function PageProgress({ steps, currentStep }: PageProgressProps) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="flex justify-between mb-2">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`flex items-center ${
              index <= currentStep ? 'text-primary' : 'text-foreground/40'
            }`}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  index <= currentStep
                    ? 'border-primary bg-primary/10'
                    : 'border-foreground/20 bg-card'
                }`}
              >
                {index + 1}
              </div>
              <span className="mt-2 text-sm font-medium">{step}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-[2px] w-full mx-4 mt-4 ${
                  index < currentStep ? 'bg-primary' : 'bg-foreground/20'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <Progress.Root
        className="relative overflow-hidden bg-foreground/10 rounded-full w-full h-2"
        value={(currentStep / (steps.length - 1)) * 100}
      >
        <Progress.Indicator
          className="bg-primary w-full h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${100 - ((currentStep / (steps.length - 1)) * 100)}%)` }}
        />
      </Progress.Root>
    </div>
  );
}