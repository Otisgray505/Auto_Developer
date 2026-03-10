const readline = require('readline');

/**
 * A dummy ACP agent that responds to `initialize` and `session/new` requests.
 * Used for testing the Worker class which acts as an ACP Client.
 */
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', (line) => {
    try {
        const req = JSON.parse(line);
        if (req.method === 'initialize') {
            console.log(JSON.stringify({
                jsonrpc: "2.0",
                id: req.id,
                result: {
                    protocolVersion: "2024-11-05", // Mock ACP version
                    agentCapabilities: {},
                    authMethods: []
                }
            }));
        } else if (req.method === 'session/new') {
            console.log(JSON.stringify({
                jsonrpc: "2.0",
                id: req.id,
                result: {
                    sessionId: "test-session-123"
                }
            }));
        }
    } catch (err) {
        // Ignore invalid JSON (e.g. from tests intentionally sending garbage)
    }
});

// Keep process alive slightly for tests
setTimeout(() => process.exit(0), 1000);
