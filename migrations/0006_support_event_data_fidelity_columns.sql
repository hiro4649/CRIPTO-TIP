begin;

alter table support_events add column if not exists previous_affinity integer;
alter table support_events add column if not exists new_affinity integer;
alter table support_events add column if not exists relationship_level integer;
alter table support_events add column if not exists reaction_can_say_name boolean;
alter table support_events add column if not exists reaction_can_read_message boolean;
alter table support_events add column if not exists reaction_max_speech_seconds integer;

update support_events
set
  previous_affinity = coalesce(previous_affinity, 0),
  new_affinity = coalesce(new_affinity, affinity_delta),
  relationship_level = coalesce(relationship_level, 0),
  reaction_can_say_name = coalesce(reaction_can_say_name, message_moderation_status = 'approved'),
  reaction_can_read_message = coalesce(reaction_can_read_message, message_moderation_status = 'approved'),
  reaction_max_speech_seconds = coalesce(reaction_max_speech_seconds, 12)
where previous_affinity is null
   or new_affinity is null
   or relationship_level is null
   or reaction_can_say_name is null
   or reaction_can_read_message is null
   or reaction_max_speech_seconds is null;

alter table support_events alter column previous_affinity set not null;
alter table support_events alter column previous_affinity set default 0;
alter table support_events alter column new_affinity set not null;
alter table support_events alter column new_affinity set default 0;
alter table support_events alter column relationship_level set not null;
alter table support_events alter column relationship_level set default 0;
alter table support_events alter column reaction_can_say_name set not null;
alter table support_events alter column reaction_can_say_name set default false;
alter table support_events alter column reaction_can_read_message set not null;
alter table support_events alter column reaction_can_read_message set default false;
alter table support_events alter column reaction_max_speech_seconds set not null;
alter table support_events alter column reaction_max_speech_seconds set default 12;

commit;
