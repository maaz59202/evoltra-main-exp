const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Standardize replacing <Loader2 /> tags with <Spinner />
    // First, remove animate-spin since Spinner already has it
    content = content.replace(/className=(['"])([^'"]*?)animate-spin([^'"]*?)\1/g, (match, quote, before, after) => {
      // Just keep it simple, strip animate-spin and any double spaces
      let newClass = (before + after).replace(/\s+/g, ' ').trim();
      return newClass ? `className="${newClass}"` : ``;
    });

    // Replace instances of Loader2 with Spinner in tags
    content = content.replace(/<Loader2/g, '<Spinner');
    content = content.replace(/<\/Loader2>/g, '</Spinner>');

    if (content !== original) {
      // It was replaced, let's fix imports
      
      // If there's an import from ui components, just prepend the spinner import
      if (!content.includes("import { Spinner }")) {
         // insert import { Spinner } from '@/components/ui/spinner'; at the top of the file
         content = `import { Spinner } from '@/components/ui/spinner';\n` + content;
      }

      // We should remove Loader2 from the lucide-react or icons import if we replaced it
      if (!content.includes("<Loader2")) {
        content = content.replace(/Loader2,?/g, ''); 
        content = content.replace(/import\s*{\s*,?\s*}\s*from\s+['"][^'"]+['"];?\n?/g, '');
      }

      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Updated:', filePath);
    }
  }
});