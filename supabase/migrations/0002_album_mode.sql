-- Terceira forma de escolher: por álbuns (cada pessoa escolhe até 5 álbuns).
-- Rode no SQL Editor do Supabase (ou `supabase db push`) antes de usar o modo "Álbuns".

alter table groups drop constraint groups_last_mode_check;
alter table groups add constraint groups_last_mode_check check (last_mode in ('artist', 'genre', 'album'));

alter table rounds drop constraint rounds_mode_check;
alter table rounds add constraint rounds_mode_check check (mode in ('artist', 'genre', 'album'));
