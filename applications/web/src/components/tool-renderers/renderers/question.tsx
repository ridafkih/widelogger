"use client";

import { Check, Loader2, X } from "lucide-react";
import { createContext, type ReactNode, use, useState } from "react";
import { tv } from "tailwind-variants";
import { useQuestionActions } from "@/lib/question-context";
import { getArray, getString } from "../shared";
import type { ToolRendererProps } from "../types";

interface QuestionOption {
  label: string;
  description: string;
}

interface QuestionInfo {
  question: string;
  header: string;
  options: QuestionOption[];
  multiple?: boolean;
  custom?: boolean;
}

interface QuestionStateContextValue {
  state: {
    selectedByQuestion: Map<number, Set<string>>;
    customByQuestion: Map<number, string>;
  };
  actions: {
    toggleOption: (
      questionIndex: number,
      label: string,
      allowMultiple: boolean
    ) => void;
    setCustomValue: (questionIndex: number, value: string) => void;
  };
}

const QuestionStateContext = createContext<QuestionStateContextValue | null>(
  null
);

function useQuestionState() {
  const context = use(QuestionStateContext);
  if (!context) {
    throw new Error(
      "Question components must be used within QuestionStateProvider"
    );
  }
  return context;
}

const card = tv({
  base: "flex flex-col gap-3 border border-border bg-bg-muted p-3",
});

const header = tv({
  base: "border border-border bg-bg px-1.5 py-0.5 text-[10px] text-text-muted",
});

const questionText = tv({
  base: "text-text text-xs",
});

const option = tv({
  base: "flex items-start gap-2 border p-2 text-left",
  variants: {
    selected: {
      true: "border-text-muted bg-bg-muted",
      false: "border-border bg-bg hover:border-text-muted",
    },
  },
  defaultVariants: {
    selected: false,
  },
});

const checkboxStyle = tv({
  base: "mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center border",
  variants: {
    selected: {
      true: "border-text bg-text",
      false: "border-text-muted",
    },
    multiple: {
      true: "",
      false: "rounded-full",
    },
  },
  defaultVariants: {
    selected: false,
    multiple: false,
  },
});

const optionLabel = tv({
  base: "text-text text-xs",
});

const optionDescription = tv({
  base: "text-[10px] text-text-muted",
});

const customInput = tv({
  base: "w-full border border-border bg-bg px-2 py-1.5 text-text text-xs placeholder:text-text-muted focus:border-text-muted focus:outline-none",
});

const button = tv({
  base: "flex items-center gap-1 border px-2 py-1 text-xs",
  variants: {
    variant: {
      primary: "",
      secondary: "border-border bg-bg",
    },
    disabled: {
      true: "cursor-not-allowed",
      false: "",
    },
  },
  compoundVariants: [
    {
      variant: "primary",
      disabled: false,
      className: "border-text-muted bg-bg text-text hover:bg-bg-muted",
    },
    {
      variant: "primary",
      disabled: true,
      className: "border-border bg-bg text-text-muted",
    },
    {
      variant: "secondary",
      disabled: false,
      className: "text-text-muted hover:border-text-muted hover:text-text",
    },
    {
      variant: "secondary",
      disabled: true,
      className: "text-text-muted",
    },
  ],
  defaultVariants: {
    variant: "primary",
    disabled: false,
  },
});

function QuestionStateProvider({ children }: { children: ReactNode }) {
  const [selectedByQuestion, setSelectedByQuestion] = useState<
    Map<number, Set<string>>
  >(() => new Map());
  const [customByQuestion, setCustomByQuestion] = useState<Map<number, string>>(
    () => new Map()
  );

  const toggleOption = (
    questionIndex: number,
    label: string,
    allowMultiple: boolean
  ) => {
    setSelectedByQuestion((previous) => {
      const updated = new Map(previous);
      const currentSelected = updated.get(questionIndex) ?? new Set<string>();
      const newSelected = new Set(currentSelected);

      if (newSelected.has(label)) {
        newSelected.delete(label);
      } else {
        if (!allowMultiple) {
          newSelected.clear();
        }
        newSelected.add(label);
      }

      updated.set(questionIndex, newSelected);
      return updated;
    });

    if (!allowMultiple) {
      setCustomByQuestion((previous) => {
        const updated = new Map(previous);
        updated.delete(questionIndex);
        return updated;
      });
    }
  };

  const setCustomValue = (questionIndex: number, value: string) => {
    setCustomByQuestion((previous) => {
      const updated = new Map(previous);
      if (value) {
        updated.set(questionIndex, value);
      } else {
        updated.delete(questionIndex);
      }
      return updated;
    });
  };

  return (
    <QuestionStateContext
      value={{
        state: { selectedByQuestion, customByQuestion },
        actions: { toggleOption, setCustomValue },
      }}
    >
      {children}
    </QuestionStateContext>
  );
}

interface SingleQuestionProps {
  question: QuestionInfo;
  questionIndex: number;
}

function SingleQuestion({ question, questionIndex }: SingleQuestionProps) {
  const { state, actions } = useQuestionState();

  const selectedOptions =
    state.selectedByQuestion.get(questionIndex) ?? new Set<string>();
  const customValue = state.customByQuestion.get(questionIndex) ?? "";
  const allowMultiple = question.multiple ?? false;
  const allowCustom = question.custom !== false;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={header()}>{question.header}</span>
        <span className={questionText()}>{question.question}</span>
      </div>

      <div className="flex flex-col gap-1">
        {question.options.map((questionOption) => {
          const isSelected = selectedOptions.has(questionOption.label);
          return (
            <button
              className={option({ selected: isSelected })}
              key={questionOption.label}
              onClick={() =>
                actions.toggleOption(
                  questionIndex,
                  questionOption.label,
                  allowMultiple
                )
              }
              type="button"
            >
              <div
                className={checkboxStyle({
                  selected: isSelected,
                  multiple: allowMultiple,
                })}
              >
                {isSelected && <Check className="text-bg" size={8} />}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className={optionLabel()}>{questionOption.label}</span>
                <span className={optionDescription()}>
                  {questionOption.description}
                </span>
              </div>
            </button>
          );
        })}

        {allowCustom && (
          <input
            className={customInput()}
            onChange={(event) =>
              actions.setCustomValue(questionIndex, event.target.value)
            }
            placeholder="Other (type your answer)..."
            type="text"
            value={customValue}
          />
        )}
      </div>
    </div>
  );
}

interface ActionButtonsProps {
  callId?: string;
  questions: QuestionInfo[];
  isSubmitting: boolean;
  onReply: (callId: string, answers: string[][]) => Promise<void>;
  onReject: (callId: string) => Promise<void>;
}

function ActionButtons({
  callId,
  questions,
  isSubmitting,
  onReply,
  onReject,
}: ActionButtonsProps) {
  const { state } = useQuestionState();

  const hasAnySelection = questions.some((_, questionIndex) => {
    const selected = state.selectedByQuestion.get(questionIndex);
    const custom = state.customByQuestion.get(questionIndex);
    return (selected && selected.size > 0) || (custom && custom.length > 0);
  });

  const handleReply = async () => {
    if (!callId) {
      return;
    }
    const answers: string[][] = questions.map((_, questionIndex) => {
      const selected =
        state.selectedByQuestion.get(questionIndex) ?? new Set<string>();
      const custom = state.customByQuestion.get(questionIndex);
      const result = [...selected];
      if (custom) {
        result.push(custom);
      }
      return result;
    });

    await onReply(callId, answers);
  };

  const handleReject = async () => {
    if (!callId) {
      return;
    }
    await onReject(callId);
  };

  const isReplyDisabled = isSubmitting || !hasAnySelection || !callId;

  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        className={button({ variant: "primary", disabled: isReplyDisabled })}
        disabled={isReplyDisabled}
        onClick={handleReply}
        type="button"
      >
        <Check size={12} />
        Reply
      </button>
      <button
        className={button({ variant: "secondary", disabled: isSubmitting })}
        disabled={isSubmitting}
        onClick={handleReject}
        type="button"
      >
        <X size={12} />
        Dismiss
      </button>
    </div>
  );
}

function QuestionRenderer({ callId, input, status, error }: ToolRendererProps) {
  const questionActions = useQuestionActions();
  const questions = getArray<QuestionInfo>(input, "questions") ?? [];

  const requestId =
    (callId && questionActions?.questionRequests.get(callId)) ??
    getString(input, "requestId") ??
    getString(input, "requestID") ??
    callId;

  if (status === "completed") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-text-muted text-xs">
        <Check className="text-green-500" size={12} />
        <span>Question answered</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="px-4 py-2 text-red-500 text-xs">
        {error ?? "Failed to process question"}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="px-4 py-2 text-text-muted text-xs">
        No questions to display
      </div>
    );
  }

  if (!questionActions) {
    return (
      <div className="px-4 py-2 text-text-muted text-xs">
        <Loader2 className="mr-2 inline animate-spin" size={12} />
        Loading question...
      </div>
    );
  }

  return (
    <QuestionStateProvider>
      <div className={card()}>
        {questions.map((question, questionIndex) => (
          <SingleQuestion
            key={`${question.header}-${question.question}-${questionIndex}`}
            question={question}
            questionIndex={questionIndex}
          />
        ))}
        <ActionButtons
          callId={requestId}
          isSubmitting={questionActions.isSubmitting}
          onReject={questionActions.reject}
          onReply={questionActions.reply}
          questions={questions}
        />
      </div>
    </QuestionStateProvider>
  );
}

export { QuestionRenderer };
