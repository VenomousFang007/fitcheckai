import { supabase } from './supabase';

export interface StyleAIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  created_at: string;
  sequence_number: number;
}

export interface GetOrCreateConversationParams {
  userId: string;
  outfitId: string;
}

/**
 * Get or create a conversation using atomic UPSERT
 * This prevents race conditions by using database-level locking
 */
export async function getOrCreateConversation(
  params: GetOrCreateConversationParams
): Promise<string> {
  const { userId, outfitId } = params;

  console.log('[CONV] Getting or creating conversation:', { userId, outfitId });

  // ✅ ATOMIC UPSERT - eliminates race conditions
  const { data, error } = await supabase
    .from('style_ai_conversations')
    .upsert(
      {
        user_id: userId,
        outfit_id: outfitId,
        updated_at: new Date().toISOString(),
        // Note: created_at is handled by database default
      },
      {
        onConflict: 'user_id,outfit_id',  // ✅ Requires UNIQUE constraint
        ignoreDuplicates: false,           // ✅ Update timestamp on conflict
      }
    )
    .select('id')
    .single();

  if (error) {
    console.error('[CONV ERROR] Failed to upsert conversation:', error);
    throw new Error('Failed to upsert conversation');
  }

  console.log('[CONV] Upserted conversation:', data.id);
  return data.id;
}

/**
 * Load all messages for a conversation
 */
export async function loadMessages(conversationId: string): Promise<StyleAIMessage[]> {
  console.log('[MESSAGES] Loading messages for conversation:', conversationId);

  const { data, error } = await supabase
    .from('style_ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sequence_number', { ascending: true });

  if (error) {
    console.error('[MESSAGES ERROR] Failed to load messages:', error);
    throw new Error('Failed to load messages');
  }

  console.log('[MESSAGES] Loaded messages:', {
    conversationId,
    count: data?.length || 0,
    messages: data?.map(m => ({ role: m.role, preview: m.content.slice(0, 30) }))
  });

  return data || [];
}

/**
 * Save a single message
 */
export interface SaveMessageParams {
  conversationId: string;
  role: 'user' | 'model';
  content: string;
}

export async function saveMessage(params: SaveMessageParams): Promise<StyleAIMessage> {
  const { conversationId, role, content } = params;

  console.log('[MESSAGE SAVE] Saving message:', {
    conversationId,
    role,
    contentPreview: content.slice(0, 50)
  });

  // Get the next sequence number
  const { data: lastMessage } = await supabase
    .from('style_ai_messages')
    .select('sequence_number')
    .eq('conversation_id', conversationId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSequence = (lastMessage?.sequence_number || 0) + 1;

  console.log('[MESSAGE SAVE] Next sequence number:', nextSequence);

  // Insert the message
  const { data, error } = await supabase
    .from('style_ai_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      sequence_number: nextSequence,
    })
    .select()
    .single();

  if (error) {
    console.error('[MESSAGE SAVE ERROR]:', error);
    throw new Error('Failed to save message');
  }

  // Update conversation timestamp (optional - upsert already does this)
  await supabase
    .from('style_ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  console.log('[MESSAGE SAVE] Success:', { id: data.id, sequence: data.sequence_number });

  return data;
}