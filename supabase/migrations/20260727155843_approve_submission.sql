-- A0.6 - fluxo de moderacao: aprova price_submissions -> cria prices

CREATE OR REPLACE FUNCTION public.approve_submission(submission_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submission public.price_submissions;
  new_price_id uuid;
BEGIN
  SELECT * INTO submission FROM public.price_submissions WHERE id = submission_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submissao % nao encontrada', submission_id;
  END IF;

  IF submission.status <> 'pending' THEN
    RAISE EXCEPTION 'Submissao % ja foi revisada (status=%)', submission_id, submission.status;
  END IF;

  INSERT INTO public.prices (
    product_id, market_id, price, source_type, observed_at, source_reference
  )
  VALUES (
    submission.product_id,
    submission.market_id,
    submission.submitted_price,
    submission.source_type,
    submission.created_at,
    'price_submissions:' || submission.id::text
  )
  RETURNING id INTO new_price_id;

  UPDATE public.price_submissions
  SET status = 'approved', reviewed_at = now()
  WHERE id = submission_id;

  RETURN new_price_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_submission(uuid) TO service_role;
