-- Real court names. Renames keep court ids, so linked matches stay linked.

-- Provalsan is a court of Padel Indoor, not a club.
delete from public.clubs where name = 'Provalsan';

-- Padel Indoor: rename by old name, then fix positions. The first four are the
-- default courts of a mixing: Blanca Impresores, Joyería Pósito, Hacienda La Laguna, Estrella Damm.
update public.courts ct set name = v.new_name, position = v.new_position
from public.clubs c,
     (values
       ('BLANCA IMPRESORES', 'Blanca Impresores', 1),
       ('JOYERIA POSITO', 'Joyería Pósito', 2),
       ('HACIENDA LA LAGUNA', 'Hacienda La Laguna', 3),
       ('ESTRELLA DAMM (exterior)', 'Estrella Damm (exterior)', 4),
       ('CLITECSA', 'Clitecsa', 5),
       ('JAFRISUR', 'Jafrisur', 6),
       ('DENTAL CLINIC', 'Dental Clinic', 7),
       ('SERVIMAIN', 'Servimain', 8),
       ('Pista 9', 'Provalsan', 9)
     ) as v(old_name, new_name, new_position)
where ct.club_id = c.id and c.name = 'Padel Indoor' and ct.name = v.old_name;

-- Padel Akademia and Padel Premium: rename by position.
update public.courts ct set name = v.new_name
from public.clubs c,
     (values
       ('Padel Akademia', 1, 'Porcelanosa'),
       ('Padel Akademia', 2, 'Jafrisur'),
       ('Padel Akademia', 3, 'Cupra'),
       ('Padel Akademia', 4, 'Caja Rural Jaén'),
       ('Padel Akademia', 5, 'Tesoro Jaén'),
       ('Padel Premium', 1, 'Neumáticos Sur'),
       ('Padel Premium', 2, 'Caorza Energy'),
       ('Padel Premium', 3, 'Alcázar Leyenda (exterior)'),
       ('Padel Premium', 4, 'Jafrisur'),
       ('Padel Premium', 5, 'BYD Autos Auringis'),
       ('Padel Premium', 6, 'Talleres Cañas'),
       ('Padel Premium', 7, 'Clínica Luis Baños'),
       ('Padel Premium', 8, 'Clínica Dr. Manuel Campaña')
     ) as v(club_name, position, new_name)
where ct.club_id = c.id and c.name = v.club_name and ct.position = v.position;

-- Keep the historic text on matches in sync with the new spelling.
update public.matches m set court_name = ct.name
from public.courts ct
where m.court_id = ct.id;
