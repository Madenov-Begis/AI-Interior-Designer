export type EntryProject = { id: string };

export type EntryProjectTransaction = {
  lockUserEntry: (userId: string) => Promise<void>;
  findEmptyDraft: (userId: string) => Promise<EntryProject | null>;
  createEmptyDraft: (userId: string) => Promise<EntryProject>;
};

export type EntryProjectDatabase = {
  transaction: <T>(
    callback: (transaction: EntryProjectTransaction) => Promise<T>,
  ) => Promise<T>;
};

export function getOrCreateEntryProjectWithDatabase(
  database: EntryProjectDatabase,
  userId: string,
) {
  return database.transaction(async (transaction) => {
    await transaction.lockUserEntry(userId);
    const existing = await transaction.findEmptyDraft(userId);
    if (existing) return existing;
    return transaction.createEmptyDraft(userId);
  });
}
