export const migration = async (args: {
  instanceId: string
}, outdatedCache: NonNullable<unknown>) => {
  if (Object.hasOwn(outdatedCache, "version")) {
    return outdatedCache;
  }
  return {
    ...outdatedCache,
    version: "0.0",
  };
};
