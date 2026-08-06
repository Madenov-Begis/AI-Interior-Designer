import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  APP_SESSION_QUERY_KEY,
  refreshAppSession,
  type AppSession,
} from "../../auth/index.ts";

test("all authenticated surfaces share purchase, debit, and refund balance updates", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let authoritativeBalance = 10;
  const loadSession = async (): Promise<AppSession> => ({
    user: {
      id: "user-1",
      name: "Test User",
      email: "user@example.com",
      avatarUrl: null,
    },
    wallet: { balance: authoritativeBalance, generationCost: 4 },
  });
  const topbar = new QueryObserver(queryClient, {
    queryKey: APP_SESSION_QUERY_KEY,
    queryFn: loadSession,
  });
  const profile = new QueryObserver(queryClient, {
    queryKey: APP_SESSION_QUERY_KEY,
    queryFn: loadSession,
  });
  const unsubscribeTopbar = topbar.subscribe(() => undefined);
  const unsubscribeProfile = profile.subscribe(() => undefined);

  await topbar.refetch();
  assert.deepEqual(APP_SESSION_QUERY_KEY, ["auth", "me"]);
  assert.equal(topbar.getCurrentResult().data?.wallet.balance, 10);
  assert.equal(profile.getCurrentResult().data?.wallet.balance, 10);

  for (const [lifecycle, expectedBalance] of [
    ["purchase", 30],
    ["debit", 26],
    ["refund", 30],
  ] as const) {
    authoritativeBalance = expectedBalance;
    await refreshAppSession(queryClient);
    assert.equal(
      topbar.getCurrentResult().data?.wallet.balance,
      expectedBalance,
      `topbar after ${lifecycle}`,
    );
    assert.equal(
      profile.getCurrentResult().data?.wallet.balance,
      expectedBalance,
      `profile after ${lifecycle}`,
    );
  }

  unsubscribeTopbar();
  unsubscribeProfile();
});
