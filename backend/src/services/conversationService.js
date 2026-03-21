/**
 * @fileoverview Conversation and message persistence layer.
 * Every function requires shopId as first parameter (multi-tenant).
 */

const { supabaseService } = require('./supabase');

async function upsertConversation(shopId, customerPhone, customerName) {
  const cleanPhone = customerPhone.replace(/[^\d+]/g, '');

  const { data, error } = await supabaseService
    .from('conversations')
    .upsert(
      {
        shop_id: shopId,
        customer_phone: cleanPhone,
        customer_name: customerName || null,
        last_message_at: new Date().toISOString(),
        message_count: 1,
      },
      { onConflict: 'shop_id, customer_phone' }
    )
    .select()
    .single();

  if (error) {
    console.error('[ConversationService] Upsert failed:', error.message);

    // On conflict the upsert may not increment; fetch existing row
    const { data: existing } = await supabaseService
      .from('conversations')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_phone', cleanPhone)
      .single();

    if (existing) {
      await supabaseService
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: (existing.message_count || 0) + 1,
          customer_name: customerName || existing.customer_name,
        })
        .eq('id', existing.id);

      return { ...existing, message_count: (existing.message_count || 0) + 1 };
    }

    throw new Error('Failed to upsert conversation: ' + error.message);
  }

  return data;
}

async function getConversationHistory(conversationId, limit = 10) {
  const { data, error } = await supabaseService
    .from('messages')
    .select('direction, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.reverse().map((msg) => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.content,
  }));
}

async function saveMessage(shopId, conversationId, direction, content, intent, needsOwnerReply = false) {
  const { data, error } = await supabaseService
    .from('messages')
    .insert({
      shop_id: shopId,
      conversation_id: conversationId,
      direction,
      content,
      intent,
      needs_owner_reply: needsOwnerReply,
    })
    .select()
    .single();

  if (error) {
    console.error('[ConversationService] saveMessage failed:', error.message);
    return null;
  }

  return data;
}

async function markNeedsOwnerReply(messageId) {
  const { error } = await supabaseService
    .from('messages')
    .update({ needs_owner_reply: true })
    .eq('id', messageId);

  if (error) {
    console.error('[ConversationService] markNeedsOwnerReply failed:', error.message);
  }
}

async function getConversationsByShop(shopId, options = {}) {
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  let query = supabaseService
    .from('conversations')
    .select('*')
    .eq('shop_id', shopId);

  if (options.resolved !== undefined) {
    query = query.eq('resolved', options.resolved);
  }

  if (options.search) {
    query = query.or(
      `customer_phone.ilike.%${options.search}%,customer_name.ilike.%${options.search}%`
    );
  }

  query = query
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error || !data) return [];

  const conversationIds = data.map((c) => c.id);
  if (conversationIds.length === 0) return [];

  const { data: latestMessages } = await supabaseService
    .from('messages')
    .select('conversation_id, content, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });

  const latestByConv = {};
  if (latestMessages) {
    for (const msg of latestMessages) {
      if (!latestByConv[msg.conversation_id]) {
        latestByConv[msg.conversation_id] = msg.content;
      }
    }
  }

  return data.map((conv) => ({
    ...conv,
    latest_message: latestByConv[conv.id] || null,
  }));
}

async function getMessagesByConversation(conversationId, shopId, options = {}) {
  const limit = options.limit || 20;
  const before = options.before || null;

  let query = supabaseService
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return data.reverse();
}

async function getEscalations(shopId) {
  const { data, error } = await supabaseService
    .from('messages')
    .select('*, conversations(customer_phone, customer_name)')
    .eq('shop_id', shopId)
    .eq('needs_owner_reply', true)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data;
}

async function getShopStats(shopId, fromDate, toDate) {
  const baseQuery = () => supabaseService
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('shop_id', shopId)
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  const [totalResult, inboundResult, intentResult, escalationResult] = await Promise.all([
    baseQuery(),
    baseQuery().eq('direction', 'inbound'),
    supabaseService
      .from('messages')
      .select('intent')
      .eq('shop_id', shopId)
      .gte('created_at', fromDate)
      .lte('created_at', toDate)
      .not('intent', 'is', null),
    baseQuery().eq('needs_owner_reply', true),
  ]);

  const intentBreakdown = {};
  if (intentResult.data) {
    for (const row of intentResult.data) {
      intentBreakdown[row.intent] = (intentBreakdown[row.intent] || 0) + 1;
    }
  }

  return {
    totalMessages: totalResult.count || 0,
    inboundMessages: inboundResult.count || 0,
    intentBreakdown,
    escalations: escalationResult.count || 0,
  };
}

module.exports = {
  upsertConversation,
  getConversationHistory,
  saveMessage,
  markNeedsOwnerReply,
  getConversationsByShop,
  getMessagesByConversation,
  getEscalations,
  getShopStats,
};
