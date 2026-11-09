import { useState } from "react";
import { apiRequest } from "../api";
import { APP_NAME } from "../config";

export default function ChatWidget({ orderData = {} }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [history, setHistory] = useState([]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim() || typing) return;
    const text = message.trim();
    setMessage("");
    setHistory((items) => [...items, { role: "user", text }]);
    setTyping(true);
    try {
      const result = await apiRequest("/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, orderData }),
      });
      setHistory((items) => [
        ...items,
        { role: "assistant", text: result.answer },
      ]);
    } catch (error) {
      setHistory((items) => [
        ...items,
        { role: "assistant", text: error.message },
      ]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <>
      <button className="chat-launcher" onClick={() => setOpen(!open)}>
        {open ? "Close support" : "Ask Local Link"}
      </button>
      {open && (
        <section className="chat-panel" aria-label={`${APP_NAME} support`}>
          <div className="chat-header">
            <strong>{APP_NAME} support</strong>
            <span>Platform questions only</span>
          </div>
          <div className="chat-messages">
            {!history.length && (
              <p className="chat-empty">
                Ask about group orders, tier prices, GST verification, or your
                orders.
              </p>
            )}
            {history.map((item, index) => (
              <p
                className={`chat-message ${item.role}`}
                key={`${item.role}-${index}`}
              >
                {item.text}
              </p>
            ))}
            {typing && (
              <p className="chat-message assistant typing">Typing...</p>
            )}
          </div>
          <form className="chat-form" onSubmit={sendMessage}>
            <label className="sr-only" htmlFor="chat-message">
              Your question
            </label>
            <input
              id="chat-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask a question"
            />
            <button
              className="button button-primary"
              type="submit"
              disabled={typing}
            >
              Send
            </button>
          </form>
        </section>
      )}
    </>
  );
}
