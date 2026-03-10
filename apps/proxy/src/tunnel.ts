import { spawn } from 'child_process';
import { logger } from './logger';

export function startTunnel(port: number = 3000): void {
    logger.info(`Starting Cloudflare Quick Tunnel for localhost:${port}`);

    // cloudflared outputs its connection logs to stderr. 
    // We use npx and shell: true to ensure cross-platform compatibility (e.g. Windows).
    const cloudflared = spawn('npx', ['cloudflared', 'tunnel', '--url', `http://localhost:${port}`], { shell: true });

    let urlFound = false;

    cloudflared.stderr.on('data', (data: Buffer) => {
        const output = data.toString();

        // Regex to match the trycloudflare.com URL
        const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);

        if (urlMatch && !urlFound) {
            urlFound = true;
            logger.info({
                event: 'tunnel_ready',
                message: 'Cloudflare Tunnel successfully established',
                url: urlMatch[0],
                target: `http://localhost:${port}`
            });

            // In a real CLI environment, you might want to explicitly print this out
            // brightly to the user so they can click it.
            logger.info(`\n🚀 Tunnel Ready! Access your local server securely at:\n👉 ${urlMatch[0]}\n`, { event: 'tunnel_url_display' });
        } else if (!urlFound) {
            // Log other setup messages at debug level to keep it quiet
            logger.debug({
                event: 'tunnel_setup',
                message: output.trim()
            });
        }
    });

    cloudflared.on('close', (code) => {
        if (code !== 0) {
            logger.error({
                event: 'tunnel_error',
                message: `cloudflared exited with error code ${code}. Is 'cloudflared' installed on your system?`
            });
        } else {
            logger.info({
                event: 'tunnel_closed',
                message: 'Cloudflare Tunnel closed successfully'
            });
        }
    });

    cloudflared.on('error', (err: any) => {
        if (err.code === 'ENOENT') {
            logger.error({
                event: 'tunnel_missing_binary',
                message: 'Failed to start cloudflared. Ensure the cloudflared CLI is installed globally and in your PATH.'
            });
        } else {
            logger.error({
                event: 'tunnel_spawn_error',
                message: err.message
            });
        }
    });

    // Handle graceful shutdown
    process.once('SIGINT', () => {
        logger.info('Shutting down tunnel...');
        cloudflared.kill();
        process.exit(0);
    });
}

// If running directly (not imported)
if (require.main === module) {
    const portArg = process.argv[2];
    const port = portArg ? parseInt(portArg, 10) : 3000;
    startTunnel(port);
}
