"use client";

import { createContext, type ReactNode, useContext } from "react";
import { useControllable } from "../hooks/use-controllable";

interface WizardContextValue {
  step: string | undefined;
  setStep: (step: string) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("Wizard components must be used within Wizard");
  }
  return context;
}

export interface WizardProps {
  step?: string;
  defaultStep?: string;
  onStepChange?: (step: string) => void;
  children: ReactNode | ((context: WizardContextValue) => ReactNode);
  className?: string;
}

export function Wizard({
  step: controlledStep,
  defaultStep,
  onStepChange,
  children,
  className,
}: WizardProps) {
  const [step, setStep] = useControllable({
    value: controlledStep,
    defaultValue: defaultStep,
    onChange: onStepChange,
  });

  const contextValue = { step, setStep };

  return (
    <WizardContext.Provider value={contextValue}>
      <div className={className}>
        {typeof children === "function" ? children(contextValue) : children}
      </div>
    </WizardContext.Provider>
  );
}

export interface WizardStepProps {
  name: string;
  children: ReactNode;
  className?: string;
}

export function WizardStep({ name, children, className }: WizardStepProps) {
  const { step } = useWizard();
  if (step !== name) {
    return null;
  }

  return <div className={className}>{children}</div>;
}
