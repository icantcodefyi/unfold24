"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconLoader2,
  IconSend,
  IconCpu,
  IconUser,
  IconChevronDown,
  IconCheck,
  IconCircleCheck,
} from "@tabler/icons-react";
import dynamic from "next/dynamic";
const ContentRenderer = dynamic(() => import("@/components/ContentRenderer"), {
  ssr: false,
});
import { ProgressBar } from "@/components/ProgressBar";
import {
  TopLines,
  BottomLines,
  SideLines,
  TopGradient,
  BottomGradient,
} from "@/components/Hero";
import { Logo } from "@/components/Hero";
import { ConnectButton } from "thirdweb/react";
import { client } from "@/components/thirdweb/client";
import Link from "next/link";

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

interface AgentData {
  error?: string;
  code?: string;
  output?: string;
  logs?: string[];
  warnings?: string[];
  success?: boolean;
  message?: string;
  details?: Record<string, string | number | boolean>;
  contract_code?: string;
  security_analysis?: string;
  abi?: AbiItem[];
  bytecode?: string;
  function_arguments?: Record<string, string | number | boolean>;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
  type?: "status" | "error" | "message";
  agent?: string;
  action?: string;
  status?: "in_progress" | "completed" | "failed";
  data?: AgentData;
}

interface ProcessStep {
  title: string;
  status: "in_progress" | "completed" | "failed";
  content?: string;
  data?: AgentData;
}

interface StepProgress {
  id: string;
  progress: number;
}

const Navbar = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="flex items-center justify-between">
      <Link href="/">
        <Logo />
      </Link>
      <div className="rounded-xl text-sm font-medium text-neutral-700 transition duration-200 hover:opacity-80 dark:text-neutral-200">
        {mounted && (
          <ConnectButton
            client={client}
            connectButton={{ label: "Sign In" }}
            connectModal={{ size: "wide" }}
          />
        )}
      </div>
    </nav>
  );
};

export default function EnhancedContentRenderer() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your blockchain AI assistant. How can I help you create your first smart contract today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stepProgress, setStepProgress] = useState<StepProgress[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>(
    {},
  );
  const [shouldScroll, setShouldScroll] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (shouldScroll) {
      const timer = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, shouldScroll]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const updateStepProgress = (stepId: string, progress: number) => {
    setStepProgress((prev) => {
      const existing = prev.find((p) => p.id === stepId);
      if (existing) {
        return prev.map((p) => (p.id === stepId ? { ...p, progress } : p));
      }
      return [...prev, { id: stepId, progress }];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      type: "message",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStepProgress([]); // Reset step progress
    setShouldScroll(true); // Enable scrolling when chat generation starts

    try {
      const response = await fetch("/api/automate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate contract");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let currentMessage: ChatMessage | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === "") continue;

          if (trimmedLine.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmedLine.slice(6)) as {
                status: "error" | "in_progress" | "completed" | "failed";
                agent: string;
                action: string;
                data: AgentData;
              };

              // Update progress for the current step
              if (data.status === "in_progress") {
                const stepId = `${data.agent}-${data.action}`;
                const currentProgress =
                  stepProgress.find((p) => p.id === stepId)?.progress ?? 0;
                const newProgress = Math.min(
                  currentProgress + Math.random() * 15 + 5,
                  99,
                );
                updateStepProgress(stepId, newProgress);
              } else if (
                data.status === "completed" ||
                data.status === "failed"
              ) {
                const stepId = `${data.agent}-${data.action}`;
                updateStepProgress(stepId, 100);
              }

              if (currentMessage?.agent === data.agent) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentMessage?.id
                      ? {
                          ...msg,
                          status:
                            data.status === "error" ? "failed" : data.status,
                          data: data.data,
                          action: data.action,
                        }
                      : msg,
                  ),
                );
              } else {
                const newMessage: ChatMessage = {
                  id: Date.now().toString(),
                  role: "assistant",
                  content: "",
                  type: data.status === "error" ? "error" : "status",
                  agent: data.agent,
                  action: data.action,
                  status: data.status === "error" ? "failed" : data.status,
                  data: data.data,
                };
                setMessages((prev) => [...prev, newMessage]);
                currentMessage = newMessage;
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "Sorry, there was an error generating the contract. Please try again.",
        type: "error",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setShouldScroll(false); // Disable scrolling when chat generation ends
    }
  };

  const renderProcessStep = (message: ChatMessage) => {
    if (!message.agent || !message.status) return null;

    const isExpanded = expandedSteps[message.id] ?? false;
    const stepId = `${message.agent}-${message.action}`;
    const progress = stepProgress.find((p) => p.id === stepId)?.progress ?? 0;
    const hasCode = message.data?.code ?? message.data?.contract_code ?? null;
    const isCompleted = message.status === "completed";

    return (
      <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900/30 transition-all duration-300 hover:bg-gray-900/40">
        <button
          onClick={() => toggleStep(message.id)}
          className={`flex w-full items-center justify-between px-4 py-3 text-left transition-all duration-300 ${
            isCompleted
              ? "text-green-300 hover:text-green-200"
              : message.status === "failed"
                ? "text-red-300 hover:text-red-200"
                : "text-gray-300 hover:text-gray-200"
          }`}
        >
          <div className="flex flex-1 items-center space-x-3">
            {isCompleted ? (
              <IconCircleCheck className="h-5 w-5 text-green-400" />
            ) : message.status === "failed" ? (
              <div className="h-2 w-2 rounded-full bg-red-400" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-gray-400" />
            )}
            <span className="font-medium">{message.agent}</span>
            <span className="text-sm text-gray-400">{message.action}</span>
          </div>
          {message.status === "in_progress" ? (
            <div className="mx-4 flex-1">
              <ProgressBar progress={progress} />
            </div>
          ) : null}
          <IconChevronDown
            className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? (hasCode ? "max-h-[80vh]" : "max-h-96") : "max-h-0"
          } ${isExpanded ? "opacity-100" : "opacity-0"}`}
        >
          <div
            className={`border-t border-gray-800 px-4 py-3 ${hasCode ? "max-h-[80vh] overflow-auto" : ""}`}
          >
            <ContentRenderer
              content={message.content}
              type={message.type}
              status={message.status}
              agent={message.agent}
              action={message.action}
              data={message.data}
            />
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    // Auto-expand new steps and auto-collapse completed ones
    messages.forEach((message) => {
      if (message.type === "status") {
        if (message.status === "in_progress") {
          // Auto expand when step starts
          setExpandedSteps((prev) => ({ ...prev, [message.id]: true }));
        } else if (
          message.status === "completed" ||
          message.status === "failed"
        ) {
          // Auto collapse after delay when step completes
          setTimeout(() => {
            setExpandedSteps((prev) => ({ ...prev, [message.id]: false }));
          }, 1500);
        }
      }
    });
  }, [messages]);

  return (
    <div className="relative min-h-screen w-full bg-white dark:bg-black">
      <div className="relative z-20 mx-auto max-w-7xl px-4 py-10 md:px-8 lg:px-4">
        <Navbar />
        <div className="relative my-12 overflow-hidden rounded-3xl bg-gray-50 dark:bg-black">
          <TopLines />
          <SideLines />
          <TopGradient />
          <BottomGradient />

          <div className="relative z-20 mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col px-4 py-10 md:px-8 md:py-20">
            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto pb-4 pr-4">
              <div className="relative mt-8 space-y-8">
                {messages.map((message: ChatMessage) => (
                  <div key={message.id} className="px-2">
                    {message.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-lg border border-gray-800 bg-gray-900/30 p-4">
                          <div className="mb-2 flex items-center space-x-2">
                            <IconUser className="h-5 w-5 flex-shrink-0 text-gray-300" />
                            <span className="font-medium text-gray-200">
                              You
                            </span>
                          </div>
                          <div className="text-gray-200">{message.content}</div>
                        </div>
                      </div>
                    ) : message.type === "status" ? (
                      renderProcessStep(message)
                    ) : (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg border border-gray-800 bg-gray-900/30 p-4">
                          <div className="mb-2 flex items-center space-x-2">
                            <IconCpu className="h-5 w-5 flex-shrink-0 text-gray-300" />
                            <span className="font-medium text-gray-200">
                              AI Assistant
                            </span>
                          </div>
                          <ContentRenderer
                            content={message.content}
                            type={message.type}
                            status={message.status}
                            agent={message.agent}
                            action={message.action}
                            data={message.data}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div ref={messagesEndRef} className="h-1" />
            </div>

            <form
              onSubmit={handleSubmit}
              className="relative z-50 mt-4 flex flex-col gap-2 border-gray-800 pt-4 backdrop-blur-sm"
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type your message..."
                  className="flex-1 rounded-lg border border-gray-800 bg-gray-900/30 p-4 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-700"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className={`rounded-lg px-6 py-4 transition-colors ${
                    isLoading
                      ? "cursor-not-allowed bg-gray-500"
                      : "bg-white text-black hover:bg-gray-100"
                  } flex items-center justify-center`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <IconLoader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <IconSend className="h-5 w-5" />
                  )}
                  <span className="ml-2">
                    {isLoading ? "Processing..." : "Send"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}