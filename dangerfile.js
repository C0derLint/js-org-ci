import {message, danger, fail} from "danger"

const activeFile = "cnames_active.js";

const modified = danger.git.modified_files;
const newFiles = danger.git.created_files;
const prTitle = danger.github.pr.title;


// Check title of PR
if(prTitle.match(/[\d\w]+?\.js\.org/))
  message(`Title of PR: ${prTitle}`)
else
  fail(`Title of Pull Request is not in the format *myawesomeproject.js.org*`)

// Check number of modified files and if the right file is modified
if(modified.includes(activeFile))
  if(modified.length == 1)
    message(`:white_check_mark: Only file modified is ${activeFile}`)
  else
    warn(`Multiple files modified - ${modified.join(", ")}`)
else 
  fail(`${activeFile} not modified.`)

danger.git.diffForFile(activeFile).then( data => {
  console.log(`Diff: ${data}`);
})

danger.git.structuredDiffForFile(activeFile).then( data => {
  console.log(`Structured Diff: ${data}`);
})


// JSON.parse()