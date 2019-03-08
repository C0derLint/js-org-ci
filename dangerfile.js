/**
 * 
 * Trying to read this code? Start from the result() function on line 90.
 * 
 */

import { danger, fail, markdown, message, warn, results } from "danger";
const { api, pr, thisPR } = danger.github;

const { get } = require("https");
const getAsync = url => new Promise(resolve => get(url, resolve));

const activeFile = "cnames_active.js";
const restrictedFile = "cnames_restricted.js"

const modified = danger.git.modified_files;

let labels = []

// puts the line into a JSON object, tries to parse and returns a JS object or undefined
function getJSON(line) {
  try {
    let record = JSON.parse(`{"_":"" ${line}}`);
    delete record._;
    return record;
  } catch (e) {}
}

// Try parsing the entire cnames_active.js file to see if there are errors
function checkEntireJSFile() {
  try {
    let allRecords = require(`./${activeFile}`)
    message(`:heavy_check_mark: \`${activeFile}\` parsed successfully.`)

    // Check if multiple records point to same web site
    let recordValues = Object.values(allRecords); // all object values in array
    let recordValuesSet = new Set(recordValues); // cast to set - sets don't allow duplicates
    if(recordValuesSet.size != recordValues.length) // Compare lengths
      warn("An existing subdomain already points to this site.");

    return true;
  } catch(e) {
    fail(`\`${activeFile}\` could not be parsed due to a syntax error.`)
    labels.push("invalid");
    return false;
  }
}

// test whether a redirect is in place and the target is correct
async function checkCNAME(domain, target) {
  const {
    headers,
    statusCode
  } = await getAsync(target);

  // Check status codes to see if redirect is done properly
  if(statusCode == 404) {
    fail(`\`${target}\` responds with a 404 error`);
    labels.push("404");
  } else if(!(statusCode >= 300 && statusCode < 400)) {
    warn(`\`${target}\` has to redirect using a CNAME file`);
    labels.push("awaiting CNAME");
  }
  
  // Check if the target redirect is correct
  const targetLocation = String(headers.location).replace(/^https/, "http").replace(/\/$/,'');
  if(!headers.location) // not redirecting anywhere
    warn(`\`${target}\` is not redirecting to \`${domain}\``);
  else if(targetLocation !== domain)
    warn(`\`${target}\` is redirecting to \`${targetLocation}\` instead of \`${domain}\``);
}


// Read restricted CNames from file
function getRestrictedCNames() {
  let restrictedCNames = []

  require(`./${restrictedFile}`).forEach(CName => { // For each item
    let end = /\(([\d\w/]*?)\)/.exec(CName) // Check if there is anything in bracket
    let base =  end ? CName.substr(0, end.index) : CName // If yes, set base as letters before bracket
    let CNames = new Set([base]) // Using sets to prevent duplicates | if no, set base as whole word itself
    if(end) end[1].split("/").forEach(addon =>  CNames.add(base + addon)) // Split stuff in bracket, base + extension
    restrictedCNames.push(...CNames); // Push into array
  });

  return restrictedCNames;
}


const result = async () => {

  // Check if cnames_active.js is modified.
  let isCNamesFileModified = modified.includes(activeFile);

  if(isCNamesFileModified)
    if(modified.length == 1)
      message(`:heavy_check_mark: Only file modified is \`${activeFile}\``);
    else
      warn(`Multiple files modified — ${modified.join(", ")}`);  
  else {
    fail(`\`${activeFile}\` not modified.`);
    return;
  }

  // Check if cnames_active.js is still valid
  let isActiveFileValid = checkEntireJSFile();

  // Show a friendly message to PR opener
  markdown(`@${pr.user.login} Hey, thanks for opening this PR! \
            <br>I've taken the liberty of running a few tests, you can see the results above :)`);

  // Check if PR title matches *.js.org
  let prTitleMatch = /^([\d\w]+?)\.js\.org$/.exec(pr.title);

  if(prTitleMatch)
    message(`:heavy_check_mark: Title of PR — \`${pr.title}\``);
  else
    warn(`Title of Pull Request is not in the format *myawesomeproject.js.org*`);

  
  // Get diff
  let diff = await danger.git.diffForFile(activeFile);
  let diffChunk = await danger.git.structuredDiffForFile(activeFile);
  let firstChunk = diffChunk && diffChunk.chunks[0];

  // Check number of lines changed in diff
  let linesOfCode = await danger.git.linesOfCode();

  if(linesOfCode == 1) {
    labels.push("add");
    if(!diff.added) { // if no lines have been added, it means there is a removal
      labels.push("remove");
      if(isActiveFileValid) // Check if file is still valid.
        message(":heavy_check_mark: One record removed.")
      return;
    } else
      message(`:heavy_check_mark: Only one line added!`);
  } else if(linesOfCode == 2 && // Check if a single line in the file is modified
          firstChunk.oldStart == firstChunk.newStart &&
          firstChunk.oldLines == firstChunk.newLines) {
    message(":heavy_check_mark: A record has been modified.");
    labels.push("change");
  } else
    fail(`Multiple lines are modified.`);
  

  // Get added line from diff
  let lineAdded = diff.added.substr(1);

  // Check for comments
  let lineComment = /\/\/.*/g.exec(lineAdded);
  if(lineComment) {
    warn(`Comment added to the cname file — \`${lineComment[0]}\``);

    lineAdded = lineAdded.substr(0, lineComment.index).trim();

    // Do not allow noCF? comments
    if(!(lineComment[0].match(/\/\/\s*?noCF\s*?$/)))
      fail("You are using an invalid comment, please remove the same.");
  }

  // Try to parse the added line as json
  const recordAdded = getJSON(lineAdded);
  if(!(typeof recordAdded === "object"))
    fail(`Could not parse \`${lineAdded}\``);
  else {
    // get the key and value of the record
    let recordKey = Object.keys(recordAdded)[0];
    let recordValue = recordAdded[recordKey];

    // Check if recordKey matches PR title
    if(prTitleMatch && prTitleMatch[1] != recordKey)
      warn("Hmmm.. your PR title doesn't seem to match your entry in the file.");

    // Check formatting (copy&paste from a browser adressbar often results in an URL)
    if(!(!recordValue.match(/(http(s?)):\/\//gi) && !recordValue.endsWith("/")))
      fail("The target value should not start with 'http(s)://' and should not end with a '/'");

    // Check for an exact Regex match — this means the format is perfect
    if(!diff.added.match(/^\+\s{2},"[\da-z]+?":\s"[\S]+?"$/))
      warn("Not an *exact* regex match");

    // check if the target of of the record is a GitHub Page
    if (recordValue.match(/.github\.io/g)) {
      // check the presence of a CNAME
      await checkCNAME(`http://${recordKey}.js.org`, `https://${recordValue}`);
    } else
      labels.push("external page");

    // Check if in alphabetic order
    diffChunk.chunks.map(chunk => { // Iterate through each chunk of differences
      let diffLines = chunk.changes.map(lineObj => { // Iterate through each line
        let lineMatch = /"(.+?)"\s*?:/.exec(lineObj.content); // get subdomain part
        if(lineMatch) return lineMatch[1]; // and return if found
      }).filter( Boolean ); // Remove falsy values like undefined, null

      diffLines.some((line, i) => {
        if (i) { // skip the first element
          let compareStrings = line.localeCompare(diffLines[i - 1]); // Compare strings
          if(compareStrings < 0) { // Check if it is in alphabetical order
            fail("The list is no longer in alphabetic order.");
            return true;
          } else if(compareStrings == 0) { // check if duplicate
            fail(`\`${line}.js.org\` already exists.`);
            labels.push("name conflict");
          }
        }
      })
    }); 

    // Check if using a restricted CName
    if(getRestrictedCNames().includes(recordKey))
      fail(`You are using a restricted name. Refer \`${restrictedFile}\` for more info.`)
  }

  // Add the required labels
  await api.issues.replaceLabels({ ...thisPR, labels: labels });

  // Add Review
  if(results.fails.length + results.warnings.length > 0)
    await api.pulls.createReview({ ...thisPR, body: "Some problems, check the test results.",event: "REQUEST_CHANGES" });
  else
    await api.pulls.createReview({ ...thisPR, event: "APPROVE"});
}

// Exit in case of any error
result().catch(err => {
  console.info(`ERROR: ${err.message || err}`);
  console.info("Some CI tests have returned an error.");
});
