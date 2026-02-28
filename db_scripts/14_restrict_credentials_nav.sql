-- Restrict Credentials to sub-account view only
UPDATE navigation_items 
SET view_mode = 'sub_account' 
WHERE label = 'Credentials';
