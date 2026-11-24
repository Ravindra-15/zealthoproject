/**
 * BODY PROFILE SETTINGS hooks
 *  useBodyProfileConfig(programId?) → { config, loading }   (this app's program by default)
 *  useBodyProfileConfigs()          → { configs, loading }  (all 5 — to name old answers)
 * If the settings can't be loaded, the default list is used, so the form
 * and views always work.
 */

import { useEffect, useMemo, useState } from "react";
import { fetchAllBodyProfileConfigs, getLoadedBodyProfileConfigs } from "../services/bodyProfileConfigService";
import { defaultBodyProfileConfig } from "../utils/bodyProfileConfig";
import { PROGRAM_ID } from "../utils/programConfig";

export const useBodyProfileConfigs = () => {
  const [state, setState] = useState(() => {
    const loaded = getLoadedBodyProfileConfigs();
    return { configs: loaded || [], loading: !loaded };
  });
  useEffect(() => {
    let alive = true;
    fetchAllBodyProfileConfigs()
      .then((configs) => alive && setState({ configs, loading: false }))
      .catch(() => alive && setState((s) => ({ configs: s.configs, loading: false })));
    return () => {
      alive = false;
    };
  }, []);
  return state;
};

const useBodyProfileConfig = (programId = PROGRAM_ID) => {
  const { configs, loading } = useBodyProfileConfigs();
  const config = useMemo(
    () => configs.find((c) => c.programId === programId) || defaultBodyProfileConfig(programId),
    [configs, programId]
  );
  return { config, loading };
};

export default useBodyProfileConfig;
