import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Send, User } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  message: string;
  sender_id: string | null;
  sender_type: string;
  created_at: string | null;
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
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    if (!authLoading && !client) {
      navigate('/client/login');
      return;
    }

    if (client && projectId) {
      fetchMessages();
      fetchProjectName();
    }
  }, [client, authLoading, projectId, navigate]);

  useEffect(() => {
    if (!client || !projectId) return;

    const intervalId = window.setInterval(() => {
      fetchMessages();
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
    setLoading(false);
  };

  const fetchProjectName = async () => {
    try {
      const { data: projectsData } = await supabase.functions.invoke('client-auth', {
        body: { action: 'get-projects', clientToken: '' },
        headers: { 'x-client-id': client?.id || '' },
      });

      if (projectsData?.projects) {
        const project = projectsData.projects.find((p: { id: string; name: string }) => p.id === projectId);
        if (project) setProjectName(project.name);
      }
    } catch (err) {
      console.error('Failed to fetch project metadata:', err);
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
        setMessages([...messages, data.message]);
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/client/portal')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg">{projectName || 'Project'}</h1>
            <p className="text-sm text-muted-foreground">Messages</p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 container mx-auto px-4 py-4 max-w-3xl">
        <Card className="h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Project Messages</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 pr-4">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((msg) => {
                    const isClient = msg.sender_type === 'client';
                    const isOwnMessage = isClient && msg.sender_id === client?.id;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={isClient ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : ''}`}>
                          <div
                            className={`rounded-lg px-4 py-2 max-w-md ${
                              isOwnMessage
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
            <form onSubmit={handleSendMessage} className="flex gap-2 pt-4 border-t mt-4">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientProjectView;
