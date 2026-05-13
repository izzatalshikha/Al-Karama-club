-- Let's see what roles already exist in the people table that might be unaccounted for
SELECT DISTINCT role FROM people;
SELECT DISTINCT role FROM app_users;
