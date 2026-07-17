/**
 * Static content for the free `generate_icon_workflow` MCP tool.
 *
 * The free icon path deliberately spends ZERO Extenshi tokens and touches no
 * Extenshi infrastructure: the coding agent draws the SVG itself, and
 * `@extenshi/cli icon preview` renders the verification page fully offline.
 * This tool exists so an agent connected through the MCP connector gets the
 * exact requirements and commands instead of guessing them.
 *
 * Kept as a template function (not a docs fetch) so the tool works without
 * network access and never fails on a docs outage.
 */

export interface IconWorkflowArgs {
	extensionName?: string
}

export function renderIconWorkflow(args: IconWorkflowArgs): string {
	const name = args.extensionName?.trim() || 'My Extension'
	const iconFile = 'icon.svg'
	return `# Browser-extension icon — design requirements and local workflow

This workflow is FREE and fully local: you (the agent) draw the SVG yourself, and the
Extenshi CLI renders an offline verification page. No API key, no credits, no uploads.

## Icon requirements (all stores: Chrome, Firefox, Edge)

- Deliverables: PNG at 16, 32, 48 and 128 px (128 px is the store-listing size), plus the
  SVG master. Chrome Web Store also uses a 440×280 promo tile.
- The 16 px toolbar render is what users see most. Design for it:
  - one bold silhouette, minimal interior detail, generous negative space;
  - no text, no thin outlines (<1.5 px at 16 px they dissolve);
  - keep ~1 px of breathing room to the edges (toolbar buttons crop nothing, but
    adjacent icons sit 8–12 px away).
- Must survive light AND dark toolbars: avoid mid-gray (#7a7a7a-ish) fills that melt
  into both themes; prefer a saturated brand color or add a contrasting outline/backdrop shape.
- Single \`<svg>\` element, square viewBox (e.g. \`viewBox="0 0 24 24"\` or \`0 0 128 128\`),
  flat shapes, no embedded rasters, no scripts, no external references.

## Workflow

1. **Draw the SVG yourself** — write it to \`${iconFile}\` in the project. Iterate on the
   silhouette at conceptual 16 px scale before adding any detail.
2. **Render the verification page** (free, offline):

   \`\`\`bash
   npx @extenshi/cli icon preview ${iconFile} --name "${name}"
   \`\`\`

   This writes a self-contained HTML file and opens it: Chrome / Firefox / Edge toolbar
   mockups with the icon pinned in place, switchable palettes (light, tinted, dark, black,
   saturated + a custom color picker) with an automatic contrast warning per palette, a
   store-size matrix, and an 8× pixel magnifier of the 16 px render.
3. **Ask the human to review the page.** Iterate: edit \`${iconFile}\`, re-run the command
   (add \`--no-open\` on re-runs; the browser tab just needs a refresh).
4. **Export** straight from the page buttons: per-size PNGs, or the ZIP containing
   \`icons/{16,32,48,128}.png\`, the SVG master and \`manifest-icons.json\`; there is also a
   copy-paste manifest snippet:

   \`\`\`json
   {
   	"icons": { "16": "icons/16.png", "32": "icons/32.png", "48": "icons/48.png", "128": "icons/128.png" },
   	"action": { "default_icon": { "16": "icons/16.png", "32": "icons/32.png" } }
   }
   \`\`\`
5. Unpack the exported \`icons/\` folder into the extension and reference it from
   \`manifest.json\` as above.

## Related

- Hosted AI icon generation (no local agent needed) lives at
  https://dojo.extenshi.io/tools/icon-generator.
- Uploading the finished icon into a dojo project is planned but not available yet —
  do not look for an upload API.
`
}
