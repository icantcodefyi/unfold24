"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { motion, type HTMLMotionProps } from "framer-motion";

interface CodeProps {
  node?: unknown;
  children?: string;
  className?: string;
  inline?: boolean;
}

interface AbiItem {
  type: string;
  name?: string;
  inputs?: Array<{
    type: string;
    name: string;
    components?: Array<{
      type: string;
      name: string;
    }>;
  }>;
  outputs?: Array<{
    type: string;
    name: string;
  }>;
  stateMutability?: string;
  payable?: boolean;
  constant?: boolean;
}

interface ContentRendererProps {
  content: string;
  type?: "status" | "error" | "message";
  status?: "in_progress" | "completed" | "failed" | "retry";
  agent?: string;
  action?: string;
  data?: {
    contract_code?: string;
    security_analysis?: string;
    abi?: AbiItem[];
    bytecode?: string;
    name?: string;
    type?: string;
    features?: string[];
    analysis?: string;
    attempt?: number;
    max_attempts?: number;
    error?: string;
    message?: string;
  };
}

const MarkdownComponents: Partial<Components> = {
  code: ({ children = "", className, inline, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className ?? "");
    if (inline) {
      return (
        <code
          className="rounded bg-gray-800 px-1 py-0.5 text-sm text-gray-200"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <SyntaxHighlighter
        language={match?.[1] ?? "text"}
        style={oneDark}
        customStyle={{ background: "transparent", padding: "1rem" }}
        className="rounded border border-gray-800 bg-gray-900/50"
        wrapLongLines
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    );
  },
  p: ({ children, ...props }) => (
    <motion.p
      {...(props as HTMLMotionProps<"p">)}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.5 }}
      className="mb-2 text-gray-200"
    >
      {children}
    </motion.p>
  ),
  h3: ({ children, ...props }) => (
    <motion.h3
      {...(props as HTMLMotionProps<"h3">)}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.5 }}
      className="mb-2 mt-4 text-lg font-medium text-gray-100"
    >
      {children}
    </motion.h3>
  ),
  ul: ({ children, ...props }) => (
    <motion.ul
      {...(props as HTMLMotionProps<"ul">)}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.5 }}
      className="mb-2 list-disc pl-4 text-gray-200"
    >
      {children}
    </motion.ul>
  ),
  li: ({ children, ...props }) => (
    <motion.li
      {...(props as HTMLMotionProps<"li">)}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-1"
    >
      {children}
    </motion.li>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-medium text-gray-100" {...props}>
      {children}
    </strong>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 hover:underline"
      {...props}
    >
      {children}
    </a>
  ),
};

const AttemptIndicator = ({
  attempt,
  maxAttempts,
}: {
  attempt: number;
  maxAttempts: number;
}) => (
  <div className="flex items-center gap-2">
    <div className="flex gap-1">
      {Array.from({ length: maxAttempts }).map((_, i) => (
        <div
          key={`attempt-${i}`}
          className={`h-2 w-2 rounded-full ${
            i < attempt ? "bg-purple-500" : "bg-purple-800"
          }`}
        />
      ))}
    </div>
    <span className="text-xs text-purple-300">
      Attempt {attempt} of {maxAttempts}
    </span>
  </div>
);

const ContentRenderer = React.memo(function ContentRenderer(
  props: ContentRendererProps,
) {
  console.log(
    props.content,
    props.type,
    props.status,
    props.agent,
    props.action,
    props.data,
  );
  if (props.type === "status") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-lg p-4 ${
          props.status === "completed"
            ? "border border-purple-500/30 bg-purple-900/30"
            : props.status === "failed"
              ? "border border-red-500/30 bg-red-900/20"
              : "border border-purple-700/30 bg-purple-900/20"
        }`}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-purple-200">{props.agent}</span>
            {props.status === "in_progress" && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            )}
          </div>
          <span className="text-sm text-purple-300">
            {props.status === "in_progress" ? "Processing..." : props.status}
          </span>
        </div>
        <div className="text-purple-300">{props.action}</div>

        {props.status === "retry" &&
          props.data?.attempt &&
          props.data?.max_attempts && (
            <div className="mt-2">
              <AttemptIndicator
                attempt={props.data.attempt}
                maxAttempts={props.data.max_attempts}
              />
            </div>
          )}

        {props.status === "completed" && (
          <>
            {props.data?.message && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-4 text-purple-200"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={MarkdownComponents as Components}
                >
                  {props.data.message}
                </ReactMarkdown>
              </motion.div>
            )}

            {props.data?.contract_code && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-4 rounded border border-purple-800/30 bg-purple-950/50 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-200">
                    Contract Code
                  </span>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        props.data?.contract_code ?? "",
                      )
                    }
                    className="rounded bg-purple-800/30 px-2 py-1 text-xs text-purple-300 transition-colors hover:bg-purple-700/30"
                  >
                    Copy Code
                  </button>
                </div>
                <SyntaxHighlighter
                  language="solidity"
                  style={oneDark}
                  customStyle={{ background: "transparent", padding: 0 }}
                  wrapLongLines
                >
                  {props.data.contract_code}
                </SyntaxHighlighter>
              </motion.div>
            )}
          </>
        )}

        {props.status === "failed" && props.data?.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-red-400"
          >
            {props.data.error}
          </motion.div>
        )}

        {props.data?.features && props.data.features.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 rounded border border-purple-800/30 bg-purple-950/50 p-4"
          >
            <div className="mb-2 text-sm font-medium text-purple-200">
              Features
            </div>
            <ul className="list-disc pl-4 text-purple-300">
              {props.data.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </motion.div>
        )}

        {(props.data?.security_analysis ?? props.data?.analysis) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 rounded border border-purple-800/30 bg-purple-950/50 p-4"
          >
            <div className="mb-2 text-sm font-medium text-purple-200">
              Security Analysis
            </div>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MarkdownComponents as Components}
              key={"security-analysis"}
            >
              {props.data.security_analysis ?? props.data.analysis ?? ""}
            </ReactMarkdown>
          </motion.div>
        )}
      </motion.div>
    );
  }

  if (props.type === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-lg border border-red-500/30 bg-red-900/20 p-4"
      >
        <div className="mb-1 font-medium text-red-300">{props.agent} Error</div>
        <div className="text-red-400">{props.content}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.5 }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MarkdownComponents as Components}
      >
        {props.content}
      </ReactMarkdown>
    </motion.div>
  );
});

export default ContentRenderer;
