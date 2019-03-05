import {message, danger, fail} from "danger"

const activeFile = "cnames_active.js";

const modified = danger.git.modified_files;
const newFiles = danger.git.created_files;
const prTitle = danger.github.pr.title;

const isActiveFileModified = () => {
  return new Promise((resolve, reject) => {
    // Check number of modified files and if the right file is modified
    if(modified.includes(activeFile))
      if(modified.length == 1) {
        message(`:white_check_mark: Only file modified is ${activeFile}`)
        resolve();
      }
      else
        warn(`Multiple files modified - ${modified.join(", ")}`)
    else 
      fail(`${activeFile} not modified.`)
    reject();
  })
}

const checkDiff = async () => {
  let diff = JSON.parse(await danger.git.diffForFile(activeFile));
  if(diff.added.match(/^\+\s{2},"[\d\w]+?":\s".+?"$/))
    message(`:white_check_mark: Kudos, you've correctly added you domain addition.`)
  else
    message(`Regex failed for \`${diff.added}\``)
}

//const checkPrTitle = async () => {
  let titleMatch = /([\d\w]+?)\.js\.org/.exec(prTitle)
  if(titleMatch != null) {
    message(`Title of PR: ${prTitle}`)
  //  resolve(titleMatch[1]);
  }
  else
    warn(`Title of Pull Request is not in the format *myawesomeproject.js.org*`)
//}


isActiveFileModified()
  .then(() => checkDiff());

// JSON.parse()