export type UnreferencedMediaFile = {
  id: string;
  bucket: string;
  path: string;
};

export async function removeUnreferencedMediaWithDependencies(
  fileId: string,
  dependencies: {
    findCandidate: (fileId: string) => Promise<UnreferencedMediaFile | null>;
    deleteIfStillUnreferenced: (fileId: string) => Promise<boolean>;
    removeStorageObject: (bucket: string, path: string) => Promise<void>;
  },
) {
  const file = await dependencies.findCandidate(fileId);
  if (!file) return false;

  const deleted = await dependencies.deleteIfStillUnreferenced(file.id);
  if (!deleted) return false;

  await dependencies.removeStorageObject(file.bucket, file.path);
  return true;
}
