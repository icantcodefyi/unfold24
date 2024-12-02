"use client";

import { useState, useEffect, useRef } from "react";
import {
  IconLoader2,
  IconSend,
  IconCpu,
  IconUser,
  IconChevronDown,
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
import { avalancheFuji, polygonAmoy, baseSepolia } from "thirdweb/chains";
import { deployContract } from "thirdweb/deploys";
import { useActiveAccount } from "thirdweb/react";

const chains = [
  { name: "Polygon Amoy", chain: polygonAmoy },
  { name: "Avalanche Fuji", chain: avalancheFuji },
  { name: "Base Sepolia", chain: baseSepolia },
];

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
  attempt?: number;
  max_attempts?: number;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
  type?: "status" | "error" | "message";
  agent?: string;
  action?: string;
  status?: "in_progress" | "completed" | "failed" | "error" | "retry";
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

interface SSEData {
  status: "error" | "in_progress" | "completed" | "failed";
  agent: string;
  action: string;
  message?: string;
  data?: AgentData;
}

interface ContractDetails {
  id: string;
  code: string;
  abi: any[];
  bytecode: string;
  ownerAddress?: string;
  chainId?: number;
  constructorArgs?: Record<string, any>;
}

interface ConstructorInput {
  type: string;
  name: string;
  components?: Array<{
    type: string;
    name: string;
  }>;
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
            chains={chains.map(c => c.chain)}
            connectButton={{ label: "Sign In" }}
            connectModal={{ 
              size: "wide",
            }}
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
  const account = useActiveAccount();
  const [contractDetails, setContractDetails] = useState<ContractDetails | null>(null);
  const [constructorInputs, setConstructorInputs] = useState<Record<string, string>>({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Fetch contract details when there's a completed message with contract data
    const completedMessage = messages.find(m => 
      m.status === "completed" && 
      m.data?.contract_code || m.data?.bytecode
    );
    
    if (completedMessage && account?.address) {
      fetch(`/api/contract?ownerAddress=${account?.address}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setContractDetails(data);
          }
        })
        .catch(console.error);
    }
  }, [messages, account?.address]);

  const handleConstructorInputChange = (name: string, value: string) => {
    setConstructorInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDeploy = async (chain: typeof chains[0]["chain"]) => {
    if (!account || !contractDetails) return;
    
    setIsDeploying(true);
    setError("");

    try {
      // Validate required constructor arguments
      const constructorAbi = contractDetails.abi.find(item => item.type === "constructor");
      const missingArgs = constructorAbi?.inputs?.filter(
        (input: ConstructorInput) => !constructorInputs[input.name]
      );

      if (missingArgs?.length) {
        throw new Error(`Missing required constructor arguments: ${missingArgs.map((arg: ConstructorInput) => arg.name).join(', ')}`);
      }

      const args = constructorAbi?.inputs?.reduce((acc: Record<string, any>, input: ConstructorInput) => {
        const value = constructorInputs[input.name];
        
        // Enhanced type conversion based on input type
        switch(input.type) {
          case 'uint256':
          case 'uint8':
            acc[input.name] = parseInt(value || '0');
            break;
          case 'bool':
            acc[input.name] = Boolean(value);
            break;
          case 'string':
            acc[input.name] = value || '';
            break;
          case 'address':
            acc[input.name] = value || '0x0000000000000000000000000000000000000000';
            break;
          default:
            acc[input.name] = value || '';
        }
        return acc;
      }, {}) || {};

      console.log("Deploying with args:", args);
      console.log("Bytecode:", `0x${contractDetails.bytecode}`);
      console.log("Constructor Params:", args);
      console.log("Chain:", chain);
      console.log("Account:", account?.address);
      console.log("ABI:", contractDetails.abi);

      const contractAddress = await deployContract({
        client,
        account,
        chain: {
          rpc: chain.rpc,
          id: chain.id,
        },
        abi: contractDetails.abi,
        bytecode: `0x${contractDetails.bytecode}`,
        constructorParams: args,
      });

      setDeployedAddress(contractAddress);
    } catch (err) {
      console.error("Deploy error:", err);
      setError(err instanceof Error ? err.message : "Failed to deploy contract");
    } finally {
      setIsDeploying(false);
    }
  };

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
    setShouldScroll(true);

    // Start simulated progress animation
    const simulateProgress = (stepId: string) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 2; // Random increment between 0-2
        if (progress > 80) {
          clearInterval(interval);
          return;
        }
        updateStepProgress(stepId, Math.min(progress, 80));
      }, 200); // Update every 200ms

      return interval;
    };

    try {
      const response = await fetch("/api/automate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: input,
          ownerAddress: account?.address,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate contract");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentMessage: ChatMessage | null = null;
      const progressIntervals: Record<string, NodeJS.Timeout> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Complete all progress bars to 100% when done
          Object.entries(progressIntervals).forEach(([stepId, interval]) => {
            clearInterval(interval);
            updateStepProgress(stepId, 100);
          });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine?.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmedLine.slice(6)) as SSEData;
            const stepId = `${data.agent}-${data.action}`;

            // Start progress simulation for new steps
            if (data.status === "in_progress" && !progressIntervals[stepId]) {
              progressIntervals[stepId] = simulateProgress(stepId);
            }

            // Complete progress and clear interval when step is done
            if (data.status === "completed" || data.status === "failed") {
              if (progressIntervals[stepId]) {
                clearInterval(progressIntervals[stepId]);
                delete progressIntervals[stepId];
                updateStepProgress(stepId, 100);
              }
            }

            const newMessage: ChatMessage = {
              id: Date.now().toString(),
              role: "assistant",
              content: data.message ?? "",
              type: data.status === "error" ? "error" : "status",
              agent: data.agent,
              action: data.action,
              status: data.status,
              data: {
                ...data.data,
                message: data.message,
                attempt: data.data?.attempt,
                max_attempts: data.data?.max_attempts,
              } as AgentData,
            };

            setMessages((prev) => {
              const existingMessageIndex = prev.findIndex(
                (msg) => msg.agent === data.agent && msg.type === "status",
              );

              if (existingMessageIndex !== -1) {
                const updatedMessages = [...prev];
                const existingMessage = updatedMessages[existingMessageIndex];
                if (existingMessage) {
                  updatedMessages[existingMessageIndex] = {
                    ...existingMessage,
                    status: data.status,
                    action: data.action,
                    data: {
                      ...(existingMessage.data ?? {}),
                      ...newMessage.data,
                    },
                  };
                  return updatedMessages;
                }
              }
              return [...prev, newMessage];
            });

            currentMessage = newMessage;
          } catch (e) {
            console.error("Failed to parse SSE data:", e);
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
      setShouldScroll(false);
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
            isExpanded ? "max-h-[80vh]" : "max-h-0"
          } ${isExpanded ? "opacity-100" : "opacity-0"}`}
        >
          <div className="border-t border-gray-800 px-4 py-3">
            <div className="max-h-[60vh] overflow-y-auto">
              <ContentRenderer
                content={message.content}
                type={message.type}
                status={
                  message.status as
                    | "in_progress"
                    | "completed"
                    | "failed"
                    | "retry"
                    | undefined
                }
                agent={message.agent}
                action={message.action}
                data={message.data}
              />
            </div>
          </div>
        </div>
        
        {/* Add deployment section when contract is ready */}
        {isExpanded && message.data?.bytecode && message.status === "completed" && (
          <div className="border-t border-gray-800 px-4 py-3">
            <h3 className="mb-4 text-lg font-medium text-gray-200">Deploy Contract</h3>
            
            {renderConstructorInputs()}

            <div className="space-y-4">
              {chains.map((chainInfo) => (
                <button
                  key={chainInfo.chain.id}
                  onClick={() => handleDeploy(chainInfo.chain)}
                  disabled={isDeploying}
                  className={`w-full rounded-lg p-4 flex items-center justify-between text-white ${
                    isDeploying
                      ? "border border-purple-500/30 bg-purple-900/30 cursor-not-allowed opacity-50"
                      : "border border-purple-500/30 bg-purple-900/30 hover:bg-purple-800/30 transition-colors"
                  }`}
                >
                  <span>{chainInfo.name}</span>
                  {isDeploying && <IconLoader2 className="animate-spin" />}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                {error}
              </div>
            )}

            {deployedAddress && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-500 rounded-lg">
                <h4 className="text-md font-semibold mb-2 text-white">Contract Deployed!</h4>
                <p className="text-gray-300 mb-2">Contract Address:</p>
                <code className="block p-3 bg-black/50 rounded border border-gray-700 break-all text-white">
                  {deployedAddress}
                </code>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderConstructorInputs = () => {
    if (!contractDetails?.abi) return null;

    const constructorAbi = contractDetails.abi.find(item => item.type === "constructor");
    if (!constructorAbi?.inputs?.length) return null;

    return (
      <div className="mb-4 space-y-4">
        <h4 className="text-md font-semibold text-gray-200">Constructor Arguments</h4>
        {constructorAbi.inputs.map((input: ConstructorInput, index: number) => {
          // Find example value from contract details
          const exampleValue = contractDetails.constructorArgs?.[input.name]?.example_value;
          
          return (
            <div key={index} className="space-y-2">
              <label className="block text-sm text-gray-300">
                {input.name} ({input.type})
                {exampleValue && (
                  <span className="ml-2 text-xs text-gray-500">
                    Example: {exampleValue}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={constructorInputs[input.name] || ''}
                onChange={(e) => handleConstructorInputChange(input.name, e.target.value)}
                placeholder={exampleValue ? `e.g. ${exampleValue}` : `Enter ${input.type}`}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-500"
              />
            </div>
          );
        })}
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
          <BottomLines />
          <SideLines />
          <TopGradient />
          <BottomGradient />
          <div className="relative z-20 mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col px-4 py-10 md:px-8">
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
                            status={
                              message.status as
                                | "in_progress"
                                | "completed"
                                | "failed"
                                | "retry"
                                | undefined
                            }
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
