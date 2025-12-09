// cinematic_server.js
const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
app.use(express.json({ limit: '1mb' }));

function pyCmd() {
  // Try python3 first, then python (works on macOS/Win/Linux)
  return process.platform === 'win32' ? 'python' : 'python3';
}

app.post('/cinematic', (req, res) => {
  try {
    const scriptPath = path.join(__dirname, 'Game', 'ai', 'battle_story_ai.py');
    const p = spawn(pyCmd(), [scriptPath, '-'], { stdio: ['pipe', 'pipe', 'pipe'] });

    let out = '', err = '';
    p.stdout.on('data', d => (out += d.toString()));
    p.stderr.on('data', d => (err += d.toString()));
    p.on('close', code => {
      if (code === 0) res.type('text/plain').send(out);
      else res.status(500).send(err || 'AI failed');
    });

    p.stdin.write(JSON.stringify(req.body));
    p.stdin.end();
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// Serve your game so fetch('/cinematic') is same-origin (no CORS headaches)
app.use('/', express.static(path.join(__dirname, 'Game')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Galaxy Clash running at http://localhost:${PORT}`));
