#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { assertNoPlaceholders } from "./evidence-lib.mjs";

const roots = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const scanRoots = roots.length ? roots : [".codex", "docs"];

function walk(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target).flatMap((entry) => walk(path.join(target, entry)));
}

for (const file of scanRoots.flatMap(walk)) {
  if (!/\.(json|md|txt|yml|yaml)$/.test(file)) continue;
  assertNoPlaceholders(fs.readFileSync(file, "utf8"), file);
}
console.log("Evidence placeholder check passed.");
