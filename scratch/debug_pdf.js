const fs = require('fs');
const path = require('path');

// Check what pdf-parse exports
const pdfModule = require('pdf-parse');
console.log('Module type:', typeof pdfModule);
console.log('Module keys:', Object.keys(pdfModule));
console.log('Default:', typeof pdfModule.default);
