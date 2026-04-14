import { useRef, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MessageSquareText, Send, Sparkles, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useProjectMessages } from '@/hooks/useProjectMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface ProjectMessagesProps {
  projectId: string;
  clientCount?: number;
}

const getInitials = (name?: string) => {
  if (!name) return '??';

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return '??';
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
};

const ProjectMessages = ({ projectId, clientCount }: ProjectMessagesProps) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage, deleteMessage } = useProjectMessages(projectId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const conversationMeta = useMemo(() => {
    const clientParticipants = new Set<string>();
    const teamParticipants = new Set<string>();

    messages.forEach((message) => {
      if (message.sender_type === 'client') {
        const stableClientKey =
          message.client_sender_id ||
          (message.senderName && message.senderName !== 'Client' ? message.senderName : null) ||
          (message.sender_name && message.sender_name !== 'Client' ? message.sender_name : null) ||
          'client';

        clientParticipants.add(stableClientKey);
      } else {
        teamParticipants.add(message.sender_id || message.senderName || 'Team');
      }
    });

    const lastMessage = messages[messages.length - 1];

    return {
      clientCount: clientCount ?? clientParticipants.size,
      teamCount: teamParticipants.size,
      lastActivity: lastMessage?.created_at
        ? format(new Date(lastMessage.created_at), 'MMM d, h:mm a')
        : 'No activity yet',
    };
  }, [clientCount, messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const result = await sendMessage(newMessage);
    if (result) {
      setNewMessage('');
    } else {
      toast.error('Failed to send message');
    }
    setSending(false);
  };

  const handleDelete = async (messageId: string) => {
    const success = await deleteMessage(messageId);
    if (!success) {
      toast.error('Failed to delete message');
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full rounded-3xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-[640px] flex-col overflow-hidden">
      <div className="border-b border-border/60 bg-card/40 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              <MessageSquareText className="h-4 w-4 text-primary" />
              Conversation
            </div>
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">Client thread</h3>
              <p className="text-sm text-muted-foreground">
                Keep updates clean, quick, and easy for the client to follow.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full border-border/70 bg-background/40 px-3 py-1 text-xs text-muted-foreground">
              {conversationMeta.clientCount || 0} client{conversationMeta.clientCount === 1 ? '' : 's'}
            </Badge>
            <Badge variant="outline" className="rounded-full border-border/70 bg-background/40 px-3 py-1 text-xs text-muted-foreground">
              {conversationMeta.teamCount || 0} team member{conversationMeta.teamCount === 1 ? '' : 's'}
            </Badge>
            <Badge variant="outline" className="rounded-full border-primary/25 bg-primary/8 px-3 py-1 text-xs text-primary">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Last activity {conversationMeta.lastActivity}
            </Badge>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-[linear-gradient(180deg,rgba(15,23,42,0.25)_0%,rgba(15,23,42,0)_20%)]">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary">
              <MessageSquareText className="h-7 w-7" />
            </div>
            <h4 className="text-lg font-semibold">No conversation yet</h4>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Start with a clean project update or ask the client for the next approval. This thread is where the work stays aligned.
            </p>
          </div>
        ) : (
          <div className="space-y-5 px-6 py-6">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              const isClient = msg.sender_type === 'client';
              const displayName = isOwn ? 'You' : msg.senderName || 'Unknown';
              const roleLabel = isClient ? 'Client' : 'Team';

              return (
                <div
                  key={msg.id}
                  className={`group flex items-end gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwn && (
                    <Avatar className="h-11 w-11 shrink-0 rounded-2xl border border-border/70">
                      <AvatarFallback className={isClient ? 'rounded-2xl bg-secondary text-secondary-foreground' : 'rounded-2xl bg-primary/15 text-primary'}>
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`max-w-[min(72%,720px)] space-y-2 ${isOwn ? 'items-end text-right' : ''}`}>
                    <div className={`flex items-center gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-sm font-medium text-foreground/90">{displayName}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                          isClient
                            ? 'bg-secondary/70 text-secondary-foreground'
                            : 'bg-primary/12 text-primary'
                        }`}
                      >
                        {roleLabel}
                      </span>
                      {!isClient && isOwn && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="opacity-0 transition-opacity text-muted-foreground hover:text-destructive group-hover:opacity-100"
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div
                      className={`rounded-[28px] border px-4 py-3 shadow-[0_10px_30px_rgba(2,6,23,0.18)] ${
                        isOwn
                          ? 'border-primary/25 bg-[linear-gradient(135deg,rgba(124,92,255,0.95),rgba(95,74,215,0.98))] text-primary-foreground'
                          : isClient
                            ? 'border-border/70 bg-secondary/35 text-foreground'
                            : 'border-border/70 bg-card/85 text-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-7">{msg.message}</p>
                    </div>

                    <div className={`text-xs text-muted-foreground ${isOwn ? 'text-right' : 'text-left'}`}>
                      {msg.created_at ? format(new Date(msg.created_at), 'MMM d, h:mm a') : ''}
                    </div>
                  </div>

                  {isOwn && (
                    <Avatar className="h-11 w-11 shrink-0 rounded-2xl border border-primary/25">
                      <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border/60 bg-card/40 px-6 py-5">
        <form onSubmit={handleSend} className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              New update
            </div>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Share a project update, next step, or reply..."
              disabled={sending}
              className="h-14 rounded-2xl border-border/70 bg-background/55 px-5 text-base"
            />
          </div>
          <Button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="h-14 rounded-2xl px-5 gradient-primary text-white"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ProjectMessages;
