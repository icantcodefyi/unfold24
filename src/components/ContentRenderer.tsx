"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown/lib/ast-to-react";

interface CodeProps {
  children: string;
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
  type?: 'status' | 'error' | 'message';
  status?: 'in_progress' | 'completed' | 'failed';
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
  };
}

const MarkdownComponents: Components = {
  code: ({ children = "", className, inline }: CodeProps) => {
    const match = /language-(\w+)/.exec(className ?? "");
    if (inline) {
      return (
        <code className="px-1 py-0.5 rounded bg-gray-800 text-gray-200 text-sm">
          {children}
        </code>
      );
    }
    return (
      <SyntaxHighlighter
        language={match?.[1] ?? "text"}
        style={oneDark as any}
        customStyle={{ background: 'transparent', padding: '1rem' }}
        className="rounded border border-gray-800 bg-gray-900/50"
        wrapLongLines
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    );
  },
  p: ({ children }) => <p className="text-gray-200 mb-2">{children}</p>,
  h3: ({ children }) => <h3 className="text-gray-100 font-medium text-lg mt-4 mb-2">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-4 text-gray-200 mb-2">{children}</ul>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  strong: ({ children }) => <strong className="text-gray-100 font-medium">{children}</strong>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 hover:underline"
    >
      {children}
    </a>
  ),
};

function ContentRenderer({ content, type, status, agent, action, data }: ContentRendererProps) {
  if (type === 'status') {
    return (
      <div className={`rounded-lg p-4 ${
        status === 'completed' 
          ? 'bg-purple-900/30 border border-purple-500/30' 
          : status === 'failed'
          ? 'bg-red-900/20 border border-red-500/30'
          : 'bg-purple-900/20 border border-purple-700/30'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-purple-200">{agent}</span>
            {status === 'in_progress' && (
              <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
            )}
          </div>
          <span className="text-sm text-purple-300">
            {status === 'in_progress' ? 'Processing...' : status}
          </span>
        </div>
        <div className="text-purple-300">{action}</div>
        
        {data && status === 'completed' && (
          <div className="mt-4 space-y-4">
            {data.contract_code && (
              <div className="rounded border border-purple-800/30 bg-purple-950/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-200">Contract Code</span>
                  <button
                    onClick={() => void navigator.clipboard.writeText(data.contract_code ?? '')}
                    className="px-2 py-1 text-xs rounded bg-purple-800/30 text-purple-300 hover:bg-purple-700/30 transition-colors"
                  >
                    Copy Code
                  </button>
                </div>
                <SyntaxHighlighter
                  language="solidity"
                  style={oneDark as any}
                  customStyle={{ background: 'transparent', padding: 0 }}
                  wrapLongLines
                >
                  {data.contract_code}
                </SyntaxHighlighter>
              </div>
            )}
            
            {(data.security_analysis ?? data.analysis) && (
              <div className="rounded border border-purple-800/30 bg-purple-950/50 p-4">
                <div className="text-sm font-medium text-purple-200 mb-2">Security Analysis</div>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={MarkdownComponents}
                >
                  {data.security_analysis ?? data.analysis ?? ''}
                </ReactMarkdown>
              </div>
            )}

            {data.features && (
              <div className="rounded border border-purple-800/30 bg-purple-950/50 p-4">
                <div className="text-sm font-medium text-purple-200 mb-2">Features</div>
                <ul className="list-disc pl-4 text-purple-300">
                  {data.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="rounded-lg p-4 bg-red-900/20 border border-red-500/30">
        <div className="text-red-300 font-medium mb-1">{agent} Error</div>
        <div className="text-red-400">{content}</div>
      </div>
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={MarkdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}

export default React.memo(ContentRenderer);
