-- Create client_users table for client authentication (separate from freelancer users)
CREATE TABLE public.client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  password_hash text, -- Will be set on first login
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create project_clients table to link clients to specific projects
CREATE TABLE public.project_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  client_user_id uuid REFERENCES public.client_users(id) ON DELETE CASCADE NOT NULL,
  invited_by uuid NOT NULL,
  invite_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  invite_expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  password_set boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(project_id, client_user_id)
);

-- Create notifications table for freelancer notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'message',
  title text NOT NULL,
  message text,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_users (accessed via edge functions with service role)
CREATE POLICY "Service role can manage client_users"
ON public.client_users FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for project_clients
CREATE POLICY "Org members can view project clients"
ON public.project_clients FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  JOIN organization_members om ON om.organization_id = p.organization_id
  WHERE p.id = project_clients.project_id AND om.user_id = auth.uid()
));

CREATE POLICY "Org members can invite clients"
ON public.project_clients FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p
  JOIN organization_members om ON om.organization_id = p.organization_id
  WHERE p.id = project_clients.project_id AND om.user_id = auth.uid()
));

CREATE POLICY "Org members can manage project clients"
ON public.project_clients FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects p
  JOIN organization_members om ON om.organization_id = p.organization_id
  WHERE p.id = project_clients.project_id AND om.user_id = auth.uid()
));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

-- Update project_messages to support client senders
-- Add index for faster message queries
CREATE INDEX IF NOT EXISTS idx_project_messages_project_id ON public.project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, read);