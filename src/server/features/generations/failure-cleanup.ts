/** Never remove output unless the database confirms it is not a successful result.
 * A lost COMMIT acknowledgement can otherwise destroy an already saved image.
 */
export async function settleFailedGeneration<TFile>(dependencies: {
  markFailed(): Promise<unknown>;
  readStatus(): Promise<string | null>;
  files: readonly TFile[];
  removeFile(file: TFile): Promise<void>;
}) {
  await dependencies.markFailed();
  const status = await dependencies.readStatus();
  if (status !== "FAILED" && status !== "CANCELLED" && status !== "REJECTED") {
    return { cleanupFailures: 0 };
  }
  const results = await Promise.allSettled(
    dependencies.files.map((file) => dependencies.removeFile(file)),
  );
  return {
    cleanupFailures: results.filter((result) => result.status === "rejected")
      .length,
  };
}
