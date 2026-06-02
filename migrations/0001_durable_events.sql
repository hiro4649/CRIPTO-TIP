create table live_sessions (
  id text primary key,
  youtube_video_id text,
  youtube_live_chat_id text,
  youtube_channel_id text,
  character_id text not null,
  title text not null,
  status text not null,
  companion_url text not null,
  overlay_url text not null,
  overlay_token_hash text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table viewer_identities (
  id text primary key,
  iris_user_id text not null,
  display_name_sanitized text,
  display_name_llm_safe text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wallet_links (
  id text primary key,
  iris_user_id text not null,
  wallet_address text not null,
  normalized_wallet_address text not null unique,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table youtube_viewer_links (
  id text primary key,
  iris_user_id text not null,
  youtube_author_channel_id text not null,
  youtube_display_name_sanitized text,
  verified_at timestamptz,
  verification_code_hash text,
  verification_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index youtube_viewer_links_author_user_unique on youtube_viewer_links(youtube_author_channel_id, iris_user_id);
create index youtube_viewer_links_author_idx on youtube_viewer_links(youtube_author_channel_id);

create table tip_intents (
  id text primary key,
  client_tip_id text not null unique,
  stream_id text not null,
  character_id text not null,
  iris_user_id text not null,
  wallet_address text,
  normalized_wallet_address text,
  display_name_raw text,
  display_name_sanitized text not null,
  display_name_llm_safe text not null,
  message_raw text,
  message_sanitized text,
  message_hash text not null,
  amount_raw numeric not null,
  amount_display text not null,
  tier text not null,
  moderation_status text not null,
  status text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (message_hash ~ '^0x[0-9a-fA-F]{64}$'),
  check (client_tip_id ~ '^0x[0-9a-fA-F]{64}$')
);
create index tip_intents_stream_idx on tip_intents(stream_id);
create index tip_intents_wallet_idx on tip_intents(normalized_wallet_address);

create table tip_transactions (
  id text primary key,
  chain_id integer not null,
  contract_address text not null,
  token_address text,
  tx_hash text not null,
  log_index integer not null,
  block_number bigint,
  block_hash text,
  from_address text,
  normalized_from_address text,
  stream_id text not null,
  character_id text not null,
  amount_raw numeric not null,
  message_hash text not null,
  client_tip_id text,
  status text not null,
  confirmations integer not null default 0,
  detected_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(chain_id, contract_address, tx_hash, log_index)
);
create index tip_transactions_status_idx on tip_transactions(status);
create index tip_transactions_client_tip_idx on tip_transactions(client_tip_id);

create table support_events (
  id text primary key,
  source text not null,
  source_event_id text not null,
  stream_id text not null,
  youtube_video_id text,
  character_id text not null,
  iris_user_id text,
  youtube_author_channel_id text,
  wallet_address text,
  display_name_sanitized text not null,
  display_name_llm_safe text not null,
  amount_raw text,
  amount_display text,
  currency_or_token text,
  tier text not null,
  message_sanitized text,
  message_moderation_status text not null,
  affinity_delta integer not null default 0,
  delivery_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, source_event_id)
);
create index support_events_stream_idx on support_events(stream_id);
create index support_events_delivery_idx on support_events(delivery_status);

create table affinity_ledger (
  id text primary key,
  source_event_id text not null,
  iris_user_id text not null,
  character_id text not null,
  previous_affinity integer not null,
  affinity_delta integer not null,
  new_affinity integer not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique(source_event_id, iris_user_id, character_id)
);

create table overlay_events (
  id text primary key,
  source_event_id text not null,
  stream_id text not null,
  payload_json jsonb not null,
  delivery_status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_event_id, stream_id)
);

create table reaction_requests (
  id text primary key,
  source_event_id text not null,
  character_id text not null,
  stream_id text not null,
  payload_json jsonb not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_event_id, character_id)
);

create table outbox_events (
  id text primary key,
  job_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  idempotency_key text not null unique,
  payload_json jsonb not null,
  status text not null,
  retry_count integer not null default 0,
  max_retry_count integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outbox_events_claim_idx on outbox_events(status, next_attempt_at, locked_at);

create table dead_letter_events (
  id text primary key,
  original_event_id text not null,
  job_type text not null,
  payload_json jsonb not null,
  last_error text not null,
  retry_count integer not null,
  failed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table audit_logs (
  id text primary key,
  actor_type text not null,
  actor_id text,
  action text not null,
  target_type text not null,
  target_id text not null,
  before_json jsonb,
  after_json jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_logs_target_idx on audit_logs(target_type, target_id);
