import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

// A file names only those that fire, as consumers report unused directives
const exemptRules = [
	// the generated comments come from the spec file, so their content is the
	// document author's
	"block65/no-jsdoc-on-statement",
	"block65/no-bare-block-comment",
	"block65/declaration-comments",
	"block65/no-comment-divider",
	"block65/no-comment-history",
	"block65/no-negated-comment",
	"block65/no-narrative-comment",
	"block65/no-jargon-comment",
	"block65/no-padded-comment",
	"block65/no-figurative-comment",
	"block65/no-absence-comment",
	"block65/no-comment-overclaim",
	"block65/no-hedging-comment",
	"block65/no-assumption-comment",
	"block65/no-overconfident-comment",
	"block65/no-placeholder-comment",
	"block65/no-banned-comment-words",
	"block65/no-comment-list",
	"block65/no-comment-punctuation",
	"block65/no-trailing-comment-punctuation",
	"block65/no-file-reference-in-comment",
	"block65/no-file-header-comment",
	"block65/max-comment-lines",
	"block65/require-comment-blank-line",
	"unicorn-unported/comment-content",

	// a query parameter named `t` or `q` is the document's wire contract, so
	// the generated code destructures that name
	"block65/no-single-character-declaration",
	"unicorn/max-nested-calls",

	// input schemas face TS callers, who may pass an explicit `undefined` for
	// an absent member. The wire schemas use `exactOptional`
	"block65/prefer-exact-optional",
];

// oxlint reports `block65/rule` as `block65(rule)`
const exemptByCode = new Map(
	exemptRules.flatMap((rule) => {
		const [plugin, name] = rule.split("/");

		return [
			[`${plugin}(${name})`, rule],
			[`eslint-plugin-${plugin}(${name})`, rule],
		];
	}),
);

// Found upward from the output, so the directives match the consumer's config
async function findOxlint(from: string): Promise<string | undefined> {
	const bin = path.join(from, "node_modules", ".bin", "oxlint");

	if (
		await access(bin).then(
			() => true,
			() => false,
		)
	) {
		return from;
	}

	const parent = path.dirname(from);

	return parent === from ? undefined : findOxlint(parent);
}

function isReport(
	value: unknown,
): value is { diagnostics: { code: string; filename: string }[] } {
	return (
		typeof value === "object" &&
		value !== null &&
		"diagnostics" in value &&
		Array.isArray(value.diagnostics)
	);
}

function parseReport(stdout: string) {
	try {
		const report: unknown = JSON.parse(stdout);

		return isReport(report) ? report : undefined;
	} catch {
		return;
	}
}

/**
 * Maps each file, as written, to the exempt rules that fire in it. The map is
 * empty without oxlint, or when its config fails to load
 */
export async function firedExemptions(files: string[]) {
	const fired = new Map<string, Set<string>>();

	const [first] = files;
	const root = first && (await findOxlint(path.dirname(first)));

	if (!root) {
		return fired;
	}

	// oxlint exits non-zero when it reports anything, which rejects, and the
	// report is still on stdout
	const stdout = await promisify(execFile)(
		path.join(root, "node_modules", ".bin", "oxlint"),
		["--format=json", ...files.map((file) => path.relative(root, file))],
		{ cwd: root, maxBuffer: 1024 * 1024 * 1024 },
	).then(
		(result) => result.stdout,
		(error: unknown) =>
			typeof error === "object" && error !== null && "stdout" in error
				? String(error.stdout)
				: "",
	);

	const report = parseReport(stdout);

	if (!report) {
		console.warn(`oxlint in ${root} produced no report, so no lint directives`);

		return fired;
	}

	for (const { code, filename } of report.diagnostics) {
		const rule = exemptByCode.get(code);

		if (rule) {
			const file = path.join(root, filename);
			const rules = fired.get(file) ?? new Set();
			rules.add(rule);
			fired.set(file, rules);
		}
	}

	return fired;
}
