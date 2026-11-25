import {Config} from '@remotion/cli/config';

// All permanent assets live in /assets (served through staticFile()).
Config.setPublicDir('./assets');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
// Software WebGL so the 3D characters render on any machine / CI without a GPU.
// Use `--gl=angle` (or vulkan) on a workstation with a GPU for much faster renders.
Config.setChromiumOpenGlRenderer('swangle');
Config.setConcurrency(4);

// Use a locally installed Chromium when Remotion cannot download its own
// (offline / restricted networks). Override with REMOTION_BROWSER=/path/to/chrome.
import fs from 'node:fs';
const localBrowser = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
if (fs.existsSync(localBrowser)) {
  Config.setBrowserExecutable(localBrowser);
}
