-- RUN THIS IN THE SUPABASE SQL EDITOR

CREATE OR REPLACE FUNCTION add_xp(xp_amount INT)
RETURNS void AS $$
BEGIN
  -- Security check: prevent massive XP manipulation
  -- Assuming legitimate max XP per question/event is small (e.g. 10)
  IF xp_amount > 50 THEN
    RAISE EXCEPTION 'XP amount too high';
  END IF;

  UPDATE profiles
  SET total_xp = COALESCE(total_xp, 0) + xp_amount
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
