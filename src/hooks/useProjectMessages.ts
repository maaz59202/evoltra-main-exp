import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProjectMessage {
  id: string;
  project_id: string | null;
  sender_id: string | null;
  client_sender_id?: string | null;
  sender_name?: string | null;
  sender_type: string;
  message: string;
  created_at: string | null;
  senderName?: string;
}

export const useProjectMessages = (projectId: string | null) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!user || !projectId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender names for freelancer messages
      const freelancerIds = data
        ?.filter(m => m.sender_type !== 'client' && m.sender_id)
        .map(m => m.sender_id) || [];

      let profilesMap: Record<string, string> = {};
      if (freelancerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', freelancerIds);

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.full_name || p.email || 'Team Member';
          return acc;
        }, {} as Record<string, string>);

        const missingFreelancerIds = freelancerIds.filter((id) => !profilesMap[id]);
        if (missingFreelancerIds.length > 0) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.access_token) {
            const { data: identityData, error: identityError } = await supabase.functions.invoke('resolve-user-identities', {
              body: { userIds: missingFreelancerIds },
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });

            if (identityError) {
              console.warn('Failed to resolve missing message sender identities:', identityError);
            } else {
              Object.entries(identityData?.identities || {}).forEach(([userId, identity]: [string, any]) => {
                profilesMap[userId] = identity.full_name || identity.email || 'Team Member';
              });
            }
          }
        }
      }

      // Fetch client names
      const clientIds = Array.from(
        new Set(
          data
            ?.filter((m) => m.sender_type === 'client')
            .map((m) => m.client_sender_id || m.sender_id)
            .filter(Boolean) || [],
        ),
      ) as string[];

      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('client_users')
          .select('id, full_name, email')
          .in('id', clientIds);

        (clients || []).forEach(c => {
          profilesMap[c.id] = c.full_name || c.email || 'Client';
        });
      }

      const messagesWithNames = (data || []).map(m => ({
        ...m,
        senderName:
          m.sender_name ||
          (m.sender_type === 'client'
            ? (m.client_sender_id ? profilesMap[m.client_sender_id] : undefined) || 'Client'
            : (m.sender_id ? profilesMap[m.sender_id] : undefined) || 'Unknown'),
      }));

      setMessages(messagesWithNames);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [user, projectId]);

  const sendMessage = async (message: string) => {
    if (!user || !projectId || !message.trim()) return null;

    try {
      const trimmedMessage = message.trim();

      const { data, error } = await supabase
        .from('project_messages')
        .insert({
          project_id: projectId,
          sender_id: user.id,
          sender_name: profile?.full_name || user.email || 'Team Member',
          sender_type: 'freelancer',
          message: trimmedMessage,
        })
        .select()
        .single();

      if (error) throw error;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const { error: emailError } = await supabase.functions.invoke('send-activity-email', {
          body: {
            type: 'project_update',
            projectId,
            message: trimmedMessage,
            senderName: profile?.full_name || user.email || 'Your team',
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (emailError) {
          console.warn('Project update email notification failed:', emailError);
        }
      }

      const newMessage: ProjectMessage = {
        ...data,
        senderName: 'You',
      };

      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      return null;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('project_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!user || !projectId) return;

    // Keep message feed fresh even if realtime websocket cannot connect.
    const fallbackInterval = window.setInterval(() => {
      fetchMessages();
    }, 10000);

    const channel = supabase
      .channel(`project-messages-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ProjectMessage;
          // Avoid duplicate if we just sent it
          if (newMsg.sender_id === user.id && newMsg.sender_type !== 'client') {
            return;
          }
          
          // Fetch sender name for the new message
          let senderName = 'Unknown';
          if (newMsg.sender_name) {
            senderName = newMsg.sender_name;
          } else if (newMsg.sender_type === 'client' && (newMsg.client_sender_id || newMsg.sender_id)) {
            const clientSenderId = newMsg.client_sender_id || newMsg.sender_id;
            const { data: clientData } = await supabase
              .from('client_users')
              .select('full_name, email')
              .eq('id', clientSenderId)
              .single();
            senderName = clientData?.full_name || clientData?.email || 'Client';
          } else if (newMsg.sender_type === 'client') {
            senderName = 'Client';
          } else if (newMsg.sender_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', newMsg.sender_id)
              .single();
            senderName = profileData?.full_name || profileData?.email || 'Team Member';
          }

          setMessages(prev => {
            // Prevent duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, senderName }];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          fetchMessages();
        }
      });

    return () => {
      window.clearInterval(fallbackInterval);
      supabase.removeChannel(channel);
    };
  }, [user, projectId, fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
    deleteMessage,
    refetch: fetchMessages,
  };
};
