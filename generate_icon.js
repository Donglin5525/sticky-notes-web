import fs from 'fs';
import { createCanvas } from 'canvas';

const canvas = createCanvas(128, 128);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#8B5CF6'; // Violet-500
ctx.beginPath();
ctx.roundRect(0, 0, 128, 128, 32);
ctx.fill();

// Sticky Note Icon
ctx.fillStyle = '#FFFFFF';
ctx.fillRect(32, 32, 64, 64);

// Folded corner
ctx.fillStyle = '#E5E7EB'; // Gray-200
ctx.beginPath();
ctx.moveTo(96, 80);
ctx.lineTo(96, 96);
ctx.lineTo(80, 96);
ctx.fill();

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('/home/ubuntu/sticky-notes-web/client/public/icon-128.png', buffer);
console.log('Icon generated successfully.');
