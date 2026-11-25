/**
 * useLegalContent() → { content, loading, notice(key), noticesAt(placement) }
 * This app's legal pages and disclaimers. Until they load (or if they can't)
 * the original text is used, so pages always show something.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLegalContent, getLoadedLegalContent } from "../services/legalContentService";
import { defaultLegal } from "../utils/legalDefaults";
import { PROGRAM_ID } from "../utils/programConfig";

const useLegalContent = () => {
  const [state, setState] = useState(() => {
    const loaded = getLoadedLegalContent();
    return { content: loaded, loading: !loaded };
  });

  useEffect(() => {
    let alive = true;
    fetchLegalContent()
      .then((content) => alive && setState({ content, loading: false }))
      .catch(() => alive && setState((s) => ({ content: s.content, loading: false })));
    return () => {
      alive = false;
    };
  }, []);

  const content = useMemo(() => state.content || defaultLegal(PROGRAM_ID), [state.content]);

  // a built-in disclaimer → its text, or null when switched off
  const notice = useCallback(
    (key) => {
      const n = content.notices.find((x) => x.key === key);
      return n && n.enabled !== false && n.text ? n : null;
    },
    [content]
  );

  // the admin's own disclaimers for one spot in the app
  const noticesAt = useCallback(
    (placement) => content.notices.filter((n) => !n.builtIn && n.placement === placement && n.enabled !== false && n.text),
    [content]
  );

  return { content, loading: state.loading, notice, noticesAt };
};

export default useLegalContent;
