-- Allow authenticated users to claim unowned guides by token.

create policy "guided_visits_claim_unowned"
  on public.guided_visits
  for update
  to authenticated
  using (user_id is null)
  with check (auth.uid() = user_id);
