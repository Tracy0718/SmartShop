import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

type Msg = { role: "user" | "assistant"; content: string };
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm ShopBot. Ask me to find products like *running shoes under $80* or *gift ideas for a coffee lover*." },
  ]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY };
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

      const resp = await fetch(CHAT_URL, { method: "POST", headers, body: JSON.stringify({ messages: newMsgs }) });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        setMessages([...newMsgs, { role: "assistant", content: err.error || "Sorry, something went wrong." }]);
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;
      setMessages([...newMsgs, { role: "assistant", content: "" }]);

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMessages((prev) => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: acc } : m));
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full btn-accent-orange shadow-lg flex items-center justify-center hover:scale-105 transition"
        aria-label="Open chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-6rem))] bg-card rounded-lg shadow-2xl border flex flex-col">
          <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" />
            <div>
              <div className="font-semibold text-sm">ShopBot</div>
              <div className="text-xs opacity-80">AI shopping assistant</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                  <div className="prose prose-sm max-w-none [&_a]:text-accent [&_a]:underline [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
                    <ReactMarkdown
                      components={{
                        a: ({ href, children }) => (
                          <Link to={href || "#"} onClick={() => setOpen(false)}>{children}</Link>
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-secondary rounded-lg px-3 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-2 border-t flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything…" disabled={loading} />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="btn-accent-orange hover:btn-accent-orange shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
