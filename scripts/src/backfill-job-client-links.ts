import { db, jobsTable, clientsTable } from "@workspace/db";
import { isNull, sql, eq } from "drizzle-orm";

async function main() {
  const unlinked = await db
    .select({ id: jobsTable.id, clientName: jobsTable.clientName })
    .from(jobsTable)
    .where(isNull(jobsTable.clientId));

  const candidates = unlinked.filter((j) => j.clientName.trim() !== "");

  if (candidates.length === 0) {
    console.log("No unlinked jobs with a clientName found. Nothing to do.");
    return;
  }

  console.log(`Found ${candidates.length} unlinked job(s). Attempting to match…\n`);

  let linked = 0;
  let noMatch = 0;
  let ambiguous = 0;

  for (const job of candidates) {
    const normalised = job.clientName.trim().toLowerCase();

    const matches = await db
      .select({ id: clientsTable.id, name: clientsTable.name })
      .from(clientsTable)
      .where(sql`lower(trim(${clientsTable.name})) = ${normalised}`);

    if (matches.length === 0) {
      console.warn(`  [NO MATCH]   job #${job.id} — clientName="${job.clientName}"`);
      noMatch++;
    } else if (matches.length > 1) {
      const names = matches.map((m) => `#${m.id} "${m.name}"`).join(", ");
      console.warn(`  [AMBIGUOUS]  job #${job.id} — clientName="${job.clientName}" — matched: ${names}`);
      ambiguous++;
    } else {
      await db
        .update(jobsTable)
        .set({ clientId: matches[0].id })
        .where(eq(jobsTable.id, job.id));
      console.log(`  [LINKED]     job #${job.id} — "${job.clientName}" → client #${matches[0].id}`);
      linked++;
    }
  }

  console.log(`\nDone. linked=${linked}  no-match=${noMatch}  ambiguous=${ambiguous}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
