begin;

alter table affinity_ledger add column if not exists source text;
update affinity_ledger set source = 'legacy_unknown' where source is null;
alter table affinity_ledger alter column source set not null;
alter table affinity_ledger drop constraint if exists affinity_ledger_source_event_id_iris_user_id_character_id_key;
alter table affinity_ledger add constraint affinity_ledger_source_source_event_id_iris_user_id_character_id_key unique(source, source_event_id, iris_user_id, character_id);

alter table overlay_events add column if not exists source text;
update overlay_events set source = 'legacy_unknown' where source is null;
alter table overlay_events alter column source set not null;
alter table overlay_events drop constraint if exists overlay_events_source_event_id_stream_id_key;
alter table overlay_events add constraint overlay_events_source_source_event_id_stream_id_key unique(source, source_event_id, stream_id);

alter table reaction_requests add column if not exists source text;
update reaction_requests set source = 'legacy_unknown' where source is null;
alter table reaction_requests alter column source set not null;
alter table reaction_requests drop constraint if exists reaction_requests_source_event_id_character_id_key;
alter table reaction_requests add constraint reaction_requests_source_source_event_id_character_id_key unique(source, source_event_id, character_id);

commit;
