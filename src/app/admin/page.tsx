"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/shared/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Lock, Users, Trash2 } from "lucide-react";

interface Subscriber {
  id: number;
  endpoint: string;
  domain: string;
  shortId: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedEndpoints, setSelectedEndpoints] = useState<Set<string>>(new Set());
  const [loadingSubs, setLoadingSubs] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch("/api/push/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data.subscribers);
        // Select all by default
        setSelectedEndpoints(new Set(data.subscribers.map((s: Subscriber) => s.endpoint)));
      }
    } catch {
      // silently fail
    } finally {
      setLoadingSubs(false);
    }
  }, [password]);

  useEffect(() => {
    if (authenticated) {
      fetchSubscribers();
    }
  }, [authenticated, fetchSubscribers]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      setAuthenticated(true);
      setResult(null);
    }
  };

  const toggleEndpoint = (endpoint: string) => {
    setSelectedEndpoints((prev) => {
      const next = new Set(prev);
      if (next.has(endpoint)) {
        next.delete(endpoint);
      } else {
        next.add(endpoint);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEndpoints.size === subscribers.length) {
      setSelectedEndpoints(new Set());
    } else {
      setSelectedEndpoints(new Set(subscribers.map((s) => s.endpoint)));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    setResult(null);

    const sendAll = selectedEndpoints.size === subscribers.length;

    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          title: title.trim() || undefined,
          body: body.trim(),
          endpoints: sendAll ? undefined : Array.from(selectedEndpoints),
        }),
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
        fetchSubscribers();
      }
    } catch {
      setResult("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleRemoveSubscriber = async (endpoint: string) => {
    // Remove by re-subscribing without this endpoint
    // For now, just deselect it. Full removal would need a delete API.
    setSelectedEndpoints((prev) => {
      const next = new Set(prev);
      next.delete(endpoint);
      return next;
    });
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
            <>
              {/* Subscriber List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-5" />
                    Subscribers ({subscribers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSubs ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : subscribers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No subscribers yet. Open the app on a device and tap Enable.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedEndpoints.size === subscribers.length}
                          onCheckedChange={toggleAll}
                          id="select-all"
                        />
                        <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                          Select all
                        </label>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {selectedEndpoints.size} selected
                        </span>
                      </div>
                      <div className="border rounded-md divide-y">
                        {subscribers.map((sub) => (
                          <div key={sub.endpoint} className="flex items-center gap-2 px-3 py-2">
                            <Checkbox
                              checked={selectedEndpoints.has(sub.endpoint)}
                              onCheckedChange={() => toggleEndpoint(sub.endpoint)}
                              id={`sub-${sub.id}`}
                            />
                            <label htmlFor={`sub-${sub.id}`} className="flex-1 min-w-0 cursor-pointer">
                              <p className="text-sm font-medium truncate">{sub.domain}</p>
                              <p className="text-xs text-muted-foreground">...{sub.shortId}</p>
                            </label>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleRemoveSubscriber(sub.endpoint)}
                              title="Deselect"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Send Form */}
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
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={sending || !body.trim() || selectedEndpoints.size === 0}
                    >
                      {sending
                        ? "Sending..."
                        : `Send to ${selectedEndpoints.size} device(s)`}
                    </Button>
                    {result && (
                      <p className={`text-sm ${result.startsWith("Sent") ? "text-green-600" : result.startsWith("No devices") ? "text-muted-foreground" : "text-destructive"}`}>
                        {result}
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
