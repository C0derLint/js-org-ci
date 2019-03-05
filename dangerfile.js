import {message, danger, fail} from "danger"

const {get} = require("https");
const getAsync = url => new Promise(resolve => get(url, resolve));

const activeFile = "cnames_active.js";

const modified = danger.git.modified_files;
const newFiles = danger.git.created_files;
const prTitle = danger.github.pr.title;

// puts the line into a JSON object, tries to parse and returns a JS object or undefined
function checkJSON(line) {
  try {
    let re = JSON.parse(`{"_":"" ${line}}`);
    delete re._;
    return re;
  } catch (e) {}
}

// test wheather a redirect is in place and the target is correct
async function checkCNAME(domain, target) {
  const {
    headers,
    statusCode
  } = await getAsync(target);

  if(!(statusCode >= 300 && statusCode < 400))
    warn(`${target} has to redirect using a CNAME file`);
  

  const targetLocation = String(headers.location).replace(/^https/, "http").replace(/\/$/,'');
  if(!(targetLocation === domain))
    warn(`${target} is redirecting to ${targetLocation} instead of ${domain}`);
  
}

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

  if(prTitleMatch)
    message(`:heavy_check_mark: Title of PR - ${prTitle}`)
  else
    warn(`Title of Pull Request is not in the format *myawesomeproject.js.org*`)

  
  // Check number of lines changed in diff
  let linesOfCode = await danger.git.linesOfCode();

  if(linesOfCode == 1)
    message(`:heavy_check_mark: Only one line added!`)    
  else
    fail(`More than one line added! There's no need to write essays here ;)`)

  console.log(linesOfCode);

  // Check diff to see if code is added properly
  let diff = await danger.git.diffForFile(activeFile);
  let lineAdded = diff.substr(1);

  // Check for comments
  let lineComment = /\/\/.*/g.exec(lineAdded);
  if(lineComment) {
    warn("Please avoid comments in the cname file.")

    // Remove the comment from the line in preparation for JSON parsing
    lineAdded = lineAdded.substr(0, lineComment.index);

    // Do not allow noCF comments
    if(!(lineComment[0].match(/\s*\/\/\s*noCF\s*\n/g)))
      fail("The `noCF` comment is no longer required, please remove the same.");
  }

  const recordAdded = checkJSON(lineAdded);
  if(!(typeof recordAdded === "object"))
    fail(`Could not parse ${lineAdded}`);
  else {
    // get the key of the record
    const recordKey = Object.keys(recordAdded)[0];
    // get the value of the record
    const recordValue = recordAdded[recordKey];

    // Check if recordKey matches PR title
    if(prTitleMatch[1] != recordKey)
      warn("Hmmm.. your PR title doesn't seem to match your entry in the file.")

    // Check formatting (copy&paste from a browser adressbar often results in an URL)
    if(!(!recordValue.match(/(http(s?))\:\/\//gi) && !recordValue.endsWith("/")))
      fail("The target value should not start with 'http(s)://' and should not end with a '/'");

    
    if(!diff.added.match(/^\+\s{2},"[\d\w]+?":\s"[\S]+?"$/))
      warn("Not an *exact* regex match")

    // check if the target of of the record is a GitHub Page
    if (recordValue.match(/.github\.io/g)) {
      // check the presence of a CNAME
      await checkCNAME(`http://${recordKey}.js.org`, `https://${recordValue}`);
    }
  }
}

// Exit in case of any error
result().catch(err => {
  console.error(`ERROR: ${err.message || err}`);
  console.info("Some CI tests have returned an error.");
  process.exit(1);
});