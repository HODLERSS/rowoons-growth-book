"use client";

import { useState } from "react";
import { Header } from "@/components/shared/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Lock } from "lucide-react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      setAuthenticated(true);
      setResult(null);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, title: title.trim() || undefined, body: body.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setAuthenticated(false);
          setResult("Wrong password. Please try again.");
        } else {
          setResult(data.error || "Failed to send");
        }
        return;
      }

      if (data.message === "No subscribers") {
        setResult("No devices subscribed yet. Open the app and tap Enable first.");
      } else {
        setResult(`Sent to ${data.sent} device(s)${data.failed ? `, ${data.failed} failed` : ""}`);
        setTitle("");
        setBody("");
      }
    } catch {
      setResult("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Admin" subtitle="Send push notifications" />
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-4 pb-8">
          {!authenticated ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-5" />
                  Admin Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAuth} className="space-y-4">
                  <Input
                    type="password"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit" className="w-full">
                    Unlock
                  </Button>
                  {result && (
                    <p className="text-sm text-destructive">{result}</p>
                  )}
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="size-5" />
                  Send Notification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSend} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="title">
                      Title (optional)
                    </label>
                    <Input
                      id="title"
                      placeholder="Rowoon's Growth Book"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="body">
                      Message
                    </label>
                    <Textarea
                      id="body"
                      placeholder="Time to check this month's milestones!"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={sending || !body.trim()}>
                    {sending ? "Sending..." : "Send Notification"}
                  </Button>
                  {result && (
                    <p className={`text-sm ${result.startsWith("Sent") ? "text-green-600" : result.startsWith("No devices") ? "text-muted-foreground" : "text-destructive"}`}>
                      {result}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
