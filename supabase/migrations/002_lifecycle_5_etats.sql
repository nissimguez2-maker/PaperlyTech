-- 002_lifecycle_5_etats.sql
-- Cycle de vie projet à 5 états : Devisé → Accepté → En production → Livré → Payé.
--
-- ⚠️ ORDRE D'APPLICATION : à appliquer APRÈS le déploiement du code compatible 5 états
-- (PipelineBadge à repli + Error Boundary, déjà sur la branche). Si on migre
-- 'confirmed' → 'accepted' alors que la production tourne encore sur l'ancien code,
-- l'ancien badge plante. Tester d'abord sur une branche Supabase + sauvegarde.

alter table public.projects drop constraint if exists projects_pipeline_stage_check;

-- Migration des états hérités
update public.projects set pipeline_stage = 'quoted'   where pipeline_stage = 'lead';
update public.projects set pipeline_stage = 'accepted'  where pipeline_stage = 'confirmed';
-- 'quoted', 'in_progress', 'delivered', 'paid' restent inchangés

alter table public.projects
  add constraint projects_pipeline_stage_check
  check (pipeline_stage in ('quoted', 'accepted', 'in_progress', 'delivered', 'paid'));

alter table public.projects alter column pipeline_stage set default 'quoted';
