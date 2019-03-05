import {message, danger, fail} from "danger"

const activeFile = "cnames_active.js"

const modified = danger.git.modified_files
const newFiles = danger.git.created_files
const prTitle = danger.github.pr.title

console.log(danger.git, danger.github.pr)

// Check title of PR
if(prTitle.match(/[\d\w]+?\.js\.org/))
  message(`Title of PR: ${prTitle}`)
else
  fail(`Title of Pull Request is not in the format *myawesomeproject.js.org*`)

// Check number of modified files and if the right file is modified
if(modified.includes(activeFile)) {
  if(modified.length == 1)
    message(`:white_check_mark: Only file modified is ${activeFile}`)
  else {
    warn("Multiple files modified")
    message(`Modified files: ${modified.join(", ")}`)
  }
} else {
  fail("cnames_active.js not modified. Are you sure you modified the right file?")
}

JSONDiffForFile(activeFile).then( data => {
  console.log(data);
});

// JSON.parse()