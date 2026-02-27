/**
 * Exit — Exits pi and prints the command to resume the session
 *
 * Commands:
 *   /exit  — Exit and print resume command
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
    pi.registerCommand("exit", {
        description: "Exit pi and print the command to resume this session",
        handler: async (_args: string, ctx) => {
            const sessionFile = ctx.sessionManager.getSessionFile();
            if (sessionFile) {
                console.log(`\npi --session ${sessionFile}\n`);
            }
            process.stdout.write(
                "\x1b[?25h" +   // restore cursor
                "\x1b[?1049l" + // exit alternate screen buffer
                "\x1b[?2004l" + // disable bracketed paste
                "\x1b[>0u" +    // disable kitty keyboard protocol
                "\x1b[?1l"      // disable application cursor keys
            );
            process.exit(0);
        },
    });
}
