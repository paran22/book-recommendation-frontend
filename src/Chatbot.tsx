import { useState, useRef, useEffect } from "react";
import axios from "axios";

// const baseURL = import.meta.env.VITE_API_BASE_URL;
// axios.defaults.baseURL = baseURL;

interface Message {
  sender: "bot" | "user";
  text: string;
}

function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // input이 enabled될 때마다 포커스
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  // 최초 질문 받아오기
  useEffect(() => {
    const fetchFirstQuestion = async () => {
      try {
        const res = await axios.get(`/api/questions?index=0`);
        if (!res.data.completed && res.data.question) {
          setMessages([
            {
              sender: "bot",
              text: `${res.data.question.q}${
                res.data.question.example
                  ? `\n(${res.data.question.example})`
                  : ""
              }`,
            },
          ]);
        }
      } catch {
        setError("질문을 불러오는 데 실패했습니다.");
      }
    };
    fetchFirstQuestion();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (input.trim() === "" || loading) return;
    const userMsg = input;
    const nextAnswers = [...answers, userMsg];
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setAnswers(nextAnswers);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      // 다음 질문 받아오기
      const res = await axios.get(`/api/questions?index=${currentIdx + 1}`);
      if (!res.data.completed && res.data.question) {
        setCurrentIdx(currentIdx + 1);
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `${res.data.question.q}${
              res.data.question.example
                ? `\n(${res.data.question.example})`
                : ""
            }`,
          },
        ]);
      } else {
        // 모든 질문이 끝났으면 추천 API 호출
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "추천 결과를 불러오는 중입니다..." },
        ]);
        // 답변을 순서대로 매핑
        const [
          user_emotion,
          desired_emotional_effect,
          occupation,
          reading_context,
          focus_level,
        ] = nextAnswers;
        const recRes = await axios.post("/api/recommend-books", {
          user_emotion,
          desired_emotional_effect,
          occupation,
          reading_context,
          focus_level,
        });
        setMessages((prev) => [
          ...prev.slice(0, prev.length - 1),
          { sender: "bot", text: recRes.data.result },
        ]);
      }
    } catch {
      setError("다음 질문 또는 추천 결과를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setAnswers([]);
    setInput("");
    setCurrentIdx(0);
    setLoading(false);
    setError(null);
    try {
      const res = await axios.get(`/api/questions?index=0`);
      if (!res.data.completed && res.data.question) {
        setMessages([
          {
            sender: "bot",
            text: `${res.data.question.q}${
              res.data.question.example
                ? `\n(${res.data.question.example})`
                : ""
            }`,
          },
        ]);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
      setError("질문을 불러오는 데 실패했습니다.");
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f6fa",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          margin: 0,
          padding: 24,
          border: "1px solid #eee",
          borderRadius: 12,
          background: "#fafbfc",
          fontFamily: "sans-serif",
          height: 600,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 24px #0001",
        }}
      >
        <h2 style={{ textAlign: "center" }}>감정 기반 도서 추천 챗봇</h2>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            marginBottom: 16,
            background: "#fff",
            borderRadius: 8,
            padding: 12,
            border: "1px solid #e0e0e0",
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent:
                  msg.sender === "user" ? "flex-end" : "flex-start",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  background: msg.sender === "user" ? "#1976d2" : "#f1f3f6",
                  color: msg.sender === "user" ? "#fff" : "#222",
                  borderRadius: 16,
                  padding: "10px 16px",
                  maxWidth: "80%",
                  whiteSpace: "pre-line",
                  fontSize: 15,
                  boxShadow:
                    msg.sender === "user"
                      ? "0 2px 8px #1976d222"
                      : "0 2px 8px #aaa2",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {messages[messages.length - 1]?.text.startsWith(
          "추천 결과를 불러오는 중"
        ) ||
        (messages.length > 0 &&
          messages[messages.length - 1]?.sender === "bot" &&
          messages[messages.length - 1]?.text.includes("추천 결과")) ? (
          <button
            onClick={handleRestart}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "#1976d2",
              color: "#fff",
              cursor: "pointer",
              marginTop: 8,
            }}
          >
            다시 시작하기
          </button>
        ) : (
          <div style={{ display: "flex" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 6,
                border: "1px solid #ccc",
                marginRight: 8,
                fontSize: 15,
              }}
              placeholder="답변을 입력하세요"
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={loading}
              style={{
                padding: "0 18px",
                borderRadius: 6,
                border: "none",
                background: "#1976d2",
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              전송
            </button>
          </div>
        )}
        {error && (
          <div style={{ marginTop: 12, color: "red", textAlign: "center" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default Chatbot;
