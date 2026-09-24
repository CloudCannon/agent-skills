# Troubleshooting

Symptom → cause → fix for the dev server itself. Configuration problems belong to
[cloudcannon-configuration](../cloudcannon-configuration/SKILL.md); regions that are marked up
but inert belong to [cloudcannon-visual-editing](../cloudcannon-visual-editing/SKILL.md).

## The loop

**Start by reading the build output.** A build that is still running, a build that failed, and a
build that was never run look identical from the browser. Run the build in a terminal you can
read, or redirect it: `<build> > /tmp/cc-build.log 2>&1`.

| Symptom                                               | Cause                                                                     | Fix                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Saved in the editor, the preview never changes        | Nothing rebuilt — `cloudcannon dev` never builds                          | Re-run the build, or start [`watch-build.mjs`](scripts/README.md)                            |
| The editor field shows the edit, the preview does not | Same cause, or the rebuild is still running                               | Read the build output. Wait for it, then the preview reloads itself                          |
| The build failed and the preview looks stale          | It is showing the last output the build wrote                             | Fix the build. The preview updates on the next successful one                                |
| Every save takes tens of seconds                      | The whole build script re-runs per change                                 | Expected with slow post-build steps. Use the manual route, or raise `--debounce`             |
| Two rebuilds for one save                             | A change arrived mid-build, so it was queued rather than risk dropping it | Expected, and it settles after one extra pass                                                |
| `the build keeps retriggering itself`                 | The build writes into a watched directory — pagefind into `public/`, say  | Stop passing that directory to `--watch`. The default list excludes static-asset directories |
| Editing a file changes nothing, not even a rebuild    | It sits outside the watched allowlist                                     | `--watch <dir>`, or rebuild by hand. Startup prints what is watched                          |
| Pages a post-build step generated vanished            | The bare SSG command ran instead of the build script                      | Run `npm run build` — see [setup.md](setup.md#build-commands)                                |
| A renamed or deleted page is still being served       | The build's output directory still holds it — most SSGs never clean it    | Delete the output directory and build again                                                  |

## Serving

| Symptom                                            | Cause                                                                                 | Fix                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/` shows the CloudCannon app, not my homepage     | It is meant to. The app owns `/` and `/index.html`                                    | The built homepage is at `/__output/index.html`                                           |
| `/about/` returns 500                              | The dev server has no directory index; EISDIR surfaces as a 500                       | Request `/about/index.html`                                                               |
| `cloudcannon dev` fails because the port is taken  | Another server holds it. A healthy answer does not prove it is yours                  | Pass `--port` with a free one. Do not stop that server — it may be the user's own         |
| `detect-build-commands` returns nothing usable     | The CLI could not place the site. `cloudcannon configure detect-ssg` shows its scores | Read the build script out of `package.json` and pass it yourself                          |
| `cloudcannon: command not found`                   | The CLI is not on `PATH`                                                              | `npm i -g @cloudcannon/cli`, or `PATH="$PWD/node_modules/.bin:$PATH"` for a local install |
| The output path is rejected as outside the project | `cloudcannon dev` requires the output path to resolve inside the working directory    | Run it from the site root; there is no `--source` flag                                    |

## Writing

| Symptom                                        | Cause                                                           | Fix                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Edit visible on screen, file unchanged         | Nothing committed the value                                     | Blur after editing, and allow ~1–3s before reading back                                                                        |
| `403 App sync is disabled`                     | Server started with `--no-app-sync`                             | Restart without it                                                                                                             |
| The diff is much larger than the edit          | CloudCannon reserialises the whole frontmatter on save          | Expected. Diff the field you changed                                                                                           |
| YAML comments vanished after an unrelated edit | Same reserialisation — comments are not part of the parsed data | Not recoverable from the editor. Keep guidance in `_inputs[].comment` in `cloudcannon.config.yml`, not in frontmatter comments |
| The user wants their test edits reverted       | They are ordinary file changes                                  | `git diff` to show them, `git checkout --` to drop them                                                                        |
