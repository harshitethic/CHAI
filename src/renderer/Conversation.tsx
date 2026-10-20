import React from "react";
import type { Task, Event } from "../core/contracts";
import { conversation } from "./conversation-model";

// React escapes all content. Raw HTML and executable links are never interpreted.
function Inline({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g)
        .map((part, i) =>
          part.startsWith("`") ? (
            <code key={i}>{part.slice(1, -1)}</code>
          ) : part.startsWith("**") ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : (
            part
          ),
        )}
    </>
  );
}
function MessageText({ text }: { text: string }) {
  return (
    <div className="message-text">
      {text.split(/(```[\s\S]*?```)/g).map((part, i) =>
        part.startsWith("```") ? (
          <pre key={i}>
            <code>{part.slice(3, -3).replace(/^[\w+-]*\n/, "")}</code>
          </pre>
        ) : (
          part
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((paragraph, j) => (
              <p key={`${i}-${j}`}>
                <Inline text={paragraph} />
              </p>
            ))
        ),
      )}
    </div>
  );
}
export function Conversation({
  task,
  events,
}: {
  task: Task;
  events: Event[];
}) {
  const messages = conversation(task, events);
  return (
    <section className="conversation" aria-label="Task conversation">
      {messages.map((message) =>
        message.kind === "tool" ? (
          <details className="conversation-tool" key={message.id}>
            <summary>{message.text}</summary>
            <pre>{message.detail}</pre>
          </details>
        ) : (
          <article
            className={`message ${message.kind}${message.final ? " final-message" : ""}`}
            key={message.id}
          >
            <header>
              <strong>{message.kind === "user" ? "You" : "CHAI"}</strong>
              {message.created && (
                <time dateTime={message.created}>
                  {new Date(message.created).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              )}
              {message.final && <span>Result</span>}
            </header>
            <MessageText text={message.text} />
          </article>
        ),
      )}
      {!messages.some((m) => m.kind === "assistant") &&
        ["PLANNING", "RUNNING", "VALIDATING"].includes(task.state) && (
          <p className="conversation-wait" role="status">
            Waiting for ChatGPT’s first update. Verified actions will appear as
            they finish.
          </p>
        )}
    </section>
  );
}
