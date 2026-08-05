type HistoryMedia = {
  bucket: string;
  path: string;
};

type HistoryItemWithMedia = {
  resultUser: HistoryMedia | null;
};

type SignedFile = {
  path: string;
  signedUrl: string;
};

export async function attachHistoryResultUrls<T extends HistoryItemWithMedia>(
  items: T[],
  signPaths: (bucket: string, paths: string[]) => Promise<SignedFile[]>,
): Promise<Array<T & { resultUrl: string | null }>> {
  const pathsByBucket = new Map<string, string[]>();

  for (const item of items) {
    if (!item.resultUser) continue;
    const paths = pathsByBucket.get(item.resultUser.bucket) ?? [];
    paths.push(item.resultUser.path);
    pathsByBucket.set(item.resultUser.bucket, paths);
  }

  const signedEntries = await Promise.all(
    [...pathsByBucket.entries()].map(
      async ([bucket, paths]) =>
        [bucket, await signPaths(bucket, paths)] as const,
    ),
  );
  const signedByFile = new Map<string, string>();
  for (const [bucket, files] of signedEntries) {
    for (const file of files) {
      signedByFile.set(`${bucket}:${file.path}`, file.signedUrl);
    }
  }

  return items.map((item) => ({
    ...item,
    resultUrl: item.resultUser
      ? (signedByFile.get(
          `${item.resultUser.bucket}:${item.resultUser.path}`,
        ) ?? null)
      : null,
  }));
}
