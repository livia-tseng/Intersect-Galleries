-- Rename portfolio templates: grid/masonry/spotlight → minimalist/bold/artsy

alter table public.profiles drop constraint if exists profiles_portfolio_template_check;

update public.profiles set portfolio_template = 'minimalist' where portfolio_template = 'grid';
update public.profiles set portfolio_template = 'bold' where portfolio_template = 'spotlight';
update public.profiles set portfolio_template = 'artsy' where portfolio_template = 'masonry';

update public.profiles
set portfolio_template = 'minimalist'
where portfolio_template is null
   or portfolio_template not in ('minimalist', 'bold', 'artsy');

alter table public.profiles
  add constraint profiles_portfolio_template_check
  check (portfolio_template in ('minimalist', 'bold', 'artsy'));

alter table public.profiles alter column portfolio_template set default 'minimalist';
