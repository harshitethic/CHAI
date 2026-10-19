import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
function fixture() {
  const base = mkdtempSync(join(tmpdir(), "chai-install-")),
    image = join(base, "fixture.AppImage"),
    home = join(base, "home");
  mkdirSync(home);
  writeFileSync(image, "test fixture, never executed");
  const run = (version: string, upgrade = false) =>
    spawnSync(
      "sh",
      [
        resolve("scripts/install-local.sh"),
        image,
        version,
        ...(upgrade ? ["--upgrade"] : []),
      ],
      { env: { ...process.env, CHAI_INSTALL_HOME: home }, encoding: "utf8" },
    );
  return { base, home, image, run };
}
test("installer requires explicit upgrade and retains previous executable and launchers", () => {
  const s = fixture();
  assert.equal(s.run("0.1.0-alpha.1").status, 0);
  const launcher = join(s.home, ".local/bin/chai"),
    before = readFileSync(launcher, "utf8");
  assert.equal(s.run("0.2.0-alpha.1").status, 1);
  assert.equal(readFileSync(launcher, "utf8"), before);
  assert.equal(s.run("0.2.0-alpha.1", true).status, 0);
  assert.equal(
    readFileSync(
      join(s.home, ".local/opt/chai-0.2.0-alpha.1/previous-launcher"),
      "utf8",
    ),
    before,
  );
  assert(
    existsSync(join(s.home, ".local/opt/chai-0.1.0-alpha.1/CHAI.AppImage")),
  );
  assert.match(readFileSync(launcher, "utf8"), /chai-0.2.0-alpha.1/);
});
test("installer refuses unrelated launchers even with upgrade requested", () => {
  const s = fixture(),
    bin = join(s.home, ".local/bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, "chai"), "unrelated user program");
  assert.equal(s.run("0.2.0-alpha.1", true).status, 1);
  assert.equal(
    readFileSync(join(bin, "chai"), "utf8"),
    "unrelated user program",
  );
  assert(!existsSync(join(s.home, ".local/opt/chai-0.2.0-alpha.1")));
});
