import { useContext, useEffect, useState, useRef } from "react";
import { WorkspaceContext } from "../context/WorkspaceContext";
import { listAgents, getOrCreateChat, sendChatMessage } from "../api/client";
import styles from "./Chat.module.css";

export default function Chat() {
  const { workspaceId } = useContext(WorkspaceContext);
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [chatId, setChatId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    listAgents(workspaceId)
      .then((res) => setAgents(res.data || []))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || !selectedAgentId) {
      setChatId("");
      setMessages([]);
      return;
    }
    getOrCreateChat(workspaceId, selectedAgentId)
      .then((res) => {
        setChatId(res.data._id);
        setMessages(res.data.messages || []);
      })
      .catch(() => setMessages([]));
  }, [workspaceId, selectedAgentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !workspaceId || sending) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, id: Date.now(), timestamp: new Date().toISOString() },
    ]);
    setSending(true);

    try {
      const res = await sendChatMessage({
        workspaceId,
        agentId: selectedAgentId || undefined,
        chatId: chatId || undefined,
        text,
        tokenGPT: import.meta.env.VITE_OPENAI_KEY || undefined,
        // Contexto temporal para convertir "mañana", "hoy", etc.
        today: new Date().toISOString().split('T')[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const reply = res.data?.text || "Sin respuesta.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          id: Date.now() + 1,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: " + (err.response?.data?.error || err.message),
          id: Date.now() + 1,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!workspaceId) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Chat</h1>
        <p className={styles.needWs}>Selecciona un workspace en Inicio o Workspaces.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Chat</h1>
      <p className={styles.subtitle}>
        Elige un agente y escribe. El bot puede consultar tablas, crear registros o responder con IA.
      </p>

      <div className={styles.agentSelect}>
        <label htmlFor="agent">Agente:</label>
        <select
          id="agent"
          value={selectedAgentId}
          onChange={(e) => setSelectedAgentId(e.target.value)}
          className={styles.select}
        >
          <option value="">— Seleccionar —</option>
          {agents.map((a) => (
            <option key={a._id} value={a._id}>
              {a.name}
            </option>
          ))}
        </select>
        {loading && <span className={styles.loading}>Cargando agentes…</span>}
      </div>

      {selectedAgentId && (
        <div className={styles.chatBox}>
          <div className={styles.messages}>
            {messages.length === 0 && (
              <p className={styles.placeholder}>
                Escribe un mensaje. Prueba: "¿Cuáles son los últimos registros?" o "Lista los datos de la tabla."
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? styles.msgUser : styles.msgBot}
              >
                <div className={styles.msgBubble}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className={styles.msgBot}>
                <div className={styles.msgBubble}>Pensando…</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className={styles.form}>
            <input
              type="text"
              placeholder="Escribe aquí…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={styles.input}
              disabled={sending}
            />
            <button type="submit" className={styles.sendBtn} disabled={sending || !input.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}

      {!selectedAgentId && !loading && agents.length === 0 && (
        <p className={styles.noAgents}>Crea un agente y vincúlale tablas en la sección Agentes.</p>
      )}
    </div>
  );
}
