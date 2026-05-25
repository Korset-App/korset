ALTER TABLE public.support_messages DROP CONSTRAINT IF EXISTS support_messages_sender_type_check;
ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_sender_type_check CHECK (sender_type IN ('user', 'ai', 'operator', 'system'));
