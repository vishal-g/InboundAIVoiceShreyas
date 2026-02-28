-- Rename 'Manage Checklists' to 'Manage Pages' in navigation_items
UPDATE navigation_items 
SET label = 'Manage Pages' 
WHERE label = 'Manage Checklists';
