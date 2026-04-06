import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { Text, matchesKey, Key, truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";

function clampLines(lines: string[], w: number): string[] {
  return lines.map(l => truncateToWidth(l, w));
}

export default function askExtension(pi: ExtensionAPI): void {
  // Simple single question tool
  pi.registerTool({
    name: "ask_user",
    label: "Ask User",
    description:
      "Ask the user a question when you need clarification, confirmation, or a decision. " +
      "Use this instead of guessing. Supports free-text input, yes/no confirmation, or multiple choice.",
    promptSnippet: "Ask the user a question for clarification or decisions",
    promptGuidelines: [
      "Use ask_user when you're unsure about a decision instead of guessing.",
      "Use ask_user for destructive actions, ambiguous requirements, or preference choices.",
      "Don't overuse it — only ask when the answer genuinely affects what you'll do.",
    ],
    parameters: Type.Object({
      question: Type.String({ description: "The question to ask the user" }),
      options: Type.Optional(
        Type.Array(Type.String(), {
          description: "Multiple choice options. Omit for free-text input.",
        })
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      let answer: string | undefined;

      if (!params.options || params.options.length === 0) {
        answer = await ctx.ui.input(params.question);
      } else {
        answer = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
          let selectIndex = 0;
          let freeTextMode = false;
          let inputBuffer = "";
          const opts = params.options!;

          return {
            render: (w: number) => {
              const lines: string[] = [];
              lines.push("");
              wrapTextWithAnsi(params.question, w).forEach(l => lines.push(l));
              lines.push("");

              if (freeTextMode) {
                lines.push(`  ${inputBuffer}█`);
              } else {
                for (let i = 0; i < opts.length; i++) {
                  const marker = i === selectIndex ? theme.fg("accent", "→ ") : "  ";
                  const label = i === selectIndex ? theme.bold(opts[i]) : opts[i];
                  lines.push(`  ${marker}${label}`);
                }
              }

              lines.push("");
              const hint = freeTextMode ? "" : "/: type  ";
              lines.push(theme.fg("dim", `  ${hint}Enter: confirm  Esc: cancel`));
              return clampLines(lines, w);
            },
            handleInput: (data: string) => {
              if (matchesKey(data, Key.escape)) {
                if (freeTextMode) {
                  freeTextMode = false;
                  inputBuffer = "";
                } else {
                  done(null);
                  return;
                }
              } else if (matchesKey(data, "/") && !freeTextMode) {
                freeTextMode = true;
                inputBuffer = "";
              } else if (matchesKey(data, Key.enter)) {
                if (freeTextMode) {
                  done(inputBuffer);
                } else {
                  done(opts[selectIndex]);
                }
                return;
              } else if (freeTextMode) {
                if (matchesKey(data, Key.backspace)) {
                  inputBuffer = inputBuffer.slice(0, -1);
                } else if (data.length === 1 && data >= " ") {
                  inputBuffer += data;
                }
              } else {
                if (matchesKey(data, "j") || matchesKey(data, Key.down)) {
                  selectIndex = Math.min(opts.length - 1, selectIndex + 1);
                } else if (matchesKey(data, "k") || matchesKey(data, Key.up)) {
                  selectIndex = Math.max(0, selectIndex - 1);
                }
              }
              tui.requestRender();
            },
            invalidate: () => {},
          };
        });
      }

      return {
        content: [{ type: "text", text: answer ?? "(no response)" }],
        details: {},
      };
    },
  });

  // Multi-question wizard tool
  pi.registerTool({
    name: "ask_user_multi",
    label: "Ask User (Multi)",
    description:
      "Ask the user multiple questions in a wizard-style flow. " +
      "The user can cycle through questions with Tab/Shift+Tab and go back to change answers. " +
      "Returns all answers at once. Use for gathering requirements, feature specs, or multi-step decisions.",
    promptSnippet: "Ask the user multiple questions in a wizard flow",
    parameters: Type.Object({
      questions: Type.Array(
        Type.Object({
          question: Type.String({ description: "The question text" }),
          type: StringEnum(["text", "select", "confirm"] as const, {
            description: "Question type: text (free input), select (pick from options), confirm (yes/no)",
          }),
          options: Type.Optional(
            Type.Array(Type.String(), { description: "Options for select type" })
          ),
        }),
        { description: "List of questions to ask" }
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const questions = params.questions;
      const answers: (string | undefined)[] = new Array(questions.length).fill(undefined);

      const result = await ctx.ui.custom<string[] | null>((tui, theme, _kb, done) => {
        let currentQ = 0;
        let inputBuffer = "";
        let selectIndex = 0;
        let freeTextMode = false;

        function render(width: number): string[] {
          const lines: string[] = [];
          const q = questions[currentQ];
          const stepLabel = theme.fg("dim", `  ${currentQ + 1}/${questions.length}`);

          lines.push("");
          wrapTextWithAnsi(`${q.question}${stepLabel}`, width).forEach(l => lines.push(l));
          lines.push("");

          // Previous answers
          for (let i = 0; i < currentQ; i++) {
            const prev = questions[i];
            const ans = answers[i] ?? theme.fg("dim", "(skipped)");
            wrapTextWithAnsi(`  ${theme.fg("dim", prev.question)} ${theme.fg("accent", ans)}`, width).forEach(l => lines.push(l));
          }
          if (currentQ > 0) lines.push("");

          // Current question
          if (q.type === "text" || freeTextMode) {
            lines.push(`  ${inputBuffer}█`);
          } else if (q.type === "confirm") {
            const opts = ["Yes", "No"];
            for (let i = 0; i < opts.length; i++) {
              const marker = i === selectIndex ? theme.fg("accent", "→ ") : "  ";
              const label = i === selectIndex ? theme.bold(opts[i]) : opts[i];
              lines.push(`  ${marker}${label}`);
            }
          } else if (q.type === "select" && q.options) {
            for (let i = 0; i < q.options.length; i++) {
              const marker = i === selectIndex ? theme.fg("accent", "→ ") : "  ";
              const label = i === selectIndex ? theme.bold(q.options[i]) : q.options[i];
              lines.push(`  ${marker}${label}`);
            }
          }

          lines.push("");
          const freeTextHint = (q.type === "select" || q.type === "confirm") && !freeTextMode
            ? "/: type  " : "";
          lines.push(theme.fg("dim", `  ${freeTextHint}Tab: next  Shift+Tab: back  Enter: confirm  Esc: cancel`));

          return clampLines(lines, width);
        }

        const text = new Text("", 0, 0);

        text.onKey = (data: string) => {
          const q = questions[currentQ];

          if (matchesKey(data, Key.escape)) {
            if (freeTextMode) {
              freeTextMode = false;
              inputBuffer = "";
              tui.requestRender();
              return true;
            }
            done(null);
            return true;
          }

          // Switch to free-text mode
          if (matchesKey(data, "/") && !freeTextMode && (q.type === "select" || q.type === "confirm")) {
            freeTextMode = true;
            inputBuffer = "";
            tui.requestRender();
            return true;
          }

          // Navigate back
          if (matchesKey(data, "shift+tab")) {
            if (currentQ > 0) {
              if (q.type === "text" || freeTextMode) {
                answers[currentQ] = inputBuffer || undefined;
              }
              freeTextMode = false;
              currentQ--;
              const prev = questions[currentQ];
              if (prev.type === "text") {
                inputBuffer = answers[currentQ] ?? "";
              } else if (prev.type === "confirm") {
                selectIndex = answers[currentQ] === "No" ? 1 : 0;
              } else if (prev.type === "select" && prev.options) {
                const idx = prev.options.indexOf(answers[currentQ] ?? "");
                selectIndex = idx >= 0 ? idx : 0;
                // If answer was custom text, go back to free-text mode
                if (idx < 0 && answers[currentQ]) {
                  freeTextMode = true;
                  inputBuffer = answers[currentQ] ?? "";
                }
              }
            }
            tui.requestRender();
            return true;
          }

          // Confirm / next
          if (matchesKey(data, Key.enter) || matchesKey(data, Key.tab)) {
            if (q.type === "text" || freeTextMode) {
              answers[currentQ] = inputBuffer;
            } else if (q.type === "confirm") {
              answers[currentQ] = selectIndex === 0 ? "Yes" : "No";
            } else if (q.type === "select" && q.options) {
              answers[currentQ] = q.options[selectIndex];
            }

            if (matchesKey(data, Key.enter) && currentQ === questions.length - 1) {
              done(answers as string[]);
              return true;
            }

            if (currentQ < questions.length - 1) {
              freeTextMode = false;
              currentQ++;
              const next = questions[currentQ];
              inputBuffer = answers[currentQ] ?? "";
              selectIndex = 0;
              if (next.type === "confirm" && answers[currentQ]) {
                selectIndex = answers[currentQ] === "No" ? 1 : 0;
              } else if (next.type === "select" && next.options && answers[currentQ]) {
                const idx = next.options.indexOf(answers[currentQ]);
                selectIndex = idx >= 0 ? idx : 0;
                if (idx < 0 && answers[currentQ]) {
                  freeTextMode = true;
                  inputBuffer = answers[currentQ];
                }
              }
            }
            tui.requestRender();
            return true;
          }

          // Text input
          if (q.type === "text" || freeTextMode) {
            if (matchesKey(data, Key.backspace)) {
              inputBuffer = inputBuffer.slice(0, -1);
            } else if (data.length === 1 && data >= " ") {
              inputBuffer += data;
            }
            tui.requestRender();
            return true;
          }

          // Select/confirm navigation
          if (q.type === "confirm") {
            if (matchesKey(data, "j") || matchesKey(data, Key.down)) {
              selectIndex = Math.min(1, selectIndex + 1);
            } else if (matchesKey(data, "k") || matchesKey(data, Key.up)) {
              selectIndex = Math.max(0, selectIndex - 1);
            }
            tui.requestRender();
            return true;
          }

          if (q.type === "select" && q.options) {
            if (matchesKey(data, "j") || matchesKey(data, Key.down)) {
              selectIndex = Math.min(q.options.length - 1, selectIndex + 1);
            } else if (matchesKey(data, "k") || matchesKey(data, Key.up)) {
              selectIndex = Math.max(0, selectIndex - 1);
            }
            tui.requestRender();
            return true;
          }

          return true;
        };

        return {
          render: (w: number) => render(w),
          handleInput: (data: string) => {
            text.onKey?.(data);
            tui.requestRender();
          },
          invalidate: () => {},
        };
      });

      if (!result) {
        return {
          content: [{ type: "text", text: "(wizard cancelled)" }],
          details: {},
        };
      }

      const summary = questions
        .map((q, i) => `${q.question}: ${result[i] ?? "(no answer)"}`)
        .join("\n");

      return {
        content: [{ type: "text", text: summary }],
        details: {},
      };
    },
  });
}
