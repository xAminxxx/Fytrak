const fs = require("node:fs");
const path = require("node:path");

const rules = fs.readFileSync(path.resolve(__dirname, "../../../firestore.rules"), "utf8");

const requiredSnippets = [
  "match /coachRequests/{requestId}",
  "allow create, update: if false;",
  "match /assignments/{assignmentId}",
  "allow create, update, delete: if false;",
  "match /chatThreads/{threadId}",
  "match /auditEvents/{eventId}",
  "match /summaries/{docId}",
];

const missing = requiredSnippets.filter((snippet) => !rules.includes(snippet));

if (missing.length > 0) {
  console.error("Firestore rules contract check failed. Missing snippets:");
  missing.forEach((snippet) => console.error(`- ${snippet}`));
  process.exit(1);
}

console.log("Firestore rules contract check passed.");
