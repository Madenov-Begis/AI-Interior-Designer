import assert from "node:assert/strict";
import test from "node:test";
import { listActiveRoomTypesWithDatabase } from "./operations.ts";

test("public room catalog filters inactive rooms and never selects the AI prompt", async () => {
  let query: unknown;
  const items = await listActiveRoomTypesWithDatabase({
    roomType: {
      async findMany(input) {
        query = input;
        return [
          {
            id: "00000000-0000-4000-8000-000000000010",
            code: "living-room",
            name: "Гостиная",
          },
        ];
      },
    },
  });

  assert.deepEqual(items, [
    {
      id: "00000000-0000-4000-8000-000000000010",
      code: "living-room",
      name: "Гостиная",
    },
  ]);
  assert.deepEqual(query, {
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { code: "asc" }],
    select: { id: true, code: true, name: true },
  });
});
