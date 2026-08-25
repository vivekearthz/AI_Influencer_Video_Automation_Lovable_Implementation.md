import * as React from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { cn, formatDateTime } from "@/lib/utils";

export function MessageThread({ collaborationId }: { collaborationId: string }) {
  const { user } = useAuth();
  const { data: messages } = useMessages(collaborationId);
  const sendMessage = useSendMessage(collaborationId);
  const [body, setBody] = React.useState("");

  async function handleSend() {
    if (!body.trim()) return;
    await sendMessage.mutateAsync(body.trim());
    setBody("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-1">
        {!messages?.length ? (
          <p className="text-sm text-muted-foreground">No messages yet — say hello.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm", m.sender_id === user?.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>
              <p>{m.body}</p>
              <p className={cn("mt-1 text-[10px] opacity-70")}>{formatDateTime(m.created_at)}</p>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" className="min-h-[44px]" />
        <Button size="icon" onClick={handleSend} disabled={sendMessage.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
