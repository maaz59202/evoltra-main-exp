-- Create profile and admin role for existing user
INSERT INTO public.profiles (user_id, email, full_name, onboarding_completed)
VALUES ('dcc2b7f4-2dd2-40c3-ab9e-d23297c8f9fe', 'syedwasay848@gmail.com', 'Syed Wasay', false)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('dcc2b7f4-2dd2-40c3-ab9e-d23297c8f9fe', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;