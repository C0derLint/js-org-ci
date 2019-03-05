import {message, danger, fail} from "danger"

const activeFile = "cnames_active.js";

const modified = danger.git.modified_files;
const newFiles = danger.git.created_files;
const prTitle = danger.github.pr.title;

// const checkIfActiveFileModified = () => {
  
// }

// const checkDiff = async () => {
//   let diff = await danger.git.diffForFile(activeFile);
//   let linesOfCode = await danger.git.linesOfCode();

//   if(diff.added.match(/^\+\s*?,"[\d\w]+?":\s*?".+?"$/) && linesOfCode == 1) {
//     message(`:heavy_check_mark: Only one line added!`)    
//   } else
//     warn(`Regex failed for \`${diff.added}\``)
// }


// isActiveFileModified()
//   .then(() => checkDiff())
//   .catch(err => console.log(err));

// JSON.parse()

const result = async () => {
  
  // Check if cnames_active.js is modified.
  let isCNamesFileModified = modified.includes(activeFile);

  if(isCNamesFileModified)
    if(modified.length == 1)
      message(`:heavy_check_mark: Only file modified is ${activeFile}`)
    else
      warn(`Multiple files modified - ${modified.join(", ")}`)
  else
    fail(`${activeFile} not modified.`)


  // Check if PR title matches *.js.org
  let prTitleMatch = /([\d\w]+?)\.js\.org/.exec(prTitle)
  let isPRTitleCorrect = prTitleMatch !== null

  if(isPRTitleCorrect)
    message(`:heavy_check_mark: Title of PR - ${prTitle}`)
  else
    warn(`Title of Pull Request is not in the format *myawesomeproject.js.org*`)

  
  // Check number of lines changed in diff
  let linesOfCode = await danger.git.linesOfCode();

  if(linesOfCode == 1)
    message(`:heavy_check_mark: Only one line added!`)    
  else
    fail(`More than one line added! There's no need to write essays here ;)`)


  // Check diff to see if code is added properly
  let diff = await danger.git.diffForFile(activeFile);
  let addedCode = diff.added;

  // Do not allow comments
  if(addedCode.match(/\/\//))
    warn("Please avoid comments in the cname file.")

  
  // Check if record matches acceptable regex
  let addedRecordMatch = /^\+\s*?,\s*?"([\d\w]+?)":\s*?"([\S]+?)"\s*?$/.exec(addedCode);
  let isAddedRecordCorrect = addedRecordMatch !== null;

  if(isAddedRecordCorrect) {
    let recordKey = addedRecordMatch[1];
    let recordValue = addedRecordMatch[2];

    // Check if recordKey matches PR title
    if(isPRTitleCorrect && prTitleMatch[1] != recordKey)
      warn("Hmmm.. your PR title doesn't seem to match your entry in the file.")

    // Check if record matches EXACT regex
    if(!addedCode.match(/^\+\s{2},"[\d\w]+?":\s"[\S]+?"$/))
      warn("Not an *exact* regex match")
  }
}

result().catch(() => console.log("Well .. humbug"));