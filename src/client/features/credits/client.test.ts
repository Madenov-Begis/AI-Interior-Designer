import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  CREDITS_QUERY_KEY,
  creditQueryOptions,
  refreshCreditsQuery,
} from "./client.ts";

test("topbar and profile observers share purchase, debit, and refund balance updates", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let authoritativeBalance = 10;
  const loadCredits = async () => ({
    balance: authoritativeBalance,
    generationCost: 4,
  });
  const topbar = new QueryObserver(
    queryClient,
    creditQueryOptions(loadCredits, { balance: 7, generationCost: 4 }),
  );
  const profile = new QueryObserver(
    queryClient,
    creditQueryOptions(loadCredits, { balance: 7, generationCost: 4 }),
  );
  const unsubscribeTopbar = topbar.subscribe(() => undefined);
  const unsubscribeProfile = profile.subscribe(() => undefined);

  await topbar.refetch();
  assert.deepEqual(CREDITS_QUERY_KEY, ["credits"]);
  assert.equal(topbar.getCurrentResult().data?.balance, 10);
  assert.equal(profile.getCurrentResult().data?.balance, 10);

  for (const [lifecycle, expectedBalance] of [
    ["purchase", 30],
    ["debit", 26],
    ["refund", 30],
  ] as const) {
    authoritativeBalance = expectedBalance;
    await refreshCreditsQuery(queryClient);
    assert.equal(
      topbar.getCurrentResult().data?.balance,
      expectedBalance,
      `topbar after ${lifecycle}`,
    );
    assert.equal(
      profile.getCurrentResult().data?.balance,
      expectedBalance,
      `profile after ${lifecycle}`,
    );
  }

  unsubscribeTopbar();
  unsubscribeProfile();
});
