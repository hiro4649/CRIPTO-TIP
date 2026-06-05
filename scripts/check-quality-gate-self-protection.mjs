#!/usr/bin/env node
import { readJson } from "./evidence-lib.mjs";

const pack = readJson(".codex/evidence-pack.json");
if (!pack.doneCriteria?.some((criterion) => /placeholder/i.test(criterion))) {
  throw new Error("quality-gate self-protection preparation must include placeholder prevention");
}
console.log("Quality-gate self-protection preparation passed.");
