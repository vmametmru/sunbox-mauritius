-- ============================================
-- SUNBOX MAURITIUS - Pool Shapes Variables Migration
-- ============================================
-- This migration documents the dimension variables available for
-- L-shaped and T-shaped pool models.
--
-- These variables are injected automatically into the formula
-- evaluation context when users enter pool dimensions for
-- L-shaped or T-shaped pool models. They can be referenced
-- in any pool_boq_variables formula.
--
-- L-SHAPE dimensions (injected from user input):
--   longueur_la  - Longueur de la piscine principale (partie LA)
--   largeur_la   - Largeur de la piscine principale (partie LA)
--   profondeur_la - Profondeur de la partie LA
--   longueur_lb  - Longueur du bout qui dépasse (partie LB)
--   largeur_lb   - Largeur du bout qui dépasse (partie LB)
--   profondeur_lb - Profondeur de la partie LB
--
-- T-SHAPE dimensions (injected from user input):
--   longueur_ta  - Longueur de la piscine 1 (partie TA)
--   largeur_ta   - Largeur de la piscine 1 (partie TA)
--   profondeur_ta - Profondeur de la partie TA
--   longueur_tb  - Longueur de la piscine 2 (partie TB)
--   largeur_tb   - Largeur de la piscine 2 (partie TB)
--   profondeur_tb - Profondeur de la partie TB
-- ============================================

-- Ensure pool_boq_variables table exists before inserting
-- (pool_boq_migration.sql must have been run first)

-- ============================================
-- No schema changes required — the dimension variables for L and T
-- shapes are injected at runtime by the formula evaluation engine.
-- Admins can create derived formula variables referencing them via
-- the pool variables admin page (admin/pool-variables).
-- ============================================

SELECT 'Pool Shapes Variables Migration completed successfully!' AS Status;
