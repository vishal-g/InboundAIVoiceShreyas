-- Migration to add Multi-step Content and Quiz support to checklist steps

ALTER TABLE checklist_steps 
ADD COLUMN IF NOT EXISTS multi_step_config JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quiz_config JSONB DEFAULT NULL;

-- Description of columns:
-- multi_step_config: Stores an array of slides for sub-pagination within a step.
-- quiz_config: Stores questions, options, and validation rules for a confirmation quiz.
