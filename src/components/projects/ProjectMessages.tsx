import { useRef, useEffect } from 'react';
import { useProjectMessages } from '@/hooks/useProjectMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Send, Trash2, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

interface ProjectMessagesProps {
  projectId: string;
}

const ProjectMessages = ({ projectId }: ProjectMessagesProps) => {
  const { user } = useAuth();
  const { messages, loading, sendMessage, deleteMessage } = useProjectMessages(projectId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No messages yet.</p>
            <p className="text-sm">Start the conversation with your client!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              const isClient = msg.sender_type === 'client';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className={
                        isClient
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-primary text-primary-foreground'
                      }
                    >
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {isOwn ? 'You' : msg.senderName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {isClient ? '(Client)' : '(Team)'}
                      </span>
                      {!isClient && (
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {msg.created_at
                        ? format(new Date(msg.created_at), 'MMM d, h:mm a')
                        : ''}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSend} className="flex gap-2 p-4 border-t">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !newMessage.trim()}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};

export default ProjectMessages;
