import { useState, type ChangeEvent, type FormEvent } from "react";
import axios from "axios";
import "./ChatWidget.css";

type Message = {
  author: "user" | "bot";
  text: string;
};

type ChatWidgetProps = {
  suggestions?: string[];
};

const FALLBACK_SUGGESTIONS = [
  "Application Fees",
  "Processing Time",
  "Required Documents",
  "Interview Requirement",
];

export default function ChatWidget({ suggestions = FALLBACK_SUGGESTIONS }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    { author: "bot", text: "Hi! I’m Mr K. How can I help you today?" }
  ]);
  const [input, setInput] = useState<string>("");
  const [isThinking, setIsThinking] = useState(false);

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { author: "bot", text }]);
  };

  const attemptKbAnswer = async (query: string) => {
    try {
      const kbRes = await axios.get<{ id: string; text: string }>("http://localhost:3001/api/kb/search", {
        params: { q: query }
      });
      addBotMessage(kbRes.data.text);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }

      console.error(error);
      addBotMessage("Sorry, I couldn’t find an answer right now.");
      return true;
    }
  };

  const attemptChatAnswer = async (query: string) => {
    try {
      const res = await axios.post<{ answer: string }>("http://localhost:3001/api/chat", {
        message: query
      });
      addBotMessage(res.data.answer);
    } catch (error) {
      console.error(error);
      addBotMessage("Sorry, something went wrong.");
    }
  };

  const sendMessage = async (seed?: string) => {
    const rawInput = typeof seed === "string" ? seed : input;
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    const userMsg: Message = { author: "user", text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    try {
      const answeredByKb = await attemptKbAnswer(trimmed);
      if (answeredByKb) return;
      await attemptChatAnswer(trimmed);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleSuggestion = (text: string) => {
    void sendMessage(text);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-history">
        {messages.map((msg, index) => (
          <div key={`${msg.author}-${index}`} className={`message message--${msg.author}`}>
            <span className="message__label">{msg.author === "user" ? "" : "Mr K"}</span>
            {msg.text}
          </div>
        ))}
        {isThinking && (
          <div className="message message--bot" role="status" aria-live="polite">
            <span className="message__label">Our AI</span>
            <div className="typing-indicator">
              <span className="typing-dots">
                <span />
                <span />
                <span />
              </span>
              Thinking...
            </div>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="chat-suggestions">
          <span className="chat-suggestions__label">Suggestions on what to ask Mr K</span>
          <div className="chat-suggestions__chips">
            {suggestions.map(suggestion => (
              <button
                key={suggestion}
                type="button"
                className="suggestion-chip"
                onClick={() => handleSuggestion(suggestion)}
                disabled={isThinking}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={handleChange}
          placeholder="Ask me anything"
          aria-label="Message Mr K"
        />
        <button className="send-button" type="submit" disabled={!input.trim() || isThinking} aria-label="Send message">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 11.5L21 3l-8.5 18-1.8-6.7L3 11.5z"
              stroke="#5c6ac4"
              strokeWidth="1.5"
              strokeLinejoin="round"
              fill="white"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}