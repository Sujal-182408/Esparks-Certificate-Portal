-- ============================================================
-- One-off data fix: standardise the company name stored on certificates
-- ============================================================
--
-- The official name is "Esparks IT Solutions Private Limited"
-- (capital E, small s). Older certificates were saved with variants such
-- as "eSparks IT Solutions". The admin certificate list shows this stored
-- value, so old rows still display the wrong spelling.
--
-- HOW TO RUN (once, against the Neon database):
--   psql "$DATABASE_URL" -f docs/migrations/2026-11-11-standardise-company-name.sql
--
-- It runs in a transaction and prints how many rows it would change
-- BEFORE changing them. Review the count, then COMMIT (or ROLLBACK).
-- ============================================================

BEGIN;

-- Preview: which issuer names will change, and how many rows each
SELECT issuer_name, COUNT(*) AS certificates
  FROM certificates
 WHERE issuer_name ILIKE 'esparks it solution%'
   AND issuer_name <> 'Esparks IT Solutions Private Limited'
 GROUP BY issuer_name;

UPDATE certificates
   SET issuer_name = 'Esparks IT Solutions Private Limited'
 WHERE issuer_name ILIKE 'esparks it solution%'
   AND issuer_name <> 'Esparks IT Solutions Private Limited';

-- Check the result, then run ONE of:
--   COMMIT;    -- keep the change
--   ROLLBACK;  -- undo it
