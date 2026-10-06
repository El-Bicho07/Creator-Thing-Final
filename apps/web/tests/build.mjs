/**
 * Frontend functional test harness.
 *
 * Phase 2-4 verification found the frontend had **no functional tests at all** --
 * only `tsc --noEmit` and `next build`, which cannot detect a client that calls
 * the wrong endpoint, drops the auth header, or forgets an error branch.
 *
 * Constraints honoured here:
 *
 * - **No new dependencies.** The repo ships React 19 and Node 24, and React 19's
 *   `react-dom/server` supports async components via `renderToReadableStream`.
 *   Node's built-in `node --test` is the runner. Nothing was installed.
 * - **No browser framework.** See `tests/README.md` for what that costs us.
 *
 * How it works: `tsc` compiles `lib/` and the two page components to
 * `.test-build/`, then this script rewrites the `@/` path alias (which tsc
 * resolves for typechecking but never rewrites in emitted JavaScript) into real
 * relative specifiers that Node can import.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const outRoot = join(webRoot, ".test-build");

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (full.endsWith(".js")) found.push(full);
  }
  return found;
}

/**
 * Rewrite `@/x` to a path relative to the emitted file's own location.
 *
 * tsc maps the alias via `paths` for type resolution but emits the specifier
 * verbatim, so Node would try to resolve a bare package named `@/lib/api`.
 *
 * Sources import extensionless (`@/lib/api`), and tsc emits those extensionless
 * too, so the target is resolved to the file that actually exists on disk.
 */
function resolveTarget(target) {
  for (const candidate of [
    join(outRoot, `${target}.js`),
    join(outRoot, target, "index.js"),
  ]) {
    try {
      statSync(candidate);
      return candidate;
    } catch {
      // try the next shape
    }
  }
  return join(outRoot, `${target}.js`);
}

/** Relative specifier from an emitted file to another path under the build root. */
function relativeTo(from, target) {
  const up = "../".repeat(from.slice(outRoot.length).split("/").filter(Boolean).length);
  const rel = `${up}${target.slice(outRoot.length + 1)}`;
  return rel.startsWith(".") ? rel : `./${rel}`;
}

function rewriteAliases() {
  let rewritten = 0;
  for (const file of walk(outRoot)) {
    const source = readFileSync(file, "utf8");
    const from = dirname(file);
    const withStub = source.replace(
      /(["'])next\/navigation\1/g,
      (_m, quote) => `${quote}${relativeTo(from, join(outRoot, "__stubs__", "next-navigation.js"))}${quote}`,
    );
    const next = withStub.replace(
      /(["'])@\/([^"']+)\1/g,
      (_match, quote, target) => {
        const absolute = resolveTarget(target);
        const up = "../".repeat(from.slice(outRoot.length).split("/").filter(Boolean).length);
        let specifier = `${up}${absolute.slice(outRoot.length + 1)}`;
        if (!specifier.startsWith(".")) specifier = `./${specifier}`;
        return `${quote}${specifier}${quote}`;
      },
    );
    if (next !== source) {
      writeFileSync(file, next);
      rewritten += 1;
    }
  }
  return rewritten;
}

export function build() {
  const tsc = join(webRoot, "node_modules", ".bin", "tsc");
  try {
    execFileSync(tsc, ["-p", join(here, "tsconfig.json")], {
      cwd: webRoot,
      stdio: "inherit",
    });
  } catch {
    console.error(
      "\nFrontend test build failed. That is a real type error in the code under\n" +
        "test -- it is not a harness problem, so do not disable it.\n",
    );
    process.exit(1);
  }
  // `next/navigation` only exists inside the Next bundler. The pages import it for
  // `useRouter` / `useSearchParams`, so the render tests get an inert stub with the
  // same shape. Anything real (a redirect, a navigation) is out of scope for a
  // server-render smoke test, and stubbing it is honest about that.
  const stubDir = join(outRoot, "__stubs__");
  mkdirSync(stubDir, { recursive: true });
  writeFileSync(
    join(stubDir, "next-navigation.js"),
    [
      "export function useRouter() {",
      "  return { push() {}, replace() {}, back() {}, refresh() {}, prefetch() {} };",
      "}",
      "export function useSearchParams() {",
      "  return new URLSearchParams();",
      "}",
      "export function usePathname() { return \"/\"; }",
      "export function redirect() { throw new Error(\"redirect() called in a render test\"); }",
      "export function notFound() { throw new Error(\"notFound() called in a render test\"); }",
      "",
    ].join("\n"),
  );

  // The emitted files are ES modules; without this Node re-parses every one of
  // them as CommonJS first, which is slow and warns on each import.
  writeFileSync(join(outRoot, "package.json"), JSON.stringify({ type: "module" }, null, 2));
  const count = rewriteAliases();
  console.log(`frontend test build ok (${count} files rewritten for the @/ alias)`);
}

if (import.meta.url === `file://${process.argv[1]}`) build();
