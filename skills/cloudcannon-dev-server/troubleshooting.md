# Troubleshooting

Symptom → cause → fix for the dev server itself. Configuration problems belong to
[cloudcannon-configuration](../cloudcannon-configuration/SKILL.md); regions that are marked up
but inert belong to [cloudcannon-visual-editing](../cloudcannon-visual-editing/SKILL.md).

## The loop

| Symptom                                               | Cause                                                                          | Fix                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Saved in the editor, the preview never changes        | Nothing is rebuilding — `cloudcannon dev` was started on its own               | Start through `cc-serve.sh`, which runs a watcher alongside it                                       |
| The editor field shows the edit, the preview does not | Same cause. The save reached the source file; the output was never regenerated | Compare `/__source/<path>` against `/__output/<path>` to confirm, then restart through `cc-serve.sh` |
| The preview updates, then reverts on the next save    | The build command does not include `.cloudcannon/postbuild`                    | Put it in `--build-cmd`. See [setup.md § The postbuild](setup.md#the-postbuild)                      |
| Pages the postbuild generated vanished after I saved  | Same — the plain rebuild overwrote what the postbuild had generated            | As above                                                                                             |
| A renamed or deleted page is still being served       | A watch build never cleans the output directory                                | Restart `cc-serve.sh`, which builds fresh                                                            |
| Rebuilds stopped but the site still serves            | The watcher exited; `cc-serve.sh` prints a line when it notices                | Restart `cc-serve.sh`                                                                                |
| Every save takes tens of seconds                      | The whole build command re-runs per change                                     | Pass a native watch build via `--watch-cmd` where the SSG has one                                    |

## Serving

| Symptom                                                 | Cause                                                                                 | Fix                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/` shows the CloudCannon app, not my homepage          | It is meant to. The app owns `/` and `/index.html`                                    | The built homepage is at `/__output/index.html`                                           |
| `/about/` returns 500                                   | The dev server has no directory index; EISDIR surfaces as a 500                       | Request `/about/index.html`                                                               |
| `cc-serve.sh` says the port is serving a different site | Another project's dev server holds it. It answers healthily, so probing cannot tell   | Pass `--port` with a free one. Do not stop that server — it may be the user's own         |
| `could not detect how this site builds`                 | The CLI could not place the site. `cloudcannon configure detect-ssg` shows its scores | Pass `--output` and `--build-cmd`                                                         |
| `cloudcannon: command not found` from `cc-serve.sh`     | It calls `cloudcannon dev`, so the CLI must be on `PATH`                              | `npm i -g @cloudcannon/cli`, or `PATH="$PWD/node_modules/.bin:$PATH"` for a local install |
| The output path is rejected as outside the project      | `cloudcannon dev` requires the output path to resolve inside the working directory    | Run it from the site root; there is no `--source` flag                                    |

## Writing

| Symptom                                        | Cause                                                           | Fix                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Edit visible on screen, file unchanged         | Nothing committed the value                                     | Blur after editing, and allow ~1–3s before reading back                                                                        |
| `403 App sync is disabled`                     | Server started with `--no-app-sync`                             | Restart without it                                                                                                             |
| The diff is much larger than the edit          | CloudCannon reserialises the whole frontmatter on save          | Expected. Diff the field you changed                                                                                           |
| YAML comments vanished after an unrelated edit | Same reserialisation — comments are not part of the parsed data | Not recoverable from the editor. Keep guidance in `_inputs[].comment` in `cloudcannon.config.yml`, not in frontmatter comments |
| The user wants their test edits reverted       | They are ordinary file changes                                  | `git diff` to show them, `git checkout --` to drop them                                                                        |
