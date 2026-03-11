#!/usr/bin/env node
const WebSocket = require('ws');

const taskId = process.argv[2];
if (!taskId) {
  console.error('Usage: node apps/proxy/scripts/attach-task.js <taskId> [baseUrl]');
  process.exit(1);
}

const baseUrl = process.argv[3] || 'ws://127.0.0.1:8080';
const ws = new WebSocket(`${baseUrl.replace(/\/$/, '')}/ws/terminal/${taskId}`);

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();
process.stdin.setEncoding('utf8');

ws.on('open', () => {
  process.stdout.write(`[attached to delegated task ${taskId}]\n`);
});

ws.on('message', (raw) => {
  try {
    const message = JSON.parse(raw.toString());
    if (message.type === 'output' && typeof message.data === 'string') {
      process.stdout.write(message.data);
      return;
    }
    if (message.type === 'error') {
      process.stderr.write(`${message.data}\n`);
      return;
    }
  } catch {
    process.stdout.write(raw.toString());
  }
});

process.stdin.on('data', (chunk) => {
  if (chunk === '\u0003') {
    ws.close();
    process.exit(0);
  }

  ws.send(JSON.stringify({ type: 'input', data: chunk }));
});

ws.on('close', () => {
  process.stdout.write('\n[detached]\n');
  process.exit(0);
});

ws.on('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
