import { supabase } from './supabase'

export async function logActivity(
  userId: string | undefined,
  action: string,
  entityType: string,
  entityId: string | null,
  description: string
) {
  if (!userId) return
  await supabase.from('activity_logs').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    description
  })
}
