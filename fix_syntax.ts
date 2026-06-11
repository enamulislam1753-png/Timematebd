import * as fs from 'fs';

const filePath = './src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\r\n/g, '\n');

// Find the section that closing the buttons
const Phrase = `                                       রিজেক্ট ও রিফান্ড (Reject)
                                     </button>
                                   </>
                               </td>`;

const Target = `                                       রিজেক্ট ও রিফান্ড (Reject)
                                     </button>
                                   </>
                                 )}
                               </td>`;

if (content.indexOf(Phrase) !== -1) {
  content = content.replace(Phrase, Target);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("SUCCESSFULLY CORRECTED CONDITIONAL BRACKET!");
} else {
  console.log("ERROR: Target sequence not found.");
  // Let's print out text around there to see spacing
  const idx = content.indexOf(`রিজেক্ট ও রিফান্ড (Reject)`);
  if (idx !== -1) {
    console.log(content.slice(idx - 100, idx + 200));
  }
}
