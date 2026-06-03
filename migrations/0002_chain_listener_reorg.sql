create table chain_cursors (
  id text primary key,
  chain_id integer not null,
  contract_address text not null,
  last_scanned_block bigint not null default 0,
  last_finalized_block bigint not null default 0,
  last_seen_block_hash text,
  updated_at timestamptz not null default now(),
  unique(chain_id, contract_address)
);

create index chain_cursors_lookup_idx on chain_cursors(chain_id, contract_address);
create index tip_transactions_confirmation_idx on tip_transactions(chain_id, contract_address, status, block_number);
