CREATE OR REPLACE FUNCTION get_public_player_data(p_player_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player JSON;
  v_attendance JSON;
  v_matches JSON;
BEGIN
  -- Fetch player
  SELECT row_to_json(p) INTO v_player 
  FROM public.people p 
  WHERE p.id = p_player_id;

  IF v_player IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch attendance stats
  SELECT json_agg(row_to_json(a)) INTO v_attendance
  FROM public.attendance a
  WHERE a."personId" = p_player_id;

  -- Fetch matches played (basic search in JSONB squad)
  SELECT json_agg(row_to_json(m)) INTO v_matches
  FROM public.matches m
  WHERE (m.squad->>p_player_id::text) IS NOT NULL; 

  RETURN json_build_object(
    'player', v_player,
    'attendance', COALESCE(v_attendance, '[]'::json),
    'matches', COALESCE(v_matches, '[]'::json)
  );
END;
$$;
