import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { ArrowLeft, CheckCircle2, Clock3, Loader2, MessageSquare, Send, User, CircleDot } from 'lucide-react';

import { useClientAuth } from '@/contexts/ClientAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Message {
  id: string;
  message: string;
  sender_id: string | null;
  client_sender_id?: string | null;
  sender_type: string;
  sender_name?: string | null;
  created_at: string | null;
}

interface ProjectOverview {
  id: string;
  name: string;
  status: string | null;
  created_at: string | null;
  progress: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    backlogTasks: number;
    progressPercent: number;
  };
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string | null;
    updated_at: string | null;
  }>;
  invoiceCount: number;
}

const ClientProjectView = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { client, loading: authLoading } = useClientAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [projectOverview, setProjectOverview] = useState<ProjectOverview | null>(null);

  useEffect(() => {
    if (!authLoading && !client) {
      navigate('/client/login');
      return;
    }

    if (client && projectId) {
      void Promise.all([fetchMessages(), fetchProjectOverview()]).finally(() => setLoading(false));
    }
  }, [client, authLoading, projectId, navigate]);

  useEffect(() => {
    if (!client || !projectId) return;

    const intervalId = window.setInterval(() => {
      void fetchMessages();
      void fetchProjectOverview();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [client, projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('client-messages', {
        body: { action: 'get', projectId },
        headers: { 'x-client-id': client?.id || '' },
      });

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      } else if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchProjectOverview = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('client-projects', {
        body: { action: 'get', projectId },
        headers: { 'x-client-id': client?.id || '' },
      });

      if (error) {
        console.error('Failed to fetch project overview:', error);
        return;
      }

      if (data?.project) {
        setProjectOverview(data.project);
      }
    } catch (err) {
      console.error('Failed to fetch project overview:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('client-messages', {
        body: { action: 'send', projectId, message: newMessage.trim() },
        headers: { 'x-client-id': client?.id || '' },
      });

      if (error) {
        if (error instanceof FunctionsHttpError) {
          try {
            const errorResponse = await error.context.json();
            const composedError = [
              errorResponse?.error,
              errorResponse?.errorCode ? `(${errorResponse.errorCode})` : null,
              errorResponse?.errorDetails ? `- ${errorResponse.errorDetails}` : null,
            ]
              .filter(Boolean)
              .join(' ');
            toast.error(composedError || error.message || 'Failed to send message');
          } catch {
            toast.error(error.message || 'Failed to send message');
          }
        } else {
          toast.error(error.message || 'Failed to send message');
        }
      } else if (!data.success) {
        toast.error(data.error || 'Failed to send message');
      } else {
        setMessages((current) => [...current, data.message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
    }
    setSending(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/client/portal')} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Client Workspace</p>
            <h1 className="text-lg font-semibold">{projectOverview?.name || 'Project'}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        {projectOverview && (
          <section className="rounded-[30px] border border-border/70 bg-card/55 p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 flex items-center gap-2">
                  <CircleDot className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Project Progress</p>
                </div>
                <h2 className="text-3xl font-semibold tracking-tight">{projectOverview.name}</h2>
                <p className="mt-3 text-sm text-muted-foreground md:text-base">
                  Keep track of work completed, active progress, and the conversation with your team in one view.
                </p>
              </div>
              <Badge className="rounded-full border border-border/70 px-3 py-1.5 text-sm">{formatTaskStatus(projectOverview.status || 'active')}</Badge>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall progress</span>
                <span className="font-medium">{projectOverview.progress.progressPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/70">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${projectOverview.progress.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <SummaryCard label="Completed" value={projectOverview.progress.completedTasks} icon={<CheckCircle2 className="h-4 w-4" />} />
              <SummaryCard label="In progress" value={projectOverview.progress.inProgressTasks} icon={<Clock3 className="h-4 w-4" />} />
              <SummaryCard label="Open tasks" value={projectOverview.progress.totalTasks - projectOverview.progress.completedTasks} icon={<CircleDot className="h-4 w-4" />} />
              <SummaryCard label="Invoices" value={projectOverview.invoiceCount} icon={<MessageSquare className="h-4 w-4" />} />
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.1fr]">
          <Card className="rounded-[28px] border-border/70 bg-card/55">
            <CardContent className="p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Recent task activity</h3>
                  <p className="text-sm text-muted-foreground">The latest movement across the project.</p>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {projectOverview?.progress.totalTasks || 0} tasks
                </Badge>
              </div>

              {projectOverview?.recentTasks?.length ? (
                <div className="space-y-3">
                  {projectOverview.recentTasks.map((task) => (
                    <div key={task.id} className="rounded-[22px] border border-border/70 bg-background/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium leading-tight">{task.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {task.updated_at ? `Updated ${format(new Date(task.updated_at), 'MMM d, h:mm a')}` : 'Recently updated'}
                          </p>
                        </div>
                        <Badge variant="outline" className="rounded-full px-3 py-1">{formatTaskStatus(task.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
                  No task activity yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-border/70 bg-card/55">
            <CardContent className="flex min-h-[560px] flex-col p-5 md:p-6">
              <div className="mb-5">
                <h3 className="text-lg font-semibold">Project Messages</h3>
                <p className="text-sm text-muted-foreground">Share updates with your team without leaving the project view.</p>
              </div>

              <ScrollArea className="flex-1 pr-4">
                {messages.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <MessageSquare className="mx-auto mb-3 h-10 w-10" />
                    <p>No messages yet. Start the conversation.</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {messages.map((msg) => {
                      const isClient = msg.sender_type === 'client';
                      const isOwnMessage = isClient && (msg.client_sender_id || msg.sender_id) === client?.id;
                      const senderDisplayName = isOwnMessage
                        ? 'You'
                        : msg.sender_name || (isClient ? 'Client' : 'Project Team');

                      return (
                        <div key={msg.id} className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback
                              className={
                                isOwnMessage
                                  ? 'bg-primary text-primary-foreground'
                                  : isClient
                                    ? 'bg-secondary text-secondary-foreground'
                                    : 'bg-muted text-foreground'
                              }
                            >
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className={`flex max-w-md flex-col ${isOwnMessage ? 'items-end' : ''}`}>
                            <div className={`mb-1 flex items-center gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                              <span className="text-xs font-medium text-muted-foreground">{senderDisplayName}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                                  isOwnMessage
                                    ? 'bg-primary/15 text-primary'
                                    : isClient
                                      ? 'bg-secondary/60 text-secondary-foreground'
                                      : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {isOwnMessage ? 'Client' : isClient ? 'Client' : 'Team'}
                              </span>
                            </div>
                            <div
                              className={`rounded-2xl px-4 py-2.5 ${
                                isOwnMessage
                                  ? 'bg-primary text-primary-foreground'
                                  : isClient
                                    ? 'bg-secondary/70 text-secondary-foreground'
                                    : 'bg-muted'
                              }`}
                            >
                              <p className="break-words whitespace-pre-wrap text-sm">{msg.message}</p>
                            </div>
                            <span className="mt-1 text-xs text-muted-foreground">
                              {msg.created_at ? format(new Date(msg.created_at), 'MMM d, h:mm a') : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <form onSubmit={handleSendMessage} className="mt-5 flex gap-2 border-t border-border/70 pt-4">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="h-11 flex-1 rounded-full"
                />
                <Button type="submit" disabled={sending || !newMessage.trim()} className="h-11 rounded-full px-5">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

const SummaryCard = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="rounded-[22px] border border-border/70 bg-background/25 px-4 py-4">
    <div className="mb-2 flex items-center justify-between text-muted-foreground">
      <span className="text-xs uppercase tracking-[0.16em]">{label}</span>
      {icon}
    </div>
    <div className="text-2xl font-semibold tracking-tight">{value}</div>
  </div>
);

const formatTaskStatus = (status: string) => {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'todo':
      return 'To Do';
    case 'done':
      return 'Done';
    case 'backlog':
      return 'Backlog';
    case 'active':
      return 'Active';
    default:
      return status;
  }
};

export default ClientProjectView;
