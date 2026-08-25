// CodeCast Stable Mode — injects recent session history into the system prompt.
// Installed by `cast stable`; `cast stable off` removes it. Do not edit —
// the codecast daemon rewrites this file when the CLI updates.
export const CodecastStable = async ({ $, directory }) => {
  const script = "/Users/var/.codecast/hooks/stable-feed-opencode.sh";
  const cache = new Map();
  return {
    "experimental.chat.system.transform": async (input, output) => {
      const key = input.sessionID || "global";
      if (!cache.has(key)) {
        cache.set(key, (async () => {
          try {
            const payload = JSON.stringify({ session_id: input.sessionID, cwd: directory });
            const res = await $`echo ${payload} | bash ${script}`.quiet().nothrow();
            return res.exitCode === 0 ? res.text().trim() : "";
          } catch {
            return "";
          }
        })());
      }
      const text = await cache.get(key);
      if (text) output.system.push(text);
    },
  };
};
