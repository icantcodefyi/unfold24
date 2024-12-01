'use client'

import { useState } from 'react'
import { useChat, Message } from 'ai/react'

interface ChatMessage extends Message {
  id: string
  role: 'assistant' | 'user'
  content: string
}

export default function AutomatePage() {
  const { messages, input, handleInputChange, handleSubmit } = useChat<ChatMessage>({
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        content: "Hi! I'm your blockchain AI assistant. How can I help you create your first smart contract today?",
      },
    ],
  })

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((message: ChatMessage, i: number) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'assistant' ? 'justify-start' : 'justify-end'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'assistant'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit(e)
        }} 
        className="flex gap-2 pt-4 border-t"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="flex-1 rounded-lg border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}
